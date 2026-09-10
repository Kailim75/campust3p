/**
 * Messages d'erreur lisibles pour l'utilisateur.
 *
 * Audit du 13/08/2026 (UX P2) : ~140 toasts affichaient `error.message` tel
 * quel — souvent un texte technique en anglais (« new row violates row-level
 * security policy », « Failed to fetch », « duplicate key value… ») face à
 * une secrétaire. Ce helper traduit les cas connus en français clair, laisse
 * passer les messages déjà rédigés par l'application, et garde le détail
 * technique dans la console pour le diagnostic.
 *
 * Ordre de décision (10/09/2026) :
 *  1. statut HTTP d'une edge function (`FunctionsHttpError`), dont le message
 *     est toujours « Edge Function returned a non-2xx status code » ;
 *  2. code d'erreur : SQLSTATE Postgres, code Supabase, statut HTTP — lus
 *     UNIQUEMENT dans `code` / `status`, jamais cherchés dans le texte (un
 *     UUID ou un chemin de stockage contient « 403 » une fois sur vingt) ;
 *  3. message déjà rédigé en français par l'application : rendu tel quel ;
 *  4. formulations anglaises connues de Postgres / Supabase / navigateur ;
 *  5. repli générique.
 */

type ErreurLike = {
  message?: unknown;
  code?: unknown;
  status?: unknown;
  details?: unknown;
  context?: unknown;
};

const MSG = {
  identifiants: "Email ou mot de passe incorrect.",
  emailNonConfirme: "Adresse email non confirmée : vérifiez votre boîte de réception.",
  motDePasseCourt: "Le mot de passe est trop court.",
  compteExistant: "Un compte existe déjà avec cette adresse email.",
  tropDeTentatives: "Trop de tentatives : patientez une minute puis réessayez.",
  session: "Votre session a expiré : reconnectez-vous.",
  droits: "Vous n'avez pas les droits nécessaires pour cette action.",
  reseau: "Connexion au serveur impossible. Vérifiez votre connexion internet puis réessayez.",
  lent: "Le serveur a mis trop de temps à répondre. Réessayez dans un instant.",
  doublon: "Cet enregistrement existe déjà.",
  donneesLiees: "Impossible : des données liées existent encore.",
  introuvable: "Élément introuvable (il a peut-être été supprimé ou déplacé).",
  champObligatoire: "Un champ obligatoire est vide.",
  valeurRefusee: "Une valeur saisie n'est pas autorisée (montant, date…).",
  format: "Une valeur saisie n'est pas au bon format (date ou nombre).",
  fichierVolumineux: "Le fichier est trop volumineux.",
  fichier: "Le fichier n'a pas pu être lu ou enregistré.",
  requeteRefusee: "Requête refusée par le serveur.",
  technique: "Une erreur technique est survenue. Réessayez ; si le problème persiste, signalez-le.",
  inconnue: "Une erreur est survenue. Réessayez ; si le problème persiste, signalez-le.",
} as const;

/** SQLSTATE Postgres et codes Supabase (comparaison exacte, en majuscules). */
const CODES: Record<string, string> = {
  "22007": MSG.format,
  "22008": MSG.format,
  "22P02": MSG.format,
  "23502": MSG.champObligatoire,
  "23503": MSG.donneesLiees,
  "23505": MSG.doublon,
  "23514": MSG.valeurRefusee,
  "42501": MSG.droits,
  "57014": MSG.lent,
  PGRST116: MSG.introuvable,
  PGRST301: MSG.session,
  BAD_JWT: MSG.session,
  SESSION_NOT_FOUND: MSG.session,
  REFRESH_TOKEN_NOT_FOUND: MSG.session,
  INVALID_CREDENTIALS: MSG.identifiants,
  EMAIL_NOT_CONFIRMED: MSG.emailNonConfirme,
  OVER_REQUEST_RATE_LIMIT: MSG.tropDeTentatives,
  USER_ALREADY_EXISTS: MSG.compteExistant,
};

