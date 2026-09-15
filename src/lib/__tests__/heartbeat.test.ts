import { describe, it, expect, vi } from "vitest";
import { reportHeartbeat } from "../../../supabase/functions/_shared/heartbeat.ts";

/**
 * Supervision minimale (15/09/2026) — battement de cœur des jobs pg_cron.
 * `_shared/heartbeat.ts` n'importe rien de Deno : pas besoin du harnais
 * faux-Deno utilisé pour les handlers d'edge functions, un import direct
 * suffit (même stratégie que les autres helpers purs de `_shared`).
 */

function makeClient(result: { error: unknown } = { error: null }) {
  const upsert = vi.fn().mockResolvedValue(result);
  const from = vi.fn().mockReturnValue({ upsert });
  return { client: { from }, upsert, from };
}

describe("reportHeartbeat", () => {
  it("running : met à jour last_run_at/last_status, ne touche pas last_ok_at, efface last_error", async () => {
    const { client, from, upsert } = makeClient();

    await reportHeartbeat(client, "signature-reminders", "running");

    expect(from).toHaveBeenCalledWith("cron_heartbeats");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [row, opts] = upsert.mock.calls[0];
    expect(row.job).toBe("signature-reminders");
    expect(row.last_status).toBe("running");
    expect(row.last_error).toBeNull();
    expect(row).not.toHaveProperty("last_ok_at");
    expect(opts).toEqual({ onConflict: "job" });
  });

  it("ok : pose last_ok_at = last_run_at et efface last_error", async () => {
    const { client, upsert } = makeClient();

    await reportHeartbeat(client, "send-daily-report", "ok");

    const [row] = upsert.mock.calls[0];
    expect(row.last_status).toBe("ok");
    expect(row.last_error).toBeNull();
    expect(row.last_ok_at).toBe(row.last_run_at);
  });

  it("error : porte le message et ne pose pas last_ok_at", async () => {
    const { client, upsert } = makeClient();

    await reportHeartbeat(client, "alma-reconcile-cron", "error", "ALMA_API_KEY not configured");

    const [row] = upsert.mock.calls[0];
    expect(row.last_status).toBe("error");
    expect(row.last_error).toBe("ALMA_API_KEY not configured");
    expect(row).not.toHaveProperty("last_ok_at");
  });

  it("un échec d'upsert (erreur renvoyée) est avalé — le cron appelant ne plante pas", async () => {
    const { client } = makeClient({ error: { message: "table introuvable" } });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(reportHeartbeat(client, "generate-notifications", "ok")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });

  it("une exception levée par le client est avalée aussi", async () => {
    const client = { from: vi.fn(() => { throw new Error("réseau indisponible"); }) };
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(reportHeartbeat(client, "process-payment-reminders", "running")).resolves.toBeUndefined();
    expect(spy).toHaveBeenCalled();

    spy.mockRestore();
  });
});
