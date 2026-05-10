import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
};

// ---------------------------------------------------------------------------
// Resource scoping configuration
// ---------------------------------------------------------------------------
// Some tables have `centre_id` directly. Others must be scoped through a
// related entity (session, contact, facture). We declare per-resource how to
// enforce centre isolation so we never leak data across centres.
// ---------------------------------------------------------------------------

type ScopeConfig =
  | { kind: "direct" }
  | {
      kind: "via";
      // FK column on this table
      fkColumn: string;
      // Parent table holding centre_id
      parentTable: "sessions" | "contacts" | "factures";
    };

const RESOURCE_SCOPE: Record<string, ScopeConfig> = {
  // Direct centre_id
  contacts: { kind: "direct" },
  prospects: { kind: "direct" },
  sessions: { kind: "direct" },
  factures: { kind: "direct" },
  catalogue_formations: { kind: "direct" },
  formateurs: { kind: "direct" },
  vehicules: { kind: "direct" },
  creneaux_conduite: { kind: "direct" },
  rappels: { kind: "direct" },

  // Indirect via session
  session_inscriptions: { kind: "via", fkColumn: "session_id", parentTable: "sessions" },
  emargements: { kind: "via", fkColumn: "session_id", parentTable: "sessions" },

  // Indirect via contact
  contact_documents: { kind: "via", fkColumn: "contact_id", parentTable: "contacts" },
  contact_historique: { kind: "via", fkColumn: "contact_id", parentTable: "contacts" },

  // Indirect via facture
  paiements: { kind: "via", fkColumn: "facture_id", parentTable: "factures" },
};

const ALLOWED_RESOURCES = new Set(Object.keys(RESOURCE_SCOPE));

// Resources that support soft-delete (have a `deleted_at` column).
const SOFT_DELETE_RESOURCES = new Set<string>([
  "contacts",
  "prospects",
  "sessions",
  "factures",
  "catalogue_formations",
  "session_inscriptions",
  "emargements",
  "contact_documents",
  "paiements",
]);

function hasSoftDelete(resource: string): boolean {
  return SOFT_DELETE_RESOURCES.has(resource);
}

function shouldIncludeDeleted(params: URLSearchParams): boolean {
  const v = params.get("include_deleted");
  return v === "true" || v === "1";
}

function applySoftDeleteScope(query: any, resource: string, params: URLSearchParams) {
  if (!hasSoftDelete(resource)) return query;
  if (shouldIncludeDeleted(params)) return query;
  return query.is("deleted_at", null);
}

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

// ---------------------------------------------------------------------------
// Centre scoping helpers
// ---------------------------------------------------------------------------

/** Build the select clause: for indirect resources, embed parent for inner join. */
function selectWithScope(resource: string, baseSelect = "*"): string {
  const scope = RESOURCE_SCOPE[resource];
  if (scope.kind === "direct") return baseSelect;
  // PostgREST inner join — restricts rows to those whose parent matches the filter.
  return `${baseSelect}, ${scope.parentTable}!inner(centre_id)`;
}

/** Apply the centre_id filter to a select query, accounting for indirect scopes. */
function applyCentreScope<T>(query: any, resource: string, centreId: string) {
  const scope = RESOURCE_SCOPE[resource];
  if (scope.kind === "direct") {
    return query.eq("centre_id", centreId);
  }
  return query.eq(`${scope.parentTable}.centre_id`, centreId);
}

/**
 * For indirect resources on POST: verify the parent FK provided in payload
 * actually belongs to the caller's centre. Returns null if OK, otherwise an
 * error response.
 */
async function verifyParentBelongsToCentre(
  admin: SupabaseClient,
  resource: string,
  payload: Record<string, unknown>,
  centreId: string,
): Promise<Response | null> {
  const scope = RESOURCE_SCOPE[resource];
  if (scope.kind === "direct") return null;

  const parentId = payload[scope.fkColumn];
  if (!parentId || typeof parentId !== "string") {
    return json(400, {
      error: `Champ '${scope.fkColumn}' requis pour créer une ressource '${resource}'`,
    });
  }
  const { data, error } = await admin
    .from(scope.parentTable)
    .select("centre_id")
    .eq("id", parentId)
    .maybeSingle();

  if (error) return json(400, { error: error.message });
  if (!data) return json(404, { error: `${scope.parentTable} introuvable` });
  if ((data as any).centre_id !== centreId) {
    return json(403, { error: "Accès refusé : la ressource parente appartient à un autre centre" });
  }
  return null;
}

/**
 * For indirect resources on PATCH/DELETE/GET-by-id: verify the record exists
 * AND its parent belongs to the caller's centre. Returns null if OK, otherwise
 * an error response.
 */
