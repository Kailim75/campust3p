import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignRequest {
  signatureId: string;
  signatureDataBase64: string; // base64 PNG data (without data:image prefix)
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
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify the signature request exists and is signable
    const { data: sigRequest, error: fetchError } = await supabase
      .from("signature_requests")
      .select("id, statut, date_expiration, contact_id")
      .eq("id", signatureId)
      .single();

    if (fetchError || !sigRequest) {
      return new Response(
        JSON.stringify({ success: false, error: "Document introuvable" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!["en_attente", "envoye"].includes(sigRequest.statut)) {
      return new Response(
        JSON.stringify({ success: false, error: "Ce document ne peut plus être signé" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (sigRequest.date_expiration && new Date(sigRequest.date_expiration) < new Date()) {
      return new Response(
        JSON.stringify({ success: false, error: "Ce lien de signature a expiré" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get centre_id from contact for proper storage path
    const { data: contact } = await supabase
      .from("contacts")
      .select("centre_id")
      .eq("id", sigRequest.contact_id)
      .single();

    const centreId = contact?.centre_id || "unknown";

    // Upload signature image to storage using service role
    const fileName = `${centreId}/public-signatures/${signatureId}_${Date.now()}.png`;
    const binaryData = decode(signatureDataBase64);

    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(fileName, binaryData, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de l'upload de la signature" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update signature request via direct update (service role bypasses RLS)
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
      return new Response(
        JSON.stringify({ success: false, error: "Erreur lors de la mise à jour" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Document ${signatureId} signed successfully`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in public-sign-document:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
