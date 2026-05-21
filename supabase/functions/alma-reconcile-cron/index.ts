// Daily Alma reconciliation cron.
// Lists recent Alma payments and inserts missing `paiements` rows (idempotent).
// Invoked by pg_cron with the service role bearer; no end-user JWT.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ALMA_API_KEY = Deno.env.get("ALMA_API_KEY");
  let rawMode = Deno.env.get("ALMA_MODE") || "test";
  if (rawMode.startsWith("sk_")) rawMode = rawMode.startsWith("sk_live_") ? "live" : "test";
  const ALMA_API_URL = rawMode === "live"
    ? "https://api.getalma.eu/v1"
    : "https://api.sandbox.getalma.eu/v1";

  if (!ALMA_API_KEY) return json(500, { error: "ALMA_API_KEY not configured" });

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Lookback window
  const url = new URL(req.url);
  const lookbackDays = Math.min(30, Math.max(1, parseInt(url.searchParams.get("days") || "7", 10)));
  const sinceMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
  const sinceSec = Math.floor(sinceMs / 1000);

  // Fetch payments page by page
  const collected: any[] = [];
  let cursor: string | null = null;
  const MAX_PAGES = 10; // safety
  for (let p = 0; p < MAX_PAGES; p++) {
    const qp = new URLSearchParams({ limit: "100", state: "paid" });
    if (cursor) qp.set("starting_after", cursor);
    const res = await fetch(`${ALMA_API_URL}/payments?${qp.toString()}`, {
      headers: { Authorization: `Alma-Auth ${ALMA_API_KEY}` },
    });
    if (!res.ok) {
      return json(502, { error: "Alma list payments failed", status: res.status, detail: await res.text() });
    }
    const body = await res.json();
    const items: any[] = body.data ?? body.payments ?? body ?? [];
    if (!Array.isArray(items) || items.length === 0) break;
    let oldestSeen = Infinity;
    for (const item of items) {
      const created = item.created ?? item.created_at ?? 0;
      const createdSec = typeof created === "string" ? Math.floor(new Date(created).getTime() / 1000) : created;
      if (createdSec) oldestSeen = Math.min(oldestSeen, createdSec);
      if (!createdSec || createdSec >= sinceSec) collected.push(item);
    }
    if (!body.has_more && !body.next_cursor) break;
    cursor = body.next_cursor || items[items.length - 1]?.id || null;
    if (!cursor || oldestSeen < sinceSec) break;
  }

  const results = {
    scanned: collected.length,
    already_recorded: 0,
    recorded: 0,
    skipped_no_facture: 0,
    skipped_zero_amount: 0,
    errors: [] as Array<{ payment_id: string; error: string }>,
    inserted: [] as Array<{ payment_id: string; facture_id: string; montant: number }>,
  };

  for (const payment of collected) {
    const paymentId: string = payment.id;
    const factureId: string | undefined = payment?.custom_data?.facture_id;
    if (!paymentId) continue;
    if (!factureId) {
      results.skipped_no_facture++;
      continue;
    }
    const reference = `ALMA-${paymentId}`;

    // Idempotency
    const { data: existing } = await admin
      .from("paiements")
      .select("id")
      .eq("facture_id", factureId)
      .eq("reference", reference)
      .is("deleted_at", null)
      .maybeSingle();
    if (existing) {
      results.already_recorded++;
      continue;
    }

    const totalAmount = (payment.purchase_amount ?? 0) / 100;
    if (totalAmount <= 0) {
      results.skipped_zero_amount++;
      continue;
    }

    // Verify facture exists
    const { data: facture } = await admin
      .from("factures")
      .select("id")
      .eq("id", factureId)
      .maybeSingle();
    if (!facture) {
      results.errors.push({ payment_id: paymentId, error: "facture_not_found" });
      continue;
    }

    const { error: insErr } = await admin.from("paiements").insert({
      facture_id: factureId,
      montant: totalAmount,
      mode_paiement: "alma",
      reference,
      date_paiement: new Date().toISOString().split("T")[0],
      commentaires: `Réconciliation auto (cron) Alma — ${payment.installments_count ?? 1}x — état ${payment.state}`,
    });
    if (insErr) {
      results.errors.push({ payment_id: paymentId, error: insErr.message });
      continue;
    }
    results.recorded++;
    results.inserted.push({ payment_id: paymentId, facture_id: factureId, montant: totalAmount });
  }

  console.log("[alma-reconcile-cron]", JSON.stringify(results));
  return json(200, { ok: true, mode: rawMode, lookback_days: lookbackDays, ...results });
});
