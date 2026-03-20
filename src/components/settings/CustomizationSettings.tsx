import { useCrmCustomization, CrmCustomization } from "@/hooks/useCrmCustomization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paintbrush, RotateCcw, Type, CircleDot, Maximize2 } from "lucide-react";
import { toast } from "sonner";

const COLOR_PRESETS: { label: string; primary: string; cta: string }[] = [
  { label: "Anthracite & Teal (défaut)", primary: "222 47% 11%", cta: "173 58% 39%" },
  { label: "Marine & Or", primary: "220 54% 18%", cta: "43 96% 56%" },
  { label: "Ardoise & Corail", primary: "215 28% 17%", cta: "12 76% 61%" },
  { label: "Charbon & Émeraude", primary: "210 11% 15%", cta: "152 69% 41%" },
  { label: "Nuit & Lavande", primary: "230 35% 14%", cta: "262 52% 56%" },
  { label: "Graphite & Bleu", primary: "220 13% 18%", cta: "210 70% 52%" },
];

export function CustomizationSettings() {
  const { config, update, reset } = useCrmCustomization();

  const handleReset = () => {
    reset();
    toast.success("Personnalisation réinitialisée");
  };

  const activePresetIndex = COLOR_PRESETS.findIndex(
    (p) => p.primary === config.primaryColor && p.cta === config.ctaColor
  );

  return (
    <div className="space-y-6">
      {/* Couleurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Paintbrush className="h-5 w-5 text-cta" />
            Palette de couleurs
          </CardTitle>
          <CardDescription>Choisissez une palette qui correspond à votre identité</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {COLOR_PRESETS.map((preset, i) => {
              const isActive = i === activePresetIndex;
              return (
                <button
                  key={i}
                  onClick={() => update({ primaryColor: preset.primary, ctaColor: preset.cta })}
                  className={`relative flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-150 hover:shadow-md ${
                    isActive
                      ? "border-cta ring-2 ring-cta/20 bg-cta/5"
                      : "border-border hover:border-border-strong"
                  }`}
                >
                  <div className="flex gap-1.5 shrink-0">
                    <span
                      className="block h-7 w-7 rounded-full border border-border"
                      style={{ background: `hsl(${preset.primary})` }}
                    />
                    <span
                      className="block h-7 w-7 rounded-full border border-border"
                      style={{ background: `hsl(${preset.cta})` }}
                    />
                  </div>
                  <span className="text-xs font-medium leading-tight">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Typographie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Type className="h-5 w-5 text-cta" />
            Typographie
          </CardTitle>
          <CardDescription>Police principale de l'interface</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs space-y-2">
            <Label>Police</Label>
            <Select
              value={config.fontFamily}
              onValueChange={(v) => update({ fontFamily: v as CrmCustomization["fontFamily"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inter">Inter (défaut)</SelectItem>
                <SelectItem value="system">Système</SelectItem>
                <SelectItem value="roboto">Roboto</SelectItem>
                <SelectItem value="poppins">Poppins</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Les polices Roboto et Poppins nécessitent leur chargement depuis Google Fonts.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Apparence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDot className="h-5 w-5 text-cta" />
              Coins arrondis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {(["sharp", "default", "rounded", "pill"] as const).map((r) => {
                const labels: Record<typeof r, string> = {
                  sharp: "Anguleux",
                  default: "Standard",
                  rounded: "Arrondi",
                  pill: "Très arrondi",
                };
                const radiusPreview: Record<typeof r, string> = {
                  sharp: "rounded-sm",
                  default: "rounded-lg",
                  rounded: "rounded-xl",
                  pill: "rounded-2xl",
                };
                return (
                  <button
                    key={r}
                    onClick={() => update({ borderRadius: r })}
                    className={`flex flex-col items-center gap-1.5 p-3 border transition-all duration-150 ${radiusPreview[r]} ${
                      config.borderRadius === r
                        ? "border-cta ring-2 ring-cta/20 bg-cta/5"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    <div
                      className={`h-8 w-12 bg-primary/20 border border-primary/30 ${radiusPreview[r]}`}
                    />
                    <span className="text-xs font-medium">{labels[r]}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Maximize2 className="h-5 w-5 text-cta" />
              Densité
            </CardTitle>
            <CardDescription>Espacement entre les éléments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(["compact", "default", "comfortable"] as const).map((d) => {
                const labels: Record<typeof d, string> = {
                  compact: "Compact",
                  default: "Standard",
                  comfortable: "Aéré",
                };
                return (
                  <button
                    key={d}
                    onClick={() => update({ density: d })}
                    className={`flex-1 rounded-lg border p-3 text-center text-xs font-medium transition-all duration-150 ${
                      config.density === d
                        ? "border-cta ring-2 ring-cta/20 bg-cta/5"
                        : "border-border hover:border-border-strong"
                    }`}
                  >
                    {labels[d]}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aperçu */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Aperçu</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <Button className="btn-cta">Bouton CTA</Button>
            <Button variant="default">Bouton primaire</Button>
            <Button variant="outline">Bouton secondaire</Button>
            <span className="badge-soft badge-soft-teal">Badge teal</span>
            <span className="inline-flex items-center rounded-lg border px-3 py-1.5 text-sm">
              Champ input
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Réinitialiser */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Réinitialiser par défaut
        </Button>
      </div>
    </div>
  );
}
