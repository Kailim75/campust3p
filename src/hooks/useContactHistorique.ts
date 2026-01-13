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
  alerte_active: boolean | null;
  date_rappel: string | null;
  rappel_description: string | null;
}

export interface HistoriqueInsert {
  contact_id: string;
  type: HistoriqueType;
  titre: string;
  contenu?: string | null;
  date_echange?: string;
  duree_minutes?: number | null;
  alerte_active?: boolean;
  date_rappel?: string | null;
  rappel_description?: string | null;
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
      queryClient.invalidateQueries({ queryKey: ["historique-alerts"] });
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
      queryClient.invalidateQueries({ queryKey: ["historique-alerts"] });
      toast.success("Échange supprimé");
    },
    onError: (error: any) => {
      console.error("Error deleting historique:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useUpdateHistoriqueAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      contactId,
      alerte_active, 
      date_rappel, 
      rappel_description 
    }: { 
      id: string; 
      contactId: string;
      alerte_active: boolean; 
      date_rappel: string | null; 
      rappel_description: string | null;
    }) => {
      const { data, error } = await supabase
        .from("contact_historique")
        .update({ alerte_active, date_rappel, rappel_description })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...data, contactId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contact-historique", data.contactId] });
      queryClient.invalidateQueries({ queryKey: ["historique-alerts"] });
      toast.success(data.alerte_active ? "Rappel activé" : "Rappel désactivé");
    },
    onError: (error: any) => {
      console.error("Error updating historique alert:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useHistoriqueAlerts() {
  return useQuery({
    queryKey: ["historique-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select(`
          *,
          contacts (
            id,
            nom,
            prenom
          )
        `)
        .eq("alerte_active", true)
        .not("date_rappel", "is", null)
        .order("date_rappel", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
