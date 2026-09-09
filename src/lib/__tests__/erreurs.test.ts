import { describe, it, expect, vi, beforeEach } from "vitest";
import { messageErreur } from "../erreurs";

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
    expect(messageErreur(new Error(msg), "Erreur")).toBe(msg);
  });

  it("masque un message technique inconnu derrière un texte générique", () => {
    const out = messageErreur(new Error('column "foo" of relation "bar" does not exist'), "Erreur lors de l'import");
    expect(out).toMatch(/^Erreur lors de l'import : Une erreur technique est survenue/);
  });

  it("utilise le contexte comme message par défaut si l'erreur est muette", () => {
    expect(messageErreur({}, "Erreur lors de la sauvegarde")).toBe("Erreur lors de la sauvegarde");
    expect(messageErreur(null)).toMatch(/^Une erreur est survenue/);
  });

  it("traduit les erreurs d'authentification Supabase", () => {
    expect(messageErreur({ message: "Invalid login credentials", status: 400 })).toBe("Email ou mot de passe incorrect.");
  });
});
