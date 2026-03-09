// ═══════════════════════════════════════════════════════════════
// IA Director — Business Rules for Anomaly Detection
// ═══════════════════════════════════════════════════════════════

import type { Anomaly, AnomalyDraft, AuditContext } from "./types";
import { computeImpact } from "./impactEngine";
import { computePriorityScore, urgenceFromSeverity } from "./priorityEngine";

const today = () => new Date().toISOString().split("T")[0];
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString().split("T")[0];

// ═══════════════ A) PROSPECTS ═══════════════

function ruleProspectSansRelance(ctx: AuditContext): AnomalyDraft | null {
  const threshold = daysAgo(5);
  const affected = ctx.prospects.filter((p) => {
    const lastHist = ctx.historique
      .filter((h) => h.contact_id === p.id)
      .sort((a: any, b: any) => b.date_echange?.localeCompare(a.date_echange))
      [0];
    return !lastHist || lastHist.date_echange < threshold;
  });
  if (affected.length === 0) return null;
  const impact = computeImpact("prospect_sans_relance", affected, ctx);
  const severity = affected.length >= 10 ? "critical" : affected.length >= 5 ? "high" : "medium";
  return {
    id: "prospect-sans-relance-5j",
    category: "prospects",
    severity,
    title: `${affected.length} prospect(s) sans relance depuis 5+ jours`,
    description: `Des prospects n'ont reçu aucune relance depuis plus de 5 jours. Risque de perte de ${impact.toLocaleString("fr-FR")}€.`,
    detection_rule: "Prospect sans interaction > 5 jours dans contact_historique",
    affected_count: affected.length,
    affected_records: affected.map((p) => p.id),
    impact_estime_euros: impact,
    urgence_score: urgenceFromSeverity(severity),
    confidence_score: 85,
    priority_score: 0,
    playbooks: [
      { label: "Ouvrir la liste filtrée", action_type: "open_filtered_view", confirmation_required: false },
      { label: "Envoyer relance email groupée", action_type: "send_email", confirmation_required: true },
    ],
  };
}

function ruleProspectChaudInactif(ctx: AuditContext): AnomalyDraft | null {
  const threshold = daysAgo(3);
  const scoringsMap = new Map(ctx.scorings.map((s: any) => [s.prospect_id, s]));
  const affected = ctx.prospects.filter((p) => {
    const scoring = scoringsMap.get(p.id);
    if (!scoring || (scoring.niveau_chaleur !== "chaud" && scoring.niveau_chaleur !== "brulant")) return false;
    const lastHist = ctx.historique
      .filter((h) => h.contact_id === p.id)
      .sort((a: any, b: any) => b.date_echange?.localeCompare(a.date_echange))
      [0];
    return !lastHist || lastHist.date_echange < threshold;
  });
  if (affected.length === 0) return null;
  const impact = computeImpact("prospect_chaud_inactif", affected, ctx);
  return {
    id: "prospect-chaud-inactif-3j",
    category: "prospects",
    severity: "critical",
    title: `${affected.length} prospect(s) chaud(s)/brûlant(s) sans action depuis 3+ jours`,
    description: `Des prospects à forte probabilité de conversion risquent de refroidir. Valeur menacée : ${impact.toLocaleString("fr-FR")}€.`,
    detection_rule: "Prospect chaud/brûlant sans interaction > 3 jours",
    affected_count: affected.length,
    affected_records: affected.map((p) => p.id),
    impact_estime_euros: impact,
    urgence_score: 100,
    confidence_score: 92,
    priority_score: 0,
    playbooks: [
      { label: "Relancer immédiatement", action_type: "send_email", confirmation_required: true },
      { label: "Créer tâche de suivi", action_type: "create_task", confirmation_required: false },
    ],
  };
}

function ruleTripleRelanceSansReponse(ctx: AuditContext): AnomalyDraft | null {
  const prospectHistMap = new Map<string, any[]>();
  ctx.historique.forEach((h) => {
    const list = prospectHistMap.get(h.contact_id) || [];
    list.push(h);
    prospectHistMap.set(h.contact_id, list);
  });
  const affected = ctx.prospects.filter((p) => {
    const hist = prospectHistMap.get(p.id) || [];
    const sorted = hist.sort((a: any, b: any) => b.date_echange?.localeCompare(a.date_echange));
    if (sorted.length < 3) return false;
    const last3 = sorted.slice(0, 3);
    return last3.every((h: any) => h.type === "appel" || h.type === "email" || h.type === "relance");
  });
  if (affected.length === 0) return null;
  const impact = computeImpact("triple_relance", affected, ctx);
  return {
    id: "prospect-triple-relance-sans-reponse",
    category: "prospects",
    severity: "high",
    title: `${affected.length} prospect(s) avec 3+ relances sans réponse`,
    description: `Ces prospects n'ont pas répondu malgré 3 tentatives. Envisager changement d'approche ou archivage.`,
    detection_rule: "3 dernières interactions sont des relances sortantes sans réponse entrante",
    affected_count: affected.length,
    affected_records: affected.map((p) => p.id),
    impact_estime_euros: impact,
    urgence_score: 50,
    confidence_score: 75,
    priority_score: 0,
    playbooks: [
      { label: "Changer d'approche (SMS)", action_type: "send_sms", confirmation_required: true },
      { label: "Archiver les prospects froids", action_type: "bulk_update", confirmation_required: true },
    ],
  };
}

