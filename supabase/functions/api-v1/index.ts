import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

// Tables exposées via l'API publique (CRUD complet, scopé par centre_id)
const ALLOWED_RESOURCES = new Set([
  "contacts",
  "prospects",
  "sessions",
  "session_inscriptions",
  "factures",
  "paiements",
  "catalogue_formations",
  "formateurs",
  "vehicules",
  "creneaux_conduite",
  "contact_documents",
  "contact_historique",
  "emargements",
  "rappels",
]);

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Récupérer la clé API
    const apiKey =
      req.headers.get("x-api-key") ||
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

    if (!apiKey || !apiKey.startsWith("ct3p_")) {
      return json(401, {
        error: "Clé API manquante ou invalide. Utilisez l'en-tête 'x-api-key: ct3p_...'",
      });
    }

    // 2. Valider la clé via RPC
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const keyHash = await sha256(apiKey);

    const { data: centreId, error: validateError } = await admin.rpc("validate_api_key", {
      p_key_hash: keyHash,
    });

    if (validateError || !centreId) {
      return json(401, { error: "Clé API invalide ou révoquée" });
    }

    // 3. Parser l'URL : /api-v1/<resource>/<id?>
    const url = new URL(req.url);
    const pathParts = url.pathname.replace(/^\/+|\/+$/g, "").split("/");
    // Format attendu : ["api-v1", "<resource>", "<id?>"]
    const apiIndex = pathParts.indexOf("api-v1");
    const resource = pathParts[apiIndex + 1];
    const recordId = pathParts[apiIndex + 2];

    if (!resource) {
      return json(200, {
        message: "API CampusT3P v1",
        centre_id: centreId,
        resources: Array.from(ALLOWED_RESOURCES),
        usage: {
          list: "GET /api-v1/<resource>?limit=50&offset=0",
          get: "GET /api-v1/<resource>/<id>",
          create: "POST /api-v1/<resource>",
          update: "PATCH /api-v1/<resource>/<id>",
          delete: "DELETE /api-v1/<resource>/<id>",
        },
      });
    }

    if (!ALLOWED_RESOURCES.has(resource)) {
      return json(404, {
        error: `Ressource '${resource}' non disponible`,
        available: Array.from(ALLOWED_RESOURCES),
      });
    }

    const method = req.method.toUpperCase();
    const subAction = pathParts[apiIndex + 3]; // ex: /contacts/<id>/summary

    // 4bis. Endpoint spécial : GET /contacts/<id>/summary (agrégat lecture seule)
    if (
      method === "GET" &&
      resource === "contacts" &&
      recordId &&
      subAction === "summary"
    ) {
      const [contact, inscriptions, factures, documents, historique] = await Promise.all([
        admin.from("contacts").select("*").eq("id", recordId).eq("centre_id", centreId).maybeSingle(),
        admin
          .from("session_inscriptions")
          .select("id, session_id, statut, statut_paiement, date_inscription, track, sessions(id, nom, formation_type, date_debut, date_fin)")
          .eq("contact_id", recordId)
          .is("deleted_at", null),
        admin
          .from("factures")
          .select("id, numero_facture, montant_total, statut, date_emission")
          .eq("contact_id", recordId)
          .eq("centre_id", centreId)
          .is("deleted_at", null),
        admin
          .from("contact_documents")
          .select("id, nom, type_document, date_expiration, created_at")
          .eq("contact_id", recordId)
          .is("deleted_at", null),
        admin
          .from("contact_historique")
          .select("id, type, titre, contenu, date_echange, date_rappel")
          .eq("contact_id", recordId)
          .order("date_echange", { ascending: false })
          .limit(20),
      ]);

      if (!contact.data) return json(404, { error: "Contact introuvable" });

      return json(200, {
        data: {
          contact: contact.data,
          inscriptions: inscriptions.data ?? [],
          factures: factures.data ?? [],
          documents: documents.data ?? [],
          historique: historique.data ?? [],
          stats: {
            nb_inscriptions: inscriptions.data?.length ?? 0,
            nb_factures: factures.data?.length ?? 0,
            nb_documents: documents.data?.length ?? 0,
            ca_total:
              factures.data?.reduce((sum: number, f: any) => sum + Number(f.montant_total ?? 0), 0) ??
              0,
          },
        },
      });
    }

    // Colonnes de recherche full-text par ressource (paramètre ?search=)
    const SEARCH_COLUMNS: Record<string, string[]> = {
      contacts: ["nom", "prenom", "email", "telephone", "telephone_normalise", "ville"],
      prospects: ["nom", "prenom", "email", "telephone"],
      sessions: ["nom", "formation_type", "lieu"],
      catalogue_formations: ["intitule", "code", "categorie"],
      formateurs: ["nom", "prenom", "email"],
      factures: ["numero_facture"],
    };

    // 4. Routage CRUD — tout est scopé par centre_id
    switch (method) {
      case "GET": {
        if (recordId) {
          const { data, error } = await admin
            .from(resource)
            .select("*")
            .eq("id", recordId)
            .eq("centre_id", centreId)
            .maybeSingle();
          if (error) return json(400, { error: error.message });
          if (!data) return json(404, { error: "Introuvable" });
          return json(200, { data });
        }

        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
        const offset = parseInt(url.searchParams.get("offset") || "0", 10);
        const orderParam = url.searchParams.get("order") || "created_at.desc";
        const [orderCol, orderDir] = orderParam.split(".");
        const searchTerm = url.searchParams.get("search");

        let query = admin
          .from(resource)
          .select("*", { count: "exact" })
          .eq("centre_id", centreId)
          .range(offset, offset + limit - 1)
          .order(orderCol || "created_at", { ascending: orderDir !== "desc" });

        // Recherche full-text (ILIKE multi-colonnes via .or())
        if (searchTerm && SEARCH_COLUMNS[resource]) {
          const safe = searchTerm.replace(/[%,()]/g, "");
          const orFilter = SEARCH_COLUMNS[resource]
            .map((col) => `${col}.ilike.%${safe}%`)
            .join(",");
          query = query.or(orFilter);
        }

        // Filtres simples ?field=value (réservé : limit/offset/order/search)
        const RESERVED = new Set(["limit", "offset", "order", "search"]);
        for (const [key, value] of url.searchParams.entries()) {
          if (RESERVED.has(key)) continue;
          query = query.eq(key, value);
        }

        const { data, error, count } = await query;
        if (error) return json(400, { error: error.message });
        return json(200, { data, count, limit, offset });
      }

      case "POST": {
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return json(400, { error: "Body JSON invalide" });
        }
        const payload = { ...body, centre_id: centreId };
        const { data, error } = await admin
          .from(resource)
          .insert(payload)
          .select()
          .maybeSingle();
        if (error) return json(400, { error: error.message });
        return json(201, { data });
      }

      case "PATCH":
      case "PUT": {
        if (!recordId) return json(400, { error: "ID manquant dans l'URL" });
        const body = await req.json().catch(() => null);
        if (!body || typeof body !== "object") {
          return json(400, { error: "Body JSON invalide" });
        }
        // On ignore toute tentative de changer centre_id (immuable)
        const { centre_id: _omit, ...patch } = body as Record<string, unknown>;
        const { data, error } = await admin
          .from(resource)
          .update(patch)
          .eq("id", recordId)
          .eq("centre_id", centreId)
          .select()
          .maybeSingle();
        if (error) return json(400, { error: error.message });
        if (!data) return json(404, { error: "Introuvable" });
        return json(200, { data });
      }

      case "DELETE": {
        if (!recordId) return json(400, { error: "ID manquant dans l'URL" });
        const { error } = await admin
          .from(resource)
          .delete()
          .eq("id", recordId)
          .eq("centre_id", centreId);
        if (error) return json(400, { error: error.message });
        return json(200, { success: true });
      }

      default:
        return json(405, { error: `Méthode ${method} non supportée` });
    }
  } catch (err) {
    console.error("api-v1 error:", err);
    return json(500, { error: (err as Error).message });
  }
});
