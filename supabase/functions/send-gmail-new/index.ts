import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID")!;
    const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")!;

    // ── Auth: validate JWT ──
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anonClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub as string;

    // ── Service role client for DB operations ──
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Role check: only admin or staff ──
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (userRoles || []).map((r: any) => r.role);
    const isAllowed = roles.some((r: string) => ["admin", "staff", "super_admin"].includes(r));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Accès refusé: rôle admin ou staff requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse & validate body ──
    const body = await req.json();
    const { to, subject, body: messageBody, centreId, linkEntity } = body;

    if (!to || !subject || !messageBody || !centreId) {
      return new Response(JSON.stringify({ error: "to, subject, body, and centreId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return new Response(JSON.stringify({ error: "Adresse email invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Centre access check ──
    const { data: centreAccess } = await supabase
      .from("user_centres")
      .select("centre_id")
      .eq("user_id", userId)
      .eq("centre_id", centreId)
      .maybeSingle();

    if (!centreAccess) {
      return new Response(JSON.stringify({ error: "Accès refusé: centre non autorisé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Get active email account ──
    const { data: account, error: accErr } = await supabase
      .from("crm_email_accounts")
      .select("*")
      .eq("centre_id", centreId)
      .eq("is_active", true)
      .single();

    if (accErr || !account) {
      return new Response(JSON.stringify({ error: "Aucun compte email actif pour ce centre" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Refresh token if needed ──
    let accessToken = account.oauth_encrypted_token;
    if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
      accessToken = await refreshToken(account, supabase, gmailClientId, gmailClientSecret);
    }

    // ── Build MIME message ──
    const rawMessage = buildMimeMessage({
      from: `${account.display_name || ""} <${account.email_address}>`,
      to,
      subject,
      body: messageBody,
    });

    // ── Send via Gmail API FIRST (no orphan thread if this fails) ──
    const sendRes = await fetch(`${GMAIL_API}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      console.error("Gmail API error:", errText);
      return new Response(JSON.stringify({ error: `Échec envoi Gmail: ${sendRes.status}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sentMsg = await sendRes.json();
    const gmailThreadId = sentMsg.threadId;

    // ── Create CRM thread (only after Gmail success) ──
    const { data: crmThread, error: threadErr } = await supabase
      .from("crm_email_threads")
      .insert({
        centre_id: centreId,
        account_id: account.id,
        provider: "gmail",
        provider_thread_id: gmailThreadId,
        subject,
        status: "en_cours",
        is_unread: false,
        last_message_at: new Date().toISOString(),
        message_count: 1,
        snippet: messageBody.substring(0, 200),
        participants: JSON.stringify([
          { email: account.email_address, name: account.display_name || "", type: "from" },
          { email: to, name: "", type: "to" },
        ]),
      })
      .select("id")
      .single();

    if (threadErr) {
      console.error("CRM thread insert error:", threadErr);
      // Gmail sent OK — log but don't fail the user
      return new Response(JSON.stringify({
        success: true,
        messageId: sentMsg.id,
        warning: "Message envoyé mais erreur CRM — il apparaîtra à la prochaine synchronisation",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Create CRM message ──
    await supabase.from("crm_email_messages").insert({
      centre_id: centreId,
      thread_id: crmThread.id,
      provider: "gmail",
      provider_message_id: sentMsg.id,
      source_system: "gmail",
      direction: "outbound",
      from_address: account.email_address,
      from_name: account.display_name || null,
      to_addresses: JSON.stringify([{ email: to }]),
      subject,
      body_text: messageBody,
      has_attachments: false,
      sent_at: new Date().toISOString(),
      sent_by: userId,
      send_status: "sent",
      received_at: new Date().toISOString(),
    });

    // ── Optional CRM link ──
    if (linkEntity?.entityType && linkEntity?.entityId) {
      await supabase.from("crm_email_links").insert({
        centre_id: centreId,
        thread_id: crmThread.id,
        entity_type: linkEntity.entityType,
        entity_id: linkEntity.entityId,
        is_primary: true,
        link_source: "manual",
        linked_by: userId,
      });
    }

    return new Response(
      JSON.stringify({ success: true, messageId: sentMsg.id, threadId: crmThread.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-gmail-new error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshToken(
  account: any,
  supabase: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (!account.oauth_refresh_token) throw new Error("No refresh token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: account.oauth_refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`Refresh failed: ${data.error}`);

  await supabase
    .from("crm_email_accounts")
    .update({
      oauth_encrypted_token: data.access_token,
      oauth_token_expires_at: new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      ).toISOString(),
    })
    .eq("id", account.id);

  return data.access_token;
}

function buildMimeMessage(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    "",
    opts.body,
  ];

  const raw = lines.join("\r\n");
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
