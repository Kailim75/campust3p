// ═══════════════════════════════════════════════════════════════
// BlockageEngine — Anti-Blocage Intelligent
// Service central de détection, priorisation et résolution
// ═══════════════════════════════════════════════════════════════

export type BlockageSeverity = "BLOCKER" | "WARNING" | "INFO";

export interface Blockage {
  severity: BlockageSeverity;
  code: string;
  entity_type: string;
  entity_id: string;
  message: string;
  explanation: string;
  action_label: string;
  action_route: string;
  auto_fix_available: boolean;
  priority_score: number;
  category?: string;
}

// ── Rule definition ──────────────────────────────────────────
interface RuleContext {
  contacts?: any[];
  prospects?: any[];
  sessions?: any[];
  inscriptions?: any[];
  factures?: any[];
  documents?: any[];
  templates?: any[];
  satisfaction?: any[];
  certificats?: any[];
}

type BlockageRule = (ctx: RuleContext) => Blockage[];

// ── Priority calculation ─────────────────────────────────────
function computePriority(
  severity: BlockageSeverity,
  isUrgent: boolean,
  financialImpact: boolean,
  regulatoryImpact: boolean
): number {
  let base = severity === "BLOCKER" ? 80 : severity === "WARNING" ? 50 : 20;
  if (isUrgent) base += 10;
  if (financialImpact) base += 5;
  if (regulatoryImpact) base += 5;
  return Math.min(100, base);
}

// ═══════════════════════════════════════════════════════════════
// RULES LIBRARY
// ═══════════════════════════════════════════════════════════════

// 1️⃣ PROSPECT → CONVERSION
const prospectConversionRules: BlockageRule = (ctx) => {
  const results: Blockage[] = [];
  ctx.prospects?.forEach((p) => {
    if (!p.nom?.trim() || !p.prenom?.trim()) {
      results.push({
        severity: "BLOCKER",
        code: "PROSPECT_NAME_MISSING",
        entity_type: "prospect",
        entity_id: p.id,
        message: `Nom ou prénom manquant : ${p.prenom || "?"} ${p.nom || "?"}`,
        explanation: "Impossible de convertir un prospect sans nom et prénom complets.",
        action_label: "Compléter la fiche",
        action_route: `prospects`,
        auto_fix_available: false,
        priority_score: computePriority("BLOCKER", false, false, true),
      });
    }
    if (!p.email && !p.telephone) {
      results.push({
        severity: "BLOCKER",
        code: "PROSPECT_NO_CONTACT",
        entity_type: "prospect",
        entity_id: p.id,
        message: `Aucun moyen de contact : ${p.prenom} ${p.nom}`,
        explanation: "Un email ou téléphone est requis pour la conversion.",
        action_label: "Ajouter contact",
        action_route: `prospects`,
        auto_fix_available: false,
        priority_score: computePriority("BLOCKER", false, false, false),
      });
    }
    if (!p.formation) {
      results.push({
        severity: "WARNING",
        code: "PROSPECT_NO_FORMATION",
        entity_type: "prospect",
        entity_id: p.id,
        message: `Formation non sélectionnée : ${p.prenom} ${p.nom}`,
        explanation: "La formation souhaitée facilite l'affectation automatique.",
        action_label: "Sélectionner formation",
        action_route: `prospects`,
        auto_fix_available: false,
        priority_score: computePriority("WARNING", false, false, false),
      });
    }
  });
  return results;
};

// 2️⃣ APPRENANT → SESSION
const apprenantSessionRules: BlockageRule = (ctx) => {
  const results: Blockage[] = [];
  const inscribedContactIds = new Set(ctx.inscriptions?.map((i) => i.contact_id) || []);

  ctx.contacts?.forEach((c) => {
    // Any contact that is NOT "En attente de validation" is considered an apprenant
    if (c.statut === "En attente de validation" || c.statut === "Abandonné") return;
    if (!inscribedContactIds.has(c.id)) {
      results.push({
        severity: "BLOCKER",
        code: "APPRENANT_NO_SESSION",
        entity_type: "apprenant",
        entity_id: c.id,
        message: `Aucune session affectée : ${c.prenom} ${c.nom}`,
        explanation: "Un apprenant doit être inscrit à au moins une session.",
        action_label: "Affecter à une session",
        action_route: `contacts`,
        auto_fix_available: false,
        priority_score: computePriority("BLOCKER", false, true, true),
      });
    }
  });
  return results;
};

// 3️⃣ DOSSIER CMA — Documents obligatoires
const dossierCMARules: BlockageRule = (ctx) => {
  const results: Blockage[] = [];
  const requiredTypes = ["cni", "permis_b", "attestation_domicile", "photo"];

  const docsByContact = new Map<string, Set<string>>();
  ctx.documents?.forEach((d) => {
    if (!docsByContact.has(d.contact_id)) docsByContact.set(d.contact_id, new Set());
    docsByContact.get(d.contact_id)!.add(d.type_document);
  });

  ctx.contacts?.forEach((c) => {
    if (c.statut === "En attente de validation" || c.statut === "Abandonné") return;
    const docs = docsByContact.get(c.id) || new Set();
    const missing = requiredTypes.filter((t) => !docs.has(t));
    if (missing.length > 0) {
      results.push({
        severity: "BLOCKER",
        code: "DOC_MISSING_CMA",
        entity_type: "apprenant",
        entity_id: c.id,
        message: `${missing.length} document(s) manquant(s) : ${c.prenom} ${c.nom}`,
        explanation: `Documents requis CMA non fournis : ${missing.join(", ")}.`,
        action_label: "Gérer documents",
        action_route: `contacts`,
        auto_fix_available: false,
        priority_score: computePriority("BLOCKER", false, false, true),
        category: "dossier",
      });
    }
  });
  return results;
};