function rulePipelineFaible(ctx: AuditContext): AnomalyDraft | null {
  const seuil = 5;
  const chauds = ctx.scorings.filter(
    (s: any) => s.niveau_chaleur === "chaud" || s.niveau_chaleur === "brulant"
  );
  if (chauds.length >= seuil) return null;
  const impact = computeImpact("pipeline_faible", ctx.prospects, ctx);
  return {
    id: "pipeline-actif-sous-seuil",
    category: "prospects",
    severity: chauds.length === 0 ? "critical" : "high",
    title: `Pipeline actif insuffisant : ${chauds.length}/${seuil} prospects chauds`,
    description: `Le pipeline commercial ne contient que ${chauds.length} prospects chauds. Seuil de sécurité : ${seuil}.`,
    detection_rule: `Nombre de prospects chaud+brûlant < ${seuil}`,
    affected_count: chauds.length,
    affected_records: chauds.map((s: any) => s.prospect_id),
    impact_estime_euros: impact,
    urgence_score: chauds.length === 0 ? 100 : 75,
    confidence_score: 88,
    priority_score: 0,
    playbooks: [
      { label: "Intensifier la prospection", action_type: "create_task", confirmation_required: false },
    ],
  };
}

// ═══════════════ B) SESSIONS ═══════════════

function ruleSessionSousRemplie(ctx: AuditContext): AnomalyDraft | null {
  const j10 = daysAgo(-10); // 10 days from now
  const affected = ctx.sessions.filter((s: any) => {
    if (s.archived || !s.date_debut || s.date_debut > j10) return false;
    const inscrits = ctx.inscriptions.filter((i: any) => i.session_id === s.id).length;
    const places = s.places_totales ?? 10;
    return inscrits / places < 0.5;
  });
  if (affected.length === 0) return null;
  const impact = computeImpact("session_sous_remplie", affected, ctx);
  return {
    id: "session-sous-remplie-j10",
    category: "sessions",
    severity: "high",
    title: `${affected.length} session(s) à <50% de remplissage à J-10`,
    description: `Sessions imminentes avec moins de la moitié des places occupées. Revenu potentiel manqué.`,
    detection_rule: "Session à date_debut ≤ J+10 avec taux_remplissage < 50%",
    affected_count: affected.length,
    affected_records: affected.map((s: any) => s.id),
    impact_estime_euros: impact,
    urgence_score: 75,
    confidence_score: 82,
    priority_score: 0,
    playbooks: [
      { label: "Relancer les prospects tièdes", action_type: "send_email", confirmation_required: true },
      { label: "Proposer session alternative", action_type: "schedule_session_suggestion", confirmation_required: false },
    ],
  };
}

function ruleSessionSansInscription(ctx: AuditContext): AnomalyDraft | null {
  const j7 = daysAgo(7);
  const affected = ctx.sessions.filter((s: any) => {
    if (s.archived) return false;
    if (!s.created_at || s.created_at > j7) return false;
    const inscrits = ctx.inscriptions.filter((i: any) => i.session_id === s.id).length;
    return inscrits === 0;
  });
  if (affected.length === 0) return null;
  const impact = computeImpact("session_sans_inscription", affected, ctx);
  return {
    id: "session-publiee-sans-inscription",
    category: "sessions",
    severity: "medium",
    title: `${affected.length} session(s) sans inscription depuis 7+ jours`,
    description: `Sessions créées depuis plus de 7 jours sans aucun inscrit.`,
    detection_rule: "Session créée > 7j avec 0 inscriptions",
    affected_count: affected.length,
    affected_records: affected.map((s: any) => s.id),
    impact_estime_euros: impact,
    urgence_score: 50,
    confidence_score: 78,
    priority_score: 0,
    playbooks: [
      { label: "Lancer campagne de recrutement", action_type: "send_email", confirmation_required: true },
    ],
  };
}

