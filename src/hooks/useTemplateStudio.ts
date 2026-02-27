// ═══════════════════════════════════════════════════════════════
// Hook: useTemplateStudio — CRUD + workflow for Template Studio
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { runComplianceCheck, COMPLIANCE_GATED_TYPES, type ComplianceReport } from "@/components/template-studio/complianceEngine";

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
  scenario: string | null;
  compliance_score: number | null;
  compliance_report_json: ComplianceReport | null;
  compliance_validated_at: string | null;
  compliance_validated_by: string | null;
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
  compliance_score: number | null;
  compliance_report_json: ComplianceReport | null;
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
  { value: "procedure_reclamation", label: "Procédure de réclamation" },
  { value: "devis", label: "Devis" },
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
  { value: "archived", label: "Archivé", color: "bg-muted/50 text-muted-foreground" },
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

/** Check if current user can publish (centre_admin or super_admin) */
async function canPublish(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Check super_admin
  const { data: isSA } = await supabase.rpc("is_super_admin");
  if (isSA) return true;

  // Check admin role
  const { data: roles } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);

  return roles?.some((r: any) => r.role === "admin" || r.role === "super_admin") ?? false;
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

  const saveVersion = async (template: StudioTemplate, complianceReport?: ComplianceReport | null) => {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("template_versions").insert({
      template_id: template.id,
      version: template.version,
      template_body: template.template_body,
      variables_schema: template.variables_schema,
      compliance_tags: template.compliance_tags,
      compliance_score: complianceReport?.score ?? null,
      compliance_report_json: complianceReport ?? null,
      centre_id: template.centre_id,
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

    publish: async (template: StudioTemplate, complianceReport: ComplianceReport | null, comment?: string) => {
      // Permission check
      const allowed = await canPublish();
      if (!allowed) {
        toast.error("Seuls les administrateurs (centre_admin / super_admin) peuvent publier");
        return false;
      }

      // Compliance gate for regulated types
      if (COMPLIANCE_GATED_TYPES.includes(template.type)) {
        const report = complianceReport ?? runComplianceCheck(template.template_body, template.type);
        if (!report.ready_to_publish) {
          toast.error(
            `Publication bloquée : ${report.blocking_issues.length} mention(s) obligatoire(s) manquante(s)`,
            {
              description: report.blocking_issues.slice(0, 3).join(", ") +
                (report.blocking_issues.length > 3 ? ` (+${report.blocking_issues.length - 3})` : ""),
              duration: 8000,
            }
          );
          return false;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      const finalReport = complianceReport ?? runComplianceCheck(template.template_body, template.type);

      // Deactivate other templates of the same scope (type + scenario)
      let deactivateQuery = (supabase as any)
        .from("template_studio_templates")
        .select("id")
        .eq("type", template.type)
        .eq("is_active", true)
        .neq("id", template.id);

      if (template.centre_id) {
        deactivateQuery = deactivateQuery.eq("centre_id", template.centre_id);
      }
      if (template.scenario) {
        deactivateQuery = deactivateQuery.eq("scenario", template.scenario);
      }

      const { data: others } = await deactivateQuery;

      if (others && others.length > 0) {
        for (const other of others) {
          await (supabase as any)
            .from("template_studio_templates")
            .update({ is_active: false, status: "inactive" })
            .eq("id", other.id);
          await logAction(other.id, template.centre_id, template.version, "deactivated", `Remplacé par template ${template.id}`);
        }
      }

      // Save version before publishing
      await saveVersion(template, finalReport);

      // Publish with compliance data
      await updateTemplate.mutateAsync({
        id: template.id,
        status: "published" as any,
        is_active: true,
        compliance_score: finalReport.score,
        compliance_report_json: finalReport as any,
        compliance_validated_at: new Date().toISOString() as any,
        compliance_validated_by: user?.id as any,
      });

      await logAction(template.id, template.centre_id, template.version, "publish", comment);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
      queryClient.invalidateQueries({ queryKey: ["studio-templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast.success("Template publié et activé — les anciens templates de ce type ont été désactivés");
      return true;
    },

    rollback: async (template: StudioTemplate, targetVersion: TemplateVersion, comment?: string) => {
      const allowed = await canPublish();
      if (!allowed) {
        toast.error("Seuls les administrateurs peuvent effectuer un rollback");
        return;
      }

      await updateTemplate.mutateAsync({
        id: template.id,
        template_body: targetVersion.template_body,
        variables_schema: targetVersion.variables_schema as any,
        compliance_tags: targetVersion.compliance_tags as any,
        version: template.version + 1,
        status: "draft" as any,
        is_active: false,
        compliance_score: null as any,
        compliance_report_json: null as any,
        compliance_validated_at: null as any,
        compliance_validated_by: null as any,
      });
      await saveVersion(
        { ...template, template_body: targetVersion.template_body, version: template.version + 1 },
        targetVersion.compliance_report_json
      );
      await logAction(template.id, template.centre_id, template.version + 1, "rollback", comment || `Rollback vers v${targetVersion.version}`);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
      queryClient.invalidateQueries({ queryKey: ["template-versions"] });
      toast.success(`Rollback vers la version ${targetVersion.version}`);
    },

    archive: async (template: StudioTemplate, comment?: string) => {
      await updateTemplate.mutateAsync({
        id: template.id,
        status: "archived" as any,
        is_active: false,
      });
      await logAction(template.id, template.centre_id, template.version, "archive", comment);
      queryClient.invalidateQueries({ queryKey: ["approval-logs"] });
      queryClient.invalidateQueries({ queryKey: ["studio-templates"] });
      toast.success("Template archivé");
    },
  };
}
