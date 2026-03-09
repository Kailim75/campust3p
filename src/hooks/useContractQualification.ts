// ═══════════════════════════════════════════════════════════════
// useContractQualification — Fetch & manage contract frame status
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  disambiguateContractType,
  mapCrmFinancingType,
  type FinancingContext,
  type ContractDisambiguationResult,
} from "@/lib/document-workflow/documentTrackRules";
import { toast } from "sonner";

export type ContractDocumentType = "contrat" | "convention";
export type ContractFrameStatus = "qualifie" | "a_qualifier" | "auto_detecte";
export type QualificationSource = "manual" | "auto_financement" | "auto_personnel";

export interface ContractQualificationData {
  inscriptionId: string;
  contractDocumentType: ContractDocumentType | null;
  contractFrameStatus: ContractFrameStatus;
  qualificationSource: QualificationSource | null;
  qualifiedAt: string | null;
  qualifiedBy: string | null;
  /** Auto-detection result for display (always computed) */
  autoDetection: ContractDisambiguationResult;
}

interface UseContractQualificationParams {
  inscriptionId: string | null;
  enabled?: boolean;
}

/**
 * Fetch contract qualification for an inscription,
 * including auto-detection from linked financing data.
 */
export function useContractQualification({
  inscriptionId,
  enabled = true,
}: UseContractQualificationParams) {
  return useQuery({
    queryKey: ["contract-qualification", inscriptionId],
    enabled: enabled && !!inscriptionId,
    queryFn: async (): Promise<ContractQualificationData | null> => {
      if (!inscriptionId) return null;

      // Fetch inscription + linked devis for financing type
      const { data: inscription } = await (supabase as any)
        .from("session_inscriptions")
        .select("id, contact_id, session_id, contract_document_type, contract_frame_status, qualification_source, qualified_at, qualified_by")
        .eq("id", inscriptionId)
        .single();

      if (!inscription) return null;

      // Try to find financing type from linked devis
      const { data: devis } = await supabase
        .from("devis")
        .select("type_financement")
        .eq("session_inscription_id", inscriptionId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const financingType: FinancingContext = devis?.[0]
        ? mapCrmFinancingType(devis[0].type_financement)
        : "unknown";

      const autoDetection = disambiguateContractType(financingType);

      return {
        inscriptionId: inscription.id,
        contractDocumentType: inscription.contract_document_type as ContractDocumentType | null,
        contractFrameStatus: (inscription.contract_frame_status ?? "a_qualifier") as ContractFrameStatus,
        qualificationSource: inscription.qualification_source as QualificationSource | null,
        qualifiedAt: inscription.qualified_at,
        qualifiedBy: inscription.qualified_by,
        autoDetection,
      };
    },
    staleTime: 30_000,
  });
}

/**
 * Mutation to manually qualify the contract frame.
 */
export function useQualifyContractFrame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inscriptionId,
      contractDocumentType,
      source = "manual",
    }: {
      inscriptionId: string;
      contractDocumentType: ContractDocumentType;
      source?: QualificationSource;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase as any)
        .from("session_inscriptions")
        .update({
          contract_document_type: contractDocumentType,
          contract_frame_status: source === "manual" ? "qualifie" : "auto_detecte",
          qualification_source: source,
          qualified_at: new Date().toISOString(),
          qualified_by: user?.id ?? null,
        })
        .eq("id", inscriptionId);

      if (error) throw error;

      // Audit log
      await supabase.from("audit_logs").insert({
        table_name: "session_inscriptions",
        record_id: inscriptionId,
        action: "CONTRACT_QUALIFIED",
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        new_data: {
          contract_document_type: contractDocumentType,
          qualification_source: source,
        },
        centre_id: "00000000-0000-0000-0000-000000000000", // Will be resolved
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contract-qualification", variables.inscriptionId] });
      queryClient.invalidateQueries({ queryKey: ["document-workflow"] });
      queryClient.invalidateQueries({ queryKey: ["learner-document-blocks"] });
      toast.success("Cadre contractuel qualifié");
    },
    onError: () => {
      toast.error("Erreur lors de la qualification");
    },
  });
}

/**
 * Auto-qualify an inscription based on financing type.
 * Only sets if not already manually qualified.
 */
/**
 * Auto-qualify an inscription based on financing type.
 * Respects priority: manual > auto > a_qualifier.
 * - Only writes if status is "a_qualifier" or "auto_detecte" (never overwrites manual).
 * - Idempotent: skips write if the computed type matches the current persisted type.
 */
export async function autoQualifyFromFinancing(
  inscriptionId: string,
  financingType: string
): Promise<void> {
  const financing = mapCrmFinancingType(financingType);
  const result = disambiguateContractType(financing);

  if (result.certainty !== "certain") return;

  // Fetch current state to avoid unnecessary writes
  const { data: current } = await (supabase as any)
    .from("session_inscriptions")
    .select("contract_document_type, contract_frame_status")
    .eq("id", inscriptionId)
    .single();

  if (!current) return;

  // Never overwrite manual qualification
  if (current.contract_frame_status === "qualifie") return;

  // Skip if already auto-detected with the same type (idempotent)
  if (
    current.contract_frame_status === "auto_detecte" &&
    current.contract_document_type === result.recommendedType
  ) return;

  await (supabase as any)
    .from("session_inscriptions")
    .update({
      contract_document_type: result.recommendedType,
      contract_frame_status: "auto_detecte",
      qualification_source: "auto_financement",
      qualified_at: new Date().toISOString(),
      qualified_by: null,
    })
    .eq("id", inscriptionId);
}
