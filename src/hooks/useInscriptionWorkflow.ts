// ═══════════════════════════════════════════════════════════════
// useInscriptionWorkflow — Étapes parcours + alertes par inscription
// Lit la vue v_inscription_workflow (computed côté DB)
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type WorkflowStep =
  | "inscrit"
  | "convoque"
  | "en_formation"
  | "emarge"
  | "termine"
  | "atteste";

export const WORKFLOW_STEPS: { key: WorkflowStep; label: string; tooltip: string }[] = [
  { key: "inscrit",      label: "Inscrit",       tooltip: "Inscription créée" },
  { key: "convoque",     label: "Convoqué",      tooltip: "Convocation générée et envoyée" },
  { key: "en_formation", label: "En formation",  tooltip: "Session en cours" },
  { key: "emarge",       label: "Émargé",        tooltip: "Au moins une feuille d'émargement signée" },
  { key: "termine",      label: "Terminé",       tooltip: "Session terminée, attestation prête" },
  { key: "atteste",      label: "Attesté",       tooltip: "Attestation envoyée à l'apprenant" },
];

export interface InscriptionWorkflow {
  inscriptionId: string;
  contactId: string;
  sessionId: string;
  centreId: string | null;
  sessionNom: string | null;
  dateDebut: string | null;
  dateFin: string | null;
  workflowStep: WorkflowStep;
  convocationGenerated: boolean;
  convocationSent: boolean;
  contractSigned: boolean;
  emargementTotal: number;
  emargementSigned: number;
  attestationGenerated: boolean;
  attestationSent: boolean;
  alerts: {
    convocationMissing: boolean;
    convocationUnsent: boolean;
    contractUnsigned: boolean;
    emargementMissing: boolean;
    attestationLate: boolean;
  };
}

function mapRow(r: any): InscriptionWorkflow {
  return {
    inscriptionId: r.inscription_id,
    contactId: r.contact_id,
    sessionId: r.session_id,
    centreId: r.centre_id,
    sessionNom: r.session_nom,
    dateDebut: r.date_debut,
    dateFin: r.date_fin,
    workflowStep: r.workflow_step,
    convocationGenerated: !!r.convocation_generated,
    convocationSent: !!r.convocation_sent,
    contractSigned: !!r.contract_signed,
    emargementTotal: Number(r.emargement_total ?? 0),
    emargementSigned: Number(r.emargement_signed ?? 0),
    attestationGenerated: !!r.attestation_generated,
    attestationSent: !!r.attestation_sent,
    alerts: {
      convocationMissing: !!r.alert_convocation_missing,
      convocationUnsent: !!r.alert_convocation_unsent,
      contractUnsigned: !!r.alert_contract_unsigned,
      emargementMissing: !!r.alert_emargement_missing,
      attestationLate: !!r.alert_attestation_late,
    },
  };
}

/** Workflow d'une inscription précise. */
export function useInscriptionWorkflow(inscriptionId: string | null | undefined) {
  return useQuery({
    queryKey: ["inscription-workflow", inscriptionId],
    enabled: !!inscriptionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_inscription_workflow")
        .select("*")
        .eq("inscription_id", inscriptionId)
        .maybeSingle();
      if (error) throw error;
      return data ? mapRow(data) : null;
    },
    staleTime: 30_000,
  });
}

/** Workflows de toutes les inscriptions d'un contact. */
export function useContactWorkflows(contactId: string | null | undefined) {
  return useQuery({
    queryKey: ["contact-workflows", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_inscription_workflow")
        .select("*")
        .eq("contact_id", contactId)
        .order("date_debut", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 30_000,
  });
}

/** Workflows de tous les apprenants d'une session. */
export function useSessionWorkflows(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ["session-workflows", sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_inscription_workflow")
        .select("*")
        .eq("session_id", sessionId);
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    staleTime: 30_000,
  });
}

/** Alertes globales du centre (cockpit "Aujourd'hui"). */
export function useWorkflowAlerts(centreId: string | null | undefined) {
  return useQuery({
    queryKey: ["workflow-alerts", centreId],
    enabled: !!centreId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("v_inscription_workflow")
        .select("*")
        .eq("centre_id", centreId)
        .or(
          "alert_convocation_missing.eq.true," +
          "alert_convocation_unsent.eq.true," +
          "alert_contract_unsigned.eq.true," +
          "alert_emargement_missing.eq.true," +
          "alert_attestation_late.eq.true"
        );
      if (error) throw error;
      const items = (data ?? []).map(mapRow);
      return {
        items,
        counts: {
          convocationMissing: items.filter(i => i.alerts.convocationMissing).length,
          convocationUnsent: items.filter(i => i.alerts.convocationUnsent).length,
          contractUnsigned: items.filter(i => i.alerts.contractUnsigned).length,
          emargementMissing: items.filter(i => i.alerts.emargementMissing).length,
          attestationLate: items.filter(i => i.alerts.attestationLate).length,
          total: items.length,
        },
      };
    },
    staleTime: 60_000,
  });
}

/** Convertit un workflow en steps consommables par WorkflowStepper. */
export function buildWorkflowSteps(wf: InscriptionWorkflow | null) {
  if (!wf) return [];
  const order: WorkflowStep[] = ["inscrit", "convoque", "en_formation", "emarge", "termine", "atteste"];
  const currentIdx = order.indexOf(wf.workflowStep);
  return WORKFLOW_STEPS.map((s, idx) => {
    let status: "complete" | "active" | "blocked" | "pending";
    if (idx < currentIdx) status = "complete";
    else if (idx === currentIdx) status = "active";
    else status = "pending";

    // Mark as blocked when an alert applies to this exact step
    if (s.key === "convoque" && (wf.alerts.convocationMissing || wf.alerts.convocationUnsent)) status = "blocked";
    if (s.key === "inscrit" && wf.alerts.contractUnsigned) status = "blocked";
    if (s.key === "emarge" && wf.alerts.emargementMissing) status = "blocked";
    if (s.key === "atteste" && wf.alerts.attestationLate) status = "blocked";

    return { label: s.label, status, tooltip: s.tooltip };
  });
}
