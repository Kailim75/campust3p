import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type HistoriqueType = "appel" | "email" | "note" | "sms" | "whatsapp" | "reunion";

export interface ContactHistorique {
  id: string;
  contact_id: string;
  type: HistoriqueType;
  titre: string;
  contenu: string | null;
  date_echange: string;
  duree_minutes: number | null;
  created_at: string;
  created_by: string | null;
}

export interface HistoriqueInsert {
  contact_id: string;
  type: HistoriqueType;
  titre: string;
  contenu?: string | null;
  date_echange?: string;
  duree_minutes?: number | null;
}

export function useContactHistorique(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-historique", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      
      const { data, error } = await supabase
        .from("contact_historique")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_echange", { ascending: false });

      if (error) throw error;
      return data as ContactHistorique[];
    },
    enabled: !!contactId,
  });
}

export function useCreateHistorique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (historique: HistoriqueInsert) => {
      const { data, error } = await supabase
        .from("contact_historique")
        .insert(historique)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contact-historique", data.contact_id] });
      toast.success("Échange ajouté");
    },
    onError: (error: any) => {
      console.error("Error creating historique:", error);
      toast.error("Erreur lors de l'ajout");
    },
  });
}

export function useDeleteHistorique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("contact_historique")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { id, contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contact-historique", data.contactId] });
      toast.success("Échange supprimé");
    },
    onError: (error: any) => {
      console.error("Error deleting historique:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}
