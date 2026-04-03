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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID")!;
    const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const { threadId, body: replyBody, centreId } = body;
    if (!threadId || !replyBody || !centreId) {
      throw new Error("threadId, body, and centreId are required");
    }

    // Get thread
    const { data: thread, error: tErr } = await supabase
      .from("crm_email_threads")
      .select("*, crm_email_accounts!inner(*)")
      .eq("id", threadId)
      .eq("centre_id", centreId)
      .single();

    if (tErr || !thread) throw new Error("Thread not found");

    const account = (thread as any).crm_email_accounts;
    if (!account) throw new Error("No email account for this thread");

    // Refresh token if needed
    let accessToken = account.oauth_encrypted_token;
    if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
      accessToken = await refreshToken(account, supabase, gmailClientId, gmailClientSecret);
    }

    // Get the last inbound message for reply headers
    const { data: lastMsg } = await supabase
      .from("crm_email_messages")
      .select("*")
      .eq("thread_id", threadId)
      .eq("direction", "inbound")
      .order("received_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Build recipients
    const replyTo = lastMsg?.from_address || "";
    const subject = thread.subject || "";
    const reSubject = subject.startsWith("Re:") ? subject : `Re: ${subject}`;

    // Build In-Reply-To and References headers
    const inReplyTo = lastMsg?.message_id_header || "";
    const references = [lastMsg?.references_header, lastMsg?.message_id_header].filter(Boolean).join(" ");

    // Build raw MIME message
    const rawMessage = buildMimeMessage({
      from: `${account.display_name || ""} <${account.email_address}>`,
      to: replyTo,
      subject: reSubject,
      body: replyBody,
      inReplyTo,
      references,
      threadId: thread.provider_thread_id,
    });

    // Send via Gmail API
    const sendRes = await fetch(`${GMAIL_API}/users/me/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        raw: rawMessage,
        threadId: thread.provider_thread_id,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      throw new Error(`Gmail send failed [${sendRes.status}]: ${errText}`);
    }

    const sentMsg = await sendRes.json();

    // Record outbound message in DB
    const { data: authUser } = await supabase.auth.getUser(
      req.headers.get("authorization")?.replace("Bearer ", "") || ""
    );

    await supabase
      .from("crm_email_messages")
      .insert({
        centre_id: centreId,
        thread_id: threadId,
        provider: "gmail",
        provider_message_id: sentMsg.id,
        source_system: "gmail",
        in_reply_to: inReplyTo || null,
        references_header: references || null,
        message_id_header: null,
        direction: "outbound",
        from_address: account.email_address,
        from_name: account.display_name || null,
        to_addresses: JSON.stringify([{ email: replyTo }]),
        subject: reSubject,
        body_text: replyBody,
        has_attachments: false,
        sent_at: new Date().toISOString(),
        sent_by: authUser?.user?.id || null,
        send_status: "sent",
        received_at: new Date().toISOString(),
      });

    // Update thread
    await supabase
      .from("crm_email_threads")
      .update({
        last_message_at: new Date().toISOString(),
        snippet: replyBody.substring(0, 200),
        message_count: (thread.message_count || 0) + 1,
        status: thread.status === "nouveau" ? "en_cours" : thread.status,
      })
      .eq("id", threadId);

    return new Response(JSON.stringify({ success: true, messageId: sentMsg.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("send-gmail-reply error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshToken(account: any, supabase: any, clientId: string, clientSecret: string): Promise<string> {
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
      oauth_token_expires_at: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
    })
    .eq("id", account.id);

  return data.access_token;
}

function buildMimeMessage(opts: {
  from: string;
  to: string;
  subject: string;
  body: string;
  inReplyTo: string;
  references: string;
  threadId: string;
}): string {
  const lines = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
  ];

  if (opts.inReplyTo) lines.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) lines.push(`References: ${opts.references}`);

  lines.push("", opts.body);

  const raw = lines.join("\r\n");
  // Base64url encode
  return btoa(unescape(encodeURIComponent(raw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
