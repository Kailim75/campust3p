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
  FileSignature,
  Check,
  X,
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface SignatureData {
  id: string;
  titre: string;
  description: string | null;
  type_document: string;
  date_expiration: string | null;
  statut: string;
  contact: { id: string; nom: string; prenom: string; email: string | null } | null;
}

export default function SignaturePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [sigRequest, setSigRequest] = useState<SignatureData | null>(null);
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
      const { data, error: fetchError } = await supabase
        .from("signature_requests")
        .select("id, titre, description, type_document, date_expiration, statut, contact:contacts(id, nom, prenom, email)")
        .eq("id", id!)
        .single();

      if (fetchError || !data) {
        setError("Document introuvable ou lien expiré.");
        return;
      }

      if (data.statut === "signe") {
        setCompleted("signed");
      } else if (data.statut === "refuse") {
        setCompleted("refused");
      } else if (data.date_expiration && new Date(data.date_expiration) < new Date()) {
        setError("Ce lien de signature a expiré.");
        return;
      }

      setSigRequest(data as unknown as SignatureData);
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
      // Upload signature image
      const fileName = `${sigRequest.id}_${Date.now()}.png`;
      const base64Data = signatureData.replace(/^data:image\/\w+;base64,/, "");
      const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, binaryData, { contentType: "image/png" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("signature_requests")
        .update({
          statut: "signe",
          date_signature: new Date().toISOString(),
          signature_url: urlData.publicUrl,
          user_agent_signature: navigator.userAgent,
        })
        .eq("id", sigRequest.id);

      if (updateError) throw updateError;

      setCompleted("signed");
      toast.success("Document signé avec succès !");
    } catch {
      toast.error("Erreur lors de la signature. Veuillez réessayer.");
    } finally {
      setSigning(false);
    }
  };

  const handleRefuse = async () => {
    if (!sigRequest) return;
    setRefusing(true);

    try {
      const { error: updateError } = await supabase
        .from("signature_requests")
        .update({
          statut: "refuse",
          commentaires: refuseReason || "Refusé par le signataire",
        })
        .eq("id", sigRequest.id);

      if (updateError) throw updateError;

      setCompleted("refused");
      toast.success("Document refusé.");
    } catch {
      toast.error("Erreur lors du refus.");
    } finally {
      setRefusing(false);
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
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h2 className="text-xl font-semibold text-slate-800">Document signé</h2>
              <p className="text-slate-500 text-center max-w-md">
                Votre signature a été enregistrée avec succès. Vous pouvez fermer cette page.
              </p>
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