function ruleAucuneSessionPlanifiee(ctx: AuditContext): AnomalyDraft | null {
  const futures = ctx.sessions.filter((s: any) => !s.archived && s.date_debut && s.date_debut >= today());
  if (futures.length > 0) return null;
  return {
    id: "aucune-session-planifiee-30j",
    category: "sessions",
    severity: "critical",
    title: "Aucune session planifiée dans les 30 prochains jours",
    description: "Absence totale de sessions futures. Risque majeur sur le chiffre d'affaires.",
    detection_rule: "0 sessions non archivées avec date_debut ≥ aujourd'hui",
    affected_count: 0,
    affected_records: [],
    impact_estime_euros: ctx.centreConfig?.prix_formation_moyen ?? 1500,
    urgence_score: 100,
    confidence_score: 95,
    priority_score: 0,
    playbooks: [
      { label: "Planifier une session", action_type: "schedule_session_suggestion", confirmation_required: false },
    ],
  };
}

// ═══════════════ C) ADMINISTRATIF ═══════════════

function ruleDossierIncomplet(ctx: AuditContext): AnomalyDraft | null {
  const j5 = daysAgo(5);
  const affected = ctx.contacts.filter((c) => {
    if (c.archived || !c.created_at || c.created_at > j5) return false;
    return !c.email || !c.telephone || !c.date_naissance;
  });
  if (affected.length === 0) return null;
  return {
    id: "dossier-incomplet-5j",
    category: "administratif",
    severity: affected.length >= 10 ? "high" : "medium",
    title: `${affected.length} dossier(s) incomplet(s) depuis 5+ jours`,
    description: `Contacts avec des informations manquantes (email, téléphone ou date de naissance).`,
    detection_rule: "Contact créé > 5j sans email, téléphone ou date_naissance",
    affected_count: affected.length,
    affected_records: affected.map((c) => c.id),
    impact_estime_euros: 0,
    urgence_score: 50,
    confidence_score: 90,
    priority_score: 0,
    playbooks: [
      { label: "Ouvrir la liste filtrée", action_type: "open_filtered_view", confirmation_required: false },
    ],
  };
}

// ═══════════════ D) PAIEMENTS ═══════════════

function rulePaiementRetard(ctx: AuditContext): AnomalyDraft | null {
  const j7 = daysAgo(7);
  const affected = ctx.factures.filter(
    (f: any) => f.statut === "en_retard" && f.date_echeance && f.date_echeance < j7
  );
  if (affected.length === 0) return null;
  const montant = affected.reduce((s: number, f: any) => s + (f.montant_total || 0), 0);
  return {
    id: "paiement-retard-7j",
    category: "paiements",
    severity: montant >= 5000 ? "critical" : montant >= 1000 ? "high" : "medium",
    title: `${affected.length} facture(s) en retard de 7+ jours — ${montant.toLocaleString("fr-FR")}€`,
    description: `Montant total impayé en retard de plus de 7 jours : ${montant.toLocaleString("fr-FR")}€.`,
    detection_rule: "Facture statut=en_retard avec date_echeance < J-7",
    affected_count: affected.length,
    affected_records: affected.map((f: any) => f.id),
    impact_estime_euros: montant,
    urgence_score: 75,
    confidence_score: 95,
    priority_score: 0,
    playbooks: [
      { label: "Relancer les factures impayées", action_type: "send_email", confirmation_required: true },
      { label: "Ouvrir les factures en retard", action_type: "open_filtered_view", confirmation_required: false },
    ],
  };
}

function ruleSoldeImpayeAvantExamen(ctx: AuditContext): AnomalyDraft | null {
  const futureSessionIds = new Set(
    ctx.sessions
      .filter((s: any) => !s.archived && s.date_debut && s.date_debut >= today())
      .map((s: any) => s.id)
  );
  const contactsAvecSession = new Set(
    ctx.inscriptions
      .filter((i: any) => futureSessionIds.has(i.session_id))
      .map((i: any) => i.contact_id)
  );
  const affected = ctx.factures.filter(
    (f: any) =>
      (f.statut === "en_retard" || f.statut === "emise" || f.statut === "partiel") &&
      contactsAvecSession.has(f.contact_id)
  );
  if (affected.length === 0) return null;
  const montant = affected.reduce((s: number, f: any) => s + (f.montant_total || 0), 0);
  return {
    id: "solde-impaye-avant-examen",
    category: "paiements",
    severity: "critical",
    title: `${affected.length} stagiaire(s) avec solde impayé avant session`,
    description: `Stagiaires inscrits à une session future avec des factures non réglées (${montant.toLocaleString("fr-FR")}€).`,
    detection_rule: "Contact inscrit à session future avec facture en_retard/emise/partiel",
    affected_count: affected.length,
    affected_records: affected.map((f: any) => f.contact_id),
    impact_estime_euros: montant,
    urgence_score: 100,
    confidence_score: 90,
    priority_score: 0,
    playbooks: [
      { label: "Relancer les paiements", action_type: "send_email", confirmation_required: true },
    ],
  };
}

