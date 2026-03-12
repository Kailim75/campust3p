// ═══════════════════════════════════════════════════════════════
// useDocumentWorkflow — Fetch & unify document data for a contact
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  mapGeneratedDocV2,
  createExpectedPlaceholders,
  type RawGeneratedDocV2,
  type RawDocumentEnvoi,
  type RawSignatureRequest,
} from "@/lib/document-workflow/documentWorkflowMapper";
import type { DocumentWorkflowItem } from "@/lib/document-workflow/types";
import type { EligibilityContact, EligibilitySession } from "@/lib/document-workflow/documentEligibility";
import type { ContractContext } from "@/lib/document-workflow/contractDocumentFilter";
import { getTrackFromFormationType, type FormationTrack } from "@/lib/formation-track";

interface UseDocumentWorkflowParams {
  contactId: string | null;
  sessionId?: string | null;
  centreId?: string | null;
  context?: "apprenant" | "session";
  enabled?: boolean;
}

/**
 * Unified hook that fetches generated docs, envois, and signatures,
 * then maps everything into DocumentWorkflowItem[].
 */
export function useDocumentWorkflow({
  contactId,
  sessionId,
  centreId,
  context = "apprenant",
  enabled = true,
}: UseDocumentWorkflowParams) {
  return useQuery({
    queryKey: ["document-workflow", contactId, sessionId, context],
    enabled: enabled && !!(contactId || sessionId),
    queryFn: async (): Promise<DocumentWorkflowItem[]> => {
      // 1. Fetch generated docs V2
      let genQuery = (supabase as any)
        .from("generated_documents_v2")
        .select("*, template:template_studio_templates(id, name, type, category)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (contactId) genQuery = genQuery.eq("contact_id", contactId);
      if (sessionId) genQuery = genQuery.eq("session_id", sessionId);

      // 2. Fetch envois
      let envoisQuery = supabase
        .from("document_envois")
        .select("*")
        .order("date_envoi", { ascending: false });

      if (contactId) envoisQuery = envoisQuery.eq("contact_id", contactId);
      if (sessionId) envoisQuery = envoisQuery.eq("session_id", sessionId);

      // 3. Fetch signatures
      let sigQuery = supabase
        .from("signature_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (contactId) sigQuery = sigQuery.eq("contact_id", contactId);

      // 4. Fetch contact data for eligibility
      let contactData: EligibilityContact | null = null;
      if (contactId) {
        const { data: c } = await supabase
          .from("contacts")
          .select("id, nom, prenom, email, date_naissance, ville_naissance")
          .eq("id", contactId)
          .single();
        contactData = c as EligibilityContact | null;
      }

      // 5. Fetch session data for eligibility + track
      let sessionData: EligibilitySession | null = null;
      let track: FormationTrack | null = null;
      if (sessionId) {
        const { data: s } = await (supabase as any)
          .from("sessions")
          .select("id, nom, date_debut, date_fin, formation_type, lieu, duree_heures, prix, track")
          .eq("id", sessionId)
          .single();
        sessionData = s ? { ...s, prix_total: s.prix ?? null } as EligibilitySession : null;
        track = s?.track ?? getTrackFromFormationType(s?.formation_type);
      }

      // 6. Fetch contract qualification from inscription
      let contractContext: ContractContext | null = null;
      if (contactId && sessionId) {
        const { data: insc } = await (supabase as any)
          .from("session_inscriptions")
          .select("contract_document_type, contract_frame_status")
          .eq("contact_id", contactId)
          .eq("session_id", sessionId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(1);

        if (insc?.[0]) {
          contractContext = {
            contractDocumentType: insc[0].contract_document_type,
            contractFrameStatus: insc[0].contract_frame_status ?? "a_qualifier",
          };
        }
      }

      // 7. Fetch published templates to resolve templateId for placeholders
      const publishedQuery = (supabase as any)
        .from("template_studio_templates")
        .select("id, name, type")
        .eq("status", "published")
        .eq("is_active", true);

      // Execute parallel queries
      const [genResult, envoisResult, sigResult, publishedResult] = await Promise.all([
        genQuery,
        envoisQuery,
        sigQuery,
        publishedQuery,
      ]);

      const generatedDocs = (genResult.data ?? []) as RawGeneratedDocV2[];
      const envois = (envoisResult.data ?? []) as RawDocumentEnvoi[];
      const signatures = (sigResult.data ?? []) as RawSignatureRequest[];

      // Map generated docs to workflow items
      const items: DocumentWorkflowItem[] = generatedDocs.map(doc =>
        mapGeneratedDocV2(doc, envois, signatures, contactData, sessionData)
      );

      // Add placeholders for expected but missing documents (track + contract aware)
      if (contactData) {
        const existingTypes = new Set(items.map(i => i.documentType));
        const effectiveCentreId = centreId ?? items[0]?.centreId ?? "";
        const placeholders = createExpectedPlaceholders(
          existingTypes,
          contactData,
          sessionData,
          effectiveCentreId,
          context,
          track,
          contractContext
        );
        items.push(...placeholders);
      }

      return items;
    },
    staleTime: 30_000,
  });
}
