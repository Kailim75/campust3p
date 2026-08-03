import { useMemo } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import {
  fetchSharedContactDocs,
  fetchSharedInscriptions,
  fetchSharedRappelsActifs,
} from "@/lib/shared-queries";
import { getMissingCmaDocs, CMA_DOC_LABELS } from "@/lib/cma-constants";
import { resolveFormationTrack } from "@/lib/formation-track";
import {
  construireRappelsPaiement,
  construireRappelsLibres,
  construireRappelsSession,
  construireRappelsSignature,
  construireRappelsDossier,
  trierRappels,
  encoderReport,
  rejetActif,
  STATUTS_FACTURE_DUE,
  HORIZON_JOURS,
  type Rappel,
  type DossierBrut,
  type ContactBrut,
} from "@/lib/rappels";

/**
 * Alimente la page « Rappels ». Les règles sont dans `src/lib/rappels.ts` :
 * ici, uniquement la collecte et le branchement des reports.
 */
export function useRappels() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["rappels", "liste"],
    staleTime: 30_000,
    queryFn: async (): Promise<Rappel[]> => {
      const aujourdhui = format(new Date(), "yyyy-MM-dd");
      // Les dossiers et sessions ne deviennent des rappels qu'à l'approche
      // du démarrage : inutile de tirer tout le catalogue.
      const horizonSessions = format(addDays(new Date(), 30), "yyyy-MM-dd");

      const [contactsRes, facturesRes, paiementsRes, sessionsRes, signaturesRes, docs, inscriptions, notesRappel] =
        await Promise.all([
          supabase
            .from("contacts")
            .select("id, nom, prenom, email, telephone, formation")
            .eq("archived", false)
            .is("deleted_at", null),
          supabase
            .from("factures")
            .select("id, contact_id, numero_facture, montant_total, statut, date_echeance")
            .in("statut", STATUTS_FACTURE_DUE)
            .not("date_echeance", "is", null)
            .is("deleted_at", null),
          supabase.from("paiements").select("facture_id, montant").is("deleted_at", null),
          supabase
            .from("sessions")
            .select("id, nom, date_debut, statut, formateur, formateur_id, lieu, adresse_ville")
            .eq("archived", false)
            .neq("statut", "annulee")
            .is("deleted_at", null)
            .gte("date_debut", aujourdhui)
            .lte("date_debut", horizonSessions),
          supabase
            .from("signature_requests")
            .select("id, contact_id, titre, type_document, statut, date_envoi, created_at")
            .eq("statut", "en_attente"),
          fetchSharedContactDocs(queryClient),
          fetchSharedInscriptions(queryClient),
          fetchSharedRappelsActifs(queryClient),
        ]);

      const contacts = (contactsRes.data || []) as (ContactBrut & { formation: string | null })[];
      const contactsParId = new Map<string, ContactBrut>(contacts.map((c) => [c.id, c]));
      const sessions = sessionsRes.data || [];

      const payeParFacture = new Map<string, number>();
      for (const p of paiementsRes.data || []) {
        payeParFacture.set(p.facture_id, (payeParFacture.get(p.facture_id) || 0) + Number(p.montant || 0));
      }

      // Les rappels libres viennent de la requête partagée (sans jointure) :
      // on rattache le contact localement.
      const libres = notesRappel.map((n) => ({
        id: n.id,
        contact_id: n.contact_id,
        titre: n.titre,
        rappel_description: n.rappel_description,
        date_rappel: n.date_rappel,
        alerte_active: n.alerte_active,
        contacts: contactsParId.get(n.contact_id)
          ? {
              id: n.contact_id,
              nom: contactsParId.get(n.contact_id)!.nom,
              prenom: contactsParId.get(n.contact_id)!.prenom,
              email: contactsParId.get(n.contact_id)!.email,
              telephone: contactsParId.get(n.contact_id)!.telephone,
            }
          : null,
      }));

      const signatures = (signaturesRes.data || []).map((s) => ({
        ...s,
        contacts: contactsParId.get(s.contact_id)
          ? {
              id: s.contact_id,
              nom: contactsParId.get(s.contact_id)!.nom,
              prenom: contactsParId.get(s.contact_id)!.prenom,
              email: contactsParId.get(s.contact_id)!.email,
            }
          : null,
      }));

      // Dossiers : pièces CMA manquantes des inscrits aux sessions à venir.
      const docsParContact = new Map<string, Set<string>>();
      for (const d of docs) {
        if (!docsParContact.has(d.contact_id)) docsParContact.set(d.contact_id, new Set());
        docsParContact.get(d.contact_id)!.add(d.type_document);
      }
      const sessionsParId = new Map(sessions.map((s) => [s.id, s]));

      const dossiers: DossierBrut[] = [];
      for (const inscription of inscriptions) {
        const session = sessionsParId.get(inscription.session_id);
        if (!session) continue;
        const contact = contacts.find((c) => c.id === inscription.contact_id);
        if (!contact) continue;

        const track = resolveFormationTrack(inscription.track, contact.formation);
        const manquantes = getMissingCmaDocs(docsParContact.get(contact.id) || new Set(), track);
        if (manquantes.length === 0) continue;

        dossiers.push({
          contactId: contact.id,
          contactNom: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() || "Contact",
          contactEmail: contact.email,
          contactTelephone: contact.telephone,
          sessionId: session.id,
          sessionNom: session.nom,
          dateDebut: session.date_debut,
          piecesManquantes: manquantes.map((type) => CMA_DOC_LABELS[type] || type),
        });
      }

      return trierRappels([
        ...construireRappelsPaiement(facturesRes.data || [], payeParFacture, contactsParId, aujourdhui),
        ...construireRappelsLibres(libres, aujourdhui),
        ...construireRappelsSession(sessions, aujourdhui),
        ...construireRappelsSignature(signatures, aujourdhui),
        ...construireRappelsDossier(dossiers, aujourdhui),
      ]);
    },
  });

  const { data: rejets = [] } = useRejetsRappels();

  // Un rappel reporté disparaît jusqu'au terme choisi ; un rappel ignoré ne
  // revient plus. Le filtre est ici pour que le cache de la liste reste
  // indépendant de celui des rejets.
  const rappels = useMemo(() => {
    if (!query.data) return [];
    const aujourdhui = format(new Date(), "yyyy-MM-dd");
    const masques = new Set(rejets.filter((r) => rejetActif(r.reason, aujourdhui)).map((r) => r.alert_id));
    return query.data.filter((r) => !masques.has(r.id));
  }, [query.data, rejets]);

  return { rappels, isLoading: query.isLoading, error: query.error };
}

