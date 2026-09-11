import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "./useSessions";

interface BulkEnrollmentResult {
  success: string[];
  duplicates: string[];
  errors: string[];
  facturesCreated: number;
  /** contact_id des inscrits dont la facture automatique n'a PAS été créée. */
  facturesEnEchec: string[];
}

/**
 * Nombre d'essais par facture quand le numéro obtenu est déjà pris au moment
 * de l'insertion (violation d'unicité 23505 : un autre utilisateur a créé une
 * facture entre la génération du numéro et l'insertion).
 */
export const ESSAIS_MAX_NUMERO_FACTURE = 3;

export interface FactureAutoSansNumero {
  contact_id: string;
  session_inscription_id: string;
  montant_total: number;
  type_financement: "personnel";
  statut: "brouillon";
  date_emission: string;
  commentaires: string;
}

export interface BilanFacturesAuto {
  creees: number;
  /** contact_id des factures non créées. */
  enEchec: string[];
}

/**
 * Crée les factures automatiques UNE PAR UNE, en générant le numéro juste
 * avant chaque insertion.
 *
 * Défaut corrigé le 11/09/2026 : les N numéros étaient générés AVANT toute
 * insertion. `generate_numero_facture` calcule MAX(numéro de l'année) + 1 sur
 * les lignes déjà en base : rien n'ayant été inséré entre deux appels, elle
 * rendait N fois le même numéro ; l'insertion groupée échouait alors sur
 * l'unicité de `numero_facture` et AUCUNE facture n'était créée, l'erreur
 * partant en console pendant que l'écran annonçait le succès.
 *
 * Correctif volontairement minimal : la numérotation sera refondue
 * (attribution par la base, à l'émission) dans un chantier ultérieur.
 */
export async function creerFacturesUneParUne(
  factures: FactureAutoSansNumero[],
): Promise<BilanFacturesAuto> {
  let creees = 0;
  const enEchec: string[] = [];

  for (const facture of factures) {
    let creee = false;

    for (let essai = 1; essai <= ESSAIS_MAX_NUMERO_FACTURE; essai++) {
      const { data: numeroFacture, error: numeroError } = await supabase.rpc("generate_numero_facture");
      if (numeroError || !numeroFacture) {
        console.error("Erreur génération numéro facture:", numeroError);
        break;
      }

      // `centre_id` est absent comme avant ce correctif (le tableau d'origine
      // était inféré en any[]) : le trigger trg_auto_set_centre_id_factures le
      // renseigne. Le transtypage ne change aucun champ inséré.
      const { error: factureError } = await supabase
        .from("factures")
        .insert({ ...facture, numero_facture: numeroFacture } as never);

      if (!factureError) {
        creee = true;
        break;
      }
      // Seul un conflit d'unicité justifie un nouveau numéro : toute autre
      // erreur (droits, valeur refusée…) se reproduirait à l'identique.
      if (factureError.code !== "23505") {
        console.error("Erreur création facture:", factureError);
        break;
      }
      console.warn(
        `Numéro de facture ${numeroFacture} déjà pris (essai ${essai}/${ESSAIS_MAX_NUMERO_FACTURE})`,
      );
    }

    if (creee) {
      creees++;
    } else {
      enEchec.push(facture.contact_id);
    }
  }

  return { creees, enEchec };
}

/** Le dialogue n'affiche que les inscriptions : le sort des factures passe ici. */
function signalerFactures({ facturesCreated, facturesEnEchec }: BulkEnrollmentResult) {
  if (facturesEnEchec.length > 0) {
    toast.error(`Facture non créée pour ${facturesEnEchec.length} stagiaire(s)`, {
      description:
        `${facturesCreated} facture(s) brouillon créée(s) sur ${facturesCreated + facturesEnEchec.length}. ` +
        "Les inscriptions sont bien enregistrées : créez les factures manquantes depuis l'onglet Finances de la session.",
      duration: 15000,
    });
  } else if (facturesCreated > 0) {
    toast.success(`${facturesCreated} facture(s) brouillon créée(s)`);
  }
}

export function useBulkEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      contactIds,
      session,
      autoCreateFacture = true,
    }: {
      sessionId: string;
      contactIds: string[];
      session: Session;
      autoCreateFacture?: boolean;
    }): Promise<BulkEnrollmentResult> => {
      // Get current inscriptions count
      const { count: currentCount, error: countError } = await supabase
        .from("session_inscriptions")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sessionId);

      if (countError) throw countError;

      const availablePlaces = session.places_totales - (currentCount || 0);

      // Get existing inscriptions to detect duplicates
      const { data: existingInscriptions, error: existingError } = await supabase
        .from("session_inscriptions")
        .select("contact_id")
        .eq("session_id", sessionId);

      if (existingError) throw existingError;

      const existingContactIds = new Set(
        existingInscriptions?.map((i) => i.contact_id) || []
      );

      // Separate duplicates from new contacts
      const duplicates: string[] = [];
      const newContactIds: string[] = [];

      contactIds.forEach((contactId) => {
        if (existingContactIds.has(contactId)) {
          duplicates.push(contactId);
        } else {
          newContactIds.push(contactId);
        }
      });

      // Check if we have enough places
      const contactsToEnroll = newContactIds.slice(0, availablePlaces);
      const rejected = newContactIds.slice(availablePlaces);

      // Perform bulk insert
      const success: string[] = [];
      const errors: string[] = [...rejected];
      let facturesCreated = 0;
      const facturesEnEchec: string[] = [];

      if (contactsToEnroll.length > 0) {
        const inscriptions = contactsToEnroll.map((contactId) => ({
          session_id: sessionId,
          contact_id: contactId,
        }));

        const { data: insertedInscriptions, error } = await supabase
          .from("session_inscriptions")
          .insert(inscriptions)
          .select();

        if (error) {
          errors.push(...contactsToEnroll);
        } else {
          success.push(...contactsToEnroll);

          // Auto-create invoices for each inscription — one at a time, the
          // number being generated right before each insert.
          if (autoCreateFacture && insertedInscriptions && insertedInscriptions.length > 0) {
            const bilan = await creerFacturesUneParUne(
              insertedInscriptions.map((inscription) => ({
                contact_id: inscription.contact_id,
                session_inscription_id: inscription.id,
                montant_total: session.prix || 0,
                type_financement: "personnel" as const,
                statut: "brouillon" as const,
                date_emission: new Date().toISOString().split("T")[0],
                commentaires: `Facture auto-générée pour la session: ${session.nom}`,
              })),
            );
            facturesCreated = bilan.creees;
            facturesEnEchec.push(...bilan.enEchec);
          }
        }
      }

      return { success, duplicates, errors, facturesCreated, facturesEnEchec };
    },
    onSuccess: (result, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "all_counts"] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      signalerFactures(result);
    },
  });
}
