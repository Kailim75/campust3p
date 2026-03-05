/**
 * Automation Rules Engine v1
 * Pure functions that compute next actions, today items, and lock status
 * based on: DB statuses + exam results + [AUTO] notes.
 */

import type { ActionCategory } from "./aujourdhui-actions";

// ─── Types ───

export interface ExamState {
  theorie: "admis" | "ajourne" | null;
  pratique: "admis" | "ajourne" | null;
}

export interface ContactContext {
  contactId: string;
  contactName: string;
  email?: string | null;
  telephone?: string | null;
  formation?: string | null;
  statut_apprenant?: string | null;
  statut_cma?: string | null;
  examState?: ExamState;
  /** [AUTO] note categories already done today for this contact */
  todayNoteCategories: string[];
  /** Has any [AUTO] note with "Carte Pro" */
  hasCarteProNote: boolean;
  /** Has note for reprogrammation (theorie or pratique) */
  hasReprogrammationNote: boolean;
}

export interface NextAction {
  id: string;
  label: string;
  description: string;
  icon: "mail" | "phone" | "whatsapp" | "calendar" | "check" | "card" | "refresh";
  variant: "primary" | "secondary" | "warning" | "destructive" | "ghost";
  /** The action category for [AUTO] note */
  noteCategory?: ActionCategory;
  /** Whether this action is locked (already done today) */
  locked: boolean;
  lockReason?: string;
  /** Action type for handler routing */
  actionType:
    | "feliciter_theorie"
    | "feliciter_pratique"
    | "encourager_theorie"
    | "encourager_pratique"
    | "programmer_pratique"
    | "reprogrammer_theorie"
    | "reprogrammer_pratique"
    | "demarches_carte_pro"
    | "marquer_carte_pro"
    | "relance_cma_rejete"
    | "relance_cma_docs";
}

export interface TodayItem {
  id: string;
  contactId: string;
  contactName: string;
  email?: string | null;
  formation?: string | null;
  type: "reprogrammer_theorie" | "reprogrammer_pratique" | "carte_pro" | "cma_rejete";
  label: string;
  urgency: "elevee" | "moyenne" | "faible";
  actionType: NextAction["actionType"];
  locked: boolean;
}

// ─── Helpers ───

function hasTodayNote(ctx: ContactContext, keywords: string[]): boolean {
  return ctx.todayNoteCategories.some((cat) =>
    keywords.some((kw) => cat.toLowerCase().includes(kw.toLowerCase()))
  );
}

// ─── Main: compute next actions for a student after exam result ───

export function computeExamActions(ctx: ContactContext): NextAction[] {
  const actions: NextAction[] = [];
  const exam = ctx.examState;
  if (!exam) return actions;

  // ─── Théorie réussie ───
  if (exam.theorie === "admis") {
    const feliciteLocked = hasTodayNote(ctx, ["théorie réussie", "examen_theorie_reussi"]);
    actions.push({
      id: `feliciter-theorie-${ctx.contactId}`,
      label: "Féliciter",
      description: "Envoyer un email de félicitations pour la théorie",
      icon: "mail",
      variant: "primary",
      noteCategory: "examen_theorie_reussi",
      locked: feliciteLocked,
      lockReason: feliciteLocked ? "Déjà fait aujourd'hui" : undefined,
      actionType: "feliciter_theorie",
    });

    if (exam.pratique === null) {
      actions.push({
        id: `programmer-pratique-${ctx.contactId}`,
        label: "Programmer pratique",
        description: "Inscrire à une session pratique à venir",
        icon: "calendar",
        variant: "secondary",
        locked: false,
        actionType: "programmer_pratique",
      });
    }
  }

  // ─── Théorie échouée ───
  if (exam.theorie === "ajourne") {
    const encourageLocked = hasTodayNote(ctx, ["théorie échouée", "examen_theorie_echoue"]);
    actions.push({
      id: `encourager-theorie-${ctx.contactId}`,
      label: "Encourager",
      description: "Email bienveillant avec plan d'action",
      icon: "mail",
      variant: "warning",
      noteCategory: "examen_theorie_echoue",
      locked: encourageLocked,
      lockReason: encourageLocked ? "Déjà fait aujourd'hui" : undefined,
      actionType: "encourager_theorie",
    });
    actions.push({
      id: `reprogrammer-theorie-${ctx.contactId}`,
      label: "Reprogrammer",
      description: "Inscrire à une prochaine session théorique",
      icon: "refresh",
      variant: "secondary",
      locked: false,
      actionType: "reprogrammer_theorie",
    });
  }

  // ─── Pratique réussie ───
  if (exam.pratique === "admis") {
    const feliciteLocked = hasTodayNote(ctx, ["pratique réussie", "examen_pratique_reussi"]);
    actions.push({
      id: `feliciter-pratique-${ctx.contactId}`,
      label: "Féliciter",
      description: "Envoyer un email de félicitations pour la pratique",
      icon: "mail",
      variant: "primary",
      noteCategory: "examen_pratique_reussi",
      locked: feliciteLocked,
      lockReason: feliciteLocked ? "Déjà fait aujourd'hui" : undefined,
      actionType: "feliciter_pratique",
    });

    const carteProLocked = hasTodayNote(ctx, ["Carte Pro", "carte_pro"]);
    actions.push({
      id: `demarches-carte-pro-${ctx.contactId}`,
      label: "Démarches Carte Pro",
      description: "Envoyer les démarches carte professionnelle",
      icon: "card",
      variant: "warning",
      noteCategory: "carte_pro_envoyee",
      locked: carteProLocked,
      lockReason: carteProLocked ? "Déjà fait aujourd'hui" : undefined,
      actionType: "demarches_carte_pro",
    });

    if (!ctx.hasCarteProNote) {
      actions.push({
        id: `marquer-carte-pro-${ctx.contactId}`,
        label: "Marquer envoyé",
        description: "Marquer les démarches Carte Pro comme envoyées",
        icon: "check",
        variant: "ghost",
        noteCategory: "carte_pro_envoyee",
        locked: carteProLocked,
        lockReason: carteProLocked ? "Déjà fait aujourd'hui" : undefined,
        actionType: "marquer_carte_pro",
      });
    }
  }

  // ─── Pratique échouée ───
  if (exam.pratique === "ajourne") {
    const encourageLocked = hasTodayNote(ctx, ["pratique échouée", "examen_pratique_echoue"]);
    actions.push({
      id: `encourager-pratique-${ctx.contactId}`,
      label: "Encourager",
      description: "Email bienveillant avec check-list erreurs",
      icon: "mail",
      variant: "warning",
      noteCategory: "examen_pratique_echoue",
      locked: encourageLocked,
      lockReason: encourageLocked ? "Déjà fait aujourd'hui" : undefined,
      actionType: "encourager_pratique",
    });
    actions.push({
      id: `reprogrammer-pratique-${ctx.contactId}`,
      label: "Reprogrammer",
      description: "Inscrire à une prochaine session pratique",
      icon: "refresh",
      variant: "secondary",
      locked: false,
      actionType: "reprogrammer_pratique",
    });
  }

  return actions;
}

