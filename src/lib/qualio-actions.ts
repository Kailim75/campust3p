/**
 * Qualiopi action engine — priority rules, CTA mapping, and action detection.
 * Used by SessionQualiopiTab to compute the top N actions for a session.
 */

import type { QualiopiCriterion } from "@/hooks/useSessionQualiopi";

export type QualiopiActionType =
  | "assigner_formateur"
  | "envoyer_convocations"
  | "envoyer_conventions"
  | "emettre_attestations"
  | "envoyer_satisfaction"
  | "relancer_satisfaction"
  | "importer_objectifs"
  | "renseigner_objectifs"
  | "importer_prerequis"
  | "renseigner_prerequis"
  | "creer_emargement"
  | "renseigner_lieu"
  | "renseigner_duree";

export interface QualiopiAction {
  type: QualiopiActionType;
  criterionId: string;
  label: string;
  description: string;
  impact: string;
  count?: number;
  priority: number; // lower = higher priority
  ctaVariant: "primary" | "secondary" | "outline";
  icon: string; // lucide icon name
}

interface ActionContext {
  criteria: QualiopiCriterion[];
  hasCatalogueFormation: boolean;
  inscriptionCount: number;
  isTerminee: boolean;
}

/**
 * Compute prioritized list of qualiopi actions based on criteria statuses.
 */
export function computeQualiopiActions(ctx: ActionContext): QualiopiAction[] {
  const actions: QualiopiAction[] = [];
  const { criteria, hasCatalogueFormation, inscriptionCount } = ctx;

  const findCriterion = (id: string) => criteria.find(c => c.id === id);

  // Formateur
  const formateur = findCriterion("formateur");
  if (formateur && formateur.status === "non_conforme") {
    actions.push({
      type: "assigner_formateur",
      criterionId: "formateur",
      label: "Assigner formateur",
      description: "Aucun formateur n'est assigné à cette session",
      impact: "Bloquant pour l'audit",
      priority: 1,
      ctaVariant: "primary",
      icon: "UserPlus",
    });
  }

  // Objectifs
  const programme = findCriterion("programme");
  if (programme && programme.status === "non_conforme") {
    if (hasCatalogueFormation) {
      actions.push({
        type: "importer_objectifs",
        criterionId: "programme",
        label: "Importer depuis Catalogue",
        description: "Les objectifs pédagogiques ne sont pas renseignés",
        impact: "Critère obligatoire Qualiopi",
        priority: 2,
        ctaVariant: "primary",
        icon: "Download",
      });
    }
    actions.push({
      type: "renseigner_objectifs",
      criterionId: "programme",
      label: "Renseigner objectifs",
      description: "Les objectifs pédagogiques ne sont pas renseignés",
      impact: "Critère obligatoire Qualiopi",
      priority: hasCatalogueFormation ? 10 : 2,
      ctaVariant: hasCatalogueFormation ? "outline" : "primary",
      icon: "Pencil",
    });
  }

  // Prérequis
  const prerequis = findCriterion("prerequis");
  if (prerequis && prerequis.status === "non_conforme") {
    if (hasCatalogueFormation) {
      actions.push({
        type: "importer_prerequis",
        criterionId: "prerequis",
        label: "Importer prérequis",
        description: "Les prérequis ne sont pas renseignés",
        impact: "Recommandé Qualiopi",
        priority: 8,
        ctaVariant: "secondary",
        icon: "Download",
      });
    }
    actions.push({
      type: "renseigner_prerequis",
      criterionId: "prerequis",
      label: "Renseigner prérequis",
      description: "Les prérequis ne sont pas renseignés",
      impact: "Recommandé Qualiopi",
      priority: hasCatalogueFormation ? 11 : 8,
      ctaVariant: "outline",
      icon: "Pencil",
    });
  }

  // Convocations
  const convocations = findCriterion("convocations");
  if (convocations && (convocations.status === "non_conforme" || convocations.status === "partiel")) {
    const match = convocations.detail?.match(/(\d+)\/(\d+)/);
    const sent = match ? parseInt(match[1]) : 0;
    const total = match ? parseInt(match[2]) : inscriptionCount;
    const missing = total - sent;
    actions.push({
      type: "envoyer_convocations",
      criterionId: "convocations",
      label: `Envoyer convocations (${missing})`,
      description: `${missing} convocation(s) non envoyée(s)`,
      impact: "Document obligatoire",
      count: missing,
      priority: 3,
      ctaVariant: "primary",
      icon: "Send",
    });
  }

  // Contrats/Conventions
  const contrats = findCriterion("contrats");
  if (contrats && (contrats.status === "non_conforme" || contrats.status === "partiel")) {
    const match = contrats.detail?.match(/(\d+)\/(\d+)/);
    const signed = match ? parseInt(match[1]) : 0;
    const total = match ? parseInt(match[2]) : inscriptionCount;
    const missing = total - signed;
    actions.push({
      type: "envoyer_conventions",
      criterionId: "contrats",
      label: `Envoyer conventions (${missing})`,
      description: `${missing} contrat(s)/convention(s) non signé(s)`,
      impact: "Document contractuel obligatoire",
      count: missing,
      priority: 4,
      ctaVariant: "primary",
      icon: "FileSignature",
    });
  }

  // Émargement
  const emargement = findCriterion("emargement");
  if (emargement && emargement.status === "non_conforme") {
    actions.push({
      type: "creer_emargement",
      criterionId: "emargement",
      label: "Créer émargement",
      description: "Aucune feuille d'émargement n'a été créée",
      impact: "Preuve de présence obligatoire",
      priority: 5,
      ctaVariant: "primary",
      icon: "ClipboardList",
    });
  }

  // Attestations (only if session is terminee)
  const attestations = findCriterion("attestations");
  if (attestations && (attestations.status === "non_conforme" || attestations.status === "partiel") && ctx.isTerminee) {
    const match = attestations.detail?.match(/(\d+)\/(\d+)/);
    const emitted = match ? parseInt(match[1]) : 0;
    const total = match ? parseInt(match[2]) : inscriptionCount;
    const missing = total - emitted;
    actions.push({
      type: "emettre_attestations",
      criterionId: "attestations",
      label: `Émettre attestations (${missing})`,
      description: `${missing} attestation(s) non émise(s)`,
      impact: "Obligatoire post-formation",
      count: missing,
      priority: 6,
      ctaVariant: "primary",
      icon: "Award",
    });
  }

  // Satisfaction (only if session is terminee)
  const satisfaction = findCriterion("satisfaction");
  if (satisfaction && ctx.isTerminee) {
    if (satisfaction.status === "non_conforme") {
      actions.push({
        type: "envoyer_satisfaction",
        criterionId: "satisfaction",
        label: "Envoyer enquête satisfaction",
        description: "Aucune évaluation de satisfaction collectée",
        impact: "Critère qualité obligatoire",
        priority: 7,
        ctaVariant: "primary",
        icon: "Star",
      });
    } else if (satisfaction.status === "partiel") {
      actions.push({
        type: "relancer_satisfaction",
        criterionId: "satisfaction",
        label: "Relancer enquête satisfaction",
        description: "Toutes les évaluations n'ont pas été collectées",
        impact: "Améliorer le taux de réponse",
        priority: 9,
        ctaVariant: "secondary",
        icon: "RefreshCw",
      });
    }
  }

  // Lieu
  const lieu = findCriterion("lieu");
  if (lieu && lieu.status === "non_conforme") {
    actions.push({
      type: "renseigner_lieu",
      criterionId: "lieu",
      label: "Renseigner lieu",
      description: "Le lieu de formation n'est pas renseigné",
      impact: "Information administrative obligatoire",
      priority: 6,
      ctaVariant: "outline",
      icon: "MapPin",
    });
  }

  // Durée
  const duree = findCriterion("duree");
  if (duree && duree.status === "non_conforme") {
    actions.push({
      type: "renseigner_duree",
      criterionId: "duree",
      label: "Renseigner durée",
      description: "La durée en heures n'est pas renseignée",
      impact: "Information pédagogique obligatoire",
      priority: 6,
      ctaVariant: "outline",
      icon: "Clock",
    });
  }

  return actions.sort((a, b) => a.priority - b.priority);
}

