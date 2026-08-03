import { differenceInCalendarDays, parseISO } from "date-fns";

/**
 * Rappels — « qui je relance, et quand » (chantier du 03/08/2026).
 *
 * La page « Aujourd'hui » liste ce qui bouge, bloc métier par bloc métier.
 * Elle ne sait pas répondre à « rappelle-moi de relancer X le 12 » : rien
 * n'y porte d'échéance propre, donc rien ne peut être reporté puis revenir.
 * Ce module construit une liste unique et datée, alimentée par cinq
 * sources, où chaque ligne est une action que le directeur pose lui-même
 * (aucun envoi automatique — décision du 23/07/2026).
 *
 * Tout est pur ici : les requêtes vivent dans `useRappels`, les règles
 * restent testables sans base ni composant.
 */

export type RappelSource = "paiement" | "libre" | "dossier" | "session" | "signature";

/** Fenêtre d'échéance, dans l'ordre où le directeur veut les traiter. */
export type RappelUrgence = "retard" | "aujourdhui" | "semaine" | "plus_tard";

export interface Rappel {
  /** Identifiant stable — sert de clé de report/rejet dans `dismissed_alerts`. */
  id: string;
  source: RappelSource;
  /** Jour où l'action est attendue (YYYY-MM-DD). */
  dateEcheance: string;
  titre: string;
  detail: string;
  /** Positif = en retard de N jours ; négatif = échéance à venir. */
  joursDeRetard: number;
  montant?: number;
  contactId?: string;
  contactNom?: string;
  contactEmail?: string | null;
  contactTelephone?: string | null;
  factureId?: string;
  numeroFacture?: string | null;
  sessionId?: string;
  sessionNom?: string;
  /** Ligne de `contact_historique` à clôturer quand le rappel est fait. */
  historiqueId?: string;
}

/** Préfixe de namespace : `dismissed_alerts` est partagé avec `useAlerts`. */
const PREFIXE = "rp";

export function construireId(source: RappelSource, ...parties: string[]): string {
  return [PREFIXE, source, ...parties].join(":");
}

/** Un rappel n'est visible que s'il est dû — inutile d'annoncer J+30. */
export const HORIZON_JOURS = 14;

export function classerUrgence(joursDeRetard: number): RappelUrgence {
  if (joursDeRetard > 0) return "retard";
  if (joursDeRetard === 0) return "aujourdhui";
  if (joursDeRetard >= -7) return "semaine";
  return "plus_tard";
}

const ORDRE_URGENCE: Record<RappelUrgence, number> = {
  retard: 0,
  aujourdhui: 1,
  semaine: 2,
  plus_tard: 3,
};

/**
 * Le plus en retard d'abord ; à retard égal, le montant le plus lourd —
 * c'est l'ordre dans lequel on décroche son téléphone.
 */
export function trierRappels(rappels: Rappel[]): Rappel[] {
  return [...rappels].sort((a, b) => {
    const ua = ORDRE_URGENCE[classerUrgence(a.joursDeRetard)];
    const ub = ORDRE_URGENCE[classerUrgence(b.joursDeRetard)];
    if (ua !== ub) return ua - ub;
    if (a.joursDeRetard !== b.joursDeRetard) return b.joursDeRetard - a.joursDeRetard;
    return (b.montant ?? 0) - (a.montant ?? 0);
  });
}

export function compterParUrgence(rappels: Rappel[]): Record<RappelUrgence | "tous", number> {
  const counts = { tous: rappels.length, retard: 0, aujourdhui: 0, semaine: 0, plus_tard: 0 };
  for (const r of rappels) counts[classerUrgence(r.joursDeRetard)] += 1;
  return counts;
}

/* ────────────────────────── Reports ────────────────────────── */

/**
 * Un report est un rejet *daté* : on réutilise `dismissed_alerts.reason`
 * plutôt que d'ajouter une table, faute de pouvoir appliquer une migration
 * (crédits Lovable épuisés depuis le 03/08/2026). Format : `report:AAAA-MM-JJ`.
 */
const PREFIXE_REPORT = "report:";

export function encoderReport(dateISO: string): string {
  return `${PREFIXE_REPORT}${dateISO}`;
}