// ─── Compute Today items from exam data ───

export function computeExamTodayItems(
  contacts: Array<{
    id: string;
    nom: string;
    prenom: string;
    email?: string | null;
    formation?: string | null;
    statut_apprenant?: string | null;
  }>,
  examResults: Record<string, ExamState>,
  autoNotes: Array<{ contact_id: string; titre: string }>,
  carteProSentIds: Set<string>
): TodayItem[] {
  const items: TodayItem[] = [];
  const terminatedStatuses = ["diplome", "abandon", "archive"];

  for (const c of contacts) {
    if (terminatedStatuses.includes(c.statut_apprenant || "")) continue;
    const exam = examResults[c.id];
    if (!exam) continue;
    const contactName = `${c.prenom} ${c.nom}`;

    // Théorie échouée + pas reprogrammé
    if (exam.theorie === "ajourne") {
      const hasReprog = autoNotes.some(
        (n) => n.contact_id === c.id && (n.titre.includes("Reprogramm") || n.titre.includes("reprogramm"))
      );
      if (!hasReprog) {
        items.push({
          id: `reprog-theorie-${c.id}`,
          contactId: c.id,
          contactName,
          email: c.email,
          formation: c.formation,
          type: "reprogrammer_theorie",
          label: "À reprogrammer (Théorie)",
          urgency: "moyenne",
          actionType: "reprogrammer_theorie",
          locked: false,
        });
      }
    }

    // Pratique échouée + pas reprogrammé
    if (exam.theorie === "admis" && exam.pratique === "ajourne") {
      const hasReprog = autoNotes.some(
        (n) => n.contact_id === c.id && (n.titre.includes("Reprogramm") || n.titre.includes("reprogramm"))
      );
      if (!hasReprog) {
        items.push({
          id: `reprog-pratique-${c.id}`,
          contactId: c.id,
          contactName,
          email: c.email,
          formation: c.formation,
          type: "reprogrammer_pratique",
          label: "À reprogrammer (Pratique)",
          urgency: "elevee",
          actionType: "reprogrammer_pratique",
          locked: false,
        });
      }
    }

    // Pratique réussie + carte pro pas envoyée
    if (exam.pratique === "admis" && !carteProSentIds.has(c.id)) {
      items.push({
        id: `carte-pro-${c.id}`,
        contactId: c.id,
        contactName,
        email: c.email,
        formation: c.formation,
        type: "carte_pro",
        label: "Carte Pro à envoyer",
        urgency: "moyenne",
        actionType: "demarches_carte_pro",
        locked: false,
      });
    }
  }

  return items;
}

// ─── Auto-reactivation check ───

export function shouldReactivate(statut_apprenant?: string | null): boolean {
  return statut_apprenant === "diplome" || statut_apprenant === "abandon" || statut_apprenant === "archive";
}
