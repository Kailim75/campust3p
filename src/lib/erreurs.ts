/**
 * Messages d'erreur lisibles pour l'utilisateur.
 *
 * Audit du 13/08/2026 (UX P2) : ~140 toasts affichaient `error.message` tel
 * quel — souvent un texte technique en anglais (« new row violates row-level
 * security policy », « Failed to fetch », « duplicate key value… ») face à
 * une secrétaire. Ce helper traduit les cas connus en français clair, laisse
 * passer les messages déjà rédigés par l'application, et garde le détail
 * technique dans la console pour le diagnostic.
 */

type ErreurLike = { message?: unknown; code?: unknown; status?: unknown; details?: unknown };

const REGLES: Array<{ test: RegExp; message: string }> = [
  { test: /invalid login credentials/i, message: "Email ou mot de passe incorrect." },
  { test: /email not confirmed/i, message: "Adresse email non confirmée : vérifiez votre boîte de réception." },
  { test: /password should be at least/i, message: "Le mot de passe est trop court." },
  { test: /rate limit|too many requests|429/i, message: "Trop de tentatives : patientez une minute puis réessayez." },
  { test: /jwt|token.*(expired|invalid)|invalid token|refresh_token|401/i, message: "Votre session a expiré : reconnectez-vous." },
  { test: /row-level security|permission denied|42501|not authorized|forbidden|403/i, message: "Vous n'avez pas les droits nécessaires pour cette action." },
  { test: /failed to fetch|networkerror|network request failed|load failed|err_(internet|network|connection)|fetch failed/i, message: "Connexion au serveur impossible. Vérifiez votre connexion internet puis réessayez." },
  { test: /timeout|timed out|57014|statement_timeout|504/i, message: "Le serveur a mis trop de temps à répondre. Réessayez dans un instant." },
  { test: /duplicate key|23505|already exists|unique constraint/i, message: "Cet enregistrement existe déjà." },
  { test: /foreign key|23503|still referenced|violates.*constraint/i, message: "Impossible : des données liées existent encore." },
  { test: /pgrst116|multiple \(or no\) rows|no rows returned|not found|404/i, message: "Élément introuvable (il a peut-être été supprimé ou déplacé)." },
  { test: /null value in column|not-null constraint|23502/i, message: "Un champ obligatoire est vide." },
  { test: /invalid input syntax|22p02|22007|22008|invalid date/i, message: "Une valeur saisie n'est pas au bon format (date ou nombre)." },
  { test: /payload too large|413|maximum size|too large/i, message: "Le fichier est trop volumineux." },
  { test: /storage|bucket|object not found/i, message: "Le fichier n'a pas pu être lu ou enregistré." },
];

/** Signature d'un message manifestement technique (à ne pas montrer tel quel). */
const TECHNIQUE = /\b(column|relation|schema|syntax error|function .* does not exist|operator does not exist|postgrest|supabase|edge function|non-2xx|status code|internal server error|unexpected token|cannot read propert|undefined is not|is not a function|typeerror|referenceerror)\b/i;

function lire(err: unknown): { message: string; code: string } {
  if (typeof err === "string") return { message: err, code: "" };
  const e = (err ?? {}) as ErreurLike;
  const message = typeof e.message === "string" ? e.message : "";
  const code = [e.code, e.status].filter((v) => v !== undefined && v !== null).map(String).join(" ");
  return { message, code };
}

/**
 * Retourne un message affichable.
 *
 * @param err       l'erreur attrapée (Error, PostgrestError, AuthError, string…)
 * @param contexte  ce qu'on était en train de faire (« Erreur lors de la création
 *                  de la facture ») — préfixe les messages traduits ou génériques,
 *                  et sert de message par défaut si l'erreur est muette.
 */
export function messageErreur(err: unknown, contexte?: string): string {
  const { message, code } = lire(err);
  const sonde = `${message} ${code}`.trim();
  const prefixe = contexte ? contexte.replace(/\s*[:：]\s*$/, "") : "";

  if (sonde) {
    for (const regle of REGLES) {
      if (regle.test.test(sonde)) {
        console.error("[erreur]", contexte ?? "", message, code);
        return prefixe ? `${prefixe} : ${regle.message}` : regle.message;
      }
    }
  }

  if (!message) {
    return prefixe || "Une erreur est survenue. Réessayez ; si le problème persiste, signalez-le.";
  }

  if (TECHNIQUE.test(message)) {
    console.error("[erreur technique]", contexte ?? "", message, code);
    const generique = "Une erreur technique est survenue. Réessayez ; si le problème persiste, signalez-le.";
    return prefixe ? `${prefixe} : ${generique}` : generique;
  }

  // Message déjà rédigé par l'application (le plus souvent en français) : on le garde.
  return message;
}
