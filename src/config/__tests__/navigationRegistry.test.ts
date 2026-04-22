import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  NAV_REGISTRY,
  PATH_TO_SECTION,
  SECTION_TO_PATH,
  SECTION_TO_PAGE_NAME,
  resolveNavTarget,
  getEntryById,
} from "@/config/navigationRegistry";

/**
 * Tests de cohérence du registre de navigation.
 *
 * Objectif : verrouiller le contrat entre `navigationRegistry.ts`,
 * `Index.tsx` (switch de rendu) et la sidebar pour empêcher toute dérive
 * silencieuse lorsqu'une nouvelle section est ajoutée.
 *
 * Stratégie : on parse `Index.tsx` comme texte pour extraire les couples
 * `case "<id>": pageName = "<PageName>"`, ce qui évite de devoir monter
 * tout l'arbre React (qui dépend de Supabase, contextes, etc.) et reste
 * rapide en CI.
 */

const INDEX_PATH = resolve(__dirname, "../pages/Index.tsx");
const INDEX_SOURCE = readFileSync(INDEX_PATH, "utf-8");

/** Extrait { sectionId → pageName } depuis le switch de Index.tsx. */
function parseIndexSwitch(source: string): Record<string, string> {
  const result: Record<string, string> = {};
  // Match: case "id":\n        pageName = "PageName";
  const re = /case\s+"([^"]+)"\s*:\s*[\s\S]*?pageName\s*=\s*"([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    result[m[1]] = m[2];
  }
  return result;
}

const INDEX_CASES = parseIndexSwitch(INDEX_SOURCE);

describe("navigationRegistry — intégrité du registre", () => {
  it("exporte des entrées avec ids uniques", () => {
    const ids = NAV_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exporte des paths uniques", () => {
    const paths = NAV_REGISTRY.map((e) => e.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("limite les hubs principaux à 5 entrées", () => {
    const hubs = NAV_REGISTRY.filter((e) => e.group === "hub");
    expect(hubs.length).toBeLessThanOrEqual(5);
  });

  it("garantit que tous les paths commencent par '/'", () => {
    for (const e of NAV_REGISTRY) {
      expect(e.path.startsWith("/"), `entrée "${e.id}" path invalide`).toBe(true);
    }
  });

  it("expose des mappings dérivés cohérents", () => {
    for (const e of NAV_REGISTRY) {
      expect(SECTION_TO_PATH[e.id]).toBe(e.path);
      expect(SECTION_TO_PAGE_NAME[e.id]).toBe(e.pageName);
      const segment = e.path.replace(/^\//, "");
      expect(PATH_TO_SECTION[segment]).toBe(e.id);
    }
  });
});

describe("navigationRegistry ↔ Index.tsx — cohérence des pages montées", () => {
  it("Index.tsx contient un case pour chaque entrée du registre", () => {
    const missing = NAV_REGISTRY.filter((e) => !(e.id in INDEX_CASES));
    expect(
      missing,
      `Sections sans case dans Index.tsx : ${missing.map((e) => e.id).join(", ")}`,
    ).toEqual([]);
  });

  it("le pageName du case correspond à celui déclaré dans le registre", () => {
    const mismatches: string[] = [];
    for (const e of NAV_REGISTRY) {
      const indexPageName = INDEX_CASES[e.id];
      if (indexPageName && indexPageName !== e.pageName) {
        mismatches.push(`${e.id}: registre="${e.pageName}" / Index="${indexPageName}"`);
      }
    }
    expect(mismatches, mismatches.join(" | ")).toEqual([]);
  });

  it("Index.tsx n'a pas de case orphelin (non listé dans le registre)", () => {
    const registryIds = new Set(NAV_REGISTRY.map((e) => e.id));
    const orphans = Object.keys(INDEX_CASES).filter((id) => !registryIds.has(id));
    expect(
      orphans,
      `Cases sans entrée registre : ${orphans.join(", ")}`,
    ).toEqual([]);
  });
});

describe("resolveNavTarget — fallback intelligent", () => {
  it("résout un path canonique exact", () => {
    const r = resolveNavTarget("/finances");
    expect(r.matched).toBe(true);
    expect(r.section).toBe("finances");
    expect(r.path).toBe("/finances");
  });

  it("résout un alias legacy (apprenants → contacts)", () => {
    const r = resolveNavTarget("/apprenants");
    expect(r.matched).toBe(true);
    expect(r.section).toBe("contacts");
  });

  it("résout un mot-clé fuzzy (factures → finances)", () => {
    const r = resolveNavTarget("/factures");
    expect(r.matched).toBe(true);
    expect(r.section).toBe("finances");
  });

  it("résout un préfixe nested (/contacts/123 → contacts)", () => {
    const r = resolveNavTarget("/contacts/abc-def");
    expect(r.matched).toBe(true);
    expect(r.section).toBe("contacts");
  });

  it("retombe sur dashboard pour un path totalement inconnu", () => {
    const r = resolveNavTarget("/totalement-inconnu-xyz");
    expect(r.matched).toBe(false);
    expect(r.section).toBe("dashboard");
    expect(r.path).toBe("/");
  });

  it("getEntryById retourne undefined pour un id inconnu", () => {
    expect(getEntryById("ghost-section")).toBeUndefined();
  });
});