interface RejetRappel {
  alert_id: string;
  reason: string | null;
}

/** Reports et rejets de l'utilisateur courant (table partagée avec `useAlerts`). */
function useRejetsRappels() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["rappels", "rejets", user?.id],
    enabled: !!user?.id,
    staleTime: 30_000,
    queryFn: async (): Promise<RejetRappel[]> => {
      const { data, error } = await supabase
        .from("dismissed_alerts")
        .select("alert_id, reason")
        .eq("user_id", user!.id)
        .like("alert_id", "rp:%");
      if (error) throw error;
      return (data || []) as RejetRappel[];
    },
  });
}

/**
 * Reporter ou ignorer un rappel. On supprime la ligne existante avant
 * d'insérer : `dismissed_alerts` n'a pas de contrainte d'unicité sur
 * (alert_id, user_id), un simple upsert empilerait les reports successifs et
 * le plus ancien continuerait de masquer.
 */
export function useReporterRappel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ rappelId, jusquA }: { rappelId: string; jusquA: string | null }) => {
      if (!user?.id) throw new Error("Utilisateur non authentifié");

      await supabase.from("dismissed_alerts").delete().eq("alert_id", rappelId).eq("user_id", user.id);

      const { error } = await supabase.from("dismissed_alerts").insert({
        alert_id: rappelId,
        user_id: user.id,
        reason: jusquA ? encoderReport(jusquA) : "ignoré depuis la page Rappels",
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rappels"] });
      queryClient.invalidateQueries({ queryKey: ["dismissed-alerts"] });
      toast.success(
        variables.jusquA
          ? `Reporté au ${format(new Date(variables.jusquA), "dd/MM/yyyy")}`
          : "Rappel ignoré"
      );
    },
    onError: () => toast.error("Impossible de reporter ce rappel"),
  });
}

/**
 * Clôturer un rappel libre : seule source dont la disparition ne peut pas
 * venir de la donnée métier, on éteint donc l'alerte à la main.
 */
export function useCloturerRappelLibre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (historiqueId: string) => {
      const { error } = await supabase
        .from("contact_historique")
        .update({ alerte_active: false })
        .eq("id", historiqueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rappels"] });
      queryClient.invalidateQueries({ queryKey: ["shared", "rappels-actifs"] });
      queryClient.invalidateQueries({ queryKey: ["contact-historique"] });
      toast.success("Rappel terminé");
    },
    onError: () => toast.error("Impossible de clôturer ce rappel"),
  });
}

/** Créer un rappel libre (« rappeler lundi »). */
export function useCreerRappelLibre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contactId,
      dateRappel,
      description,
    }: {
      contactId: string;
      dateRappel: string;
      description: string;
    }) => {
      const { error } = await supabase.from("contact_historique").insert({
        contact_id: contactId,
        type: "note",
        titre: "Rappel",
        contenu: description,
        rappel_description: description,
        date_rappel: dateRappel,
        alerte_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rappels"] });
      queryClient.invalidateQueries({ queryKey: ["shared", "rappels-actifs"] });
      queryClient.invalidateQueries({ queryKey: ["contact-historique"] });
      toast.success("Rappel créé");
    },
    onError: () => toast.error("Impossible de créer ce rappel"),
  });
}

export { HORIZON_JOURS };
