import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Json } from "@/integrations/supabase/types";

export interface LmsModule {
  id: string;
  formation_id: string;
  titre: string;
  description: string | null;
  ordre: number;
  duree_estimee_min: number;
  obligatoire: boolean;
  conditions_deblocage: Json | null;
  icone: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface LmsModuleInsert {
  formation_id: string;
  titre: string;
  description?: string | null;
  ordre?: number;
  duree_estimee_min?: number;
  obligatoire?: boolean;
  conditions_deblocage?: Json | null;
  icone?: string | null;
  actif?: boolean;
}

export function useLmsModules(formationId?: string | null) {
  return useQuery({
    queryKey: ["lms-modules", formationId],
    queryFn: async () => {
      let query = supabase
        .from("lms_modules")
        .select("*")
        .order("ordre", { ascending: true });

      if (formationId) {
        query = query.eq("formation_id", formationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as LmsModule[];
    },
  });
}

export function useLmsModule(id: string | null) {
  return useQuery({
    queryKey: ["lms-module", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("lms_modules")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as LmsModule;
    },
    enabled: !!id,
  });
}

export function useCreateLmsModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (module: LmsModuleInsert) => {
      const { data, error } = await supabase
        .from("lms_modules")
        .insert(module)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["lms-modules"] });
      queryClient.invalidateQueries({ queryKey: ["lms-modules", variables.formation_id] });
      toast.success("Module créé avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création: " + error.message);
    },
  });
}

export function useUpdateLmsModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LmsModule> & { id: string }) => {
      const { data, error } = await supabase
        .from("lms_modules")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-modules"] });
      toast.success("Module mis à jour");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour: " + error.message);
    },
  });
}

export function useDeleteLmsModule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("lms_modules")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lms-modules"] });
      toast.success("Module supprimé");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression: " + error.message);
    },
  });
}