/**
 * Get the top N priority actions.
 */
export function getTopActions(actions: QualiopiAction[], n = 3): QualiopiAction[] {
  return actions.slice(0, n);
}

/**
 * Map criterion ID to business CTA types.
 */
export function getCTAsForCriterion(
  criterionId: string,
  status: string,
  ctx: { hasCatalogueFormation: boolean; isTerminee: boolean }
): QualiopiActionType[] {
  switch (criterionId) {
    case "programme":
      if (status === "non_conforme") {
        return ctx.hasCatalogueFormation
          ? ["importer_objectifs", "renseigner_objectifs"]
          : ["renseigner_objectifs"];
      }
      return [];
    case "prerequis":
      if (status === "non_conforme") {
        return ctx.hasCatalogueFormation
          ? ["importer_prerequis", "renseigner_prerequis"]
          : ["renseigner_prerequis"];
      }
      return [];
    case "convocations":
      return status !== "conforme" && status !== "na" ? ["envoyer_convocations"] : [];
    case "contrats":
      return status !== "conforme" && status !== "na" ? ["envoyer_conventions"] : [];
    case "emargement":
      return status === "non_conforme" ? ["creer_emargement"] : [];
    case "satisfaction":
      if (!ctx.isTerminee) return [];
      if (status === "non_conforme") return ["envoyer_satisfaction"];
      if (status === "partiel") return ["relancer_satisfaction"];
      return [];
    case "attestations":
      if (!ctx.isTerminee) return [];
      return status !== "conforme" && status !== "na" ? ["emettre_attestations"] : [];
    case "formateur":
      return status === "non_conforme" ? ["assigner_formateur"] : [];
    case "lieu":
      return status === "non_conforme" ? ["renseigner_lieu"] : [];
    case "duree":
      return status === "non_conforme" ? ["renseigner_duree"] : [];
    default:
      return [];
  }
}

/** Human-readable CTA labels */
export const CTA_LABELS: Record<QualiopiActionType, string> = {
  assigner_formateur: "Assigner formateur",
  envoyer_convocations: "Envoyer convocations",
  envoyer_conventions: "Envoyer conventions",
  emettre_attestations: "Émettre attestations",
  envoyer_satisfaction: "Envoyer enquête",
  relancer_satisfaction: "Relancer enquête",
  importer_objectifs: "Importer depuis Catalogue",
  renseigner_objectifs: "Renseigner",
  importer_prerequis: "Importer depuis Catalogue",
  renseigner_prerequis: "Renseigner",
  creer_emargement: "Créer émargement",
  renseigner_lieu: "Renseigner lieu",
  renseigner_duree: "Renseigner durée",
};
