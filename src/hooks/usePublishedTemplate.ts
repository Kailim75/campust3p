// ═══════════════════════════════════════════════════════════════
// Hook: usePublishedTemplate — Fetch active published templates from Template Studio
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublishedTemplate {
  id: string;
  name: string;
  type: string;
  template_body: string;
  scenario: string | null;
  format: string;
  version: number;
}

/**
 * Fetch the active published template for a given document type.
 * Only returns templates with status='published' and is_active=true.
 * Optionally filter by scenario (e.g., formation type).
 */
export function usePublishedTemplate(type: string | null, scenario?: string | null) {
  return useQuery({
    queryKey: ["published-template", type, scenario],
    queryFn: async () => {
      if (!type) return null;
      let query = (supabase as any)
        .from("template_studio_templates")
        .select("id, name, type, template_body, scenario, format, version")
        .eq("type", type)
        .eq("status", "published")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (scenario) {
        query = query.eq("scenario", scenario);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data && data.length > 0 ? data[0] : null) as PublishedTemplate | null;
    },
    enabled: !!type,
  });
}

/**
 * Fetch a published template by type without React Query (for use in callbacks).
 */
export async function fetchPublishedTemplate(
  type: string,
  scenario?: string | null
): Promise<PublishedTemplate | null> {
  let query = (supabase as any)
    .from("template_studio_templates")
    .select("id, name, type, template_body, scenario, format, version")
    .eq("type", type)
    .eq("status", "published")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (scenario) {
    query = query.eq("scenario", scenario);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data && data.length > 0 ? data[0] : null;
}

/**
 * Check which document types have published templates available.
 */
export function usePublishedTemplateTypes() {
  return useQuery({
    queryKey: ["published-template-types"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .select("type, name, scenario")
        .eq("status", "published")
        .eq("is_active", true);
      if (error) throw error;
      return (data || []) as Array<{ type: string; name: string; scenario: string | null }>;
    },
  });
}
