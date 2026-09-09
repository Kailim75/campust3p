import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

/**
 * Point d'entrée UNIQUE du flux de signature public (SignaturePage).
 *
 * Deux jetons, deux portées :
 *  - access_token  (lecture) : transporté dans l'URL /signature/:id/:token.
 *    Autorise `get_info`, `list_related`, `get_document_url`.
 *  - signing_token (écriture) : n'apparaît jamais dans une URL ; obtenu en
 *    mémoire via resolve-signing-token. Autorise `sign` et `refuse`.
 *    Mis à NULL après signature ou refus (usage unique).
 *
 * Les anciennes RPC `get_signature_request_public`, `get_related_signature_docs`,
 * `sign_document_public` et `refuse_document_public` (accessibles à anon sans
 * aucun jeton — audit du 13/08/2026, P0) sont révoquées par la migration
 * 20260909230000 : ne pas les réutiliser.
 *
 * Toute comparaison de jeton est en temps constant. Un jeton stocké NULL ne
 * valide jamais (plus de « fallback legacy » : les liens antérieurs au
 * durcissement d'avril 2026 ont tous expiré — validité 30 jours).
 */

interface SignRequest {
  action?: "sign" | "refuse" | "get_document_url" | "get_info" | "list_related";
  signatureId: string;
  accessToken?: string;
  signingToken?: string;
  signatureDataBase64?: string;
  userAgent?: string;
  commentaires?: string;
}

interface SigRow {
  id: string;
  titre: string | null;
  description: string | null;
  type_document: string | null;
  date_expiration: string | null;
  statut: string;
  document_url: string | null;
  signature_url: string | null;
  contact_id: string | null;
  document_storage_path: string | null;
  document_storage_bucket: string | null;
  access_token: string | null;
  signing_token: string | null;
}

interface RelatedRow {
  id: string;
  titre: string | null;
  type_document: string | null;
  statut: string;
  document_url: string | null;
  date_envoi: string | null;
  date_signature: string | null;
  access_token: string | null;
  date_expiration: string | null;
  created_at: string | null;
}

function constantTimeEq(stored: string | null | undefined, provided: string | null | undefined): boolean {
  if (!stored || !provided || stored.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < stored.length; i++) {
    diff |= stored.charCodeAt(i) ^ provided.charCodeAt(i);
  }
  return diff === 0;
}

function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isExpiredDateOnly(dateExpiration: string | null): boolean {
  if (!dateExpiration) return false;
  return dateExpiration.slice(0, 10) < todayDateKey();
}