async function verifyRecordInCentre(
  admin: SupabaseClient,
  resource: string,
  recordId: string,
  centreId: string,
): Promise<Response | null> {
  const scope = RESOURCE_SCOPE[resource];
  if (scope.kind === "direct") {
    const { data, error } = await admin
      .from(resource)
      .select("centre_id")
      .eq("id", recordId)
      .maybeSingle();
    if (error) return json(400, { error: error.message });
    if (!data) return json(404, { error: "Introuvable" });
    if ((data as any).centre_id !== centreId) {
      return json(404, { error: "Introuvable" });
    }
    return null;
  }

  const { data, error } = await admin
    .from(resource)
    .select(`id, ${scope.parentTable}!inner(centre_id)`)
    .eq("id", recordId)
    .maybeSingle();
  if (error) return json(400, { error: error.message });
  if (!data) return json(404, { error: "Introuvable" });
  const parent = (data as any)[scope.parentTable];
  const parentCentreId = Array.isArray(parent) ? parent[0]?.centre_id : parent?.centre_id;
  if (parentCentreId !== centreId) {
    return json(404, { error: "Introuvable" });
  }
  return null;
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
          .select("id, session_id, statut, statut_paiement, date_inscription, track, sessions!inner(id, nom, formation_type, date_debut, date_fin, centre_id)")
          .eq("contact_id", recordId)
          .eq("sessions.centre_id", centreId)
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

    const scope = RESOURCE_SCOPE[resource];

    // 4. Routage CRUD — tout est scopé par centre_id (direct ou indirect)
    switch (method) {
      case "GET": {
        if (recordId) {
          const { data, error } = await admin
            .from(resource)
            .select(selectWithScope(resource))
            .eq("id", recordId)
            .maybeSingle();
          if (error) return json(400, { error: error.message });
          if (!data) return json(404, { error: "Introuvable" });
          if (scope.kind === "via") {
            const parent = (data as any)[scope.parentTable];
            const parentCentreId = Array.isArray(parent) ? parent[0]?.centre_id : parent?.centre_id;
            if (parentCentreId !== centreId) return json(404, { error: "Introuvable" });
          } else if ((data as any).centre_id !== centreId) {
            return json(404, { error: "Introuvable" });
          }
          // Soft-delete: par défaut, ne pas exposer une ligne supprimée
          if (
            hasSoftDelete(resource) &&
            !shouldIncludeDeleted(url.searchParams) &&
            (data as any).deleted_at != null
          ) {
            return json(404, { error: "Introuvable" });
          }
          return json(200, { data });
        }

        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10), 500);
        const offset = parseInt(url.searchParams.get("offset") || "0", 10);
        const orderParam = url.searchParams.get("order") || "created_at.desc";
        const [orderCol, orderDir] = orderParam.split(".");
        const searchTerm = url.searchParams.get("search");

        let query = admin
          .from(resource)
          .select(selectWithScope(resource), { count: "exact" })
          .range(offset, offset + limit - 1)
          .order(orderCol || "created_at", { ascending: orderDir !== "desc" });

        // 1. Centre scoping
        query = applyCentreScope(query, resource, centreId);

        // 2. Soft-delete par défaut (sauf include_deleted=true)
        query = applySoftDeleteScope(query, resource, url.searchParams);

        // 3. Recherche full-text
        if (searchTerm && SEARCH_COLUMNS[resource]) {
          const safe = searchTerm.replace(/[%,()]/g, "");
          const orFilter = SEARCH_COLUMNS[resource]
            .map((col) => `${col}.ilike.%${safe}%`)
            .join(",");
          query = query.or(orFilter);
        }

        // 4. Filtres simples ?field=value
        const RESERVED = new Set(["limit", "offset", "order", "search", "include_deleted"]);
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
        // Build payload — for direct scopes inject centre_id; for indirect scopes
        // verify parent belongs to centre and DON'T inject centre_id (no such column).
        let payload: Record<string, unknown>;
        if (scope.kind === "direct") {
          payload = { ...body, centre_id: centreId };
        } else {
          payload = { ...body };
          // Remove any spurious centre_id the caller might pass (column doesn't exist)
          delete (payload as any).centre_id;
          const verifyErr = await verifyParentBelongsToCentre(admin, resource, payload, centreId);
          if (verifyErr) return verifyErr;
        }
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
        // Vérifie d'abord que l'enregistrement appartient bien au centre
        const scopeErr = await verifyRecordInCentre(admin, resource, recordId, centreId);
        if (scopeErr) return scopeErr;

        // On ignore toute tentative de changer centre_id (immuable / inexistant)
        const { centre_id: _omit, ...patch } = body as Record<string, unknown>;

        // Pour les ressources indirectes, si le caller change le FK parent,
        // re-vérifier que le nouveau parent est bien dans le centre.
        if (scope.kind === "via" && patch[scope.fkColumn]) {
          const verifyErr = await verifyParentBelongsToCentre(admin, resource, patch, centreId);
          if (verifyErr) return verifyErr;
        }

        const { data, error } = await admin
          .from(resource)
          .update(patch)
          .eq("id", recordId)
          .select()
          .maybeSingle();
        if (error) return json(400, { error: error.message });
        if (!data) return json(404, { error: "Introuvable" });
        return json(200, { data });
      }

      case "DELETE": {
        if (!recordId) return json(400, { error: "ID manquant dans l'URL" });
        const scopeErr = await verifyRecordInCentre(admin, resource, recordId, centreId);
        if (scopeErr) return scopeErr;

        // Soft-delete pour les ressources qui le supportent (jamais de DELETE physique)
        if (hasSoftDelete(resource)) {
          const reason = url.searchParams.get("delete_reason") || "Supprimé via API";
          const { error } = await admin
            .from(resource)
            .update({ deleted_at: new Date().toISOString(), delete_reason: reason })
            .eq("id", recordId)
            .is("deleted_at", null);
          if (error) {
            console.error("api-v1 soft-delete error:", error);
            return json(400, { error: "Suppression impossible" });
          }
          return json(200, { success: true, soft_deleted: true });
        }

        // Refus pour les ressources qui n'ont pas de colonne deleted_at
        return json(405, {
          error: `La suppression n'est pas supportée pour la ressource '${resource}'`,
        });
      }

      default:
        return json(405, { error: `Méthode ${method} non supportée` });
    }
  } catch (err) {
    console.error("api-v1 error:", err);
    return json(500, { error: "Erreur interne du serveur" });
  }
});
