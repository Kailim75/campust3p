import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { useEInvoicingSettings } from "@/hooks/useEInvoicingSettings";

const VAT_REGIMES = [
  { value: "exonere_261_4_4_a", label: "Exonéré — art. 261-4-4°a CGI (formation pro)" },
  { value: "tva_normale_20", label: "TVA normale 20%" },
  { value: "tva_intermediaire_10", label: "TVA intermédiaire 10%" },
  { value: "tva_reduite_5_5", label: "TVA réduite 5,5%" },
  { value: "franchise_base_293b", label: "Franchise en base — art. 293 B CGI" },
];

const PDP_CHOICES = [
  { value: "non_choisie", label: "Non choisie" },
  { value: "ppf", label: "PPF — Portail Public de Facturation" },
  { value: "docaposte", label: "Docaposte" },
  { value: "esker", label: "Esker" },
  { value: "generix", label: "Generix" },
  { value: "iopole", label: "Iopole" },
  { value: "pennylane", label: "Pennylane" },
  { value: "sage", label: "Sage" },
  { value: "yooz", label: "Yooz" },
  { value: "autre", label: "Autre PDP enregistrée" },
];

/**
 * Sprint 7 — Center-level parameters driving the e-invoicing reform readiness.
 * Surfaces threshold, default VAT regime and PDP choice in the Settings → Financial tab.
 */
export function EInvoicingSettings() {
  const { settings, isLoading, save } = useEInvoicingSettings();
  const [threshold, setThreshold] = useState(settings.einv_blocking_threshold);
  const [regime, setRegime] = useState(settings.einv_default_vat_regime);
  const [pdp, setPdp] = useState(settings.einv_pdp_choice);

  useEffect(() => {
    setThreshold(settings.einv_blocking_threshold);
    setRegime(settings.einv_default_vat_regime);
    setPdp(settings.einv_pdp_choice);
  }, [settings.einv_blocking_threshold, settings.einv_default_vat_regime, settings.einv_pdp_choice]);

  const dirty =
    threshold !== settings.einv_blocking_threshold ||
    regime !== settings.einv_default_vat_regime ||
    pdp !== settings.einv_pdp_choice;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Facturation électronique 2026/2027
        </CardTitle>
        <CardDescription>
          Pilotez le niveau d'exigence appliqué à vos factures avant leur émission ainsi que la
          Plateforme de Dématérialisation Partenaire (PDP) que vous comptez utiliser.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Chargement…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Seuil de conformité bloquant</Label>
                <span className="text-sm font-semibold text-primary">{threshold} / 100</span>
              </div>
              <Slider
                value={[threshold]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setThreshold(v[0])}
              />
              <p className="text-xs text-muted-foreground">
                Toute facture brouillon avec un score inférieur à ce seuil sera refusée lors de
                l'émission groupée. Recommandé : 70 (transition) à 90 (à partir de 2026).
              </p>
            </div>

            <div className="space-y-2">
              <Label>Régime TVA appliqué par défaut</Label>
              <Select value={regime} onValueChange={setRegime}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VAT_REGIMES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Ce régime sera figé sur le snapshot de chaque facture au moment de l'émission si
                aucun régime spécifique n'a été choisi.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Plateforme de Dématérialisation Partenaire (PDP)</Label>
              <Select value={pdp} onValueChange={setPdp}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PDP_CHOICES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                À partir de 2026, toutes les factures B2B devront transiter par une PDP. Ce choix
                conditionne la prochaine intégration technique.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() =>
                  save.mutate({
                    einv_blocking_threshold: threshold,
                    einv_default_vat_regime: regime,
                    einv_pdp_choice: pdp,
                  })
                }
                disabled={!dirty || save.isPending}
              >
                {save.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                ) : (
                  <Save className="h-4 w-4 mr-1.5" />
                )}
                Enregistrer
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
