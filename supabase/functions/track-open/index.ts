// Track email opens via 1x1 transparent pixel
// Public endpoint: GET /track-open?t=<token>
// Logs the open then returns a 1x1 transparent GIF.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// 1x1 transparent GIF (43 bytes)
const PIXEL_BYTES = new Uint8Array([
  0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00,
  0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 0x00, 0x00,
  0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02,
  0x44, 0x01, 0x00, 0x3b,
]);

const PIXEL_HEADERS = {
  "Content-Type": "image/gif",
  "Content-Length": String(PIXEL_BYTES.length),
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  "Pragma": "no-cache",
  "Expires": "0",
};

function pixelResponse() {
  return new Response(PIXEL_BYTES, { status: 200, headers: PIXEL_HEADERS });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (!token) return pixelResponse();

  // Fire-and-forget logging — never block pixel response
  (async () => {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

      const [{ data: rel }, { data: doc }] = await Promise.all([
        supabase
          .from("relance_paiement_queue")
          .select("id, contact_id, centre_id, open_count, opened_at")
          .eq("tracking_token", token)
          .maybeSingle(),
        supabase
          .from("document_envois")
          .select("id, contact_id, open_count, opened_at")
          .eq("tracking_token", token)
          .maybeSingle(),
      ]);

      const ip =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("cf-connecting-ip") ||
        null;
      const ua = req.headers.get("user-agent") ?? null;

      // Many email clients prefetch images (Gmail, Apple Mail proxy).
      // We still record the event; a single open is meaningful, repeats less so.
      if (rel) {
        await Promise.all([
          supabase
            .from("relance_paiement_queue")
            .update({
              opened_at: rel.opened_at ?? new Date().toISOString(),
              open_count: (rel.open_count ?? 0) + 1,
            })
            .eq("id", rel.id),
          supabase.from("email_tracking_events").insert({
            tracking_token: token,
            source_table: "relance_paiement_queue",
            source_id: rel.id,
            contact_id: rel.contact_id,
            centre_id: rel.centre_id,
            event_type: "open",
            ip_address: ip,
            user_agent: ua,
          }),
        ]);
      } else if (doc) {
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
              opened_at: doc.opened_at ?? new Date().toISOString(),
              open_count: (doc.open_count ?? 0) + 1,
            })
            .eq("id", doc.id),
          supabase.from("email_tracking_events").insert({
            tracking_token: token,
            source_table: "document_envois",
            source_id: doc.id,
            contact_id: doc.contact_id,
            centre_id: centreId,
            event_type: "open",
            ip_address: ip,
            user_agent: ua,
          }),
        ]);
      }
    } catch (e) {
      console.error("track-open logging failed:", e);
    }
  })();

  return pixelResponse();
});
