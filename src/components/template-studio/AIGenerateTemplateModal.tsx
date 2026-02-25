import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, CheckCircle2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { useCentreContext } from "@/contexts/CentreContext";

const AI_DOCUMENT_TYPES = [
  { value: "programme", label: "Programme de formation" },
  { value: "contrat", label: "Contrat de formation" },
  { value: "convention", label: "Convention de formation" },
  { value: "attestation", label: "Attestation de fin de formation" },
  { value: "invoice", label: "Facture" },
  { value: "convocation", label: "Convocation session" },
  { value: "emargement", label: "Feuille d'émargement" },
  { value: "bulletin_inscription", label: "Bulletin d'inscription" },
  { value: "evaluation_chaud", label: "Évaluation à chaud" },
  { value: "positionnement", label: "Test de positionnement" },
  { value: "reglement_interieur", label: "Règlement intérieur" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (html: string, type: string) => void;
}

export default function AIGenerateTemplateModal({ open, onOpenChange, onUseTemplate }: Props) {
  const [documentType, setDocumentType] = useState("programme");
  const [customInstructions, setCustomInstructions] = useState("");
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentCentre } = useCentreContext();

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedHtml(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template-ai", {
        body: {
          document_type: documentType,
          custom_instructions: customInstructions || undefined,
          centre_info: currentCentre ? {
            nom: currentCentre.nom,
            siret: currentCentre.siret,
            nda: currentCentre.nda,
            adresse: currentCentre.adresse_complete,
          } : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedHtml(data.html);
      toast.success("Template généré avec succès !");
    } catch (err: any) {
      console.error("[AI Template] Error:", err);
      toast.error("Erreur de génération : " + (err.message || "inconnue"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (generatedHtml) {
      onUseTemplate(generatedHtml, documentType);
      onOpenChange(false);
      setGeneratedHtml(null);
      setCustomInstructions("");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setGeneratedHtml(null);
    setCustomInstructions("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générer un template avec l'IA
          </DialogTitle>
          <DialogDescription>
            L'IA crée un template professionnel, conforme Qualiopi & DREETS, avec un design moderne prêt à l'emploi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type de document</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AI_DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Instructions supplémentaires <span className="text-muted-foreground">(optionnel)</span></Label>
              <Textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Ex: Ajouter une section sur les conditions d'annulation..."
                className="h-[72px]"
              />
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full gap-2"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Génération en cours... (10-20s)
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Générer le template
              </>
            )}
          </Button>

          {/* Preview */}
          {generatedHtml && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Aperçu du template généré
                </h3>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    navigator.clipboard.writeText(generatedHtml);
                    toast.success("HTML copié !");
                  }} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    Copier HTML
                  </Button>
                  <Button size="sm" onClick={handleUse} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Utiliser ce template
                  </Button>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden bg-white">
                <div
                  className="p-6 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(generatedHtml) }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
