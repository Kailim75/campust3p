// ═══════════════════════════════════════════════════════════════
// useContratConduite — Génération du contrat d'accompagnement conduite
// (produit autonome, sans rattachement obligatoire à une session)
// ═══════════════════════════════════════════════════════════════

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { renderTemplateHtml } from "@/lib/template-renderer";
import {
  buildContratConduiteVariables,
  type ContratConduiteVarsInput,
} from "@/lib/documents/conduite/contratConduiteVariables";
import {
  validateContratConduite,
} from "@/lib/documents/conduite/contratConduiteValidator";
import { getProduitConduiteByFiliere, type FiliereConduite } from "@/lib/documents/conduite/produitsCatalogue";

export const CONTRAT_CONDUITE_TYPE = "contrat_conduite";

/** Récupère le template publié `contrat_conduite` pour une filière donnée */
export function useContratConduiteTemplate(filiere: FiliereConduite | null) {
  return useQuery({
    queryKey: ["contrat-conduite-template", filiere],
    enabled: !!filiere,
    queryFn: async () => {
      if (!filiere) return null;
      const { data, error } = await (supabase as any)
        .from("template_studio_templates")
        .select("id, name, type, body_html, metadata")
        .eq("type", CONTRAT_CONDUITE_TYPE)
        .eq("status", "published")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      const list = (data ?? []) as Array<{
        id: string; name: string; type: string; body_html: string | null; metadata: any;
      }>;

      // Choix par filière (metadata.filiere) sinon fallback sur le nom
      const filiereLabel = filiere === "taxi" ? "taxi" : "vtc";
      const matched =
        list.find(t => (t.metadata?.filiere ?? "").toString().toLowerCase() === filiereLabel) ??
        list.find(t => t.name.toLowerCase().includes(filiereLabel)) ??
        null;
      return matched;
    },
    staleTime: 60_000,
  });
}

export interface ContratConduiteCreateParams {
  contactId: string;
  centreId: string;
  filiere: FiliereConduite;
  prix_ttc: number;
  montant_paye?: number | null;
  reste_a_payer?: number | null;
  date_conduite?: string | null;
  date_examen?: string | null;
  lieu_rdv?: string | null;
  accompagnateur?: string | null;
  accompagnateur_id?: string | null;
  facture_id?: string | null;
  facture_ligne_id?: string | null;
  justification_prix?: string | null;
  conditions_annulation?: string | null;
  /** Données de contact (pour build variables) */
  contactData?: ContratConduiteVarsInput["contact"];
  centreData?: ContratConduiteVarsInput["centre"];
}

/** Rendu HTML (preview) sans persister */
export function renderContratConduiteHtml(
  bodyHtml: string,
  params: ContratConduiteCreateParams,
) {
  const vars = buildContratConduiteVariables({
    contact: params.contactData ?? null,
    centre: params.centreData ?? null,
    filiere: params.filiere,
    prix_ttc: params.prix_ttc,
    montant_paye: params.montant_paye,
    reste_a_payer: params.reste_a_payer,
    date_conduite: params.date_conduite,
    date_examen: params.date_examen,
    lieu_rdv: params.lieu_rdv,
    accompagnateur: params.accompagnateur,
    conditions_annulation: params.conditions_annulation,
  });
  return renderTemplateHtml(bodyHtml, vars);
}

/**
 * Crée un enregistrement `generated_documents_v2` (session_id = NULL volontaire).
 * Ne génère aucune facture, ne crée aucune session.
 */
export function useCreateContratConduite() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: ContratConduiteCreateParams & { templateId: string; renderedHtml?: string }) => {
      const validation = validateContratConduite({
        filiere: params.filiere,
        prix_ttc: params.prix_ttc,
        justification_prix: params.justification_prix,
      });
      if (!validation.ok) {
        throw new Error(validation.errors.join(" "));
      }

      const produit = getProduitConduiteByFiliere(params.filiere);

      const metadata = {
        filiere: params.filiere,
        produit_sku: produit.sku,
        produit_intitule: produit.intitule,
        prix_catalogue_ttc: produit.prix_ttc,
        prix_ttc: params.prix_ttc,
        prix_alert: validation.priceAlert,
        justification_prix: params.justification_prix ?? null,
        montant_paye: params.montant_paye ?? 0,
        reste_a_payer: params.reste_a_payer ?? params.prix_ttc,
        facture_id: params.facture_id ?? null,
        facture_ligne_id: params.facture_ligne_id ?? null,
        date_conduite: params.date_conduite ?? null,
        date_examen: params.date_examen ?? null,
        lieu_rdv: params.lieu_rdv ?? null,
        accompagnateur_id: params.accompagnateur_id ?? null,
        accompagnateur_name: params.accompagnateur ?? null,
        source: "contrat_conduite",
      };

      const { data, error } = await (supabase as any)
        .from("generated_documents_v2")
        .insert({
          contact_id: params.contactId,
          centre_id: params.centreId,
          session_id: null, // volontaire : produit autonome
          template_id: params.templateId,
          document_type: CONTRAT_CONDUITE_TYPE,
          status: "generated",
          rendered_html: params.renderedHtml ?? null,
          metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["document-workflow", vars.contactId] });
      qc.invalidateQueries({ queryKey: ["generated-documents-v2"] });
      toast.success("Contrat d'accompagnement conduite généré");
    },
    onError: (err: any) => {
      console.error("[ContratConduite] create error:", err);
      toast.error(err?.message ?? "Erreur lors de la génération du contrat");
    },
  });
}
