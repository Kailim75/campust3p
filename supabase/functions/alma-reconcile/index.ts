import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

/**
 * Manual Alma reconciliation endpoint.
 *
 * Use case: the IPN callback was missed (signature rejection, retries
 * exhausted, network), so an admin pastes the Alma `payment_id` to attach
 * the payment to the right invoice manually but in an idempotent, audited way
 * (same `ALMA-<id>` reference the webhook would have written).
 *
 * Body: { payment_id: string, facture_id?: string }
 *  - facture_id is optional override when payment.custom_data.facture_id is missing
 */
serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  // JWT validation (admin/staff only — enforced by RLS via the user client below).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { error: "Unauthorized" });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return json(401, { error: "Invalid or expired session" });
  }
  const userId = userData.user.id;

  // Role check: admin or staff
  const { data: roles } = await userClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "staff");
  if (!allowed) {
    return json(403, { error: "Forbidden — admin or staff role required" });
  }

  // Parse body
  let body: { payment_id?: string; facture_id?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  let paymentId = (body.payment_id ?? "").trim();
  // Tolerate full URLs pasted from Alma dashboard (e.g. https://dashboard.getalma.eu/payments/payment_xxx)
  const m = paymentId.match(/(payment_[A-Za-z0-9]+)/);
  if (m) paymentId = m[1];
  if (!paymentId) {
    return json(400, { error: "payment_id required" });
  }

  // Fetch payment from Alma
  const ALMA_API_KEY = Deno.env.get("ALMA_API_KEY");
  let rawMode = Deno.env.get("ALMA_MODE") || "test";
  if (rawMode.startsWith("sk_")) rawMode = rawMode.startsWith("sk_live_") ? "live" : "test";
  const ALMA_API_URL = rawMode === "live"
    ? "https://api.getalma.eu/v1"
    : "https://api.sandbox.getalma.eu/v1";

  if (!ALMA_API_KEY) return json(500, { error: "ALMA_API_KEY not configured" });

  const almaRes = await fetch(`${ALMA_API_URL}/payments/${paymentId}`, {
    headers: { Authorization: `Alma-Auth ${ALMA_API_KEY}` },
  });
  const payment = await almaRes.json();
  if (!almaRes.ok) {
    return json(404, {
      error: "Alma payment not found or API error",
      alma_status: almaRes.status,
      alma_error: payment,
    });
  }

  const factureId: string | undefined =
    body.facture_id || payment?.custom_data?.facture_id;
  if (!factureId) {
    return json(422, {
      error: "No facture_id in payment.custom_data — please provide facture_id",
      payment_summary: {
        id: payment.id,
        state: payment.state,
        purchase_amount: payment.purchase_amount,
        installments_count: payment.installments_count,
        custom_data: payment.custom_data,
        customer: payment.customer,
      },
    });
  }

  // Service-role for the write (webhook parity)
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Verify the facture exists and is in user's accessible scope (RLS via userClient)
  const { data: factureCheck, error: facCheckErr } = await userClient
    .from("factures")
    .select("id, numero_facture, montant_total, contact_id, contacts(nom, prenom)")
    .eq("id", factureId)
    .maybeSingle();
  if (facCheckErr || !factureCheck) {
    return json(404, { error: "Facture not found or not accessible", facture_id: factureId });
  }

  const reference = `ALMA-${paymentId}`;

  // Idempotency
  const { data: existing } = await admin
    .from("paiements")
    .select("id, montant, date_paiement")
    .eq("facture_id", factureId)
    .eq("reference", reference)
    .is("deleted_at", null)
    .maybeSingle();

  if (existing) {
    return json(200, {
      status: "already_recorded",
      paiement_id: existing.id,
      montant: existing.montant,
      reference,
      facture: factureCheck,
    });
  }

  const totalAmount = (payment.purchase_amount ?? 0) / 100;
  if (totalAmount <= 0) {
    return json(422, { error: "Alma payment amount is 0 or invalid", payment });
  }

  const { data: inserted, error: insertErr } = await admin
    .from("paiements")
    .insert({
      facture_id: factureId,
      montant: totalAmount,
      mode_paiement: "alma",
      reference,
      date_paiement: new Date().toISOString().split("T")[0],
      commentaires: `Réconciliation manuelle Alma — ${payment.installments_count}x — état ${payment.state} (par ${userData.user.email ?? userId})`,
    })
    .select("id")
    .single();

  if (insertErr) {
    return json(500, {
      error: "Insert paiement failed",
      detail: insertErr.message,
      facture_id: factureId,
      payment_id: paymentId,
    });
  }

  return json(200, {
    status: "recorded",
    paiement_id: inserted.id,
    montant: totalAmount,
    reference,
    facture: factureCheck,
    payment_state: payment.state,
    installments_count: payment.installments_count,
  });
});
