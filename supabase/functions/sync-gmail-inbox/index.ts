import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

// ─── CRM Label taxonomy ─────────────────────────────────────
const CRM_LABELS = [
  "CRM/Prospect",
  "CRM/Apprenant",
  "CRM/Document",
  "CRM/Facturation",
  "CRM/Urgent",
  "CRM/A traiter",
  "CRM/Non rattaché",
] as const;

type CrmLabel = typeof CRM_LABELS[number];

const BILLING_KEYWORDS = ["facture", "paiement", "règlement", "cpf", "opco", "financement", "devis"];
const URGENT_KEYWORDS = ["urgent", "urgence", "immédiat", "asap"];
const DOC_MIME_TYPES = [
  "application/pdf", "image/jpeg", "image/png", "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

// Cache: accountId → { labelName → gmailLabelId }
const labelIdCache = new Map<string, Map<string, string>>();

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
      const stateParam = url.searchParams.get("state");
      const error = url.searchParams.get("error");

      let accountId = stateParam;
      let returnTo = "/inbox";

      if (stateParam) {
        try {
          const parsedState = JSON.parse(atob(stateParam));
          accountId = parsedState.accountId || stateParam;
          if (
            typeof parsedState.returnTo === "string" &&
            parsedState.returnTo.trim()
          ) {
            returnTo = parsedState.returnTo;
          }
        } catch {
          accountId = stateParam;
        }
      }

      if (error) {
        return Response.redirect(
          `${returnTo}?gmail_oauth_error=${encodeURIComponent(error)}`,
          302,
        );
      }

      if (!code || !accountId) {
        return Response.redirect(
          `${returnTo}?gmail_oauth_error=missing_callback_params`,
          302,
        );
      }

      const redirectUri =
        `${supabaseUrl}/functions/v1/sync-gmail-inbox?callback=true`;

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
        const oauthError = tokens.error_description || tokens.error;
        return Response.redirect(
          `${returnTo}?gmail_oauth_error=${encodeURIComponent(oauthError)}`,
          302,
        );
      }

      const expiresAt = new Date(
        Date.now() + (tokens.expires_in || 3600) * 1000,
      ).toISOString();
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

      return Response.redirect(`${returnTo}?gmail_connected=1`, 302);
    }

    const body = await req.json();

    // ─── OAuth Init ─────────────────────────────────────────────
    if (body.action === "init_oauth") {
      if (!gmailClientId || !gmailClientSecret) {
        throw new Error("Gmail OAuth credentials not configured");
      }

      const { centreId, email, displayName } = body;
      if (!centreId || !email) throw new Error("centreId and email required");

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

      const requestOrigin = req.headers.get("origin") || (() => {
        try {
          const referer = req.headers.get("referer");
          return referer ? new URL(referer).origin : null;
        } catch {
          return null;
        }
      })();

      const statePayload = btoa(JSON.stringify({
        accountId: account.id,
        returnTo: requestOrigin ? `${requestOrigin}/inbox` : "/inbox",
      }));

      const redirectUri =
        `${supabaseUrl}/functions/v1/sync-gmail-inbox?callback=true`;
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
        `&include_granted_scopes=true` +
        `&login_hint=${encodeURIComponent(email)}` +
        `&prompt=${encodeURIComponent("select_account consent")}` +
        `&state=${encodeURIComponent(statePayload)}`;

      return new Response(JSON.stringify({ authUrl, accountId: account.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── OAuth Callback (POST from frontend, fallback) ─────────
    if (body.action === "oauth_callback") {
      const code = body.code;
      const accountId = body.accountId;
      if (!code || !accountId) throw new Error("Missing code or accountId");

      const redirectUri =
        `${supabaseUrl}/functions/v1/sync-gmail-inbox?callback=true`;
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
        throw new Error(
          `OAuth error: ${tokens.error_description || tokens.error}`,
        );
      }

      const expiresAt = new Date(
        Date.now() + (tokens.expires_in || 3600) * 1000,
      ).toISOString();
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
        let accessToken = account.oauth_encrypted_token;
        if (
          account.oauth_token_expires_at &&
          new Date(account.oauth_token_expires_at) < new Date()
        ) {
          accessToken = await refreshGmailToken(
            account,
            supabase,
            gmailClientId!,
            gmailClientSecret!,
          );
        }

        const syncResult = await syncAccount(account, accessToken, supabase);
        results.push({ accountId: account.id, ...syncResult });

        await supabase
          .from("crm_email_accounts")
          .update({
            sync_status: "idle",
            sync_error: null,
            last_sync_at: new Date().toISOString(),
          })
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

// ─── Token refresh ───────────────────────────────────────────
async function refreshGmailToken(
  account: any,
  supabase: any,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  if (!account.oauth_refresh_token) {
    throw new Error("No refresh token available");
  }

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

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000)
    .toISOString();
  await supabase
    .from("crm_email_accounts")
    .update({
      oauth_encrypted_token: data.access_token,
      oauth_token_expires_at: expiresAt,
    })
    .eq("id", account.id);

  return data.access_token;
}

// ─── Sync account ────────────────────────────────────────────
async function syncAccount(account: any, accessToken: string, supabase: any) {
  const centreId = account.centre_id;
  let newMessages = 0;

  const { data: existingThreads } = await supabase
    .from("crm_email_threads")
    .select("id")
    .eq("account_id", account.id)
    .limit(1000);

  const existingThreadIds = (existingThreads || []).map((thread: { id: string }) => thread.id);
  let hasLocalMessages = false;

  if (existingThreadIds.length > 0) {
    const { count: localMessageCount } = await supabase
      .from("crm_email_messages")
      .select("id", { count: "exact", head: true })
      .in("thread_id", existingThreadIds);

    hasLocalMessages = (localMessageCount || 0) > 0;
  }

  await supabase
    .from("crm_email_accounts")
    .update({ sync_status: "syncing" })
    .eq("id", account.id);

  let messageIds: string[] = [];

  if (account.last_history_id && hasLocalMessages) {
    try {
      const histRes = await gmailFetch(
        accessToken,
        `/users/me/history?startHistoryId=${account.last_history_id}&historyTypes=messageAdded`,
      );
      if (histRes.history) {
        for (const h of histRes.history) {
          if (h.messagesAdded) {
            for (const ma of h.messagesAdded) {
              messageIds.push(ma.message.id);
            }
          }
        }
      }
      if (histRes.historyId) {
        await supabase
          .from("crm_email_accounts")
          .update({ last_history_id: histRes.historyId })
          .eq("id", account.id);
      }
    } catch (err: any) {
      if (err.message?.includes("404") || err.message?.includes("historyId")) {
        console.log("History expired, falling back to full sync");
        messageIds = await getRecentMessageIds(accessToken);
        await updateHistoryId(account.id, accessToken, supabase);
      } else {
        throw err;
      }
    }
  } else {
    messageIds = await getRecentMessageIds(accessToken);
    await updateHistoryId(account.id, accessToken, supabase);
  }

  const uniqueIds = [...new Set(messageIds)];

  // Ensure CRM labels exist in Gmail (once per sync run)
  await ensureGmailLabels(accessToken, account.id);

  for (const msgId of uniqueIds.slice(0, 200)) {
    try {
      const exists = await supabase
        .from("crm_email_messages")
        .select("id")
        .eq("centre_id", centreId)
        .eq("provider_message_id", msgId)
        .maybeSingle();

      if (exists.data) continue;

      const msg = await gmailFetch(
        accessToken,
        `/users/me/messages/${msgId}?format=full`,
      );
      await processMessage(msg, account, accessToken, supabase);
      newMessages++;
    } catch (err: any) {
      console.error(`Error processing message ${msgId}:`, err.message);
    }
  }

  return { newMessages, totalProcessed: uniqueIds.length };
}

// ─── Gmail label management ─────────────────────────────────
async function ensureGmailLabels(accessToken: string, accountId: string) {
  // Use cache to avoid repeated API calls
  if (labelIdCache.has(accountId)) return;

  try {
    const labelsRes = await gmailFetch(accessToken, `/users/me/labels`);
    const existing = (labelsRes.labels || []) as { id: string; name: string }[];
    const cache = new Map<string, string>();

    for (const label of existing) {
      if ((CRM_LABELS as readonly string[]).includes(label.name)) {
        cache.set(label.name, label.id);
      }
    }

    // Create missing labels
    for (const labelName of CRM_LABELS) {
      if (!cache.has(labelName)) {
        try {
          const created = await gmailFetchPost(accessToken, `/users/me/labels`, {
            name: labelName,
            labelListVisibility: "labelShow",
            messageListVisibility: "show",
          });
          if (created?.id) {
            cache.set(labelName, created.id);
          }
        } catch (err: any) {
          console.error(`Failed to create Gmail label ${labelName}:`, err.message);
        }
      }
    }

    labelIdCache.set(accountId, cache);
  } catch (err: any) {
    console.error("Failed to ensure Gmail labels:", err.message);
  }
}

function getGmailLabelId(accountId: string, labelName: string): string | null {
  return labelIdCache.get(accountId)?.get(labelName) || null;
}

// ─── Classification engine ──────────────────────────────────
interface ClassificationContext {
  senderEmail: string;
  subject: string;
  bodyText: string | null;
  direction: string;
  hasExploitableAttachment: boolean;
  isContact: boolean;
  isProspect: boolean;
  hasLink: boolean;
}

function classifyMessage(ctx: ClassificationContext): CrmLabel[] {
  const labels: CrmLabel[] = [];
  const textToScan = `${ctx.subject} ${ctx.bodyText || ""}`.toLowerCase();

  // Rule 1 & 2: Mutual exclusive — Apprenant wins over Prospect
  if (ctx.isContact) {
    labels.push("CRM/Apprenant");
  } else if (ctx.isProspect) {
    labels.push("CRM/Prospect");
  }

  // Rule 3: Non rattaché (no CRM link found)
  if (!ctx.isContact && !ctx.isProspect && !ctx.hasLink && ctx.direction === "inbound") {
    labels.push("CRM/Non rattaché");
  }

  // Rule 4: Exploitable attachment
  if (ctx.hasExploitableAttachment) {
    labels.push("CRM/Document");
  }

  // Rule 5: Billing keywords
  if (BILLING_KEYWORDS.some((kw) => textToScan.includes(kw))) {
    labels.push("CRM/Facturation");
  }

  // Rule 6: Urgent keywords
  if (URGENT_KEYWORDS.some((kw) => textToScan.includes(kw))) {
    labels.push("CRM/Urgent");
  }

  // Rule 7: A traiter — inbound with no CRM link
  if (ctx.direction === "inbound" && !ctx.hasLink && !ctx.isContact && !ctx.isProspect) {
    // Already has Non rattaché, skip A traiter to avoid redundancy
  } else if (ctx.direction === "inbound" && !ctx.hasLink) {
    labels.push("CRM/A traiter");
  }

  // Cap at 3 labels max
  return labels.slice(0, 3);
}

async function applyGmailLabels(
  msgId: string,
  labels: CrmLabel[],
  accessToken: string,
  accountId: string,
) {
  if (labels.length === 0) return;

  const addLabelIds: string[] = [];
  for (const label of labels) {
    const gmailId = getGmailLabelId(accountId, label);
    if (gmailId) addLabelIds.push(gmailId);
  }

  if (addLabelIds.length === 0) return;

  try {
    await gmailFetchPost(accessToken, `/users/me/messages/${msgId}/modify`, {
      addLabelIds,
    });
  } catch (err: any) {
    // Non-blocking: label application failure must not break sync
    console.error(`Failed to apply labels to ${msgId}:`, err.message);
  }
}

// ─── Process message ─────────────────────────────────────────
async function processMessage(msg: any, account: any, accessToken: string, supabase: any) {
  const centreId = account.centre_id;
  const headers = msg.payload?.headers || [];
  const getHeader = (name: string) =>
    headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())
      ?.value || null;

  const from = getHeader("From") || "";
  const to = getHeader("To") || "";
  const cc = getHeader("Cc") || "";
  const subject = getHeader("Subject") || "";
  const messageIdHeader = getHeader("Message-ID") || "";
  const inReplyTo = getHeader("In-Reply-To") || null;
  const referencesHeader = getHeader("References") || null;
  const date = getHeader("Date");

  const fromParsed = parseEmailAddress(from);
  const toParsed = (to || "").split(",").map((e: string) =>
    parseEmailAddress(e.trim())
  ).filter(Boolean);
  const ccParsed = (cc || "").split(",").map((e: string) =>
    parseEmailAddress(e.trim())
  ).filter(Boolean);

  const accountEmail = account.email_address.toLowerCase();
  const direction = fromParsed.email?.toLowerCase() === accountEmail
    ? "outbound"
    : "inbound";

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
      last_message_at: date
        ? new Date(date).toISOString()
        : new Date().toISOString(),
      snippet: msg.snippet || null,
      has_attachments: hasAttachments(msg.payload),
      participants: [fromParsed, ...toParsed],
    }, { onConflict: "centre_id,provider,provider_thread_id" })
    .select()
    .single();

  if (!thread) return;

  // Extract body
  const bodyText = extractBody(msg.payload, "text/plain");
  const bodyHtml = extractBody(msg.payload, "text/html");

  // Insert message
  const { data: insertedMessage, error: insertMessageError } = await supabase
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
      to_addresses: toParsed,
      cc_addresses: ccParsed,
      subject: subject || null,
      body_text: bodyText,
      body_html: bodyHtml,
      snippet: msg.snippet || null,
      gmail_label_ids: msg.labelIds || [],
      gmail_internal_date: msg.internalDate
        ? new Date(parseInt(msg.internalDate)).toISOString()
        : null,
      has_attachments: hasAttachments(msg.payload),
      received_at: date
        ? new Date(date).toISOString()
        : new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertMessageError) {
    throw insertMessageError;
  }

  const { count } = await supabase
    .from("crm_email_messages")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", thread.id);

  // Auto-link: find matching contact/prospect by email
  const senderEmail = direction === "inbound" ? (fromParsed.email || "") : "";
  let isContact = false;
  let isProspect = false;
  let hasLink = false;

  if (senderEmail) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id")
      .eq("centre_id", centreId)
      .ilike("email", senderEmail)
      .eq("archived", false)
      .maybeSingle();

    if (contact) {
      isContact = true;
      hasLink = true;
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
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id")
        .eq("centre_id", centreId)
        .ilike("email", senderEmail)
        .maybeSingle();

      if (prospect) {
        isProspect = true;
        hasLink = true;
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

  // Check if thread already has any link (from previous messages)
  if (!hasLink) {
    const { count: linkCount } = await supabase
      .from("crm_email_links")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", thread.id);
    hasLink = (linkCount || 0) > 0;
  }

  // Detect exploitable attachments
  const parts = flattenParts(msg.payload);
  const hasExploitableAttachment = parts.some(
    (p) => p.filename && p.filename !== "" && p.body?.attachmentId &&
      DOC_MIME_TYPES.some((mt) => (p.mimeType || "").toLowerCase().startsWith(mt))
  );

  // ─── Classification ───────────────────────────────────────
  const crmLabels = classifyMessage({
    senderEmail: senderEmail.toLowerCase(),
    subject,
    bodyText,
    direction,
    hasExploitableAttachment,
    isContact,
    isProspect,
    hasLink,
  });

  // Apply labels in Gmail (non-blocking)
  await applyGmailLabels(msg.id, crmLabels, accessToken, account.id);

  // Update thread with aggregated labels and message count
  // Merge with existing thread labels (union, deduplicate, cap at 5)
  const existingLabels: string[] = thread.crm_labels || [];
  const mergedLabels = [...new Set([...existingLabels, ...crmLabels])].slice(0, 5);

  // Remove "Non rattaché" if thread now has a link
  const finalLabels = hasLink
    ? mergedLabels.filter((l) => l !== "CRM/Non rattaché")
    : mergedLabels;

  await supabase
    .from("crm_email_threads")
    .update({
      message_count: count || 1,
      is_unread: direction === "inbound",
      has_attachments: hasAttachments(msg.payload),
      crm_labels: finalLabels,
      priority: crmLabels.includes("CRM/Urgent") ? "high" : thread.priority,
    })
    .eq("id", thread.id);

  // Process attachments
  if (insertedMessage?.id) {
    await processAttachments(msg, insertedMessage.id, centreId, supabase);
  }
}

// ─── Helpers ─────────────────────────────────────────────────
async function getRecentMessageIds(accessToken: string): Promise<string[]> {
  const res = await gmailFetch(
    accessToken,
    `/users/me/messages?maxResults=100`,
  );
  return (res.messages || []).map((m: any) => m.id);
}

async function updateHistoryId(
  accountId: string,
  accessToken: string,
  supabase: any,
) {
  const profile = await gmailFetch(accessToken, `/users/me/profile`);
  if (profile.historyId) {
    await supabase
      .from("crm_email_accounts")
      .update({ last_history_id: profile.historyId })
      .eq("id", accountId);
  }
}

async function processAttachments(
  msg: any,
  messageId: string,
  centreId: string,
  supabase: any,
) {
  const parts = flattenParts(msg.payload);
  for (const part of parts) {
    if (!part.filename || part.filename === "") continue;
    if (!part.body?.attachmentId) continue;

    await supabase
      .from("crm_email_attachments")
      .insert({
        centre_id: centreId,
        message_id: messageId,
        filename: part.filename,
        mime_type: part.mimeType || null,
        size_bytes: part.body?.size || null,
        gmail_attachment_id: part.body?.attachmentId || null,
      })
      .then(() => null, () => null);
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
    return decodeBase64UrlUtf8(payload.body.data);
  }
  if (payload.parts) {
    for (const part of payload.parts) {
      const result = extractBody(part, mimeType);
      if (result) return result;
    }
  }
  return null;
}

function decodeBase64UrlUtf8(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function parseEmailAddress(
  raw: string,
): { email: string | null; name: string | null } {
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

async function gmailFetchPost(accessToken: string, path: string, body: any): Promise<any> {
  const res = await fetch(`${GMAIL_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gmail API POST ${res.status}: ${text}`);
  }
  return res.json();
}
