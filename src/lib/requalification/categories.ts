/**
 * Catégories de requalification des contacts.
 * Aucune ne déclenche d'action automatique : elles servent uniquement
 * à classer manuellement les contacts pour préserver l'historique SmartOF
 * sans fausser les KPI courants.
 */
export type RequalificationCategory =
  | "apprenant_historique_smartof"
  | "apprenant_actif_reel"
  | "ancien_apprenant_a_archiver"
  | "ancien_apprenant_diplome"
  | "fiche_incomplete"
  | "anomalie_a_verifier"
  | "accompagnement_pratique_en_cours"
  | "non_classe";

export const REQUALIFICATION_CATEGORIES: RequalificationCategory[] = [
  "apprenant_historique_smartof",
  "apprenant_actif_reel",
  "ancien_apprenant_a_archiver",
  "ancien_apprenant_diplome",
  "fiche_incomplete",
  "anomalie_a_verifier",
  "accompagnement_pratique_en_cours",
  "non_classe",
];

export const CATEGORY_LABELS: Record<RequalificationCategory, string> = {
  apprenant_historique_smartof: "Historique SmartOF",
  apprenant_actif_reel: "Apprenant actif réel",
  ancien_apprenant_a_archiver: "Ancien — à archiver",
  ancien_apprenant_diplome: "Ancien — diplômé",
  fiche_incomplete: "Fiche incomplète",
  anomalie_a_verifier: "Anomalie à vérifier",
  accompagnement_pratique_en_cours: "Accompagnement pratique",
  non_classe: "Non classé",
};

export const CATEGORY_BADGE_TONE: Record<RequalificationCategory, string> = {
  apprenant_historique_smartof: "bg-slate-100 text-slate-700 border-slate-300",
  apprenant_actif_reel: "bg-emerald-50 text-emerald-700 border-emerald-300",
  ancien_apprenant_a_archiver: "bg-amber-50 text-amber-700 border-amber-300",
  ancien_apprenant_diplome: "bg-blue-50 text-blue-700 border-blue-300",
  fiche_incomplete: "bg-orange-50 text-orange-700 border-orange-300",
  anomalie_a_verifier: "bg-red-50 text-red-700 border-red-300",
  accompagnement_pratique_en_cours: "bg-indigo-50 text-indigo-700 border-indigo-300",
  non_classe: "bg-muted text-muted-foreground border-border",
};

export type RequalificationActionType =
  | "mark_smartof"
  | "exclude_kpi"
  | "archive"
  | "mark_diplome"
  | "attach_session"
  | "create_inscription"
  | "add_note"
  | "create_task"
  | "reset_category";

export const ACTION_LABELS: Record<RequalificationActionType, string> = {
  mark_smartof: "Marquer historique SmartOF",
  exclude_kpi: "Sortir des KPI actifs",
  archive: "Archiver ancien apprenant",
  mark_diplome: "Marquer diplômé (avec preuve)",
  attach_session: "Rattacher à une session historique",
  create_inscription: "Créer nouvelle inscription",
  add_note: "Ajouter note administrative",
  create_task: "Créer tâche de vérification",
  reset_category: "Réinitialiser le classement",
};
