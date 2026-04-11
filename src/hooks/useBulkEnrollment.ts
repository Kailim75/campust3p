import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "./useSessions";

interface BulkEnrollmentResult {
  success: string[];
  duplicates: string[];
  errors: string[];
  facturesCreated: number;
  factureErrors: string[];
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
        .eq("session_id", sessionId)
        .is("deleted_at", null);

      if (countError) throw countError;

      const availablePlaces = session.places_totales - (currentCount || 0);
      
      // Get existing inscriptions to detect duplicates
      const { data: existingInscriptions, error: existingError } = await supabase
        .from("session_inscriptions")
        .select("contact_id")
        .eq("session_id", sessionId)
        .is("deleted_at", null);

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
      const factureErrors: string[] = [];

      if (contactsToEnroll.length > 0) {
        const inscriptions = contactsToEnroll.map((contactId) => ({
          session_id: sessionId,
          contact_id: contactId,
          statut: "inscrit" as const,
        }));

        const { data: insertedInscriptions, error } = await supabase
          .from("session_inscriptions")
          .insert(inscriptions)
          .select();

        if (error) {
          errors.push(...contactsToEnroll);
        } else {
          success.push(...contactsToEnroll);

          // Auto-create invoices for each inscription
          if (autoCreateFacture && insertedInscriptions && insertedInscriptions.length > 0) {
            // Generate invoice numbers for all inscriptions
            const facturesToCreate = [];
            
            for (const inscription of insertedInscriptions) {
              // Generate unique invoice number
              const { data: numeroFacture, error: numeroError } = await supabase.rpc("generate_numero_facture");
              
              if (numeroError) {
                console.error("Erreur génération numéro facture:", numeroError);
                factureErrors.push(inscription.contact_id);
                continue;
              }

              facturesToCreate.push({
                contact_id: inscription.contact_id,
                session_inscription_id: inscription.id,
                numero_facture: numeroFacture,
                montant_total: session.prix || 0,
                type_financement: "personnel" as const,
                statut: "brouillon" as const,
                date_emission: new Date().toISOString().split("T")[0],
                commentaires: `Facture auto-générée pour la session: ${session.nom}`,
              });
            }

            if (facturesToCreate.length > 0) {
              const { error: factureError } = await supabase
                .from("factures")
                .insert(facturesToCreate);

              if (factureError) {
                console.error("Erreur création factures:", factureError);
                factureErrors.push(...facturesToCreate.map((facture) => facture.contact_id));
              } else {
                facturesCreated = facturesToCreate.length;
              }
            }
          }
        }
      }

      return { success, duplicates, errors, facturesCreated, factureErrors };
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "all_counts"] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-detail", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
    },
  });
}
