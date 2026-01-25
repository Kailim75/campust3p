import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BreachSeverity = 'faible' | 'moyenne' | 'elevee' | 'critique';
export type BreachType = 'confidentialite' | 'integrite' | 'disponibilite';
export type BreachOrigin = 'externe' | 'interne' | 'sous_traitant' | 'erreur_humaine' | 'technique' | 'autre';
export type BreachStatus = 'detectee' | 'en_analyse' | 'notifiee_cnil' | 'notifiee_personnes' | 'corrigee' | 'cloturee';
export type RiskLevel = 'aucun' | 'faible' | 'eleve';

export interface DataBreach {
  id: string;
  code: string;
  titre: string;
  description: string;
  date_detection: string;
  date_notification_cnil: string | null;
  date_notification_personnes: string | null;
  detecte_par: string | null;
  type_violation: BreachType;
  origine: BreachOrigin | null;
  severite: BreachSeverity;
  categories_donnees: string[];
  categories_personnes: string[];
  nombre_personnes_affectees: number | null;
  risque_pour_personnes: RiskLevel | null;
  mesures_immediates: string | null;
  mesures_correctives: string | null;
  mesures_preventives: string | null;
  notification_cnil_requise: boolean;
  notification_personnes_requise: boolean;
  justification_non_notification: string | null;
  statut: BreachStatus;
  responsable_traitement: string | null;
  documents_associes: string[] | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  closed_at: string | null;
  closed_by: string | null;
}

export interface DataBreachHistory {
  id: string;
  breach_id: string;
  action: string;
  changed_fields: string[] | null;
  old_values: any;
  new_values: any;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
}

export function useDataBreaches() {
  const queryClient = useQueryClient();

  // Get all breaches
  const { data: breaches, isLoading } = useQuery({
    queryKey: ["data-breaches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_breaches")
        .select("*")
        .order("date_detection", { ascending: false });
      if (error) throw error;
      return data as DataBreach[];
    },
  });

  // Get breach history
  const getBreachHistory = async (breachId: string) => {
    const { data, error } = await supabase
      .from("data_breach_history")
      .select("*")
      .eq("breach_id", breachId)
      .order("changed_at", { ascending: false });
    if (error) throw error;
    return data as DataBreachHistory[];
  };

  // Generate breach code
  const generateBreachCode = async () => {
    const { data, error } = await supabase.rpc("generate_breach_code");
    if (error) throw error;
    return data as string;
  };

  // Create breach
  const createBreachMutation = useMutation({
    mutationFn: async (breach: Omit<DataBreach, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'closed_at' | 'closed_by'>) => {
      const { data, error } = await supabase
        .from("data_breaches")
        .insert(breach)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-breaches"] });
    },
  });

  // Update breach
  const updateBreachMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DataBreach> & { id: string }) => {
      const { data, error } = await supabase
        .from("data_breaches")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-breaches"] });
    },
  });

  // Close breach
  const closeBreachMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("data_breaches")
        .update({ 
          statut: 'cloturee' as const,
          closed_at: new Date().toISOString()
        })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data-breaches"] });
    },
  });

  // Stats
  const activeBreaches = breaches?.filter(b => b.statut !== 'cloturee') || [];
  const criticalBreaches = breaches?.filter(b => b.severite === 'critique' && b.statut !== 'cloturee') || [];
  const pendingCnilNotification = breaches?.filter(b => 
    b.notification_cnil_requise && !b.date_notification_cnil && b.statut !== 'cloturee'
  ) || [];

  return {
    breaches,
    activeBreaches,
    criticalBreaches,
    pendingCnilNotification,
    isLoading,
    getBreachHistory,
    generateBreachCode,
    createBreach: createBreachMutation.mutateAsync,
    updateBreach: updateBreachMutation.mutateAsync,
    closeBreach: closeBreachMutation.mutateAsync,
    isCreating: createBreachMutation.isPending,
    isUpdating: updateBreachMutation.isPending,
    isClosing: closeBreachMutation.isPending,
  };
}
