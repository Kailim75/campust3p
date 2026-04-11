import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";

type Action = "archive" | "trash" | "mark_read" | "mark_unread" | "add_labels" | "remove_labels";

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

    // ── Auth ──
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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Role check ──
    const { data: userRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (userRoles || []).map((r: any) => r.role);
    const isAllowed = roles.some((r: string) => ["admin", "staff", "super_admin"].includes(r));
    if (!isAllowed) {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse body ──
    const body = await req.json();
    const { threadId, centreId, action, labels } = body as {
      threadId: string;
      centreId: string;
      action: Action;
      labels?: string[];
    };

    if (!threadId || !centreId || !action) {
      return new Response(JSON.stringify({ error: "threadId, centreId, and action are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Centre access ──
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

    // ── Get thread + account ──
    const { data: thread, error: tErr } = await supabase
      .from("crm_email_threads")
      .select("*, crm_email_accounts!inner(*)")
      .eq("id", threadId)
      .eq("centre_id", centreId)
      .single();

    if (tErr || !thread) {
      return new Response(JSON.stringify({ error: "Thread non trouvé" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const account = (thread as any).crm_email_accounts;

    // ── Refresh token if needed ──
    let accessToken = account.oauth_encrypted_token;
    if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
      accessToken = await refreshToken(account, supabase, gmailClientId, gmailClientSecret);
    }

    // ── Get all message IDs in this thread from Gmail ──
    const gmailThread = await gmailFetch(accessToken, `/users/me/threads/${thread.provider_thread_id}?format=minimal`);
    const messageIds: string[] = (gmailThread.messages || []).map((m: any) => m.id);

    // ── Execute action ──
    switch (action) {
      case "archive": {
        // Archive = remove INBOX label from all messages
        for (const msgId of messageIds) {
          await gmailModify(accessToken, msgId, { removeLabelIds: ["INBOX"] });
        }
        // Update CRM status
        await supabase
          .from("crm_email_threads")
          .update({ status: "archive", archived_at: new Date().toISOString() })
          .eq("id", threadId);
        break;
      }

      case "trash": {
        // Trash via Gmail API (not permanent delete)
        await gmailFetchPost(accessToken, `/users/me/threads/${thread.provider_thread_id}/trash`, {});
        // Mark in CRM
        await supabase
          .from("crm_email_threads")
          .update({ status: "archive", archived_at: new Date().toISOString() })
          .eq("id", threadId);
        break;
      }

      case "mark_read": {
        for (const msgId of messageIds) {
          await gmailModify(accessToken, msgId, { removeLabelIds: ["UNREAD"] });
        }
        await supabase
          .from("crm_email_threads")
          .update({ is_unread: false })
          .eq("id", threadId);
        break;
      }

      case "mark_unread": {
        // Mark last message as unread
        if (messageIds.length > 0) {
          await gmailModify(accessToken, messageIds[messageIds.length - 1], { addLabelIds: ["UNREAD"] });
        }
        await supabase
          .from("crm_email_threads")
          .update({ is_unread: true })
          .eq("id", threadId);
        break;
      }

      case "add_labels": {
        if (!labels || labels.length === 0) break;
        // Get Gmail label IDs
        const labelMap = await getGmailLabelMap(accessToken);
        const addIds: string[] = [];
        for (const label of labels) {
          let gmailId = labelMap.get(label);
          // Create label if it doesn't exist
          if (!gmailId) {
            try {
              const created = await gmailFetchPost(accessToken, `/users/me/labels`, {
                name: label,
                labelListVisibility: "labelShow",
                messageListVisibility: "show",
              });
              if (created?.id) {
                gmailId = created.id;
                labelMap.set(label, gmailId!);
              }
            } catch (e: any) {
              console.error(`Failed to create label ${label}:`, e.message);
            }
          }
          if (gmailId) addIds.push(gmailId);
        }
        // Apply to all messages in thread
        if (addIds.length > 0) {
          for (const msgId of messageIds) {
            await gmailModify(accessToken, msgId, { addLabelIds: addIds });
          }
        }
        // Update CRM labels
        const existing: string[] = thread.crm_labels || [];
        const merged = [...new Set([...existing, ...labels])].slice(0, 5);
        await supabase
          .from("crm_email_threads")
          .update({ crm_labels: merged })
          .eq("id", threadId);
        break;
      }

      case "remove_labels": {
        if (!labels || labels.length === 0) break;
        const labelMap = await getGmailLabelMap(accessToken);
        const removeIds: string[] = [];
        for (const label of labels) {
          const gmailId = labelMap.get(label);
          if (gmailId) removeIds.push(gmailId);
        }
        if (removeIds.length > 0) {
          for (const msgId of messageIds) {
            await gmailModify(accessToken, msgId, { removeLabelIds: removeIds });
          }
        }
        // Update CRM labels
        const existing2: string[] = thread.crm_labels || [];
        const filtered = existing2.filter((l) => !labels.includes(l));
        await supabase
          .from("crm_email_threads")
          .update({ crm_labels: filtered })
          .eq("id", threadId);
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, action }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("gmail-thread-actions error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helpers ──

async function getGmailLabelMap(accessToken: string): Promise<Map<string, string>> {
  const res = await gmailFetch(accessToken, `/users/me/labels`);
  const map = new Map<string, string>();
  for (const label of (res.labels || [])) {
    map.set(label.name, label.id);
  }
  return map;
}

async function gmailModify(accessToken: string, messageId: string, body: { addLabelIds?: string[]; removeLabelIds?: string[] }) {
  try {
    await gmailFetchPost(accessToken, `/users/me/messages/${messageId}/modify`, body);
  } catch (e: any) {
    console.error(`Failed to modify message ${messageId}:`, e.message);
  }
}

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