/** Adresse IP du signataire (valeur probante), derrière le proxy Supabase. */
function clientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  return ip ? ip.slice(0, 64) : null;
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  const jsonResponse = (body: Record<string, unknown>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: SignRequest = await req.json();
    const action = body.action || "sign";
    const { signatureId } = body;

    if (!signatureId) {
      return jsonResponse({ success: false, error: "signatureId requis" }, 400);
    }

    // Une seule lecture de la demande pour toutes les actions.
    const { data: rowData, error: fetchError } = await supabase
      .from("signature_requests")
      .select(
        "id, titre, description, type_document, date_expiration, statut, document_url, signature_url, contact_id, document_storage_path, document_storage_bucket, access_token, signing_token",
      )
      .eq("id", signatureId)
      .maybeSingle();

    if (fetchError || !rowData) {
      return jsonResponse({ success: false, error: "Document introuvable", code: "NOT_FOUND" }, 404);
    }
    const row = rowData as SigRow;

    const readOk = constantTimeEq(row.access_token, body.accessToken);
    // false si signing_token est NULL (document déjà signé/refusé) — voulu.
    const writeOk = constantTimeEq(row.signing_token, body.signingToken);
    const deny = (code: "TOKEN_REQUIRED" | "TOKEN_INVALID" = "TOKEN_INVALID") =>
      jsonResponse({ success: false, error: "Lien invalide ou expiré", code }, 401);

    // ─── get_info (lecture) — remplace la RPC get_signature_request_public ───
    if (action === "get_info") {
      if (!readOk) return deny(body.accessToken ? "TOKEN_INVALID" : "TOKEN_REQUIRED");

      let contact: { nom: string | null; prenom: string | null; email: string | null } | null = null;
      if (row.contact_id) {
        const { data } = await supabase
          .from("contacts")
          .select("nom, prenom, email")
          .eq("id", row.contact_id)
          .maybeSingle();
        contact = data ?? null;
      }

      return jsonResponse({
        success: true,
        request: {
          id: row.id,
          titre: row.titre,
          description: row.description,
          type_document: row.type_document,
          date_expiration: row.date_expiration,
          statut: row.statut,
          document_url: row.document_url,
          signature_url: row.signature_url,
          contact_id: row.contact_id,
          contact_nom: contact?.nom ?? null,
          contact_prenom: contact?.prenom ?? null,
          contact_email: contact?.email ?? null,
          document_storage_path: row.document_storage_path,
          document_storage_bucket: row.document_storage_bucket,
        },
      });
    }

    // ─── list_related (lecture) — remplace la RPC get_related_signature_docs ───
    // Les autres documents du MÊME signataire, avec leur access_token : c'est ce
    // qui permet la signature en lot. Gardé par le jeton de lecture de la
    // demande courante (plus de listing à partir d'un simple contact_id).
    if (action === "list_related") {
      if (!readOk) return deny(body.accessToken ? "TOKEN_INVALID" : "TOKEN_REQUIRED");
      if (!row.contact_id) return jsonResponse({ success: true, documents: [] });

      const { data: docsData } = await supabase
        .from("signature_requests")
        .select("id, titre, type_document, statut, document_url, date_envoi, date_signature, access_token, date_expiration, created_at")
        .eq("contact_id", row.contact_id);

      const rank = (d: RelatedRow) =>
        d.statut === "signe" ? 0 : d.statut === "envoye" && !isExpiredDateOnly(d.date_expiration) ? 1 : 2;
      const ts = (d: RelatedRow) => new Date(d.date_signature || d.date_envoi || d.created_at || 0).getTime();

      const documents = ((docsData ?? []) as RelatedRow[])
        .sort((a, b) => rank(a) - rank(b) || ts(b) - ts(a))
        .map((d) => ({
          id: d.id,
          titre: d.titre,
          type_document: d.type_document,
          statut: d.statut,
          document_url: d.document_url,
          date_envoi: d.date_envoi,
          date_signature: d.date_signature,
          access_token: d.access_token,
          date_expiration: d.date_expiration,
        }));

      return jsonResponse({ success: true, documents });
    }

    // ─── get_document_url (lecture) ───
    // Jeton de lecture suffisant (le PDF signé reste consultable par le
    // signataire après signature) ; le jeton d'écriture est aussi accepté.
    if (action === "get_document_url") {
      if (!readOk && !writeOk) {
        return deny(body.accessToken || body.signingToken ? "TOKEN_INVALID" : "TOKEN_REQUIRED");
      }

      // Priorité 1 : chemin de stockage stable → URL signée fraîche (1 h)
      if (row.document_storage_path && row.document_storage_bucket) {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from(row.document_storage_bucket)
          .createSignedUrl(row.document_storage_path, 3600);

        if (signedUrlError || !signedUrlData?.signedUrl) {
          console.error("Signed URL generation failed:", signedUrlError);
          return jsonResponse(
            { success: false, error: "Le fichier du document est introuvable dans le stockage.", code: "FILE_NOT_FOUND" },
            404,
          );
        }
        return jsonResponse({ success: true, url: signedUrlData.signedUrl, source: "storage_path" });
      }

      // Priorité 2 : document_url hérité (peut être expiré)
      if (row.document_url) {
        return jsonResponse({
          success: true,
          url: row.document_url,
          source: "legacy_url",
          warning: "URL héritée — peut être expirée",
        });
      }

      return jsonResponse(
        { success: false, error: "Aucun document associé à cette demande de signature.", code: "NO_DOCUMENT" },
        404,
      );
    }

    // ─── refuse (écriture) — remplace la RPC refuse_document_public ───
    if (action === "refuse") {
      if (!writeOk) return deny(body.signingToken ? "TOKEN_INVALID" : "TOKEN_REQUIRED");
      if (!["en_attente", "envoye"].includes(row.statut)) {
        return jsonResponse({ success: false, error: "Ce document ne peut plus être modifié" }, 400);
      }

      const { error: refuseError } = await supabase
        .from("signature_requests")
        .update({
          statut: "refuse",
          commentaires: (body.commentaires || "Refusé par le signataire").slice(0, 2000),
          signing_token: null,
        })
        .eq("id", signatureId);

      if (refuseError) {
        console.error("Refuse error:", refuseError);
        return jsonResponse({ success: false, error: "Erreur lors du refus" }, 500);
      }
      return jsonResponse({ success: true });
    }

    // ─── sign (écriture, action par défaut) ───
    const { signatureDataBase64, userAgent } = body;
    if (!signatureDataBase64) {
      return jsonResponse({ success: false, error: "Paramètres manquants" }, 400);
    }
    if (!writeOk) {
      console.warn("[public-sign-document] sign token check failed");
      return deny(body.signingToken ? "TOKEN_INVALID" : "TOKEN_REQUIRED");
    }
    if (!["en_attente", "envoye"].includes(row.statut)) {
      return jsonResponse({ success: false, error: "Ce document ne peut plus être signé" }, 400);
    }
    if (isExpiredDateOnly(row.date_expiration)) {
      return jsonResponse({ success: false, error: "Ce lien de signature a expiré" }, 400);
    }

    const { data: contact } = await supabase
      .from("contacts")
      .select("centre_id")
      .eq("id", row.contact_id ?? "")
      .maybeSingle();
    const centreId = contact?.centre_id || "unknown";

    const fileName = `centre/${centreId}/signatures/${row.contact_id}/sig-${signatureId}-${Date.now()}.png`;
    const binaryData = decode(signatureDataBase64);

    const { error: uploadError } = await supabase.storage
      .from("generated-documents")
      .upload(fileName, binaryData, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return jsonResponse({ success: false, error: "Erreur lors de l'upload de la signature" }, 500);
    }

    const { error: updateError } = await supabase
      .from("signature_requests")
      .update({
        statut: "signe",
        signature_url: fileName,
        date_signature: new Date().toISOString(),
        user_agent_signature: userAgent || null,
        ip_signature: clientIp(req),
        // Usage unique : le jeton d'écriture est invalidé après signature.
        signing_token: null,
      })
      .eq("id", signatureId);

    if (updateError) {
      console.error("Update error:", updateError);
      return jsonResponse({ success: false, error: "Erreur lors de la mise à jour" }, 500);
    }

    console.log(`Document ${signatureId} signed successfully`);
    return jsonResponse({ success: true });
  } catch (error: unknown) {
    console.error("Error in public-sign-document:", error);
    return jsonResponse({ success: false, error: "Erreur interne" }, 500);
  }
});