/** Retourne la date de fin de report, ou null si le rejet est définitif. */
export function decoderReport(reason: string | null | undefined): string | null {
  if (!reason || !reason.startsWith(PREFIXE_REPORT)) return null;
  const date = reason.slice(PREFIXE_REPORT.length).trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

/**
 * Un rejet masque-t-il encore aujourd'hui ? Un rejet sans date masque pour
 * toujours (« ignorer ») ; un report ne masque que jusqu'à son terme, sinon
 * une facture impayée disparaîtrait définitivement du radar.
 */
export function rejetActif(reason: string | null | undefined, aujourdhui: string): boolean {
  const jusquA = decoderReport(reason);
  if (!jusquA) return true;
  return jusquA > aujourdhui;
}

/* ────────────────────── Construction des sources ────────────────────── */

export interface FactureBrute {
  id: string;
  contact_id: string | null;
  numero_facture: string | null;
  montant_total: number | null;
  date_echeance: string | null;
  statut: string | null;
}

export interface ContactBrut {
  id: string;
  nom: string | null;
  prenom: string | null;
  email?: string | null;
  telephone?: string | null;
}

/** Statuts d'une facture encore due (définition partagée avec Finances). */
export const STATUTS_FACTURE_DUE = ["emise", "partiel", "impayee"] as const;

export function estFactureDue(statut: string | null | undefined): boolean {
  return (STATUTS_FACTURE_DUE as readonly string[]).includes(statut ?? "");
}

/**
 * Paiements en retard. Le directeur encaisse aussi en direct (espèces,
 * virement) hors Alma : le reste dû se calcule donc facture par facture,
 * paiements supprimés exclus en amont.
 */
export function construireRappelsPaiement(
  factures: FactureBrute[],
  payeParFacture: Map<string, number>,
  contactsParId: Map<string, ContactBrut>,
  aujourdhui: string
): Rappel[] {
  const rappels: Rappel[] = [];

  for (const facture of factures) {
    if (!facture.date_echeance) continue;
    if (!estFactureDue(facture.statut)) continue;

    const restant = Math.max(0, Number(facture.montant_total ?? 0) - (payeParFacture.get(facture.id) ?? 0));
    if (restant <= 0) continue;

    const joursDeRetard = differenceInCalendarDays(parseISO(aujourdhui), parseISO(facture.date_echeance));
    if (joursDeRetard < -HORIZON_JOURS) continue;

    const contact = facture.contact_id ? contactsParId.get(facture.contact_id) : undefined;
    const nom = contact ? `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() : "Contact inconnu";

    rappels.push({
      id: construireId("paiement", facture.id),
      source: "paiement",
      dateEcheance: facture.date_echeance,
      titre: nom || "Contact inconnu",
      detail:
        joursDeRetard > 0
          ? `${restant.toLocaleString("fr-FR")} € en retard depuis ${joursDeRetard} j`
          : `${restant.toLocaleString("fr-FR")} € à encaisser`,
      joursDeRetard,
      montant: restant,
      contactId: contact?.id,
      contactNom: nom,
      contactEmail: contact?.email ?? null,
      contactTelephone: contact?.telephone ?? null,
      factureId: facture.id,
      numeroFacture: facture.numero_facture,
    });
  }

  return rappels;
}

export interface HistoriqueBrut {
  id: string;
  contact_id: string | null;
  titre: string | null;
  rappel_description: string | null;
  date_rappel: string | null;
  alerte_active: boolean | null;
  contacts?: { id: string; nom: string | null; prenom: string | null; email?: string | null; telephone?: string | null } | null;
}

/**
 * Rappels posés à la main (« rappeler lundi »). Ceux-là seuls se cochent
 * « fait » : ils n'ont pas de condition en base qui les ferait disparaître
 * d'eux-mêmes.
 */
export function construireRappelsLibres(notes: HistoriqueBrut[], aujourdhui: string): Rappel[] {
  const rappels: Rappel[] = [];

  for (const note of notes) {
    if (!note.date_rappel || !note.alerte_active) continue;

    const joursDeRetard = differenceInCalendarDays(parseISO(aujourdhui), parseISO(note.date_rappel));
    if (joursDeRetard < -HORIZON_JOURS) continue;

    const contact = note.contacts;
    const nom = contact ? `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() : "Rappel";

    rappels.push({
      id: construireId("libre", note.id),
      source: "libre",
      dateEcheance: note.date_rappel,
      titre: nom || "Rappel",
      detail: note.rappel_description || note.titre || "Rappel personnel",
      joursDeRetard,
      contactId: contact?.id ?? note.contact_id ?? undefined,
      contactNom: nom,
      contactEmail: contact?.email ?? null,
      contactTelephone: contact?.telephone ?? null,
      historiqueId: note.id,
    });
  }

  return rappels;
}

export interface SessionBrute {
  id: string;
  nom: string;
  date_debut: string;
  formateur_id: string | null;
  formateur: string | null;
  lieu: string | null;
  adresse_ville: string | null;
  statut: string | null;
}

/**
 * Sessions qui démarrent sans formateur ou sans lieu. L'échéance n'est pas
 * le jour J mais une semaine avant : au-delà, il est trop tard pour
 * convoquer qui que ce soit.
 */
export const MARGE_PREPARATION_JOURS = 7;

export function construireRappelsSession(sessions: SessionBrute[], aujourdhui: string): Rappel[] {
  const rappels: Rappel[] = [];

  for (const session of sessions) {
    if (session.statut === "annulee" || session.statut === "terminee") continue;

    const manques: string[] = [];
    if (!session.formateur_id && !session.formateur?.trim()) manques.push("formateur");
    if (!session.lieu?.trim() && !session.adresse_ville?.trim()) manques.push("lieu");
    if (manques.length === 0) continue;

    const debut = parseISO(session.date_debut);
    const joursAvantDebut = differenceInCalendarDays(debut, parseISO(aujourdhui));
    if (joursAvantDebut < 0) continue;

    const joursDeRetard = MARGE_PREPARATION_JOURS - joursAvantDebut;
    if (joursDeRetard < -HORIZON_JOURS) continue;

    rappels.push({
      id: construireId("session", session.id),
      source: "session",
      dateEcheance: session.date_debut,
      titre: session.nom,
      detail: `Sans ${manques.join(" ni ")} — démarre dans ${joursAvantDebut} j`,
      joursDeRetard,
      sessionId: session.id,
      sessionNom: session.nom,
    });
  }

  return rappels;
}

export interface SignatureBrute {
  id: string;
  contact_id: string | null;
  titre: string | null;
  type_document: string | null;
  statut: string | null;
  /** Date d'envoi réelle ; `created_at` sert de repli sur les demandes anciennes. */
  date_envoi: string | null;
  created_at: string;
  contacts?: { id: string; nom: string | null; prenom: string | null; email?: string | null } | null;
}

/** Au-delà de ce délai, une demande de signature en attente mérite un coup de fil. */
export const DELAI_SIGNATURE_JOURS = 5;

export function construireRappelsSignature(demandes: SignatureBrute[], aujourdhui: string): Rappel[] {
  const rappels: Rappel[] = [];

  for (const demande of demandes) {
    if (demande.statut !== "en_attente") continue;

    const envoyee = demande.date_envoi || demande.created_at;
    const envoyeeDepuis = differenceInCalendarDays(parseISO(aujourdhui), parseISO(envoyee));
    const joursDeRetard = envoyeeDepuis - DELAI_SIGNATURE_JOURS;
    if (joursDeRetard < 0) continue;

    const contact = demande.contacts;
    const nom = contact ? `${contact.prenom ?? ""} ${contact.nom ?? ""}`.trim() : "Contact inconnu";
    const document = demande.titre || demande.type_document || "Document";

    rappels.push({
      id: construireId("signature", demande.id),
      source: "signature",
      dateEcheance: aujourdhui,
      titre: nom || "Contact inconnu",
      detail: `${document} non signé depuis ${envoyeeDepuis} j`,
      joursDeRetard,
      contactId: contact?.id ?? demande.contact_id ?? undefined,
      contactNom: nom,
      contactEmail: contact?.email ?? null,
    });
  }

  return rappels;
}

export interface DossierBrut {
  contactId: string;
  contactNom: string;
  contactEmail?: string | null;
  contactTelephone?: string | null;
  sessionId: string;
  sessionNom: string;
  dateDebut: string;
  piecesManquantes: string[];
}

/**
 * Dossiers incomplets. Un dossier incomplet dans l'absolu n'est pas un
 * rappel — il y en a 186 en base. Il le devient quand une session approche :
 * c'est la date de session qui donne l'échéance.
 */
export const MARGE_DOSSIER_JOURS = 10;

export function construireRappelsDossier(dossiers: DossierBrut[], aujourdhui: string): Rappel[] {
  const rappels: Rappel[] = [];

  for (const dossier of dossiers) {
    if (dossier.piecesManquantes.length === 0) continue;

    const joursAvantDebut = differenceInCalendarDays(parseISO(dossier.dateDebut), parseISO(aujourdhui));
    if (joursAvantDebut < 0) continue;

    const joursDeRetard = MARGE_DOSSIER_JOURS - joursAvantDebut;
    if (joursDeRetard < -HORIZON_JOURS) continue;

    const pieces = dossier.piecesManquantes;
    const resume = pieces.length <= 2 ? pieces.join(", ") : `${pieces.slice(0, 2).join(", ")} +${pieces.length - 2}`;

    rappels.push({
      id: construireId("dossier", dossier.contactId, dossier.sessionId),
      source: "dossier",
      dateEcheance: dossier.dateDebut,
      titre: dossier.contactNom,
      detail: `Manque : ${resume} — session dans ${joursAvantDebut} j`,
      joursDeRetard,
      contactId: dossier.contactId,
      contactNom: dossier.contactNom,
      contactEmail: dossier.contactEmail ?? null,
      contactTelephone: dossier.contactTelephone ?? null,
      sessionId: dossier.sessionId,
      sessionNom: dossier.sessionNom,
    });
  }

  return rappels;
}
