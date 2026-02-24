// ═══════════════════════════════════════════════════════════════
// Hook: useTemplateStudio — CRUD + workflow for Template Studio
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StudioTemplate {
  id: string;
  centre_id: string | null;
  type: string;
  format: string;
  name: string;
  description: string | null;
  template_body: string;
  variables_schema: any[];
  compliance_tags: any[];
  version: number;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface TemplateVersion {
  id: string;
  template_id: string;
  version: number;
  template_body: string;
  variables_schema: any[];
  compliance_tags: any[];
  status: string;
  created_at: string;
  created_by: string | null;
}

export interface ApprovalLog {
  id: string;
  centre_id: string | null;
  template_id: string;
  version: number;
  action: string;
  comment: string | null;
  created_at: string;
  created_by: string | null;
}

export const TEMPLATE_TYPES = [
  { value: "programme", label: "Programme de formation" },
  { value: "contrat", label: "Contrat de formation (personne physique)" },
  { value: "convention", label: "Convention de formation (entreprise)" },
  { value: "attestation", label: "Attestation" },
  { value: "bulletin_inscription", label: "Bulletin d'inscription" },
  { value: "positionnement", label: "Test de positionnement" },
  { value: "test_positionnement", label: "Test de positionnement (alt)" },
  { value: "evaluation", label: "Évaluation" },
  { value: "evaluation_chaud", label: "Évaluation à chaud" },
  { value: "evaluation_froid", label: "Évaluation à froid (J+30)" },
  { value: "emargement", label: "Feuille d'émargement" },
  { value: "feuille_emargement", label: "Feuille d'émargement (alt)" },
  { value: "convocation", label: "Convocation" },
  { value: "reglement_interieur", label: "Règlement intérieur" },
  { value: "invoice", label: "Facture" },
  { value: "email", label: "Email" },
  { value: "chef_oeuvre", label: "Chef d'œuvre" },
  { value: "autre", label: "Autre" },
] as const;

export const TEMPLATE_FORMATS = [
  { value: "html", label: "HTML" },
  { value: "markdown", label: "Markdown" },
  { value: "email", label: "Email" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
] as const;

export const TEMPLATE_STATUSES = [
  { value: "draft", label: "Brouillon", color: "bg-muted text-muted-foreground" },
  { value: "review", label: "En révision", color: "bg-yellow-500/10 text-yellow-600" },
  { value: "approved", label: "Approuvé", color: "bg-blue-500/10 text-blue-600" },
  { value: "published", label: "Publié", color: "bg-green-500/10 text-green-600" },
  { value: "inactive", label: "Inactif", color: "bg-muted text-muted-foreground" },
] as const;

// ── Queries ──

export function useStudioTemplates(filters?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: ["studio-templates", filters],
    queryFn: async () => {
      let query = (supabase as any)
        .from("template_studio_templates")
        .select("*")
        .order("updated_at", { ascending: false });

      if (filters?.type && filters.type !== "all") {
        query = query.eq("type", filters.type);
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as StudioTemplate[];
    },
  });
}

export function useStudioTemplate(id: string | null) {
  return useQuery({
    queryKey: ["studio-template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as StudioTemplate;
    },
    enabled: !!id,
  });
}

export function useTemplateVersions(templateId: string | null) {
  return useQuery({
    queryKey: ["template-versions", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await (supabase as any)
        .from("template_versions")
        .select("*")
        .eq("template_id", templateId)
        .order("version", { ascending: false });
      if (error) throw error;
      return data as TemplateVersion[];
    },
    enabled: !!templateId,
  });
}

export function useApprovalLogs(templateId: string | null) {
  return useQuery({
    queryKey: ["approval-logs", templateId],
    queryFn: async () => {
      if (!templateId) return [];
      const { data, error } = await (supabase as any)
        .from("template_approval_logs")
        .select("*")
        .eq("template_id", templateId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ApprovalLog[];
    },
    enabled: !!templateId,
  });
}

// ── Mutations ──

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (template: Partial<StudioTemplate>) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .insert({ ...template, created_by: user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as StudioTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio-templates"] });
      toast.success("Template créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StudioTemplate> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as StudioTemplate;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["studio-templates"] });
      queryClient.invalidateQueries({ queryKey: ["studio-template", data.id] });
      toast.success("Template mis à jour");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("template_studio_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["studio-templates"] });
      toast.success("Template supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ── Workflow Actions ──

export function useTemplateWorkflow() {
  const queryClient = useQueryClient();
  const updateTemplate = useUpdateTemplate();

  const logAction = async (templateId: string, centreId: string | null, version: number, action: string, comment?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("template_approval_logs").insert({
      template_id: templateId,
      centre_id: centreId,
      version,
      action,
      comment: comment || null,
      created_by: user?.id,
    });
  };

  const saveVersion = async (template: StudioTemplate) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("template_versions").insert({
      template_id: template.id,
      version: template.version,
      template_body: template.template_body,
      variables_schema: template.variables_schema,
      compliance_tags: template.compliance_tags,
      status: template.status,
      created_by: user?.id,
    });
  };

  return {
    submitForReview: async (template: StudioTemplate, comment?: string) => {
      await saveVersion(template);
      await updateTemplate.mutateAsync({ id: template.id, status: "review" as any });
      await logAction(template.id, template.centre_id, template.version, "submit_review", comment);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
    },
    approve: async (template: StudioTemplate, comment?: string) => {
      await updateTemplate.mutateAsync({ id: template.id, status: "approved" as any });
      await logAction(template.id, template.centre_id, template.version, "approve", comment);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
    },
    publish: async (template: StudioTemplate, comment?: string) => {
      // Deactivate other templates of the same type for this centre
      const { data: others } = await (supabase as any)
        .from("template_studio_templates")
        .select("id")
        .eq("centre_id", template.centre_id)
        .eq("type", template.type)
        .eq("is_active", true)
        .neq("id", template.id);

      if (others && others.length > 0) {
        for (const other of others) {
          await (supabase as any)
            .from("template_studio_templates")
            .update({ is_active: false, status: "inactive" })
            .eq("id", other.id);
        }
      }

      await updateTemplate.mutateAsync({
        id: template.id,
        status: "published" as any,
        is_active: true,
      });
      await logAction(template.id, template.centre_id, template.version, "publish", comment);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
      queryClient.invalidateQueries({ queryKey: ["studio-templates"] });
      toast.success("Template publié et activé");
    },
    rollback: async (template: StudioTemplate, targetVersion: TemplateVersion, comment?: string) => {
      await updateTemplate.mutateAsync({
        id: template.id,
        template_body: targetVersion.template_body,
        variables_schema: targetVersion.variables_schema as any,
        compliance_tags: targetVersion.compliance_tags as any,
        version: template.version + 1,
        status: "draft" as any,
        is_active: false,
      });
      await saveVersion({ ...template, template_body: targetVersion.template_body, version: template.version + 1 });
      await logAction(template.id, template.centre_id, template.version + 1, "rollback", comment || `Rollback vers v${targetVersion.version}`);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast.success(`Rollback vers la version ${targetVersion.version}`);
    },
  };
}
