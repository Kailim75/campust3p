// ═══════════════════════════════════════════════════════════════
// useSessionDocumentMatrix — Session-level document overview
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { buildBlockSummaries } from "./useLearnerDocumentBlocks";
import {
  mapGeneratedDocV2,
  createExpectedPlaceholders,
  type RawGeneratedDocV2,
  type RawDocumentEnvoi,
  type RawSignatureRequest,
} from "@/lib/document-workflow/documentWorkflowMapper";
import type { SessionDocumentMatrixRow, DocumentWorkflowItem } from "@/lib/document-workflow/types";
import type { EligibilityContact, EligibilitySession } from "@/lib/document-workflow/documentEligibility";
import { getTrackFromFormationType, type FormationTrack } from "@/lib/formation-track";

interface UseSessionDocumentMatrixParams {
  sessionId: string | null;
  enabled?: boolean;
}

/**
 * Builds a matrix of all learners × document blocks for a session.
 * Used in the session view to show document completion at a glance.
 * Now track-aware: adapts required documents based on initial vs continuing.
 */
export function useSessionDocumentMatrix({
  sessionId,
  enabled = true,
}: UseSessionDocumentMatrixParams) {
  return useQuery({
    queryKey: ["session-document-matrix", sessionId],
    enabled: enabled && !!sessionId,
    queryFn: async (): Promise<SessionDocumentMatrixRow[]> => {
      if (!sessionId) return [];

      // Fetch session data (including track)
      const { data: sessionRaw, error: sessionError } = await (supabase as any)
        .from("sessions")
        .select("id, nom, date_debut, date_fin, formation_type, lieu, duree_heures, prix, centre_id, track")
        .eq("id", sessionId)
        .single();

      if (sessionError) {
        console.error("Session document matrix: session fetch error", sessionError);
        throw new Error(`Erreur chargement session: ${sessionError.message}`);
      }

      if (!sessionRaw) return [];
      // Map DB field 'prix' to EligibilitySession's 'prix_total'
      const sessionData: EligibilitySession = {
        ...sessionRaw,
        prix_total: sessionRaw.prix ?? null,
      };
      const centreId = sessionRaw.centre_id as string;
      // Resolve formation track
      const track: FormationTrack = sessionRaw.track ?? getTrackFromFormationType(sessionRaw.formation_type);

      // Fetch inscriptions with contact data + contract qualification
      const { data: inscriptions, error: inscError } = await (supabase as any)
        .from("session_inscriptions")
        .select("id, contact_id, contract_document_type, contract_frame_status, qualification_source, contacts:contact_id(id, nom, prenom, email, date_naissance, ville_naissance)")
        .eq("session_id", sessionId)
        .is("deleted_at", null);

      if (inscError) {
        console.error("Session document matrix: inscriptions fetch error", inscError);
        throw new Error(`Erreur chargement inscriptions: ${inscError.message}`);
      }

      if (!inscriptions?.length) return [];

      const contactIds = inscriptions.map((i: any) => i.contact_id).filter(Boolean);

      // Batch fetch all docs, envois, signatures, and published templates for this session
      const [genResult, envoisResult, sigResult, publishedResult] = await Promise.all([
        (supabase as any)
          .from("generated_documents_v2")
          .select("*, template:template_studio_templates(id, name, type, category)")
          .eq("session_id", sessionId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("document_envois")
          .select("*")
          .eq("session_id", sessionId)
          .order("date_envoi", { ascending: false }),
        supabase
          .from("signature_requests")
          .select("*")
          .in("contact_id", contactIds)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("template_studio_templates")
          .select("id, name, type")
          .eq("status", "published")
          .eq("is_active", true),
      ]);

      // Log any errors from parallel queries
      if (genResult.error) console.error("Session doc matrix: generated_documents_v2 error", genResult.error);
      if (envoisResult.error) console.error("Session doc matrix: document_envois error", envoisResult.error);
      if (sigResult.error) console.error("Session doc matrix: signature_requests error", sigResult.error);
      if (publishedResult.error) console.error("Session doc matrix: template_studio_templates error", publishedResult.error);

      const allDocs = (genResult.data ?? []) as RawGeneratedDocV2[];
      const allEnvois = (envoisResult.data ?? []) as RawDocumentEnvoi[];
      const allSigs = (sigResult.data ?? []) as RawSignatureRequest[];

      // Build a map of document type → published template ID
      const publishedTemplateMap = new Map<string, string>();
      for (const t of (publishedResult.data ?? []) as Array<{ id: string; name: string; type: string }>) {
        if (!publishedTemplateMap.has(t.type)) {
          publishedTemplateMap.set(t.type, t.id);
        }
      }

      // Build matrix rows
      const rows: SessionDocumentMatrixRow[] = [];

      for (const insc of inscriptions) {
        const contact = (insc as any).contacts as EligibilityContact | null;
        if (!contact) continue;

        const contactDocs = allDocs.filter(d => d.contact_id === contact.id);
        const contactEnvois = allEnvois.filter(e => e.contact_id === contact.id);
        const contactSigs = allSigs.filter(s => s.contact_id === contact.id);

        // Map existing docs
        const items: DocumentWorkflowItem[] = contactDocs.map(doc =>
          mapGeneratedDocV2(doc, contactEnvois, contactSigs, contact, sessionData)
        );

        // Build contract context from inscription qualification
        const inscContractDocType = (insc as any).contract_document_type as string | null;
        const inscContractStatus = (insc as any).contract_frame_status as string | null;
        const inscContractContext = inscContractDocType
          ? {
              contractDocumentType: inscContractDocType as "contrat" | "convention",
              contractFrameStatus: (inscContractStatus ?? "a_qualifier") as "qualifie" | "a_qualifier" | "auto_detecte",
            }
          : null;

        // Add placeholders (track-aware + contract-aware) and enrich with published template IDs
        const existingTypes = new Set(items.map(i => i.documentType));
        const placeholders = createExpectedPlaceholders(
          existingTypes, contact, sessionData, centreId, "session", track, inscContractContext
        );
        // Resolve templateId from published templates for placeholders
        for (const ph of placeholders) {
          if (!ph.templateId) {
            const pubId = publishedTemplateMap.get(ph.documentType);
            if (pubId) {
              ph.templateId = pubId;
            }
          }
        }
        items.push(...placeholders);

        const blocks = buildBlockSummaries(items);
        const missingCount = items.filter(i =>
          i.businessStatus === "a_generer" || i.businessStatus === "incomplet"
        ).length;
        const generatedCount = items.filter(i =>
          ["genere", "envoye", "signe", "consulte"].includes(i.businessStatus)
        ).length;

        // Contract frame from inscription
        const contractDocType = (insc as any).contract_document_type as string | null;
        const contractStatus = (insc as any).contract_frame_status as string | null;
        const qualSource = (insc as any).qualification_source as string | null;

        const contractFrame = contractDocType === "contrat" ? "contrat"
          : contractDocType === "convention" ? "convention"
          : "a_qualifier";
        const contractFrameSource = qualSource === "manual" ? "manual"
          : qualSource ? "auto"
          : null;

        rows.push({
          contactId: contact.id,
          contactName: `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim(),
          contactEmail: contact.email,
          blocks,
          overallStatus: missingCount === 0 && items.length > 0
            ? "complete"
            : items.some(i => i.isBlocked)
              ? "blocked"
              : items.length === 0
                ? "empty"
                : "incomplete",
          totalDocuments: items.length,
          generatedCount,
          missingCount,
          contractFrame: contractFrame as any,
          contractFrameSource: contractFrameSource as any,
        });
      }

      return rows;
    },
    staleTime: 30_000,
  });
}
