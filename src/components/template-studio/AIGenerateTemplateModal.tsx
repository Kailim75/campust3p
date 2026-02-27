import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, Copy, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { useCentreContext } from "@/contexts/CentreContext";
import { cn } from "@/lib/utils";

const AI_DOCUMENT_TYPES = [
  { value: "programme", label: "Programme de formation" },
  { value: "contrat", label: "Contrat de formation" },
  { value: "convention", label: "Convention de formation" },
  { value: "attestation", label: "Attestation de fin de formation" },
  { value: "devis", label: "Devis" },
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
  const [variations, setVariations] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentCentre } = useCentreContext();

  const currentHtml = variations.length > 0 ? variations[currentIndex] : null;

  const handleGenerate = async () => {
    setIsGenerating(true);
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
          variation_hint: variations.length > 0
            ? `Proposez un design DIFFÉRENT des ${variations.length} version(s) précédente(s). Variez la mise en page, les couleurs, la structure et le style typographique.`
            : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setVariations((prev) => [...prev, data.html]);
      setCurrentIndex(variations.length); // point to new one
      toast.success(`Variation ${variations.length + 1} générée !`);
    } catch (err: any) {
      console.error("[AI Template] Error:", err);
      toast.error("Erreur de génération : " + (err.message || "inconnue"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUse = () => {
    if (currentHtml) {
      onUseTemplate(currentHtml, documentType);
      onOpenChange(false);
      resetState();
    }
  };

  const handleDeleteVariation = () => {
    if (variations.length <= 1) {
      setVariations([]);
      setCurrentIndex(0);
      return;
    }
    const newVariations = variations.filter((_, i) => i !== currentIndex);
    setVariations(newVariations);
    setCurrentIndex(Math.min(currentIndex, newVariations.length - 1));
  };

  const resetState = () => {
    setVariations([]);
    setCurrentIndex(0);
    setCustomInstructions("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
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
            Générez plusieurs variations et choisissez celle qui vous convient le mieux.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1">
          {/* Config */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type de document</Label>
              <Select value={documentType} onValueChange={(v) => { setDocumentType(v); resetState(); }}>
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
                placeholder="Ex: Style épuré et moderne, couleurs bleu marine..."
                className="h-[72px]"
              />
            </div>
          </div>

          {/* Generate / Regenerate button */}
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex-1 gap-2"
              size="lg"
              variant={variations.length > 0 ? "outline" : "default"}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : variations.length > 0 ? (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Générer une nouvelle variation
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer le template
                </>
              )}
            </Button>
          </div>

          {/* Variations navigator + preview */}
          {currentHtml && (
            <div className="space-y-3">
              {/* Navigation bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentIndex <= 0} onClick={() => setCurrentIndex((i) => i - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Badge variant="secondary" className="text-xs px-3">
                    Variation {currentIndex + 1} / {variations.length}
                  </Badge>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={currentIndex >= variations.length - 1} onClick={() => setCurrentIndex((i) => i + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={handleDeleteVariation} className="gap-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" /> Supprimer
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(currentHtml); toast.success("HTML copié !"); }} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </Button>
                  <Button size="sm" onClick={handleUse} className="gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Valider cette variation
                  </Button>
                </div>
              </div>

              {/* Variation thumbnails */}
              {variations.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {variations.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-md border-2 flex items-center justify-center text-xs font-medium transition-all",
                        idx === currentIndex
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/50"
                      )}
                    >
                      V{idx + 1}
                    </button>
                  ))}
                </div>
              )}

              {/* Preview */}
              <div className="border rounded-lg overflow-hidden bg-white dark:bg-card">
                <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                    Aperçu — Variation {currentIndex + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {AI_DOCUMENT_TYPES.find(t => t.value === documentType)?.label}
                  </span>
                </div>
                <div
                  className="p-6 prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentHtml) }}
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
