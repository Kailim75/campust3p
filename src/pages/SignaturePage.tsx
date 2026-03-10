import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SignatureCanvas } from "@/components/signatures/SignatureCanvas";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast, Toaster } from "sonner";
import {
  Check,
  X,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  Eye,
  FileSignature,
} from "lucide-react";
import { PDFViewer } from "@/components/ui/pdf-viewer";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface SignatureData {
  id: string;
  titre: string;
  description: string | null;
  type_document: string;
  date_expiration: string | null;
  statut: string;
  document_url: string | null;
  signature_url: string | null;
  contact_id: string;
  contact: { id: string; nom: string; prenom: string; email: string | null } | null;
}

interface RelatedDocument {
  id: string;
  titre: string;
  type_document: string;
  statut: string;
  document_url: string | null;
  date_envoi: string | null;
  date_signature: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  convention: "Convention de formation",
  contrat: "Contrat de formation",
  cgv: "Conditions générales de vente",
  reglement: "Règlement intérieur",
  programme: "Programme de formation",
  convocation: "Convocation",
  attestation: "Attestation",
};

export default function SignaturePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [sigRequest, setSigRequest] = useState<SignatureData | null>(null);
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showRefuse, setShowRefuse] = useState(false);
  const [refuseReason, setRefuseReason] = useState("");
  const [signing, setSigning] = useState(false);
  const [refusing, setRefusing] = useState(false);
  const [completed, setCompleted] = useState<"signed" | "refused" | null>(null);

  useEffect(() => {
    if (!id) return;
    loadSignatureRequest();
  }, [id]);

  const loadSignatureRequest = async () => {
    try {
      // Use Security Definer RPC to bypass RLS on contacts table
      const { data, error: fetchError } = await (supabase as any)
        .rpc("get_signature_request_public", { p_signature_id: id! });

      if (fetchError || !data || (Array.isArray(data) && data.length === 0)) {
        setError("Document introuvable ou lien expiré.");
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;

      if (row.statut === "signe") {
        setCompleted("signed");
      } else if (row.statut === "refuse") {
        setCompleted("refused");
      } else if (row.date_expiration && new Date(row.date_expiration) < new Date()) {
        setError("Ce lien de signature a expiré.");
        return;
      }

      const sigData: SignatureData = {
        id: row.id,
        titre: row.titre,
        description: row.description,
        type_document: row.type_document,
        date_expiration: row.date_expiration,
        statut: row.statut,
        document_url: row.document_url,
        signature_url: row.signature_url,
        contact_id: row.contact_id,
        contact: row.contact_nom ? {
          id: row.contact_id,
          nom: row.contact_nom,
          prenom: row.contact_prenom,
          email: row.contact_email,
        } : null,
      };

      setSigRequest(sigData);

      // Load related documents via RPC
      if (row.contact_id) {
        const { data: related } = await (supabase as any)
          .rpc("get_related_signature_docs", { p_contact_id: row.contact_id });

        if (related && Array.isArray(related)) {
          const seen = new Set<string>();
          const unique = related.filter((d: any) => {
            if (seen.has(d.type_document)) return false;
            seen.add(d.type_document);
            return true;
          });
          setRelatedDocs(unique as RelatedDocument[]);
        }
      }
    } catch {
      setError("Erreur lors du chargement du document.");
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signatureData || !acceptedTerms || !sigRequest) return;
    setSigning(true);

    try {
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, "");

      // Use Edge Function to handle upload + update (bypasses storage RLS for public page)
      const { data: result, error: fnError } = await supabase.functions.invoke("public-sign-document", {
        body: {
          signatureId: sigRequest.id,
          signatureDataBase64: base64Data,
          userAgent: navigator.userAgent,
        },
      });

      if (fnError) throw fnError;
      if (result && !result.success) throw new Error(result.error);

      setCompleted("signed");
      loadSignatureRequest();
      toast.success("Document signé avec succès !");
    } catch (err: any) {
      console.error("Signing error:", err);
      toast.error("Erreur lors de la signature. Veuillez réessayer.");
    } finally {
      setSigning(false);
    }
  };

  const handleRefuse = async () => {
    if (!sigRequest) return;
    setRefusing(true);

    try {
      // Use Security Definer RPC to refuse document
      const { data: result, error: rpcError } = await (supabase as any)
        .rpc("refuse_document_public", {
          p_signature_id: sigRequest.id,
          p_commentaires: refuseReason || "Refusé par le signataire",
        });

      if (rpcError) throw rpcError;
      if (result && !result.success) throw new Error(result.error);

      setCompleted("refused");
      toast.success("Document refusé.");
    } catch {
      toast.error("Erreur lors du refus.");
    } finally {
      setRefusing(false);
    }
  };

  const handleDownloadDocument = async (doc: RelatedDocument) => {
    if (doc.document_url) {
      window.open(doc.document_url, "_blank");
    } else {
      toast.info("Le document sera disponible au téléchargement prochainement.");
    }
  };

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case "signe":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3" /> Signé
          </span>
        );
      case "refuse":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <XCircle className="h-3 w-3" /> Refusé
          </span>
        );
      case "envoye":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <FileSignature className="h-3 w-3" /> En attente
          </span>
        );
      default:
        return null;
    }
  };

  const contact = sigRequest?.contact as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">T3P Formation</h1>
          <p className="text-sm text-slate-500">Signature électronique de document</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="text-slate-500">Chargement du document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <XCircle className="h-12 w-12 text-red-400" />
              <p className="text-slate-600 text-center">{error}</p>
            </div>
          ) : completed === "signed" ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h2 className="text-xl font-semibold text-slate-800">Document signé</h2>
                <p className="text-slate-500 text-center max-w-md">
                  Votre signature a été enregistrée avec succès.
                </p>
              </div>

              {/* Documents section after signing */}
              {relatedDocs.length > 0 && (
                <DocumentsSection
                  docs={relatedDocs}
                  currentId={id!}
                  onDownload={handleDownloadDocument}
                  getStatusBadge={getStatusBadge}
                  title="Vos documents de formation"
                />
              )}
            </div>
          ) : completed === "refused" ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <XCircle className="h-16 w-16 text-red-400" />
              <h2 className="text-xl font-semibold text-slate-800">Document refusé</h2>
              <p className="text-slate-500 text-center max-w-md">
                Votre refus a été enregistré. Vous pouvez fermer cette page.
              </p>
            </div>
          ) : !showRefuse ? (
            <div className="space-y-6">
              {/* Document Info */}
              <div className="rounded-lg border bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-slate-800">{sigRequest?.titre}</span>
                </div>
                {sigRequest?.description && (
                  <p className="text-sm text-slate-500">{sigRequest.description}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {contact && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <User className="h-4 w-4" />
                      <span>{contact.prenom} {contact.nom}</span>
                    </div>
                  )}
                  {sigRequest?.date_expiration && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Expire le {format(parseISO(sigRequest.date_expiration), "d MMMM yyyy", { locale: fr })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview of current document */}
              {sigRequest?.document_url && (
                <div className="rounded-lg border overflow-hidden bg-white">
                  <div className="flex items-center justify-between p-3 border-b bg-slate-50">
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Aperçu du document
                    </span>
                  </div>
                  <PDFViewer
                    pdfData={sigRequest.document_url}
                    className="h-[400px]"
                    onDownload={() => window.open(sigRequest.document_url!, "_blank")}
                  />
                </div>
              )}

              {/* Related documents before signing */}
              {relatedDocs.length > 1 && (
                <DocumentsSection
                  docs={relatedDocs}
                  currentId={id!}
                  onDownload={handleDownloadDocument}
                  getStatusBadge={getStatusBadge}
                  title="Documents liés à votre formation"
                />
              )}

              {/* Signature Canvas */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Votre signature</Label>
                <SignatureCanvas onSignatureChange={setSignatureData} />
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-3 rounded-lg border p-4 bg-slate-50">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                />
                <div className="space-y-1">
                  <Label htmlFor="terms" className="text-sm font-medium cursor-pointer">
                    J'ai lu et j'accepte les conditions
                  </Label>
                  <p className="text-xs text-slate-500">
                    En signant ce document, je reconnais avoir pris connaissance de son contenu
                    et j'accepte les termes et conditions qui y sont décrits. Cette signature
                    électronique a la même valeur qu'une signature manuscrite.
                  </p>
                </div>
              </div>

              {/* Legal */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
                <p className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Cette signature électronique est horodatée et enregistrée avec votre adresse IP
                    pour garantir son authenticité conformément à la réglementation en vigueur.
                  </span>
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-between pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowRefuse(true)}
                  className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={!signatureData || !acceptedTerms || signing}
                  className="bg-blue-600 hover:bg-blue-700 gap-2"
                >
                  {signing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signature en cours...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Signer le document
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                <p className="text-sm text-red-700 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Vous êtes sur le point de refuser ce document
                </p>
              </div>
              <div className="space-y-2">
                <Label>Motif du refus (optionnel)</Label>
                <Textarea
                  value={refuseReason}
                  onChange={(e) => setRefuseReason(e.target.value)}
                  placeholder="Expliquez pourquoi vous refusez de signer..."
                  rows={4}
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setShowRefuse(false)}>
                  Retour
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRefuse}
                  disabled={refusing}
                >
                  {refusing ? "Refus en cours..." : "Confirmer le refus"}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          T3P Formation — Centre de formation Taxi, VTC et VMDTR
        </p>
      </div>
    </div>
  );
}

function DocumentsSection({
  docs,
  currentId,
  onDownload,
  getStatusBadge,
  title,
}: {
  docs: RelatedDocument[];
  currentId: string;
  onDownload: (doc: RelatedDocument) => void;
  getStatusBadge: (statut: string) => React.ReactNode;
  title: string;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  const handlePreview = (doc: RelatedDocument) => {
    if (doc.document_url) {
      setPreviewUrl(doc.document_url);
      setPreviewTitle(TYPE_LABELS[doc.type_document] || doc.titre);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
        <Download className="h-4 w-4" />
        {title}
      </h3>
      <div className="divide-y rounded-lg border overflow-hidden">
        {docs.map((doc) => (
          <div
            key={doc.id}
            className={`flex items-center justify-between p-3 text-sm ${
              doc.id === currentId ? "bg-blue-50" : "bg-white hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-slate-700 truncate">
                  {TYPE_LABELS[doc.type_document] || doc.titre}
                </p>
                {doc.date_signature && (
                  <p className="text-xs text-slate-400">
                    Signé le {format(parseISO(doc.date_signature), "d MMM yyyy", { locale: fr })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {getStatusBadge(doc.statut)}
              {doc.statut === "envoye" && doc.id !== currentId && (
                <a
                  href={`/signature/${doc.id}`}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                >
                  <FileSignature className="h-3 w-3" />
                  Signer
                </a>
              )}
              {doc.document_url && (
                <>
                  <button
                    onClick={() => handlePreview(doc)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
                    title="Visualiser le document"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => onDownload(doc)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
                    title="Télécharger le document"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Inline PDF Viewer */}
      {previewUrl && (
        <div className="rounded-lg border overflow-hidden bg-white">
          <div className="flex items-center justify-between p-3 border-b bg-slate-50">
            <span className="text-sm font-medium text-slate-700">{previewTitle}</span>
            <button
              onClick={() => setPreviewUrl(null)}
              className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100"
            >
              Fermer
            </button>
          </div>
          <PDFViewer
            pdfData={previewUrl}
            className="h-[500px] rounded-b-lg"
            onDownload={() => window.open(previewUrl, "_blank")}
          />
        </div>
      )}
    </div>
  );
}
