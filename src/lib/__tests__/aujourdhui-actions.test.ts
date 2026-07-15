import { describe, it, expect } from "vitest";
import { isHandledToday, parsePostponedNote } from "@/lib/aujourdhui-actions";

/**
 * Chantier §5.1 — lecture structurée des notes [AUTO].
 * auto_category est la source de vérité ; le parsing de titre/contenu ne
 * sert que de repli pour les notes antérieures (auto_category NULL).
 */

describe("parsePostponedNote", () => {
  it("préfère auto_metadata quand présent", () => {
    const r = parsePostponedNote({
      contenu: "Bloc: LEGACY · Jusqu'au: 2000-01-01",
      auto_metadata: { bloc: "CMA", postponed_until: "2026-08-01" },
    });
    expect(r).toEqual({ bloc: "CMA", postponedUntil: "2026-08-01" });
  });

  it("replie sur le contenu pour les notes historiques", () => {
    const r = parsePostponedNote({
      contenu: "Bloc: Relance · Jusqu'au: 2026-07-20",
      auto_metadata: null,
    });
    expect(r).toEqual({ bloc: "Relance", postponedUntil: "2026-07-20" });
  });

  it("retourne null si aucune source exploitable", () => {
    expect(parsePostponedNote({ contenu: "note libre", auto_metadata: null })).toBeNull();
    expect(parsePostponedNote({ contenu: null, auto_metadata: { bloc: "CMA" } })).toBeNull();
  });
});

describe("isHandledToday", () => {
  const keywords = ["Convocation envoyée", "session_envoi_convocation"];

  it("matche par catégorie exacte quand auto_category est présent", () => {
    const notes = [{ contact_id: "c1", titre: "[AUTO] Convocation envoyée", auto_category: "session_envoi_convocation" }];
    expect(isHandledToday("c1", notes, keywords)).toBe(true);
  });

  it("ne matche PAS par mot-clé de titre quand auto_category est présent mais différent", () => {
    // Une note catégorisée ne doit plus déclencher de faux positif via son titre
    const notes = [{ contact_id: "c1", titre: "[AUTO] Convocation envoyée par erreur de libellé", auto_category: "marquer_fait" }];
    expect(isHandledToday("c1", notes, keywords)).toBe(false);
  });

  it("replie sur les mots-clés de titre pour les notes historiques (catégorie NULL)", () => {
    const notes = [{ contact_id: "c1", titre: "[AUTO] Convocation envoyée", auto_category: null }];
    expect(isHandledToday("c1", notes, keywords)).toBe(true);
  });

  it("ignore les notes des autres contacts", () => {
    const notes = [{ contact_id: "c2", titre: "[AUTO] Convocation envoyée", auto_category: "session_envoi_convocation" }];
    expect(isHandledToday("c1", notes, keywords)).toBe(false);
  });
});
