/**
 * Factures émises : ce que l'interface a encore le droit d'écrire.
 *
 * Décisions du directeur (11/09/2026, chantier des avoirs) :
 *  D1  aucune facture émise ne se supprime ;
 *  D2  une facture émise est immuable dès l'émission (montants, lignes, client,
 *      dates, numéro, coordonnées figées de l'acheteur) ;
 *  D6  l'annulation manuelle reste permise, et tracée en base, jusqu'à la
 *      livraison des avoirs.
 *
 * La garde en base (déclencheur `trg_garde_facture_emise`, migration à venir)
 * refuse le reste. Ce module fait en sorte que l'interface n'envoie jamais une
 * écriture que la garde refuserait — et, tant que la garde n'est pas appliquée,
 * qu'elle ne produise pas elle-même une facture émise incohérente.
 *
 * Pannes prouvées sur le banc de la garde, empêchées ici :
 *  1. FactureFormDialog (édition) mettait à jour la facture, statut compris,
 *     PUIS supprimait et réinsérait les lignes : un brouillon passé à « Émise »
 *     devenait émis avec ses anciennes lignes et un montant HT figé faux
 *     (le déclencheur d'émission calcule montant_ht depuis les lignes EN BASE).
 *  2. EditFactureLibreDialog : même inversion (facture, puis première ligne).
 *  3. Les deux dialogues renvoyaient toutes les colonnes : sur une facture émise
 *     dont `commentaires` vaut '' en base, la normalisation vers NULL faisait
 *     refuser l'annulation.
 */

export type StatutFacture = "brouillon" | "emise" | "payee" | "partiel" | "impayee" | "annulee";

export const STATUT_BROUILLON = "brouillon" as const;

/**
 * SEULE liste des champs qu'un dialogue d'édition peut encore envoyer pour une
 * facture qui n'est plus un brouillon. Tout le reste est figé (D2).
 */
export const CHAMPS_FACTURE_MODIFIABLES_APRES_EMISSION = ["statut"] as const;

export type ChampFactureModifiableApresEmission =
  (typeof CHAMPS_FACTURE_MODIFIABLES_APRES_EMISSION)[number];

export const LIBELLES_STATUT_FACTURE: Record<StatutFacture, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  payee: "Payée",
  partiel: "Partiel",
  impayee: "Impayée",
  annulee: "Annulée",
};

/** Statuts qu'une facture émise peut prendre : jamais « brouillon » (D4). */
export const STATUTS_FACTURE_APRES_EMISSION: readonly StatutFacture[] = [
  "emise",
  "partiel",
  "payee",
  "impayee",
  "annulee",
];

/**
 * Statuts qu'un workflow automatique peut poser sur une facture : ni
 * « brouillon » (une facture émise ne redevient jamais brouillon), ni
 * « annulee » (annulation réservée à une personne connectée, qui confirme).
 */
export const STATUTS_FACTURE_POUR_WORKFLOW: readonly StatutFacture[] = [
  "emise",
  "partiel",
  "payee",
  "impayee",
];

export function statutWorkflowFactureAutorise(statut: unknown): boolean {
  return typeof statut === "string" && (STATUTS_FACTURE_POUR_WORKFLOW as readonly string[]).includes(statut);
}

type ActionWorkflow = { type: string; config: Record<string, unknown> };

/** Action « changer le statut » d'une facture dont le statut n'est pas autorisé. */
export function actionWorkflowFactureInvalide(action: ActionWorkflow): boolean {
  return (
    action.type === "update_status" &&
    action.config?.table === "factures" &&
    !statutWorkflowFactureAutorise(action.config?.new_status)
  );
}

/**
 * Vide le statut de facture non autorisé d'une suggestion (IA ou workflow
 * existant) : l'utilisateur doit en choisir un parmi STATUTS_FACTURE_POUR_WORKFLOW.
 */
export function nettoyerActionsWorkflow<T extends ActionWorkflow>(actions: T[]): T[] {
  return actions.map((action) =>
    actionWorkflowFactureInvalide(action) ? { ...action, config: { ...action.config, new_status: "" } } : action,
  );
}

/** Vrai dès que la facture n'est plus un brouillon (statut inconnu inclus). */
export function estFactureEmise(statut: string | null | undefined): boolean {
  return statut !== STATUT_BROUILLON;
}

