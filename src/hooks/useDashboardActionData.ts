import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isToday, isPast, parseISO, addDays, format } from "date-fns";
import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";

export interface ActionItem {
  id: string;
  type: "prospect" | "facture" | "apprenant";
  label: string;
  reason: string;
  entityId: string;
  section: string;
  track?: "initial" | "continuing";
}

export interface UpcomingSession {
  id: string;
  nom: string;
  date_debut: string;
  formation_type: string;
  track: string | null;
  inscrits: number;
  places_totales: number;
  isRisk: boolean;
}

export function useTodayActions() {
  return useQuery({
    queryKey: ["dashboard", "today-actions"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      const [prospectsRes, facturesRes, inscriptionsRes, docsRes, cartesRes] = await Promise.all([
        supabase.from("prospects")
          .select("id, nom, prenom, statut, date_prochaine_relance")
          .eq("is_active", true)
          .not("statut", "in", '("converti","perdu")')
          .order("date_prochaine_relance", { ascending: true })
          .limit(20),
        supabase.from("factures")
          .select("id, numero_facture, statut, date_echeance, montant_total, contact_id")
          .in("statut", ["emise"])
          .order("date_echeance", { ascending: true })
          .limit(20),
        supabase.from("session_inscriptions")
          .select("id, contact_id, track, contact:contacts(id, nom, prenom)")
          .limit(500),
        supabase.from("contact_documents")
          .select("contact_id, type_document"),
        supabase.from("cartes_professionnelles")
          .select("contact_id, statut, date_expiration"),
      ]);

      const items: ActionItem[] = [];

      // Prospects to call back
      const prospects = prospectsRes.data || [];
      prospects.forEach(p => {
        const isDue = p.date_prochaine_relance && (
          isToday(parseISO(p.date_prochaine_relance)) ||
          isPast(parseISO(p.date_prochaine_relance))
        );
        if (isDue || p.statut === "relance") {
          items.push({
            id: `prospect-${p.id}`,
            type: "prospect",
            label: `${p.prenom || ""} ${p.nom || ""}`.trim(),
            reason: p.date_prochaine_relance && isPast(parseISO(p.date_prochaine_relance)) && !isToday(parseISO(p.date_prochaine_relance))
              ? "Relance en retard"
              : "Relance prévue aujourd'hui",
            entityId: p.id,
            section: "prospects",
          });
        }
      });

      // Factures en retard / à relancer
      const factures = facturesRes.data || [];
      factures.forEach(f => {
        const isLate = f.date_echeance && f.date_echeance < todayStr;
        items.push({
          id: `facture-${f.id}`,
          type: "facture",
          label: f.numero_facture,
          reason: isLate ? "Échéance dépassée" : "En attente de paiement",
          entityId: f.id,
          section: "finances",
        });
      });

      // Apprenants with missing docs (track-aware)
      const inscriptions = inscriptionsRes.data || [];
      const docsMap = new Map<string, Set<string>>();
      (docsRes.data || []).forEach((d: any) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });
      const cartesMap = new Map<string, any[]>();
      (cartesRes.data || []).forEach((c: any) => {
        if (!cartesMap.has(c.contact_id)) cartesMap.set(c.contact_id, []);
        cartesMap.get(c.contact_id)!.push(c);
      });

      const seenContacts = new Set<string>();
      inscriptions.forEach((insc: any) => {
        const cid = insc.contact_id;
        if (seenContacts.has(cid)) return;
        const contact = insc.contact;
        if (!contact) return;

        if (insc.track === "initial") {
          const contactDocs = docsMap.get(cid) || new Set();
          const missing = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
          if (missing.length > 0) {
            seenContacts.add(cid);
            items.push({
              id: `apprenant-${cid}`,
              type: "apprenant",
              label: `${contact.prenom || ""} ${contact.nom || ""}`.trim(),
              reason: `${missing.length} doc(s) CMA manquant(s)`,
              entityId: cid,
              section: "contacts",
              track: "initial",
            });
          }
        } else if (insc.track === "continuing") {
          const contactCartes = cartesMap.get(cid) || [];
          const hasValid = contactCartes.some(
            (c: any) => c.statut !== "annulee" && (!c.date_expiration || c.date_expiration >= todayStr)
          );
          if (!hasValid) {
            seenContacts.add(cid);
            items.push({
              id: `apprenant-${cid}`,
              type: "apprenant",
              label: `${contact.prenom || ""} ${contact.nom || ""}`.trim(),
              reason: "Carte pro manquante/expirée",
              entityId: cid,
              section: "contacts",
              track: "continuing",
            });
          }
        }
      });

      return items.slice(0, 10);
    },
    staleTime: 60_000,
  });
}

export function useUpcomingSessions() {
  return useQuery({
    queryKey: ["dashboard", "upcoming-sessions-7d"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const in7days = format(addDays(new Date(), 7), "yyyy-MM-dd");

      const [sessionsRes, inscriptionsRes] = await Promise.all([
        supabase.from("sessions")
          .select("id, nom, date_debut, formation_type, track, places_totales, statut")
          .eq("archived", false)
          .gte("date_debut", todayStr)
          .lte("date_debut", in7days)
          .order("date_debut", { ascending: true })
          .limit(10),
        supabase.from("session_inscriptions")
          .select("session_id"),
      ]);

      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const counts: Record<string, number> = {};
      inscriptions.forEach(i => { counts[i.session_id] = (counts[i.session_id] || 0) + 1; });

      return sessions.map(s => ({
        id: s.id,
        nom: s.nom,
        date_debut: s.date_debut,
        formation_type: s.formation_type,
        track: s.track,
        inscrits: counts[s.id] || 0,
        places_totales: s.places_totales || 0,
        isRisk: s.places_totales ? ((counts[s.id] || 0) / s.places_totales) < 0.5 : false,
      })) as UpcomingSession[];
    },
    staleTime: 60_000,
  });
}
