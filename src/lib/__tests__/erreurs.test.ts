import { describe, it, expect, vi, beforeEach } from "vitest";
import { messageErreur, messageErreurInvoke } from "../erreurs";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("messageErreur", () => {
  it("traduit une violation RLS en message de droits", () => {
    const err = { message: 'new row violates row-level security policy for table "factures"', code: "42501" };
    expect(messageErreur(err)).toBe("Vous n'avez pas les droits nécessaires pour cette action.");
  });

  it("préfixe par le contexte quand il est fourni", () => {
    const err = new TypeError("Failed to fetch");
    expect(messageErreur(err, "Erreur lors de la création de la facture : ")).toBe(
      "Erreur lors de la création de la facture : Connexion au serveur impossible. Vérifiez votre connexion internet puis réessayez.",
    );
  });

  it("reconnaît les codes Postgres même sans texte connu", () => {
    expect(messageErreur({ message: "x", code: "23505" })).toBe("Cet enregistrement existe déjà.");
  });

  it("laisse passer un message déjà rédigé par l'application", () => {
    const msg = "Réactivation bloquée : un contact actif avec cet email existe déjà dans ce centre.";
    expect(messageErreur(new Error(msg))).toBe(msg);
  });

  it("préfixe aussi un message applicatif par le contexte", () => {
    const err = { message: "Enregistrement hors de votre centre", code: "P0001" };
    expect(messageErreur(err, "Annulation impossible")).toBe(
      "Annulation impossible : Enregistrement hors de votre centre",
    );
  });

  it("ne préfixe pas deux fois si le message commence déjà par le contexte", () => {
    const msg = "Erreur lors de l'import : ligne 12 incomplète";
    expect(messageErreur(new Error(msg), "Erreur lors de l'import")).toBe(msg);
  });

  it("masque un message technique inconnu derrière un texte générique", () => {
    const out = messageErreur(new Error('column "foo" of relation "bar" does not exist'), "Erreur lors de l'import");
    expect(out).toMatch(/^Erreur lors de l'import : Une erreur technique est survenue/);
  });

  it("masque aussi une erreur JavaScript", () => {
    const err = new TypeError("Cannot read properties of undefined (reading 'nom')");
    expect(messageErreur(err, "Erreur")).toMatch(/^Erreur : Une erreur technique est survenue/);
  });

  it("utilise le contexte comme message par défaut si l'erreur est muette", () => {
    expect(messageErreur({}, "Erreur lors de la sauvegarde")).toBe("Erreur lors de la sauvegarde");
    expect(messageErreur(null)).toMatch(/^Une erreur est survenue/);
  });

  it("traduit les erreurs d'authentification Supabase", () => {
    expect(messageErreur({ message: "Invalid login credentials", status: 400 })).toBe("Email ou mot de passe incorrect.");
  });

  it("traduit une violation NOT NULL en champ obligatoire (code et texte)", () => {
    expect(messageErreur({ message: "x", code: "23502" })).toBe("Un champ obligatoire est vide.");
    const brut = new Error('null value in column "nom" of relation "contacts" violates not-null constraint');
    expect(messageErreur(brut)).toBe("Un champ obligatoire est vide.");
  });

  it("traduit une violation CHECK en valeur non autorisée (code et texte)", () => {
    expect(messageErreur({ message: "x", code: "23514" })).toBe("Une valeur saisie n'est pas autorisée (montant, date…).");
    const brut = new Error('new row for relation "paiements" violates check constraint "paiements_montant_check"');
    expect(messageErreur(brut)).toBe("Une valeur saisie n'est pas autorisée (montant, date…).");
  });

  it("réserve « des données liées existent encore » à la clé étrangère", () => {
    expect(
      messageErreur({
        message: 'update or delete on table "sessions" violates foreign key constraint "inscriptions_session_id_fkey"',
        code: "23503",
      }),
    ).toBe("Impossible : des données liées existent encore.");
  });

  it("ne retraduit pas « Token invalide » de l'enquête publique", () => {
    expect(messageErreur(new Error("Token invalide"))).toBe("Token invalide");
  });

  it("ne se fie pas aux nombres présents dans le texte du message", () => {
    const msg =
      "Impossible de télécharger le document depuis contact-documents/1c4295e0-404b-4e2f-9d2f-5a1b2c3d4e5f/attestation.pdf: Object not found";
    expect(messageErreur(new Error(msg))).toBe(msg);
  });

  it("traduit un code Supabase de session expirée", () => {
    expect(
      messageErreur({ message: "Invalid Refresh Token: Refresh Token Not Found", code: "refresh_token_not_found", status: 400 }),
    ).toBe("Votre session a expiré : reconnectez-vous.");
  });

  it("traduit un doublon Postgres même si la donnée contient des accents", () => {
    const err = {
      message: 'duplicate key value violates unique constraint "contacts_email_key" Key (email)=(josé@exemple.fr) already exists.',
      code: "23505",
    };
    expect(messageErreur(err)).toBe("Cet enregistrement existe déjà.");
  });

  it("traduit une FunctionsHttpError d'après le statut de la réponse", () => {
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: { status: 403 },
    };
    expect(messageErreur(err)).toBe("Vous n'avez pas les droits nécessaires pour cette action.");
    expect(messageErreur({ ...err, context: { status: 400 } })).toBe("Requête refusée par le serveur.");
    expect(messageErreur({ ...err, context: { status: 500 } })).toMatch(/^Une erreur technique est survenue/);
  });
});

describe("messageErreurInvoke", () => {
  it("lit le message renvoyé par l'edge function", async () => {
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: { status: 400, json: async () => ({ error: "Le mot de passe doit contenir au moins 8 caractères" }) },
    };
    await expect(messageErreurInvoke(err, "Erreur lors de la création de l'utilisateur")).resolves.toBe(
      "Erreur lors de la création de l'utilisateur : Le mot de passe doit contenir au moins 8 caractères",
    );
  });

  it("retombe sur le statut si le corps est illisible", async () => {
    const err = {
      name: "FunctionsHttpError",
      message: "Edge Function returned a non-2xx status code",
      context: {
        status: 403,
        json: async () => {
          throw new Error("Unexpected token < in JSON");
        },
      },
    };
    await expect(messageErreurInvoke(err, "Erreur")).resolves.toBe(
      "Erreur : Vous n'avez pas les droits nécessaires pour cette action.",
    );
  });
});