/** Statuts HTTP traduisibles. 400 et 500 restent ouverts : le message est plus précis. */
const STATUTS: Record<number, string> = {
  401: MSG.session,
  403: MSG.droits,
  404: MSG.introuvable,
  408: MSG.lent,
  413: MSG.fichierVolumineux,
  429: MSG.tropDeTentatives,
  504: MSG.lent,
};

/** Formulations anglaises réelles de Postgres / Supabase / navigateur. */
const REGLES: Array<{ test: RegExp; message: string }> = [
  { test: /invalid login credentials/i, message: MSG.identifiants },
  { test: /email not confirmed/i, message: MSG.emailNonConfirme },
  { test: /password should be at least|password is too short/i, message: MSG.motDePasseCourt },
  { test: /rate limit|too many requests/i, message: MSG.tropDeTentatives },
  {
    test: /\bjwt\b|\binvalid token\b|token (is )?(expired|invalid)|invalid refresh token|\brefresh_token\b|session (not found|expired)/i,
    message: MSG.session,
  },
  { test: /row-level security|permission denied|not authorized|unauthorized|forbidden/i, message: MSG.droits },
  {
    test: /failed to fetch|failed to send a request|network ?error|network request failed|load failed|fetch failed|err_(internet|network|connection)/i,
    message: MSG.reseau,
  },
  { test: /time[d ]?out|statement timeout|canceling statement/i, message: MSG.lent },
  // NOT NULL et CHECK avant la clé étrangère : les trois messages Postgres
  // commencent par « … violates … constraint ».
  { test: /violates not-null constraint|null value in column/i, message: MSG.champObligatoire },
  { test: /violates check constraint|\bcheck constraint\b/i, message: MSG.valeurRefusee },
  { test: /already (been )?registered/i, message: MSG.compteExistant },
  { test: /duplicate key|violates unique constraint|already exists/i, message: MSG.doublon },
  { test: /violates foreign key constraint|foreign key|still referenced/i, message: MSG.donneesLiees },
  { test: /object not found|\bbucket\b|storage error/i, message: MSG.fichier },
  { test: /\bnot found\b|no rows returned|multiple \(or no\) rows/i, message: MSG.introuvable },
  { test: /invalid input syntax|invalid date/i, message: MSG.format },
  { test: /payload too large|entity too large|maximum (allowed )?size|file too large/i, message: MSG.fichierVolumineux },
];

/** Signature d'un message manifestement technique (à ne pas montrer tel quel). */
const TECHNIQUE = /\b(column|relation|schema|syntax error|function .* does not exist|operator does not exist|postgrest|supabase|edge function|non-2xx|status code|internal server error|unexpected token|cannot read propert(y|ies)|undefined is not|is not a function|typeerror|referenceerror)\b/i;

/** Accent ou vocabulaire français : le message vient de l'application, pas du moteur. */
const FRANCAIS =
  /[àâäçéèêëîïôöùûüÿœ]|\b(aucun|aucune|depuis|erreur|impossible|introuvable|invalide|lors de|manquant|manquante|obligatoire|requis|requise|veuillez|votre|vous)\b/i;

function lire(err: unknown): { message: string; codes: string[]; statuts: number[] } {
  if (typeof err === "string") return { message: err, codes: [], statuts: [] };
  const e = (err ?? {}) as ErreurLike;
  const message = typeof e.message === "string" ? e.message : "";
  const codes: string[] = [];
  const statuts: number[] = [];
  for (const brut of [e.code, e.status]) {
    if (brut === undefined || brut === null || brut === "") continue;
    const texte = String(brut).trim();
    codes.push(texte.toUpperCase());
    const nombre = Number(texte);
    if (Number.isInteger(nombre) && nombre >= 100 && nombre <= 599) statuts.push(nombre);
  }
  return { message, codes, statuts };
}