/** Ne garde que les champs modifiables après émission. */
export function restreindreAuxChampsModifiables(
  valeurs: Record<string, unknown>,
): Partial<Record<ChampFactureModifiableApresEmission, unknown>> {
  const resultat: Partial<Record<ChampFactureModifiableApresEmission, unknown>> = {};
  for (const champ of CHAMPS_FACTURE_MODIFIABLES_APRES_EMISSION) {
    if (champ in valeurs) resultat[champ] = valeurs[champ];
  }
  return resultat;
}

/**
 * Options du sélecteur de statut d'une facture émise (sans « Brouillon »).
 *
 * Cas particulier de la phase 3 (avoirs livrés, interrupteur à false) : une
 * facture DÉJÀ annulée ne peut plus changer de statut du tout — la garde refuse
 * la branche « annulee → autre statut » (« Réactivation refusée »). Le sélecteur
 * ne propose alors que son statut courant plutôt qu'une action vouée au refus.
 */
export function optionsStatutFactureEmise(
  statutActuel: string,
  annulationPermise: boolean,
): { value: StatutFacture; label: string }[] {
  if (statutActuel === "annulee" && !annulationPermise) {
    return [{ value: "annulee", label: LIBELLES_STATUT_FACTURE.annulee }];
  }
  return STATUTS_FACTURE_APRES_EMISSION
    .filter((s) => s !== "annulee" || annulationPermise || statutActuel === "annulee")
    .map((s) => ({ value: s, label: LIBELLES_STATUT_FACTURE[s] }));
}

// ─── Ordre des écritures d'un dialogue d'édition ─────────────────────────────

export type EtapeEnregistrement = "lignes" | "facture";

export type PlanEnregistrementFacture =
  | {
      ok: true;
      /** Étapes dans l'ordre d'exécution. Vide : rien à écrire. */
      etapes: EtapeEnregistrement[];
      /** Valeurs à envoyer à l'étape « facture ». */
      valeursFacture: Record<string, unknown>;
    }
  | { ok: false; message: string };

export interface EntreePlanEnregistrement {
  numeroFacture?: string | null;
  /** Statut de la facture à l'ouverture du dialogue : il a décidé du formulaire. */
  statutOuverture: string;
  /** Statut relu en base juste avant d'écrire. */
  statutEnBase: string;
  /** Valeurs complètes saisies dans le formulaire (statut compris). */
  valeursFacture: Record<string, unknown> & { statut: string };
  /** Le dialogue a des lignes à écrire (brouillon seulement). */
  avecLignes: boolean;
}

/**
 * Décide QUOI écrire et DANS QUEL ORDRE.
 *
 *  - Brouillon en base : les lignes d'abord, la facture (statut compris)
 *    ensuite. Si le statut passe à « Émise », le déclencheur d'émission fige
 *    alors des lignes et un montant HT cohérents ; si l'écriture des lignes
 *    échoue, la facture reste un brouillon intact.
 *  - Facture émise en base : uniquement `{ statut }` (liste
 *    CHAMPS_FACTURE_MODIFIABLES_APRES_EMISSION), jamais les lignes, jamais
 *    « brouillon ».
 *  - Le statut a changé entre l'ouverture et l'enregistrement (émise ailleurs
 *    entre-temps) : refus, on n'écrit rien — les lignes saisies viseraient une
 *    facture figée.
 */
export function planifierEnregistrementFacture(entree: EntreePlanEnregistrement): PlanEnregistrementFacture {
  const numero = entree.numeroFacture ? ` ${entree.numeroFacture}` : "";
  const brouillonOuverture = !estFactureEmise(entree.statutOuverture);
  const brouillonEnBase = !estFactureEmise(entree.statutEnBase);

  if (brouillonOuverture !== brouillonEnBase) {
    return {
      ok: false,
      message: brouillonEnBase
        ? `La facture${numero} est redevenue un brouillon depuis l'ouverture du formulaire. Fermez-le puis rouvrez-la avant de la modifier.`
        : `La facture${numero} a été émise depuis l'ouverture du formulaire : son contenu est désormais figé et rien n'a été enregistré. Fermez le formulaire puis rouvrez la facture pour ne modifier que son statut.`,
    };
  }

  if (brouillonEnBase) {
    return {
      ok: true,
      etapes: entree.avecLignes ? ["lignes", "facture"] : ["facture"],
      valeursFacture: { ...entree.valeursFacture },
    };
  }

  const nouveauStatut = entree.valeursFacture.statut;
  if (nouveauStatut === STATUT_BROUILLON) {
    return {
      ok: false,
      message: `La facture${numero} est émise : elle ne peut plus redevenir un brouillon.`,
    };
  }
  if (nouveauStatut === entree.statutEnBase) {
    return { ok: true, etapes: [], valeursFacture: {} };
  }
  return {
    ok: true,
    etapes: ["facture"],
    valeursFacture: restreindreAuxChampsModifiables(entree.valeursFacture),
  };
}

