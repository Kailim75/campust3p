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

    const { attachmentId: dbAttachmentId, centreId } = body;
    if (!dbAttachmentId || !centreId) {
      return new Response(JSON.stringify({ error: "attachmentId and centreId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get attachment record
    const { data: attachment, error: attErr } = await supabase
      .from("crm_email_attachments")
      .select("*, crm_email_messages!inner(provider_message_id, thread_id, crm_email_threads!inner(account_id, centre_id))")
      .eq("id", dbAttachmentId)
      .eq("centre_id", centreId)
      .single();

    if (attErr || !attachment) {
      return new Response(JSON.stringify({ error: "Attachment not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already stored, return signed URL
    if (attachment.storage_path) {
      const { data: signedUrl } = await supabase.storage
        .from("crm-email-attachments")
        .createSignedUrl(attachment.storage_path, 300); // 5 min

      return new Response(JSON.stringify({ url: signedUrl?.signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Need to fetch from Gmail
    const thread = attachment.crm_email_messages.crm_email_threads;
    const { data: account } = await supabase
      .from("crm_email_accounts")
      .select("*")
      .eq("id", thread.account_id)
      .single();

    if (!account?.oauth_encrypted_token) {
      return new Response(JSON.stringify({ error: "Gmail account not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refresh token if needed
    let accessToken = account.oauth_encrypted_token;
    if (account.oauth_token_expires_at && new Date(account.oauth_token_expires_at) < new Date()) {
      if (!account.oauth_refresh_token) {
        return new Response(JSON.stringify({ error: "Token expired, reconnection needed" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          refresh_token: account.oauth_refresh_token,
          client_id: gmailClientId,
          client_secret: gmailClientSecret,
          grant_type: "refresh_token",
        }),
      });
      const tokens = await tokenRes.json();
      if (tokens.error) {
        return new Response(JSON.stringify({ error: "Token refresh failed" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      accessToken = tokens.access_token;
      await supabase.from("crm_email_accounts").update({
        oauth_encrypted_token: tokens.access_token,
        oauth_token_expires_at: new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString(),
      }).eq("id", account.id);
    }

    // Find the Gmail attachment ID by fetching the message
    const gmailMessageId = attachment.crm_email_messages.provider_message_id;
    let gmailAttachmentId = attachment.gmail_attachment_id;

    if (!gmailAttachmentId) {
      // Fetch message to find attachment ID
      const msgRes = await fetch(`${GMAIL_API}/users/me/messages/${gmailMessageId}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to fetch Gmail message" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const msg = await msgRes.json();
      
      // Find matching part
      const parts = flattenParts(msg.payload);
      const matchingPart = parts.find((p: any) => 
        p.filename === attachment.filename && p.body?.attachmentId
      );
      
      if (!matchingPart?.body?.attachmentId) {
        return new Response(JSON.stringify({ error: "Attachment no longer available in Gmail" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      gmailAttachmentId = matchingPart.body.attachmentId;

      // Store for future use
      await supabase.from("crm_email_attachments")
        .update({ gmail_attachment_id: gmailAttachmentId })
        .eq("id", dbAttachmentId);
    }

    // Download attachment data
    const attRes = await fetch(
      `${GMAIL_API}/users/me/messages/${gmailMessageId}/attachments/${gmailAttachmentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!attRes.ok) {
      return new Response(JSON.stringify({ error: "Failed to download attachment from Gmail" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const attData = await attRes.json();

    // Decode base64url
    const base64 = attData.data.replace(/-/g, "+").replace(/_/g, "/");
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    // Store in Supabase Storage
    const storagePath = `${centreId}/${dbAttachmentId}/${attachment.filename}`;
    const { error: uploadErr } = await supabase.storage
      .from("crm-email-attachments")
      .upload(storagePath, bytes, {
        contentType: attachment.mime_type || "application/octet-stream",
        upsert: true,
      });

    if (uploadErr) {
      console.error("Storage upload error:", uploadErr);
      return new Response(JSON.stringify({ error: "Failed to store attachment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update record with storage path
    await supabase.from("crm_email_attachments")
      .update({ storage_path: storagePath })
      .eq("id", dbAttachmentId);

    // Return signed URL
    const { data: signedUrl } = await supabase.storage
      .from("crm-email-attachments")
      .createSignedUrl(storagePath, 300);

    return new Response(JSON.stringify({ url: signedUrl?.signedUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("download-email-attachment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