/** Statut de la réponse d'une edge function (`FunctionsHttpError.context`). */
function statutInvoke(err: unknown): number | undefined {
  const contexte = (err ?? {}) as ErreurLike;
  const reponse = contexte.context;
  if (!reponse || typeof reponse !== "object") return undefined;
  const statut = (reponse as { status?: unknown }).status;
  return typeof statut === "number" ? statut : undefined;
}

function messageStatutInvoke(statut: number): string {
  if (STATUTS[statut]) return STATUTS[statut];
  if (statut >= 500) return MSG.technique;
  if (statut >= 400) return MSG.requeteRefusee;
  return MSG.technique;
}

/** Message déjà rédigé par l'application : on ne le retraduit jamais. */
function estApplicatif(message: string): boolean {
  return !TECHNIQUE.test(message) && FRANCAIS.test(message);
}

/**
 * Retourne un message affichable.
 *
 * @param err       l'erreur attrapée (Error, PostgrestError, AuthError, string…)
 * @param contexte  ce qu'on était en train de faire (« Erreur lors de la création
 *                  de la facture ») — préfixe le message affiché (y compris un
 *                  message applicatif, sauf s'il commence déjà par ce contexte),
 *                  et sert de message par défaut si l'erreur est muette.
 */
export function messageErreur(err: unknown, contexte?: string): string {
  const { message, codes, statuts } = lire(err);
  const prefixe = contexte ? contexte.replace(/\s*[:：]\s*$/, "").trim() : "";
  const prefixer = (texte: string) =>
    prefixe && !texte.startsWith(prefixe) ? `${prefixe} : ${texte}` : texte;
  const tracer = (etiquette: string) =>
    console.error(etiquette, contexte ?? "", message, codes.join(" "));

  const statutFonction = statutInvoke(err);
  if (statutFonction !== undefined) {
    tracer("[erreur]");
    return prefixer(messageStatutInvoke(statutFonction));
  }

  for (const code of codes) {
    if (CODES[code]) {
      tracer("[erreur]");
      return prefixer(CODES[code]);
    }
  }
  for (const statut of statuts) {
    if (STATUTS[statut]) {
      tracer("[erreur]");
      return prefixer(STATUTS[statut]);
    }
  }

  if (!message) {
    return prefixe || MSG.inconnue;
  }

  if (estApplicatif(message)) {
    return prefixer(message);
  }

  for (const regle of REGLES) {
    if (regle.test.test(message)) {
      tracer("[erreur]");
      return prefixer(regle.message);
    }
  }

  if (TECHNIQUE.test(message)) {
    tracer("[erreur technique]");
    return prefixer(MSG.technique);
  }

  return prefixer(message);
}

/**
 * Variante asynchrone pour `supabase.functions.invoke`.
 *
 * Sur un non-2xx, supabase-js lève un `FunctionsHttpError` au message fixe
 * « Edge Function returned a non-2xx status code » : le vrai message (`{ error }`
 * renvoyé par la fonction, par exemple « Le mot de passe doit contenir au moins
 * 8 caractères ») n'est lisible que dans le corps de la réponse.
 */
export async function messageErreurInvoke(err: unknown, contexte?: string): Promise<string> {
  const e = (err ?? {}) as ErreurLike;
  const reponse = e.context as { json?: () => Promise<unknown> } | undefined;
  if (reponse && typeof reponse === "object" && typeof reponse.json === "function") {
    try {
      const corps = (await reponse.json()) as { error?: unknown; message?: unknown } | null;
      const texte =
        typeof corps?.error === "string"
          ? corps.error
          : typeof corps?.message === "string"
            ? corps.message
            : "";
      if (texte.trim()) return messageErreur({ message: texte.trim() }, contexte);
    } catch {
      // Corps illisible (HTML, flux déjà consommé) : on retombe sur le statut.
    }
  }
  return messageErreur(err, contexte);
}
