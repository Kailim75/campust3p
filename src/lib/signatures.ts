import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Ouverture d'une image de signature stockée dans un bucket Supabase PRIVÉ
 * (`signatures` et `generated-documents` sont tous deux privés — c'est voulu :
 * ce sont des données personnelles).
 *
 * Problème historique : la valeur `signature_url` en base est hétérogène —
 *   • un CHEMIN BRUT `centre/<centre>/signatures/<contact>/sig-<id>-<ts>.png`
 *     (edge function public-sign-document) : ouvert tel quel, le navigateur le
 *     résout comme une route interne → « Page introuvable » (404 in-app) ;
 *   • une URL `.../object/public/<bucket>/<path>` (getPublicUrl) : sur un bucket
 *     privé, cette URL renvoie 403 → image cassée.
 * Dans les deux cas, ouvrir la valeur directement ne marche pas. La seule voie
 * correcte pour un bucket privé est une URL SIGNÉE générée à la volée.
 */

/**
 * Compose le chemin de téléversement dans le bucket privé "signatures",
 * préfixé par le centre. La policy RLS "sig_insert" (migration
 * 20260305171158) exige `storage_object_centre_id(name) IS NOT NULL`, qui
 * lit le centre au 1er segment du chemin — sans ce préfixe, l'upload est
 * refusé pour tout le monde (staff authentifié inclus). Fonction PURE
 * (testable), partagée par useSignDocument (useSignatures.ts) et
 * useSignEmargement (useEmargements.ts).
 */
export function cheminSignatureCentre(centreId: string, nomFichier: string): string {
  return `${centreId}/${nomFichier}`;
}

/**
 * Déduit le bucket et le chemin de l'objet à signer à partir d'une valeur
 * `signature_url` hétérogène. Fonction PURE (testable).
 * Renvoie null pour une URL externe qu'on ne sait pas re-signer.
 */
export function resoudreObjetSignature(
  valeur: string,
): { bucket: string; path: string } | null {
  const v = (valeur || "").trim();
  if (!v) return null;

  // URL Supabase, publique OU signée OU authentifiée :
  //   .../object/{public|sign|authenticated}/<bucket>/<path>[?token=…]
  const m = v.match(/\/object\/(?:public|sign|authenticated)\/([^/]+)\/([^?]+)/);
  if (m) {
    return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
  }

  // Toute autre URL http(s) : externe et inconnue → on ne re-signe pas.
  if (/^https?:\/\//i.test(v)) return null;

  // Chemin brut de stockage. Le flux de signature publique préfixe par
  // « centre/ » et vit dans le bucket generated-documents ; le reste
  // (émargements : `<id>_<ts>.png`, `emargement_…`, `learner_…`) dans signatures.
  const path = v.replace(/^\/+/, "");
  const bucket = path.startsWith("centre/") ? "generated-documents" : "signatures";
  return { bucket, path };
}

/**
 * Ouvre la signature dans un nouvel onglet via une URL signée fraîche.
 * Ouvre d'abord un onglet vierge de façon SYNCHRONE (dans le geste du clic)
 * pour ne pas être bloqué par le navigateur, puis l'amène sur l'URL signée.
 */
export async function ouvrirSignature(
  signatureUrl: string | null | undefined,
): Promise<void> {
  if (!signatureUrl) {
    toast.error("Aucune signature disponible");
    return;
  }

  // Onglet ouvert dans le geste utilisateur (sinon popup bloquée après l'await).
  const fenetre = window.open("about:blank", "_blank");

  const cible = resoudreObjetSignature(signatureUrl);
  if (!cible) {
    // URL externe qu'on ne sait pas re-signer : tentative directe.
    if (fenetre) fenetre.location.href = signatureUrl;
    else window.open(signatureUrl, "_blank");
    return;
  }

  const { data, error } = await supabase.storage
    .from(cible.bucket)
    .createSignedUrl(cible.path, 60 * 5); // 5 min, suffisant pour l'affichage

  if (error || !data?.signedUrl) {
    if (fenetre) fenetre.close();
    console.error("Signature : URL signée impossible", { cible, error });
    toast.error(
      "Impossible d'ouvrir la signature (fichier introuvable ou accès refusé).",
    );
    return;
  }

  if (fenetre) fenetre.location.href = data.signedUrl;
  else window.open(data.signedUrl, "_blank");
}
