import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LegalMention {
  id: string;
  version: number;
  contenu: string;
  raison_sociale: string | null;
  forme_juridique: string | null;
  capital_social: string | null;
  siege_social: string | null;
  rcs: string | null;
  siret: string | null;
  nda: string | null;
  directeur_publication: string | null;
  hebergeur_nom: string | null;
  hebergeur_adresse: string | null;
  hebergeur_contact: string | null;
  email_contact: string | null;
  telephone_contact: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  activated_at: string | null;
  archived_at: string | null;
}

export interface LegalMentionHistory {
  id: string;
  mention_id: string;
  action: string;
  changed_fields: string[] | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: string | null;
  changed_at: string;
}

export function useLegalMentions() {
  const queryClient = useQueryClient();

  // Fetch all mentions (for super admin)
  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ["legal-mentions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_mentions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as LegalMention[];
    },
  });

  // Fetch active mention (public)
  const { data: activeMention, isLoading: isLoadingActive } = useQuery({
    queryKey: ["legal-mentions-active"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_active_legal_mentions");
      if (error) throw error;
      return data?.[0] || null;
    },
  });

  // Fetch history for a specific mention
  const useHistory = (mentionId: string | null) => {
    return useQuery({
      queryKey: ["legal-mentions-history", mentionId],
      queryFn: async () => {
        if (!mentionId) return [];
        const { data, error } = await supabase
          .from("legal_mentions_history")
          .select("*")
          .eq("mention_id", mentionId)
          .order("changed_at", { ascending: false });

        if (error) throw error;
        return data as LegalMentionHistory[];
      },
      enabled: !!mentionId,
    });
  };

  // Create new mention
  const createMutation = useMutation({
    mutationFn: async (mention: Partial<LegalMention>) => {
      // Calculate next version
      const maxVersion = mentions.reduce((max, m) => Math.max(max, m.version), 0);
      
      const { data, error } = await supabase
        .from("legal_mentions")
        .insert({
          contenu: mention.contenu || "",
          raison_sociale: mention.raison_sociale,
          forme_juridique: mention.forme_juridique,
          capital_social: mention.capital_social,
          siege_social: mention.siege_social,
          rcs: mention.rcs,
          siret: mention.siret,
          nda: mention.nda,
          directeur_publication: mention.directeur_publication,
          hebergeur_nom: mention.hebergeur_nom,
          hebergeur_adresse: mention.hebergeur_adresse,
          hebergeur_contact: mention.hebergeur_contact,
          email_contact: mention.email_contact,
          telephone_contact: mention.telephone_contact,
          version: maxVersion + 1,
          status: "draft",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-mentions"] });
      toast.success("Mentions légales créées");
    },
    onError: (error) => {
      toast.error("Erreur lors de la création");
      console.error(error);
    },
  });

  // Update mention
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LegalMention> & { id: string }) => {
      const { data, error } = await supabase
        .from("legal_mentions")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-mentions"] });
      toast.success("Mentions légales mises à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });

  // Activate mention (archives previous active)
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Archive current active
      const currentActive = mentions.find((m) => m.status === "active");
      if (currentActive) {
        await supabase
          .from("legal_mentions")
          .update({ status: "archived", archived_at: new Date().toISOString() })
          .eq("id", currentActive.id);
      }

      // Activate new
      const { data, error } = await supabase
        .from("legal_mentions")
        .update({ status: "active", activated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-mentions"] });
      queryClient.invalidateQueries({ queryKey: ["legal-mentions-active"] });
      toast.success("Mentions légales activées et publiées");
    },
    onError: (error) => {
      toast.error("Erreur lors de l'activation");
      console.error(error);
    },
  });

  return {
    mentions,
    activeMention,
    isLoading,
    isLoadingActive,
    useHistory,
    createMention: createMutation.mutate,
    updateMention: updateMutation.mutate,
    activateMention: activateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isActivating: activateMutation.isPending,
  };
}
