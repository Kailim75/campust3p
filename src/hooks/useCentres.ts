import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface Centre {
  id: string;
  nom: string;
  nom_commercial: string | null;
  siret: string | null;
  nda: string | null;
  email: string;
  telephone: string | null;
  adresse_complete: string | null;
  logo_url: string | null;
  actif: boolean;
  plan_type: "essentiel" | "pro" | "premium";
  plan_start_date: string | null;
  plan_end_date: string | null;
  max_users: number;
  max_contacts: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  settings: Json;
  created_at: string;
  updated_at: string;
}

export interface CentreStats {
  id: string;
  nom: string;
  plan_type: string;
  actif: boolean;
  created_at: string;
  onboarding_completed_at: string | null;
  last_activity_at: string | null;
  health_score: number | null;
  nb_users: number;
  nb_contacts: number;
  nb_sessions: number;
  ca_total: number;
}

export type CentreInput = Omit<Centre, "id" | "created_at" | "updated_at">;

// Hook pour récupérer les centres auxquels l'utilisateur a accès
export function useCentres() {
  return useQuery({
    queryKey: ["centres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .order("nom");

      if (error) throw error;
      return data as Centre[];
    },
  });
}

// Hook pour récupérer un centre spécifique
export function useCentre(centreId: string | null) {
  return useQuery({
    queryKey: ["centre", centreId],
    queryFn: async () => {
      if (!centreId) return null;
      
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .eq("id", centreId)
        .maybeSingle();

      if (error) throw error;
      return data as Centre | null;
    },
    enabled: !!centreId,
  });
}

// Hook pour récupérer les stats de tous les centres (super admin)
export function useCentresStats() {
  return useQuery({
    queryKey: ["centres-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("centres_stats")
        .select("*")
        .order("nom");

      if (error) throw error;
      return data as CentreStats[];
    },
  });
}

// Hook pour créer un nouveau centre
export function useCreateCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<CentreInput>) => {
      const { data, error } = await supabase
        .from("centres")
        .insert({
          nom: input.nom || "",
          email: input.email || "",
          nom_commercial: input.nom_commercial,
          siret: input.siret,
          nda: input.nda,
          telephone: input.telephone,
          adresse_complete: input.adresse_complete,
          logo_url: input.logo_url,
          actif: input.actif ?? true,
          plan_type: input.plan_type || "essentiel",
          plan_start_date: input.plan_start_date,
          plan_end_date: input.plan_end_date,
          max_users: input.max_users ?? 5,
          max_contacts: input.max_contacts ?? 500,
          settings: (input.settings as Json) || {},
        })
        .select()
        .single();

      if (error) throw error;
      return data as Centre;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      queryClient.invalidateQueries({ queryKey: ["centres-stats"] });
      toast.success("Centre créé avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la création : " + error.message);
    },
  });
}

// Hook pour mettre à jour un centre
export function useUpdateCentre() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, settings, ...rest }: Partial<Centre> & { id: string }) => {
      const updateData = {
        ...rest,
        ...(settings !== undefined && { settings: settings as Json }),
      };
      
      const { data, error } = await supabase
        .from("centres")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Centre;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["centres"] });
      queryClient.invalidateQueries({ queryKey: ["centre", data.id] });
      queryClient.invalidateQueries({ queryKey: ["centres-stats"] });
      toast.success("Centre mis à jour avec succès");
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la mise à jour : " + error.message);
    },
  });
}

// Hook pour vérifier si l'utilisateur est super admin
export function useIsSuperAdmin() {
  return useQuery({
    queryKey: ["is-super-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("is_super_admin");
      if (error) {
        console.error("Error checking super admin status:", error);
        return false;
      }
      return data as boolean;
    },
  });
}

// Hook pour récupérer le centre actuel de l'utilisateur
export function useUserCentre() {
  return useQuery({
    queryKey: ["user-centre"],
    queryFn: async () => {
      // D'abord récupérer le centre_id de l'utilisateur
      const { data: centreId, error: rpcError } = await supabase.rpc("get_user_centre_id");
      
      if (rpcError || !centreId) {
        return null;
      }

      // Puis récupérer les détails du centre
      const { data, error } = await supabase
        .from("centres")
        .select("*")
        .eq("id", centreId)
        .maybeSingle();

      if (error) throw error;
      return data as Centre | null;
    },
  });
}
