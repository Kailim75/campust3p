// ═══════════════════════════════════════════════════════════════
// useLearnerDocumentBlocks — Group workflow items into blocks
// ═══════════════════════════════════════════════════════════════

import { useMemo } from "react";
import { useDocumentWorkflow } from "./useDocumentWorkflow";
import { DOCUMENT_BLOCKS, getDocumentTypeConfig } from "@/lib/document-workflow/documentBlockConfig";
import type { DocumentBlock, DocumentBlockSummary, DocumentWorkflowItem } from "@/lib/document-workflow/types";

interface UseLearnerDocumentBlocksParams {
  contactId: string | null;
  sessionId?: string | null;
  centreId?: string | null;
  enabled?: boolean;
}

/**
 * Returns document workflow items grouped by business blocks
 * for a specific learner (optionally scoped to a session).
 */
export function useLearnerDocumentBlocks({
  contactId,
  sessionId,
  centreId,
  enabled = true,
}: UseLearnerDocumentBlocksParams) {
  const workflow = useDocumentWorkflow({
    contactId,
    sessionId,
    centreId,
    context: "apprenant",
    enabled,
  });

  const blocks = useMemo((): DocumentBlockSummary[] => {
    if (!workflow.data) return [];
    return buildBlockSummaries(workflow.data);
  }, [workflow.data]);

  const globalStats = useMemo(() => {
    const items = workflow.data ?? [];
    return {
      total: items.length,
      generated: items.filter(i => i.businessStatus === "genere" || i.businessStatus === "envoye" || i.businessStatus === "signe").length,
      missing: items.filter(i => i.businessStatus === "a_generer" || i.businessStatus === "incomplet").length,
      sent: items.filter(i => i.businessStatus === "envoye").length,
      signed: items.filter(i => i.businessStatus === "signe").length,
      errors: items.filter(i => i.businessStatus === "erreur").length,
      blocked: items.filter(i => i.isBlocked).length,
    };
  }, [workflow.data]);

  return {
    blocks,
    globalStats,
    items: workflow.data ?? [],
    isLoading: workflow.isLoading,
    error: workflow.error,
    refetch: workflow.refetch,
  };
}

/** Build block summaries from flat workflow items */
export function buildBlockSummaries(items: DocumentWorkflowItem[]): DocumentBlockSummary[] {
  const blockMap = new Map<DocumentBlock, DocumentWorkflowItem[]>();

  for (const item of items) {
    const existing = blockMap.get(item.documentBlock) ?? [];
    existing.push(item);
    blockMap.set(item.documentBlock, existing);
  }

  const blockOrder = Object.entries(DOCUMENT_BLOCKS) as [DocumentBlock, typeof DOCUMENT_BLOCKS[DocumentBlock]][];
  blockOrder.sort((a, b) => a[1].sortOrder - b[1].sortOrder);

  return blockOrder
    .map(([block, meta]) => {
      const blockItems = blockMap.get(block) ?? [];
      if (blockItems.length === 0) return null;

      // Sort items within block by config sortOrder (via documentType)
      blockItems.sort((a, b) =>
        getDocumentTypeConfig(a.documentType).sortOrder - getDocumentTypeConfig(b.documentType).sortOrder
      );

      return {
        block,
        label: meta.label,
        icon: meta.icon,
        items: blockItems,
        totalExpected: blockItems.filter(i => i.isRequired || i.businessStatus !== "non_requis").length,
        generated: blockItems.filter(i => ["genere", "envoye", "signe", "consulte"].includes(i.businessStatus)).length,
        sent: blockItems.filter(i => i.businessStatus === "envoye").length,
        signed: blockItems.filter(i => i.businessStatus === "signe").length,
        missing: blockItems.filter(i => i.businessStatus === "a_generer" || i.businessStatus === "incomplet").length,
        blocked: blockItems.filter(i => i.isBlocked).length,
        errors: blockItems.filter(i => i.businessStatus === "erreur").length,
      } satisfies DocumentBlockSummary;
    })
    .filter((b): b is DocumentBlockSummary => b !== null);
}
