import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Download, Eye } from "lucide-react";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCentreFormation } from "@/hooks/useCentreFormation";

// ── Color presets ────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: "Bleu classique", primary: "#3B82F6", accent: "#1E40AF", text: "#1E1E1E" },
  { label: "Vert forêt", primary: "#1E462D", accent: "#2D6A4F", text: "#1E1E1E" },
  { label: "Bordeaux", primary: "#7F1D1D", accent: "#991B1B", text: "#1E1E1E" },
  { label: "Anthracite", primary: "#374151", accent: "#1F2937", text: "#111827" },
  { label: "Violet", primary: "#6D28D9", accent: "#4C1D95", text: "#1E1E1E" },
  { label: "Or & noir", primary: "#1E1E1E", accent: "#B8860B", text: "#1E1E1E" },
];

const FONTS = [
  { label: "Helvetica", value: "helvetica" },
  { label: "Times", value: "times" },
  { label: "Courier", value: "courier" },
];

interface ChevaletEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prenom: string;
  nom: string;
  contactId: string;
  formationType?: string;
}

export function ChevaletEditorDialog({
  open,
  onOpenChange,
  prenom,
  nom,
  contactId,
  formationType = "",
}: ChevaletEditorDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { centreFormation } = useCentreFormation();

  // ── Customization state ─────────────────────────────────────
  const [colorPresetIdx, setColorPresetIdx] = useState(0);
  const [font, setFont] = useState("helvetica");
  const [displayName, setDisplayName] = useState(prenom.toUpperCase());
  const [formation, setFormation] = useState(formationType || "");
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const colors = COLOR_PRESETS[colorPresetIdx];

  // Reset on open
  useEffect(() => {
    if (open) {
      setDisplayName(prenom.toUpperCase());
      setFormation(formationType || "");
    }
  }, [open, prenom, formationType]);

  // ── Live preview on canvas ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 315; // 105mm * 3
    const H = 444; // 148mm * 3
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = colors.primary;
    ctx.lineWidth = 5;
    ctx.strokeRect(15, 15, W - 30, H - 30);

    // Logo area
    const centreName = centreFormation?.nom_commercial || centreFormation?.nom_legal || "CENTRE";
    ctx.fillStyle = "#F3F4F6";
    ctx.fillRect(82, 40, 150, 60);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(centreName.substring(0, 20), W / 2, 76);

    // Formation badge
    if (formation) {
      const badgeY = 140;
      const badgeH = 42;
      ctx.fillStyle = colors.primary;
      roundRect(ctx, 50, badgeY, W - 100, badgeH, 9);
      ctx.fill();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold 18px ${font === "times" ? "serif" : font === "courier" ? "monospace" : "sans-serif"}`;
      ctx.textAlign = "center";
      ctx.fillText(`Formation ${formation}`, W / 2, badgeY + 28);
    }

    // Name
    ctx.fillStyle = colors.text;
    const fontSize = displayName.length > 12 ? 36 : displayName.length > 8 ? 42 : 52;
    ctx.font = `bold ${fontSize}px ${font === "times" ? "serif" : font === "courier" ? "monospace" : "sans-serif"}`;
    ctx.textAlign = "center";
    ctx.fillText(displayName, W / 2, 275);

    // Decorative line
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 305);
    ctx.lineTo(W - 80, 305);
    ctx.stroke();

    // Subtitle
    if (showSubtitle) {
      ctx.fillStyle = "#6B7280";
      ctx.font = `16px ${font === "times" ? "serif" : font === "courier" ? "monospace" : "sans-serif"}`;
      ctx.fillText("STAGIAIRE", W / 2, 340);
    }

    // Bottom accent line
    ctx.fillStyle = colors.primary;
    ctx.fillRect(15, H - 25, W - 30, 10);
  }, [colors, font, displayName, formation, showSubtitle, centreFormation]);

  // ── Generate PDF ────────────────────────────────────────────
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [105, 148],
      });

      const hexToRgb = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b] as const;
      };

      const [pr, pg, pb] = hexToRgb(colors.primary);
      const [ar, ag, ab] = hexToRgb(colors.accent);
      const [tr, tg, tb] = hexToRgb(colors.text);

      // Background
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, 105, 148, "F");

      // Border
      doc.setDrawColor(pr, pg, pb);
      doc.setLineWidth(2);
      doc.rect(5, 5, 95, 138, "S");

      // Logo area
      const centreName = centreFormation?.nom_commercial || centreFormation?.nom_legal || "";
      doc.setFillColor(243, 244, 246);
      doc.rect(27.5, 13, 50, 20, "F");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.setFont(font, "bold");
      doc.text(centreName.substring(0, 25), 52.5, 25, { align: "center" });

      // Formation badge
      if (formation) {
        doc.setFillColor(pr, pg, pb);
        doc.roundedRect(17.5, 46, 70, 14, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont(font, "bold");
        doc.text(`Formation ${formation}`, 52.5, 55, { align: "center" });
      }

      // Name
      doc.setTextColor(tr, tg, tb);
      const fs = displayName.length > 12 ? 18 : displayName.length > 8 ? 22 : 26;
      doc.setFontSize(fs);
      doc.setFont(font, "bold");
      doc.text(displayName, 52.5, 92, { align: "center" });

      // Decorative line
      doc.setDrawColor(ar, ag, ab);
      doc.setLineWidth(0.7);
      doc.line(25, 102, 80, 102);

      // Subtitle
      if (showSubtitle) {
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.setFont(font, "normal");
        doc.text("STAGIAIRE", 52.5, 112, { align: "center" });
      }

      // Bottom accent
      doc.setFillColor(pr, pg, pb);
      doc.rect(5, 139, 95, 4, "F");

      // Download directly (no storage upload needed for printable chevalets)
      const pdfBlob = doc.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Chevalet_${prenom}_${nom}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Chevalet généré et téléchargé");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération du chevalet");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Éditer le chevalet — {prenom} {nom}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* ── Left: Options ── */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nom affiché</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value.toUpperCase())}
                placeholder="NOM DU STAGIAIRE"
              />
            </div>

            <div className="space-y-2">
              <Label>Formation</Label>
              <Input
                value={formation}
                onChange={(e) => setFormation(e.target.value)}
                placeholder="Ex: TAXI, VTC, T3P…"
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Palette de couleurs</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setColorPresetIdx(idx)}
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-all ${
                      colorPresetIdx === idx
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: preset.primary }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Police</Label>
              <Select value={font} onValueChange={setFont}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showSubtitle"
                checked={showSubtitle}
                onChange={(e) => setShowSubtitle(e.target.checked)}
                className="rounded border-input"
              />
              <Label htmlFor="showSubtitle" className="text-sm cursor-pointer">
                Afficher « STAGIAIRE »
              </Label>
            </div>
          </div>

          {/* ── Right: Preview ── */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-muted-foreground font-medium">Aperçu A6 (105×148 mm)</p>
            <div className="border rounded-lg shadow-sm bg-white p-2">
              <canvas
                ref={canvasRef}
                className="w-full max-w-[210px]"
                style={{ aspectRatio: "105/148" }}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            <Download className="h-4 w-4 mr-2" />
            {isGenerating ? "Génération…" : "Générer le PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Canvas helper ─────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
