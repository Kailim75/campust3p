// Track link clicks from outbound emails (relances paiement, document_envois, etc.)
// Public endpoint: GET /track-link?t=<token>&u=<base64url(target_url)>
// Logs the click then 302-redirects to the target URL.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function b64urlDecode(input: string): string {
  try {
    const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
    const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + pad;
    return atob(b64);
  } catch {
    return "";
  }
}

function safeUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");
  const encoded = url.searchParams.get("u");
  const fallback = "https://campust3p.lovable.app/";

  const target = encoded ? safeUrl(b64urlDecode(encoded)) : null;
  const redirectTo = target ?? fallback;

  if (!token) {
    return Response.redirect(redirectTo, 302);
  }

  // Fire-and-forget logging — never block redirect
  (async () => {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

      // Find which table owns this token
      const [{ data: rel }, { data: doc }] = await Promise.all([
        supabase
          .from("relance_paiement_queue")
          .select("id, contact_id, centre_id, click_count")
          .eq("tracking_token", token)
          .maybeSingle(),
        supabase
          .from("document_envois")
          .select("id, contact_id, click_count, session_id")
          .eq("tracking_token", token)
          .maybeSingle(),
      ]);

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;
      const ua = req.headers.get("user-agent") ?? null;

      if (rel) {
        await Promise.all([
          supabase
            .from("relance_paiement_queue")
            .update({
              clicked_at: new Date().toISOString(),
              click_count: (rel.click_count ?? 0) + 1,
            })
            .eq("id", rel.id),
          supabase.from("email_tracking_events").insert({
            tracking_token: token,
            source_table: "relance_paiement_queue",
            source_id: rel.id,
            contact_id: rel.contact_id,
            centre_id: rel.centre_id,
            event_type: "click",
            target_url: redirectTo,
            ip_address: ip,
            user_agent: ua,
          }),
        ]);
      } else if (doc) {
        // Resolve centre_id via contact for document envois
        let centreId: string | null = null;
        if (doc.contact_id) {
          const { data: c } = await supabase
            .from("contacts")
            .select("centre_id")
            .eq("id", doc.contact_id)
            .maybeSingle();
          centreId = c?.centre_id ?? null;
        }
        await Promise.all([
          supabase
            .from("document_envois")
            .update({
              clicked_at: new Date().toISOString(),
              click_count: (doc.click_count ?? 0) + 1,
            })
            .eq("id", doc.id),
          supabase.from("email_tracking_events").insert({
            tracking_token: token,
            source_table: "document_envois",
            source_id: doc.id,
            contact_id: doc.contact_id,
            centre_id: centreId,
            event_type: "click",
            target_url: redirectTo,
            ip_address: ip,
            user_agent: ua,
          }),
        ]);
      }
    } catch (e) {
      console.error("track-link logging failed:", e);
    }
  })();

  return Response.redirect(redirectTo, 302);
});