// 4️⃣ GÉNÉRATION DOCUMENT — Templates
const documentTemplateRules: BlockageRule = (ctx) => {
  const results: Blockage[] = [];
  // Check if critical template types exist
  const templateTypes = new Set(ctx.templates?.map((t) => t.type_document) || []);
  const criticalTypes = ["contrat", "convention", "attestation_formation", "emargement"];

  criticalTypes.forEach((type) => {
    if (!templateTypes.has(type)) {
      results.push({
        severity: "WARNING",
        code: "TEMPLATE_MISSING",
        entity_type: "template",
        entity_id: type,
        message: `Modèle "${type}" absent du Template Studio`,
        explanation: "Ce modèle est requis pour la génération automatique de documents.",
        action_label: "Créer le modèle",
        action_route: `template-studio`,
        auto_fix_available: false,
        priority_score: computePriority("WARNING", false, false, true),
      });
    }
  });
  return results;
};

// 5️⃣ FACTURATION
const facturationRules: BlockageRule = (ctx) => {
  const results: Blockage[] = [];
  const now = new Date();

  // Sessions terminées sans facture
  const facturedContacts = new Set(ctx.factures?.map((f) => f.contact_id) || []);

  ctx.sessions?.forEach((s) => {
    if (s.statut !== "terminee" && s.statut !== "archivee") return;
    const sessionInscriptions = ctx.inscriptions?.filter((i) => i.session_id === s.id) || [];
    sessionInscriptions.forEach((insc) => {
      if (!facturedContacts.has(insc.contact_id)) {
        const contact = ctx.contacts?.find((c) => c.id === insc.contact_id);
        results.push({
          severity: "BLOCKER",
          code: "SESSION_NO_INVOICE",
          entity_type: "session",
          entity_id: s.id,
          message: `Session terminée sans facture : ${contact?.prenom || ""} ${contact?.nom || ""} — ${s.nom}`,
          explanation: "Une facture doit être émise pour chaque apprenant ayant suivi une session.",
          action_label: "Créer facture",
          action_route: `facturation`,
          auto_fix_available: false,
          priority_score: computePriority("BLOCKER", true, true, false),
        });
      }
    });
  });

  // Factures impayées depuis longtemps
  ctx.factures?.forEach((f) => {
    if (f.statut === "emise" && f.date_emission) {
      const age = Math.floor((now.getTime() - new Date(f.date_emission).getTime()) / (1000 * 60 * 60 * 24));
      if (age > 30) {
        results.push({
          severity: "WARNING",
          code: "INVOICE_OVERDUE",
          entity_type: "facture",
          entity_id: f.id,
          message: `Facture ${f.numero_facture} impayée depuis ${age} jours`,
          explanation: "Cette facture devrait faire l'objet d'une relance.",
          action_label: "Voir facture",
          action_route: `facturation`,
          auto_fix_available: false,
          priority_score: computePriority("WARNING", age > 60, true, false),
        });
      }
    }
  });

  return results;
};

// 6️⃣ SESSION — conformité
const sessionConformiteRules: BlockageRule = (ctx) => {
  const results: Blockage[] = [];
  const now = new Date();

  ctx.sessions?.forEach((s) => {
    if (s.archived || s.statut === "annulee") return;

    // Session imminente (dans 7 jours) avec peu d'inscrits
    const debut = new Date(s.date_debut);
    const daysUntil = Math.floor((debut.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const nbInscrits = ctx.inscriptions?.filter((i) => i.session_id === s.id).length || 0;

    if (daysUntil <= 7 && daysUntil >= 0 && nbInscrits === 0) {
      results.push({
        severity: "BLOCKER",
        code: "SESSION_IMMINENT_EMPTY",
        entity_type: "session",
        entity_id: s.id,
        message: `Session "${s.nom}" dans ${daysUntil}j sans inscrit`,
        explanation: "Session imminente sans aucun participant. Risque d'annulation.",
        action_label: "Gérer session",
        action_route: `sessions`,
        auto_fix_available: false,
        priority_score: computePriority("BLOCKER", true, true, false),
      });
    }

    // Session sans satisfaction après fin
    if (s.statut === "terminee") {
      const hasSatisfaction = ctx.satisfaction?.some((sat) => sat.session_id === s.id);
      if (!hasSatisfaction) {
        results.push({
          severity: "WARNING",
          code: "SESSION_NO_SATISFACTION",
          entity_type: "session",
          entity_id: s.id,
          message: `Session "${s.nom}" terminée sans enquête satisfaction`,
          explanation: "Critère Qualiopi : la satisfaction doit être collectée pour chaque session.",
          action_label: "Envoyer enquête",
          action_route: `sessions`,
          auto_fix_available: false,
          priority_score: computePriority("WARNING", false, false, true),
          category: "qualiopi",
        });
      }
    }
  });
  return results;
};

// ═══════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════

const ALL_RULES: BlockageRule[] = [
  prospectConversionRules,
  apprenantSessionRules,
  dossierCMARules,
  documentTemplateRules,
  facturationRules,
  sessionConformiteRules,
];

export function runBlockageEngine(ctx: RuleContext): Blockage[] {
  const all: Blockage[] = [];
  for (const rule of ALL_RULES) {
    try {
      all.push(...rule(ctx));
    } catch {
      // silently skip broken rule
    }
  }
  // Sort by priority descending
  all.sort((a, b) => b.priority_score - a.priority_score);
  return all;
}

export function countBySeverity(blockages: Blockage[]) {
  return {
    blockers: blockages.filter((b) => b.severity === "BLOCKER").length,
    warnings: blockages.filter((b) => b.severity === "WARNING").length,
    infos: blockages.filter((b) => b.severity === "INFO").length,
    total: blockages.length,
  };
}
