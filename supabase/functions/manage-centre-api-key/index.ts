import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateApiKey(): string {
  // 32 octets aléatoires en base32-like → ~52 chars
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `ct3p_${hex}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Non autorisé" });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user?.id) {
      console.error("Auth error:", userErr);
      return json(401, { error: "Token invalide" });
    }

    const userId = userData.user.id;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Vérifier super_admin
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isSuperAdmin = roles?.some((r: any) => r.role === "super_admin");
    if (!isSuperAdmin) {
      return json(403, { error: "Accès réservé aux super administrateurs" });
    }

    const body = await req.json().catch(() => ({}));
    const { centre_id, label, action } = body as {
      centre_id?: string;
      label?: string;
      action?: "create" | "regenerate" | "revoke";
    };

    if (!centre_id) return json(400, { error: "centre_id requis" });
    if (!action) return json(400, { error: "action requise (create|regenerate|revoke)" });

    if (action === "revoke") {
      const { error } = await admin
        .from("centre_api_keys")
        .update({ actif: false, revoked_at: new Date().toISOString(), revoked_by: userId })
        .eq("centre_id", centre_id)
        .eq("actif", true);
      if (error) return json(400, { error: error.message });
      return json(200, { success: true });
    }

    // create / regenerate : on révoque l'ancienne d'abord
    await admin
      .from("centre_api_keys")
      .update({ actif: false, revoked_at: new Date().toISOString(), revoked_by: userId })
      .eq("centre_id", centre_id)
      .eq("actif", true);

    const apiKey = generateApiKey();
    const keyHash = await sha256(apiKey);
    const keyPrefix = apiKey.slice(0, 12); // ct3p_xxxxxxx

    const { data, error } = await admin
      .from("centre_api_keys")
      .insert({
        centre_id,
        key_prefix: keyPrefix,
        key_hash: keyHash,
        label: label || "Clé principale",
        created_by: userId,
        actif: true,
      })
      .select()
      .single();

    if (error) return json(400, { error: error.message });

    return json(200, {
      success: true,
      api_key: apiKey,
      key_prefix: keyPrefix,
      record: data,
      warning:
        "⚠️ Cette clé ne sera plus jamais affichée. Copiez-la maintenant et stockez-la en lieu sûr.",
    });
  } catch (err) {
    console.error("manage-centre-api-key error:", err);
    return json(500, { error: (err as Error).message });
  }
});
