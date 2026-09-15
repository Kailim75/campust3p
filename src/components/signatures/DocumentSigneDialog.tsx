import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { resoudreObjetSignature } from "@/lib/signatures";
import { composerPdfSigne, legendeSignature } from "@/lib/documentSigne";

/**
 * Champs minimaux nécessaires à l'affichage — satisfait aussi bien par
 * SignatureRequest (page principale) que par les lignes du panneau de suivi.
 */
export type SignatureAAfficher = {
  titre?: string | null;
  signature_url: string | null;
  document_storage_path: string | null;
  document_storage_bucket: string | null;
  date_signature: string | null;
  contact?: { nom?: string | null; prenom?: string | null } | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signature: SignatureAAfficher | null;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("Lecture du fichier impossible"));
    r.readAsDataURL(blob);
  });
}

async function telechargerOctets(bucket: string, path: string): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error || !data?.signedUrl) throw new Error("Accès au document refusé ou introuvable");
  const resp = await fetch(data.signedUrl);
  if (!resp.ok) throw new Error("Téléchargement du document échoué");
  return resp.arrayBuffer();
}

async function chargerSignatureDataUrl(signatureUrl: string): Promise<string> {
  const cible = resoudreObjetSignature(signatureUrl);
  if (!cible) {
    // URL externe : tentative de fetch direct.
    const resp = await fetch(signatureUrl);
    if (!resp.ok) throw new Error("Signature inaccessible");
    return blobToDataUrl(await resp.blob());
  }
  const { data, error } = await supabase.storage.from(cible.bucket).createSignedUrl(cible.path, 60 * 5);
  if (error || !data?.signedUrl) throw new Error("Accès à la signature refusé ou introuvable");
  const resp = await fetch(data.signedUrl);
  if (!resp.ok) throw new Error("Téléchargement de la signature échoué");
  return blobToDataUrl(await resp.blob());
}

export function DocumentSigneDialog({ open, onOpenChange, signature }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdf, setPdf] = useState<Blob | null>(null);

  useEffect(() => {
    if (!open || !signature) {
      setPdf(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPdf(null);

    (async () => {
      try {
        const path = signature.document_storage_path;
        const bucket = signature.document_storage_bucket || "generated-documents";
        if (!path) throw new Error("Aucun document n'est associé à cette signature.");
        if (!signature.signature_url) throw new Error("Aucune signature enregistrée.");

        const [docOctets, sigDataUrl] = await Promise.all([
          telechargerOctets(bucket, path),
          chargerSignatureDataUrl(signature.signature_url),
        ]);

        const nom = signature.contact
          ? `${signature.contact.prenom ?? ""} ${signature.contact.nom ?? ""}`.trim()
          : "";
        const blob = await composerPdfSigne(
          docOctets,
          sigDataUrl,
          legendeSignature(nom, signature.date_signature),
        );
        if (!cancelled) setPdf(blob);
      } catch (e: unknown) {
        console.error("Document signé : composition impossible", e);
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, signature]);

  const telecharger = () => {
    if (!pdf) return;
    const url = URL.createObjectURL(pdf);
    const a = document.createElement("a");
    a.href = url;
    const base = (signature?.titre || "document").replace(/[^\w.-]+/g, "_").slice(0, 80);
    a.download = `signe-${base}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between gap-3 space-y-0">
          <DialogTitle className="text-base truncate">
            Document signé — {signature?.titre ?? ""}
          </DialogTitle>
          {pdf && (
            <Button variant="outline" size="sm" className="gap-1.5 mr-8" onClick={telecharger}>
              <Download className="h-4 w-4" />
              Télécharger
            </Button>
          )}
        </DialogHeader>

        <div className="flex-1 min-h-0 bg-muted/20">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm">Assemblage du document signé…</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center">
              <div className="flex max-w-sm flex-col items-center gap-3 text-center text-muted-foreground">
                <AlertCircle className="h-8 w-8" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          ) : (
            <PDFViewer pdfData={pdf} className="h-full" onDownload={telecharger} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
