import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProspectHistoriqueType = "appel" | "email" | "sms" | "rdv" | "note" | "relance";

export interface ProspectHistorique {
  id: string;
  prospect_id: string;
  type: ProspectHistoriqueType;
  titre: string;
  contenu: string | null;
  date_echange: string;
  duree_minutes: number | null;
  resultat: string | null;
  date_rappel: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProspectHistoriqueInsert {
  prospect_id: string;
  type: ProspectHistoriqueType;
  titre: string;
  contenu?: string | null;
  date_echange?: string;
  duree_minutes?: number | null;
  resultat?: string | null;
  date_rappel?: string | null;
}

export function useProspectHistorique(prospectId: string | null) {
  return useQuery({
    queryKey: ["prospect-historique", prospectId],
    queryFn: async () => {
      if (!prospectId) return [];

      const { data, error } = await supabase
        .from("prospect_historique")
        .select("*")
        .eq("prospect_id", prospectId)
        .order("date_echange", { ascending: false });

      if (error) throw error;
      return data as ProspectHistorique[];
    },
    enabled: !!prospectId,
  });
}

export function useCreateProspectHistorique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: ProspectHistoriqueInsert) => {
      const { data, error } = await supabase
        .from("prospect_historique")
        .insert(entry)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["prospect-historique", data.prospect_id] });
      toast.success("Échange ajouté");
    },
    onError: (error) => {
      console.error("Error creating historique:", error);
      toast.error("Erreur lors de l'ajout");
    },
  });
}

export function useDeleteProspectHistorique() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, prospectId }: { id: string; prospectId: string }) => {
      const { error } = await supabase
        .from("prospect_historique")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { prospectId };
    },
    onSuccess: ({ prospectId }) => {
      queryClient.invalidateQueries({ queryKey: ["prospect-historique", prospectId] });
      toast.success("Échange supprimé");
    },
    onError: (error) => {
      console.error("Error deleting historique:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

// Get prospects that need to be followed up
export function useProspectsToRelance() {
  return useQuery({
    queryKey: ["prospects", "to-relance"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("is_active", true)
        .not("statut", "in", '("converti","perdu")')
        .lte("date_prochaine_relance", today)
        .order("date_prochaine_relance", { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
