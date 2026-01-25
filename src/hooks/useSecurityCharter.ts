import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Charter {
  id: string;
  titre: string;
  contenu: string;
  version: number;
  roles_requis: string[];
  activated_at: string | null;
}

export function useSecurityCharter() {
  const queryClient = useQueryClient();

  // Check if user has accepted current charter
  const { data: hasAccepted, isLoading: checkingAcceptance } = useQuery({
    queryKey: ["charter-acceptance"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_accepted_current_charter");
      if (error) throw error;
      return data as boolean;
    },
  });

  // Get active charter
  const { data: activeCharter, isLoading: loadingCharter } = useQuery({
    queryKey: ["active-charter"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_charter");
      if (error) throw error;
      return (data as Charter[])?.[0] || null;
    },
  });

  // Accept charter mutation
  const acceptCharterMutation = useMutation({
    mutationFn: async (charterId: string) => {
      const { data, error } = await supabase.rpc("accept_charter", {
        p_charter_id: charterId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["charter-acceptance"] });
    },
  });

  return {
    hasAccepted: hasAccepted ?? false,
    activeCharter,
    isLoading: checkingAcceptance || loadingCharter,
    acceptCharter: acceptCharterMutation.mutateAsync,
    isAccepting: acceptCharterMutation.isPending,
  };
}

// Hook for Super Admin charter management
export function useCharterManagement() {
  const queryClient = useQueryClient();

  // Get all charters (for super admin)
  const { data: charters, isLoading } = useQuery({
    queryKey: ["all-charters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_charters")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get acceptance history
  const { data: acceptances } = useQuery({
    queryKey: ["charter-acceptances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("charter_acceptances")
        .select(`
          *,
          security_charters (titre, version)
        `)
        .order("accepted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Create new charter
  const createCharterMutation = useMutation({
    mutationFn: async (charter: { titre: string; contenu: string; roles_requis: string[] }) => {
      // Get next version number
      const { data: existing } = await supabase
        .from("security_charters")
        .select("version")
        .order("version", { ascending: false })
        .limit(1);
      
      const nextVersion = (existing?.[0]?.version || 0) + 1;

      const { data, error } = await supabase
        .from("security_charters")
        .insert({
          ...charter,
          version: nextVersion,
          status: "draft" as const,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-charters"] });
    },
  });

  // Update charter
  const updateCharterMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; titre?: string; contenu?: string; roles_requis?: string[] }) => {
      const { data, error } = await supabase
        .from("security_charters")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-charters"] });
    },
  });

  // Activate charter (archives others)
  const activateCharterMutation = useMutation({
    mutationFn: async (charterId: string) => {
      // Archive all active charters
      await supabase
        .from("security_charters")
        .update({ status: "archived" as const, archived_at: new Date().toISOString() })
        .eq("status", "active");

      // Activate the selected one
      const { data, error } = await supabase
        .from("security_charters")
        .update({ status: "active" as const, activated_at: new Date().toISOString() })
        .eq("id", charterId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-charters"] });
      queryClient.invalidateQueries({ queryKey: ["active-charter"] });
      queryClient.invalidateQueries({ queryKey: ["charter-acceptance"] });
    },
  });

  return {
    charters,
    acceptances,
    isLoading,
    createCharter: createCharterMutation.mutateAsync,
    updateCharter: updateCharterMutation.mutateAsync,
    activateCharter: activateCharterMutation.mutateAsync,
    isCreating: createCharterMutation.isPending,
    isUpdating: updateCharterMutation.isPending,
    isActivating: activateCharterMutation.isPending,
  };
}
