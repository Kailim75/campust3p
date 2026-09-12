import { describe, it, expect, beforeAll, vi } from "vitest";

/**
 * P0 (12/09/2026) — execute-workflow ne doit plus avaler les échecs d'action.
 *
 * Une action qui RETOURNE { success: false } (destinataire manquant, template
 * hors centre, clé Resend absente, type inconnu…) sans lever d'exception doit
 * marquer l'exécution en échec, et non « completed / success: true ».
 *
 * On teste la fonction pure resumerActions, chargée depuis l'edge function via
 * le harnais faux-Deno (les imports distants sont mockés ; le handler serve()
 * n'est jamais exécuté).
 */

const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("https://deno.land/std@0.190.0/http/server.ts", () => ({ serve: vi.fn() }));
vi.mock("https://esm.sh/@supabase/supabase-js@2", () => ({ createClient }));
vi.mock("https://esm.sh/resend@2.0.0", () => ({ Resend: vi.fn() }));

type Resumer = (r: any[]) => { echec: boolean; messageErreur: string | null };
let resumerActions: Resumer;

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = { env: { get: () => undefined } };
  // Chemin en variable : tsc (tsconfig.app.json) ne suit pas ce code Deno.
  const chemin = "../../../supabase/functions/execute-workflow/index.ts";
  const mod = await import(/* @vite-ignore */ chemin);
  resumerActions = mod.resumerActions as Resumer;
});

describe("execute-workflow — un échec d'action ne passe plus en silence", () => {
  it("expose resumerActions", () => {
    expect(typeof resumerActions).toBe("function");
  });

  it("aucune action en échec → pas d'échec, pas de message", () => {
    const r = resumerActions([{ success: true }, { success: true, id: "notif" }]);
    expect(r.echec).toBe(false);
    expect(r.messageErreur).toBeNull();
  });

  it("une action retourne success:false → échec + message repris", () => {
    const r = resumerActions([
      { success: true },
      { success: false, error: "Template hors du centre du workflow" },
    ]);
    expect(r.echec).toBe(true);
    expect(r.messageErreur).toBe("Template hors du centre du workflow");
  });

  it("plusieurs échecs → messages concaténés", () => {
    const r = resumerActions([
      { success: false, error: "No recipient email found" },
      { success: false, error: "RESEND_API_KEY not configured" },
    ]);
    expect(r.echec).toBe(true);
    expect(r.messageErreur).toBe(
      "No recipient email found ; RESEND_API_KEY not configured",
    );
  });

  it("un résultat sans champ success n'est PAS traité comme un échec", () => {
    const r = resumerActions([{ id: "x" }, { success: true }]);
    expect(r.echec).toBe(false);
    expect(r.messageErreur).toBeNull();
  });

  it("échec sans message → libellé générique", () => {
    const r = resumerActions([{ success: false }]);
    expect(r.echec).toBe(true);
    expect(r.messageErreur).toBe("action en échec");
  });
});
