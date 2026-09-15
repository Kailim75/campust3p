import { describe, it, expect, beforeAll } from "vitest";

/**
 * cron-auth.ts — durcissement `fix/cron-secret-strict` (15/09/2026) :
 * `checkCronSecret` ne tolère plus l'absence de `CRON_SECRET` côté serveur
 * (ancien « mode transition »), elle refuse (401) comme le faisait déjà
 * `cronSecretMatches`. Exécuté dans un faux Deno — même harnais que
 * `submit-pdp-simulee.test.ts` : tsc (tsconfig.app.json) ne suit pas ce
 * code Deno, donc cette suite est la seule couverture du fichier.
 */

const env = new Map<string, string>();

type CheckCronSecret = (req: Request) => Response | null;

let checkCronSecret: CheckCronSecret;

beforeAll(async () => {
  (globalThis as unknown as { Deno: unknown }).Deno = {
    env: { get: (key: string) => env.get(key) },
  };
  // Chemin en variable : tsc (tsconfig.app.json) ne suit pas ce code Deno.
  const fichier = "../../../supabase/functions/_shared/cron-auth.ts";
  const module = await import(/* @vite-ignore */ fichier);
  checkCronSecret = module.checkCronSecret;
});

function requeteCron(headers: Record<string, string> = {}): Request {
  return new Request("https://projet.supabase.co/functions/v1/send-daily-report", {
    method: "POST",
    headers,
  });
}

describe("checkCronSecret — garde stricte (plus de mode transition)", () => {
  it("refuse (401) quand CRON_SECRET est absent côté serveur, même avec un en-tête présent", () => {
    env.delete("CRON_SECRET");

    const reponse = checkCronSecret(requeteCron({ "x-cron-secret": "peu-importe" }));

    expect(reponse).not.toBeNull();
    expect(reponse!.status).toBe(401);
  });

  it("refuse (401) quand l'en-tête x-cron-secret est absent côté appelant", () => {
    env.set("CRON_SECRET", "le-vrai-secret");

    const reponse = checkCronSecret(requeteCron());

    expect(reponse).not.toBeNull();
    expect(reponse!.status).toBe(401);
  });

  it("refuse (401) quand l'en-tête x-cron-secret est faux", () => {
    env.set("CRON_SECRET", "le-vrai-secret");

    const reponse = checkCronSecret(requeteCron({ "x-cron-secret": "mauvais-secret" }));

    expect(reponse).not.toBeNull();
    expect(reponse!.status).toBe(401);
  });

  it("accepte (pas de Response) quand l'en-tête x-cron-secret correspond", () => {
    env.set("CRON_SECRET", "le-vrai-secret");

    const reponse = checkCronSecret(requeteCron({ "x-cron-secret": "le-vrai-secret" }));

    expect(reponse).toBeNull();
  });
});