// ═══════════════ E) QUALITÉ DATA ═══════════════

function ruleContactSansCoordonnees(ctx: AuditContext): AnomalyDraft | null {
  const affected = ctx.contacts.filter((c) => !c.archived && !c.email && !c.telephone);
  if (affected.length === 0) return null;
  return {
    id: "contact-sans-email-ni-tel",
    category: "qualite_data",
    severity: affected.length >= 10 ? "high" : "medium",
    title: `${affected.length} contact(s) sans email NI téléphone`,
    description: `Ces contacts sont injoignables. Impossible de les relancer ou de leur envoyer des documents.`,
    detection_rule: "Contact non archivé sans email ET sans téléphone",
    affected_count: affected.length,
    affected_records: affected.map((c) => c.id),
    impact_estime_euros: 0,
    urgence_score: 50,
    confidence_score: 95,
    priority_score: 0,
    playbooks: [
      { label: "Ouvrir la liste filtrée", action_type: "open_filtered_view", confirmation_required: false },
    ],
  };
}

function ruleDoublonsPotentiels(ctx: AuditContext): AnomalyDraft | null {
  const seen = new Map<string, any[]>();
  ctx.contacts.filter((c) => !c.archived).forEach((c) => {
    const keys: string[] = [];
    if (c.email) keys.push(`email:${c.email.toLowerCase()}`);
    if (c.telephone) keys.push(`tel:${c.telephone.replace(/\s/g, "")}`);
    const nomKey = `nom:${(c.nom || "").toLowerCase()}_${(c.prenom || "").toLowerCase()}`;
    keys.push(nomKey);
    keys.forEach((k) => {
      const list = seen.get(k) || [];
      list.push(c);
      seen.set(k, list);
    });
  });
  const doublons = new Set<string>();
  seen.forEach((list) => {
    if (list.length > 1) list.forEach((c) => doublons.add(c.id));
  });
  if (doublons.size === 0) return null;
  return {
    id: "doublons-potentiels",
    category: "qualite_data",
    severity: doublons.size >= 10 ? "high" : "medium",
    title: `${doublons.size} doublon(s) potentiel(s) détecté(s)`,
    description: `Contacts partageant le même email, téléphone ou nom complet. Risque de données incohérentes.`,
    detection_rule: "Contacts non archivés avec email, téléphone ou nom+prénom identiques",
    affected_count: doublons.size,
    affected_records: Array.from(doublons),
    impact_estime_euros: 0,
    urgence_score: 25,
    confidence_score: 65,
    priority_score: 0,
    playbooks: [
      { label: "Examiner les doublons", action_type: "open_filtered_view", confirmation_required: false },
      { label: "Fusionner en masse", action_type: "bulk_update", confirmation_required: true },
    ],
  };
}

// ═══════════════ ALL RULES ═══════════════

type RuleFn = (ctx: AuditContext) => AnomalyDraft | null;

const QUICK_RULES: RuleFn[] = [
  ruleProspectChaudInactif,
  rulePipelineFaible,
  rulePaiementRetard,
  ruleSoldeImpayeAvantExamen,
  ruleAucuneSessionPlanifiee,
];

const DEEP_RULES: RuleFn[] = [
  ...QUICK_RULES,
  ruleProspectSansRelance,
  ruleTripleRelanceSansReponse,
  ruleSessionSousRemplie,
  ruleSessionSansInscription,
  ruleDossierIncomplet,
  ruleContactSansCoordonnees,
  ruleDoublonsPotentiels,
];

export function runQuickAudit(ctx: AuditContext): Anomaly[] {
  return runRules(QUICK_RULES, ctx);
}

export function runDeepAudit(ctx: AuditContext): Anomaly[] {
  return runRules(DEEP_RULES, ctx);
}

function runRules(rules: RuleFn[], ctx: AuditContext): Anomaly[] {
  const anomalies: Anomaly[] = [];
  for (const rule of rules) {
    try {
      const draft = rule(ctx);
      if (draft) {
        const anomaly: Anomaly = {
          ...draft,
          status: draft.status || "open",
          priority_score: 0,
        };
        anomaly.priority_score = computePriorityScore(anomaly);
        anomalies.push(anomaly);
      }
    } catch (e) {
      console.warn("Audit rule error:", e);
    }
  }
  return anomalies.sort((a, b) => b.priority_score - a.priority_score);
}
