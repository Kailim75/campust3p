import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "./useSessions";
import type { Contact } from "./useContacts";

interface BulkEnrollmentResult {
  success: string[];
  duplicates: string[];
  errors: string[];
}

export function useBulkEnrollment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      contactIds,
      session,
    }: {
      sessionId: string;
      contactIds: string[];
      session: Session;
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

      if (contactsToEnroll.length > 0) {
        const inscriptions = contactsToEnroll.map((contactId) => ({
          session_id: sessionId,
          contact_id: contactId,
        }));

        const { data, error } = await supabase
          .from("session_inscriptions")
          .insert(inscriptions)
          .select();

        if (error) {
          errors.push(...contactsToEnroll);
        } else {
          success.push(...contactsToEnroll);
        }
      }

      return { success, duplicates, errors };
    },
    onSuccess: (_, { sessionId }) => {
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "count", sessionId] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions", "all_counts"] });
    },
  });
}
