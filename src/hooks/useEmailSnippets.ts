import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { toast } from "sonner";

export interface EmailSnippet {
  id: string;
  centre_id: string;
  user_id: string | null;
  scope: "centre" | "personal";
  shortcut: string;
  title: string;
  body: string;
  usage_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useEmailSnippets() {
  const { centreId } = useCentreContext();

  return useQuery({
    queryKey: ["email-snippets", centreId],
    queryFn: async (): Promise<EmailSnippet[]> => {
      if (!centreId) return [];
      const { data, error } = await supabase
        .from("email_snippets")
        .select("*")
        .eq("centre_id", centreId)
        .is("deleted_at", null)
        .order("usage_count", { ascending: false })
        .order("title", { ascending: true });
      if (error) throw error;
      return (data as EmailSnippet[]) ?? [];
    },
    enabled: !!centreId,
    staleTime: 60_000,
  });
}

export function useCreateSnippet() {
  const qc = useQueryClient();
  const { centreId } = useCentreContext();
  return useMutation({
    mutationFn: async (input: Omit<EmailSnippet, "id" | "centre_id" | "usage_count" | "created_at" | "updated_at" | "created_by"> & { user_id: string | null }) => {
      if (!centreId) throw new Error("Aucun centre actif");
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("email_snippets")
        .insert({
          ...input,
          centre_id: centreId,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-snippets"] });
      toast.success("Snippet créé");
    },
    onError: (e: any) => toast.error("Erreur : " + (e?.message ?? "création échouée")),
  });
}

export function useUpdateSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmailSnippet> & { id: string }) => {
      const { error } = await supabase
        .from("email_snippets")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-snippets"] });
      toast.success("Snippet mis à jour");
    },
    onError: (e: any) => toast.error("Erreur : " + e.message),
  });
}

export function useDeleteSnippet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("email_snippets")
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id ?? null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["email-snippets"] });
      toast.success("Snippet supprimé");
    },
  });
}

export function useIncrementSnippetUsage() {
  return useMutation({
    mutationFn: async (id: string) => {
      // best-effort increment
      const { data } = await supabase.from("email_snippets").select("usage_count").eq("id", id).single();
      const current = (data as any)?.usage_count ?? 0;
      await supabase.from("email_snippets").update({ usage_count: current + 1 }).eq("id", id);
    },
  });
}

/**
 * Replace variables {prenom}, {nom}, {email}, {centre}, {date} in a snippet body.
 */
export function applySnippetVariables(
  body: string,
  ctx: { prenom?: string; nom?: string; email?: string; centre?: string },
): string {
  const today = new Date().toLocaleDateString("fr-FR");
  return body
    .replace(/\{prenom\}/gi, ctx.prenom ?? "")
    .replace(/\{nom\}/gi, ctx.nom ?? "")
    .replace(/\{email\}/gi, ctx.email ?? "")
    .replace(/\{centre\}/gi, ctx.centre ?? "")
    .replace(/\{date\}/gi, today)
    .trim();
}
