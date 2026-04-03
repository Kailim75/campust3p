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
    const gmailClientId = Deno.env.get("GMAIL_CLIENT_ID");
    const gmailClientSecret = Deno.env.get("GMAIL_CLIENT_SECRET");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ─── OAuth Callback (GET from Google redirect) ──────────────
    const url = new URL(req.url);
    if (url.searchParams.get("callback") && req.method === "GET") {
      const code = url.searchParams.get("code");
      const accountId = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      if (error) {
        return new Response(
          `<html><body><h2>Erreur d'autorisation</h2><p>${error}</p><p>Vous pouvez fermer cette page.</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      if (!code || !accountId) {
        return new Response(
          `<html><body><h2>Paramètres manquants</h2><p>Vous pouvez fermer cette page et réessayer.</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const redirectUri = `${supabaseUrl}/functions/v1/sync-gmail-inbox?callback=true`;

      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: gmailClientId!,
          client_secret: gmailClientSecret!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      const tokens = await tokenRes.json();
      if (tokens.error) {
        return new Response(
          `<html><body><h2>Erreur OAuth</h2><p>${tokens.error_description || tokens.error}</p></body></html>`,
          { headers: { "Content-Type": "text/html" } }
        );
      }

      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      await supabase
        .from("crm_email_accounts")
        .update({
          oauth_encrypted_token: tokens.access_token,
          oauth_refresh_token: tokens.refresh_token || null,
          oauth_token_expires_at: expiresAt,
          sync_status: "idle",
          sync_error: null,
        })
        .eq("id", accountId);

      // Redirect back to app inbox page
      // Retrieve the origin from the account's centre to build redirect
      return new Response(
        `<html><head><meta charset="utf-8"></head><body>
          <h2>✅ Connexion Gmail réussie !</h2>
          <p>Vous pouvez fermer cette page et retourner au CRM.</p>
          <script>
            if (window.opener) { window.opener.location.reload(); window.close(); }
            else { setTimeout(() => { window.location.href = '/inbox'; }, 2000); }
          </script>
        </body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }

    const body = await req.json();

    // ─── OAuth Init ─────────────────────────────────────────────
    if (body.action === "init_oauth") {
      if (!gmailClientId || !gmailClientSecret) {
        throw new Error("Gmail OAuth credentials not configured");
      }
      
      const { centreId, email, displayName } = body;
      if (!centreId || !email) throw new Error("centreId and email required");

      // Create account record
      const { data: account, error: accErr } = await supabase
        .from("crm_email_accounts")
        .upsert({
          centre_id: centreId,
          email_address: email,
          display_name: displayName || null,
          provider: "gmail",
          is_active: true,
          sync_status: "idle",
        }, { onConflict: "centre_id,email_address" })
        .select()
        .single();

      if (accErr) throw accErr;

      // Build OAuth URL
      const redirectUri = `${supabaseUrl}/functions/v1/sync-gmail-inbox?callback=true`;
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.modify",
      ].join(" ");

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(gmailClientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent(scopes)}` +
        `&access_type=offline` +
        `&prompt=consent` +
        `&state=${account.id}`;

      return new Response(JSON.stringify({ authUrl, accountId: account.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── OAuth Callback (POST from frontend, fallback) ─────────
    if (body.action === "oauth_callback") {
      const code = body.code;
      const accountId = body.accountId;
      if (!code || !accountId) throw new Error("Missing code or accountId");

      const redirectUri = `${supabaseUrl}/functions/v1/sync-gmail-inbox?callback=true`;
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: gmailClientId!,
          client_secret: gmailClientSecret!,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.error) throw new Error(`OAuth error: ${tokens.error_description || tokens.error}`);

      const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();
      await supabase
        .from("crm_email_accounts")
        .update({
          oauth_encrypted_token: tokens.access_token,
          oauth_refresh_token: tokens.refresh_token || null,
          oauth_token_expires_at: expiresAt,
          sync_status: "idle",
          sync_error: null,
        })
        .eq("id", accountId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Sync (manual or cron) ──────────────────────────────────
    // Get all active accounts (or specific centre)
    let accountsQuery = supabase
      .from("crm_email_accounts")
      .select("*")
      .eq("is_active", true)
      .not("oauth_encrypted_token", "is", null);

    if (body.centreId) {
      accountsQuery = accountsQuery.eq("centre_id", body.centreId);
    }

    const { data: accounts, error: accListErr } = await accountsQuery;
    if (accListErr) throw accListErr;

    const results: any[] = [];

    for (const account of (accounts || [])) {
      try {
        // Refresh token if expired
        let accessToken = account.oauth_encrypted_token;
        if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
          accessToken = await refreshGmailToken(account, supabase, gmailClientId!, gmailClientSecret!);
        }

        // Sync messages
        const syncResult = await syncAccount(account, accessToken, supabase);
        results.push({ accountId: account.id, ...syncResult });

        await supabase
          .from("crm_email_accounts")
          .update({ sync_status: "idle", sync_error: null, last_sync_at: new Date().toISOString() })
          .eq("id", account.id);
      } catch (err: any) {
        console.error(`Sync error for account ${account.id}:`, err.message);
        await supabase
          .from("crm_email_accounts")
          .update({ sync_status: "error", sync_error: err.message })
          .eq("id", account.id);
        results.push({ accountId: account.id, error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("sync-gmail-inbox error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function refreshGmailToken(
  account: any,
  supabase: any,
  clientId: string,
  clientSecret: string
): Promise<string> {
  if (!account.oauth_refresh_token) throw new Error("No refresh token available");

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
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`);

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await supabase
    .from("crm_email_accounts")
    .update({
      oauth_encrypted_token: data.access_token,
      oauth_token_expires_at: expiresAt,
    })
    .eq("id", account.id);

  return data.access_token;
}

async function syncAccount(account: any, accessToken: string, supabase: any) {
  const centreId = account.centre_id;
  let newMessages = 0;

  // Mark as syncing
  await supabase
    .from("crm_email_accounts")
    .update({ sync_status: "syncing" })
    .eq("id", account.id);

  // Determine sync strategy
  let messageIds: string[] = [];

  if (account.last_history_id) {
    // Incremental sync via history
    try {
      const histRes = await gmailFetch(accessToken, `/users/me/history?startHistoryId=${account.last_history_id}&historyTypes=messageAdded`);
      if (histRes.history) {
        for (const h of histRes.history) {
          if (h.messagesAdded) {
            for (const ma of h.messagesAdded) {
              messageIds.push(ma.message.id);
            }
          }
        }
      }
      // Update historyId
      if (histRes.historyId) {
        await supabase
          .from("crm_email_accounts")
          .update({ last_history_id: histRes.historyId })
          .eq("id", account.id);
      }
    } catch (err: any) {
      // historyId invalid → full resync
      if (err.message?.includes("404") || err.message?.includes("historyId")) {
        console.log("History expired, falling back to full sync");
        messageIds = await getRecentMessageIds(accessToken);
        await updateHistoryId(account.id, accessToken, supabase);
      } else {
        throw err;
      }
    }
  } else {
    // Full initial sync
    messageIds = await getRecentMessageIds(accessToken);
    await updateHistoryId(account.id, accessToken, supabase);
  }

  // Deduplicate
  const uniqueIds = [...new Set(messageIds)];

  // Process each message
  for (const msgId of uniqueIds.slice(0, 200)) {
    try {
      const exists = await supabase
        .from("crm_email_messages")
        .select("id")
        .eq("centre_id", centreId)
        .eq("provider_message_id", msgId)
        .maybeSingle();

      if (exists.data) continue; // Already synced

      const msg = await gmailFetch(accessToken, `/users/me/messages/${msgId}?format=full`);
      await processMessage(msg, account, supabase);
      newMessages++;
    } catch (err: any) {
      console.error(`Error processing message ${msgId}:`, err.message);
    }
  }

  return { newMessages, totalProcessed: uniqueIds.length };
}

async function getRecentMessageIds(accessToken: string): Promise<string[]> {
  const res = await gmailFetch(accessToken, `/users/me/messages?maxResults=100`);
  return (res.messages || []).map((m: any) => m.id);
}

async function updateHistoryId(accountId: string, accessToken: string, supabase: any) {
  const profile = await gmailFetch(accessToken, `/users/me/profile`);
  if (profile.historyId) {
    await supabase
      .from("crm_email_accounts")
      .update({ last_history_id: profile.historyId })
      .eq("id", accountId);
  }
}

async function processMessage(msg: any, account: any, supabase: any) {
  const centreId = account.centre_id;
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || null;

  const from = getHeader("From") || "";
  const to = getHeader("To") || "";
  const cc = getHeader("Cc") || "";
  const subject = getHeader("Subject") || "";
  const messageIdHeader = getHeader("Message-ID") || "";
  const inReplyTo = getHeader("In-Reply-To") || null;
  const referencesHeader = getHeader("References") || null;
  const date = getHeader("Date");

  const fromParsed = parseEmailAddress(from);
  const toParsed = (to || "").split(",").map((e: string) => parseEmailAddress(e.trim())).filter(Boolean);
  const ccParsed = (cc || "").split(",").map((e: string) => parseEmailAddress(e.trim())).filter(Boolean);

  // Determine direction
  const accountEmail = account.email_address.toLowerCase();
  const direction = fromParsed.email?.toLowerCase() === accountEmail ? "outbound" : "inbound";

  // Upsert thread
  const threadId = msg.threadId;
  const { data: thread } = await supabase
    .from("crm_email_threads")
    .upsert({
      centre_id: centreId,
      account_id: account.id,
      provider: "gmail",
      provider_thread_id: threadId,
      subject: subject || null,
      last_message_at: date ? new Date(date).toISOString() : new Date().toISOString(),
      snippet: msg.snippet || null,
      has_attachments: hasAttachments(msg.payload),
      participants: JSON.stringify([fromParsed, ...toParsed]),
    }, { onConflict: "centre_id,provider,provider_thread_id" })
    .select()
    .single();

  if (!thread) return;

  // Update thread counters
  await supabase.rpc("", {}).catch(() => {}); // placeholder
  const { count } = await supabase
    .from("crm_email_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", thread.id);

  await supabase
    .from("crm_email_threads")
    .update({
      message_count: (count || 0) + 1,
      is_unread: direction === "inbound",
      has_attachments: hasAttachments(msg.payload),
    })
    .eq("id", thread.id);

  // Extract body
  const bodyText = extractBody(msg.payload, "text/plain");
  const bodyHtml = extractBody(msg.payload, "text/html");

  // Insert message
  await supabase
    .from("crm_email_messages")
    .insert({
      centre_id: centreId,
      thread_id: thread.id,
      provider: "gmail",
      provider_message_id: msg.id,
      source_system: "gmail",
      in_reply_to: inReplyTo,
      references_header: referencesHeader,
      message_id_header: messageIdHeader,
      direction,
      from_address: fromParsed.email || from,
      from_name: fromParsed.name || null,
      to_addresses: JSON.stringify(toParsed),
      cc_addresses: JSON.stringify(ccParsed),
      subject: subject || null,
      body_text: bodyText,
      body_html: bodyHtml,
      snippet: msg.snippet || null,
      gmail_label_ids: msg.labelIds || [],
      gmail_internal_date: msg.internalDate ? new Date(parseInt(msg.internalDate)).toISOString() : null,
      has_attachments: hasAttachments(msg.payload),
      received_at: date ? new Date(date).toISOString() : new Date().toISOString(),
    });

  // Auto-link: find matching contact/prospect by email
  const senderEmail = direction === "inbound" ? (fromParsed.email || "") : "";
  if (senderEmail) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("centre_id", centreId)
      .ilike("email", senderEmail)
      .eq("archived", false)
      .maybeSingle();

    if (contact) {
      await supabase
        .from("crm_email_links")
        .upsert({
          centre_id: centreId,
          thread_id: thread.id,
          entity_type: "contact",
          entity_id: contact.id,
          is_primary: true,
          link_source: "auto",
          confidence_score: 1.0,
        }, { onConflict: "thread_id,entity_type,entity_id" });
    } else {
      // Try prospects
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id")
        .eq("centre_id", centreId)
        .ilike("email", senderEmail)
        .maybeSingle();

      if (prospect) {
        await supabase
          .from("crm_email_links")
          .upsert({
            centre_id: centreId,
            thread_id: thread.id,
            entity_type: "prospect",
            entity_id: prospect.id,
            is_primary: true,
            link_source: "auto",
            confidence_score: 1.0,
          }, { onConflict: "thread_id,entity_type,entity_id" });
      }
    }
  }

  // Process attachments
  await processAttachments(msg, thread.id, centreId, account, supabase);
}

async function processAttachments(msg: any, threadId: string, centreId: string, account: any, supabase: any) {
  const parts = flattenParts(msg.payload);
  for (const part of parts) {
    if (!part.filename || part.filename === "") continue;
    if (!part.body?.attachmentId) continue;

    // Just record metadata for now, don't download
    await supabase
      .from("crm_email_attachments")
      .insert({
        centre_id: centreId,
        message_id: threadId, // Will be updated with correct message id
        filename: part.filename,
        mime_type: part.mimeType || null,
        size_bytes: part.body?.size || null,
      })
      .catch(() => {}); // Ignore duplicates
  }
}

function flattenParts(payload: any): any[] {
  if (!payload) return [];
  const results: any[] = [];
  if (payload.parts) {
    for (const part of payload.parts) {
      results.push(part);
      results.push(...flattenParts(part));
    }
  }
  return results;
}

function hasAttachments(payload: any): boolean {
  return flattenParts(payload).some((p) => p.filename && p.filename !== "");
}

function extractBody(payload: any, mimeType: string): string | null {
  if (!payload) return null;
  if (payload.mimeType === mimeType && payload.body?.data) {
    return atob(payload.body.data.replace(/-/g, "+").replace(/_/g, "/"));
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part, mimeType);
      if (result) return result;
    }
  }
  return null;
}

function parseEmailAddress(raw: string): { email: string | null; name: string | null } {
  if (!raw) return { email: null, name: null };
  const match = raw.match(/^(.+?)\s*<(.+?)>$/);
  if (match) {
    return { name: match[1].replace(/"/g, "").trim(), email: match[2].trim() };
  }
  return { email: raw.trim(), name: null };
}

async function gmailFetch(accessToken: string, path: string): Promise<any> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API ${res.status}: ${text}`);
  }
  return res.json();
}
