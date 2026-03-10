import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

interface SignRequest {
  signatureId: string;
  signatureDataBase64: string;
  userAgent?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: SignRequest = await req.json();
    const { signatureId, signatureDataBase64, userAgent } = body;

    if (!signatureId || !signatureDataBase64) {
      return jsonResponse({ success: false, error: "Paramètres manquants" }, 400);
    }

    // Verify the signature request exists and is signable
    const { data: sigRequest, error: fetchError } = await supabase
      .from("signature_requests")
      .select("id, statut, date_expiration, contact_id")
      .eq("id", signatureId)
      .single();

    if (fetchError || !sigRequest) {
      return jsonResponse({ success: false, error: "Document introuvable" }, 404);
    }

    if (!["en_attente", "envoye"].includes(sigRequest.statut)) {
      return jsonResponse({ success: false, error: "Ce document ne peut plus être signé" }, 400);
    }

    if (sigRequest.date_expiration && new Date(sigRequest.date_expiration) < new Date()) {
      return jsonResponse({ success: false, error: "Ce lien de signature a expiré" }, 400);
    }

    // Get centre_id from contact for proper storage path
    const { data: contact } = await supabase
      .from("contacts")
      .select("centre_id")
      .eq("id", sigRequest.contact_id)
      .single();

    const centreId = contact?.centre_id || "unknown";

    // Upload signature image to storage using service role
    const fileName = `centre/${centreId}/signatures/${sigRequest.contact_id}/sig-${signatureId}-${Date.now()}.png`;
    const binaryData = decode(signatureDataBase64);

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return jsonResponse({ success: false, error: "Erreur lors de l'upload de la signature" }, 500);
    }

    // Update signature request
    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        statut: "signe",
        signature_url: fileName,
        date_signature: new Date().toISOString(),
        user_agent_signature: userAgent || null,
      })
      .eq("id", signatureId);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse({ success: false, error: "Erreur lors de la mise à jour" }, 500);
    }

    console.log(`Document ${signatureId} signed successfully`);
    return jsonResponse({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur interne";
    console.error("Error in public-sign-document:", error);
    return jsonResponse({ success: false, error: message }, 500);
  }
});