export interface OperationsEnregistrement {
  ecrireLignes: () => Promise<void>;
  ecrireFacture: (valeurs: Record<string, unknown>) => Promise<void>;
}

/** Exécute le plan dans l'ordre ; la première erreur interrompt la suite. */
export async function executerPlanEnregistrement(
  plan: Extract<PlanEnregistrementFacture, { ok: true }>,
  operations: OperationsEnregistrement,
): Promise<void> {
  for (const etape of plan.etapes) {
    if (etape === "lignes") await operations.ecrireLignes();
    else await operations.ecrireFacture(plan.valeursFacture);
  }
}

// ─── Annulation manuelle (D6) ────────────────────────────────────────────────

/** Le dialogue doit-il demander confirmation avant d'enregistrer ce statut ? */
export function demandeConfirmationAnnulation(statutEnBase: string, nouveauStatut: string): boolean {
  return estFactureEmise(statutEnBase) && statutEnBase !== "annulee" && nouveauStatut === "annulee";
}

export const TITRE_CONFIRMATION_ANNULATION = "Annuler cette facture émise ?";

/**
 * `montantDejaPaye` : total encaissé sur la facture. D7 a reporté les
 * remboursements — les paiements restent rattachés à la facture annulée. La
 * confirmation doit donc le DIRE, sinon on annule une facture payée en croyant
 * corriger une erreur, et l'argent encaissé reste sur une facture annulée.
 */
export function texteConfirmationAnnulation(
  numeroFacture?: string | null,
  montantDejaPaye?: number | null,
): string[] {
  const numero = numeroFacture ? ` ${numeroFacture}` : "";
  const phrases = [
    `La facture${numero} ne sera ni supprimée ni renumérotée : elle garde son numéro et reste dans la comptabilité avec le statut « Annulée ».`,
    "L'annulation est tracée (date, auteur).",
  ];
  if (typeof montantDejaPaye === "number" && montantDejaPaye > 0) {
    phrases.push(
      `Cette facture a déjà reçu ${montantDejaPaye.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} € de paiements : ils resteront rattachés à la facture annulée. Le remboursement se fait à part.`,
    );
  }
  phrases.push("Un avoir devra être émis pour cette facture dès que la fonction existera dans le logiciel.");
  return phrases;
}

/**
 * Lecture de `public.factures_annulation_manuelle_permise()`.
 *
 * La fonction n'existe qu'une fois la garde appliquée. Base actuelle (fonction
 * absente, PGRST202 / 42883) ou lecture impossible : l'annulation est
 * considérée permise — c'est la garde, si elle existe, qui tranche, avec un
 * message clair. Seul un `false` explicite masque l'action.
 */
export function interpreterAnnulationManuellePermise(data: unknown, error: unknown): boolean {
  if (error) return true;
  return data !== false;
}

/** Actions de gestion proposées dans la fiche d'une facture. */
export function actionsGestionFacture(
  statut: string,
  annulationPermise: boolean,
): { supprimer: boolean; annuler: boolean } {
  const emise = estFactureEmise(statut);
  return {
    supprimer: !emise,
    annuler: emise && statut !== "annulee" && annulationPermise,
  };
}

// ─── Transmission PDP ────────────────────────────────────────────────────────

/**
 * Tant que l'appel réel à la plateforme de dématérialisation n'est pas branché,
 * `submit-pdp` refuse toute transmission (constante jumelle
 * PLATEFORME_PDP_SIMULEE dans supabase/functions/submit-pdp/index.ts).
 */
export const TRANSMISSION_PDP_SIMULEE = true;

export const MESSAGE_TRANSMISSION_PDP_SIMULEE =
  "Transmission désactivée : la plateforme de dématérialisation n'est pas encore branchée. Aucune facture n'est transmise.";
