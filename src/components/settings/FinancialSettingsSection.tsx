import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Landmark, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { useParametresFinanciers, useUpsertParametres } from "@/hooks/useFinancialData";

export function FinancialSettingsSection() {
  const { data: params, isLoading } = useParametresFinanciers();
  const upsert = useUpsertParametres();

  const [form, setForm] = useState({
    prix_moyen_taxi: 990,
    prix_moyen_vtc: 990,
    prix_moyen_vmdtr: 990,
    prix_moyen_recyclage: 350,
  });

  useEffect(() => {
    if (params) {
      setForm({
        prix_moyen_taxi: params.prix_moyen_taxi || 990,
        prix_moyen_vtc: params.prix_moyen_vtc || 990,
        prix_moyen_vmdtr: params.prix_moyen_vmdtr || 990,
        prix_moyen_recyclage: params.prix_moyen_recyclage || 350,
      });
    }
  }, [params]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        id: params?.id || null,
        ...form,
      });
      toast.success("Paramètres financiers enregistrés");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    }
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5" />
          Configuration financière
        </CardTitle>
        <CardDescription>
          Prix moyens utilisés pour le calcul du seuil de rentabilité et les projections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-xs text-blue-700 dark:text-blue-400">
            ℹ️ Centre de formation exonéré de TVA (art. 261-4-4° du CGI). Tous les prix sont HT = TTC.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Prix moyen Taxi initial (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.prix_moyen_taxi}
              onChange={e => setForm(f => ({ ...f, prix_moyen_taxi: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Prix moyen VTC (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.prix_moyen_vtc}
              onChange={e => setForm(f => ({ ...f, prix_moyen_vtc: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Prix moyen VMDTR (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.prix_moyen_vmdtr}
              onChange={e => setForm(f => ({ ...f, prix_moyen_vmdtr: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Prix moyen Recyclage (€)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.prix_moyen_recyclage}
              onChange={e => setForm(f => ({ ...f, prix_moyen_recyclage: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={upsert.isPending}>
          {upsert.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Enregistrer
        </Button>
      </CardContent>
    </Card>
  );
}
