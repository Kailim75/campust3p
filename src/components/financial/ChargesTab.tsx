import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, PiggyBank, TrendingDown, GraduationCap, Car, Calculator } from "lucide-react";

const SUGGESTIONS_FIXES = [
  "Loyer local",
  "Assurance RC Pro",
  "Assurance local",
  "Abonnement internet / téléphone",
  "Logiciel de gestion / CRM",
  "Comptable / Expert-comptable",
  "Salaires (personnel administratif)",
  "Charges sociales dirigeant",
  "Électricité / Eau",
  "Leasing véhicule",
  "Cotisation CFE",
  "Abonnement hébergement web",
  "Frais bancaires",
  "Maintenance matériel",
];

const SUGGESTIONS_VARIABLES = [
  "Carburant véhicules",
  "Fournitures pédagogiques",
  "Frais d'examen (inscription candidats)",
  "Location salle / véhicule ponctuelle",
  "Rémunération formateur vacataire",
  "Frais de déplacement",
  "Supports de formation (impression)",
  "Publicité / Marketing",
  "Frais postaux",
  "Réparation véhicule",
  "Commissions apporteurs d'affaires",
  "Frais de restauration (formation)",
];
import { toast } from "sonner";
import {
  FinancialCost,
  FinancialCashManual,
  useCreateFinancialCost,
  useDeleteFinancialCost,
  useCreateFinancialCash,
  useDeleteFinancialCash,
} from "@/hooks/useFinancialCockpit";

interface Props {
  monthId: string | null;
  costs: FinancialCost[];
  cashManual: FinancialCashManual[];
}

const formatEuro = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export function ChargesTab({ monthId, costs, cashManual }: Props) {
  const [costLabel, setCostLabel] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costType, setCostType] = useState<"fixed" | "variable">("fixed");

  const [cashLabel, setCashLabel] = useState("");
  const [cashAmount, setCashAmount] = useState("");
  const [cashType, setCashType] = useState<"encaissement" | "decaissement">("encaissement");

  // Formateur cost calculator state
  const [thTarifHoraire, setThTarifHoraire] = useState("35");
  const [thHeuresJour, setThHeuresJour] = useState("3.5");
  const [thJours, setThJours] = useState("10");
  const [prCoutParCandidat, setPrCoutParCandidat] = useState("95");
  const [prNbCandidats, setPrNbCandidats] = useState("");

  const createCost = useCreateFinancialCost();
  const deleteCost = useDeleteFinancialCost();
  const createCash = useCreateFinancialCash();
  const deleteCash = useDeleteFinancialCash();

  // Computed trainer costs
  const theorieTotal = parseFloat(thTarifHoraire || "0") * parseFloat(thHeuresJour || "0") * parseFloat(thJours || "0");
  const pratiqueTotal = parseFloat(prCoutParCandidat || "0") * parseFloat(prNbCandidats || "0");
  const formateurTotal = theorieTotal + pratiqueTotal;

  const handleAddFormateurCosts = () => {
    if (!monthId || formateurTotal === 0) {
      toast.error("Veuillez renseigner au moins un coût formateur");
      return;
    }

    const addSequentially = async () => {
      if (theorieTotal > 0) {
        await new Promise<void>((resolve) => {
          createCost.mutate(
            {
              financial_month_id: monthId!,
              type: "variable",
              label: `Formateur théorie (${thTarifHoraire}€/h × ${thHeuresJour}h/j × ${thJours}j)`,
              amount: Math.round(theorieTotal * 100) / 100,
            },
            { onSuccess: () => resolve() }
          );
        });
      }
      if (pratiqueTotal > 0) {
        await new Promise<void>((resolve) => {
          createCost.mutate(
            {
              financial_month_id: monthId!,
              type: "variable",
              label: `Formateur pratique (${prCoutParCandidat}€ × ${prNbCandidats} candidats – conduite + véhicule examen)`,
              amount: Math.round(pratiqueTotal * 100) / 100,
            },
            { onSuccess: () => resolve() }
          );
        });
      }
      toast.success("Coûts formateur ajoutés aux charges variables");
    };

    addSequentially();
  };

  const handleAddCost = () => {
    if (!monthId || !costLabel.trim() || !costAmount) return;
    createCost.mutate(
      { financial_month_id: monthId, type: costType, label: costLabel.trim(), amount: parseFloat(costAmount) },
      {
        onSuccess: () => {
          toast.success("Charge ajoutée");
          setCostLabel("");
          setCostAmount("");
        },
      }
    );
  };

  const handleAddCash = () => {
    if (!monthId || !cashLabel.trim() || !cashAmount) return;
    createCash.mutate(
      { financial_month_id: monthId, type: cashType, label: cashLabel.trim(), amount: parseFloat(cashAmount) },
      {
        onSuccess: () => {
          toast.success("Mouvement ajouté");
          setCashLabel("");
          setCashAmount("");
        },
      }
    );
  };

  const fixedCosts = costs.filter(c => c.type === "fixed");
  const variableCosts = costs.filter(c => c.type === "variable");
  const totalFixed = fixedCosts.reduce((s, c) => s + c.amount, 0);
  const totalVariable = variableCosts.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="space-y-6">
      {/* Formateur cost calculator */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Calculateur coûts formateur
          </CardTitle>
          <CardDescription>
            Calculez automatiquement les coûts formateurs (théorie + pratique) et ajoutez-les aux charges variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Théorie */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <GraduationCap className="h-4 w-4 text-primary" />
              Formation théorique
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tarif horaire (€)</Label>
                <Input type="number" value={thTarifHoraire} onChange={e => setThTarifHoraire(e.target.value)} placeholder="35" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Heures / jour</Label>
                <Input type="number" step="0.5" value={thHeuresJour} onChange={e => setThHeuresJour(e.target.value)} placeholder="3.5" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nb jours</Label>
                <Input type="number" value={thJours} onChange={e => setThJours(e.target.value)} placeholder="10" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sous-total théorie</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 font-semibold text-sm">
                  {formatEuro(theorieTotal)}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {thTarifHoraire}€/h × {thHeuresJour}h/jour × {thJours} jours = <strong>{formatEuro(theorieTotal)}</strong>
            </p>
          </div>

          <Separator />

          {/* Pratique */}
          <div>
            <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Car className="h-4 w-4 text-primary" />
              Formation pratique
              <span className="text-xs font-normal text-muted-foreground">(conduite 2h + véhicule jour examen)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Coût / candidat (€)</Label>
                <Input type="number" value={prCoutParCandidat} onChange={e => setPrCoutParCandidat(e.target.value)} placeholder="95" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Nb candidats</Label>
                <Input type="number" value={prNbCandidats} onChange={e => setPrNbCandidats(e.target.value)} placeholder="Ex: 12" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sous-total pratique</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted/50 font-semibold text-sm">
                  {formatEuro(pratiqueTotal)}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {prCoutParCandidat}€ × {prNbCandidats || "0"} candidats = <strong>{formatEuro(pratiqueTotal)}</strong>
            </p>
          </div>

          <Separator />

          {/* Total + action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="text-sm">
              <span className="text-muted-foreground">Coût total formateur : </span>
              <span className="text-lg font-bold text-primary">{formatEuro(formateurTotal)}</span>
            </div>
            <Button onClick={handleAddFormateurCosts} disabled={!monthId || formateurTotal === 0 || createCost.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter aux charges variables
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add cost form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Ajouter une charge
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={costType} onValueChange={(v) => setCostType(v as "fixed" | "variable")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixe</SelectItem>
                <SelectItem value="variable">Variable</SelectItem>
              </SelectContent>
            </Select>
            <Select value={costLabel || "none"} onValueChange={(v) => setCostLabel(v === "none" ? "" : v)}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Choisir ou saisir un libellé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" disabled>Sélectionner une charge…</SelectItem>
                {(costType === "fixed" ? SUGGESTIONS_FIXES : SUGGESTIONS_VARIABLES).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Ou libellé personnalisé" value={costLabel} onChange={e => setCostLabel(e.target.value)} className="flex-1" />
            <Input type="number" placeholder="Montant €" value={costAmount} onChange={e => setCostAmount(e.target.value)} className="w-[130px]" />
            <Button onClick={handleAddCost} disabled={!monthId || createCost.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Costs tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><PiggyBank className="h-4 w-4 text-primary" /> Charges fixes</span>
              <span className="font-bold">{formatEuro(totalFixed)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fixedCosts.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune charge fixe</TableCell></TableRow>
                ) : fixedCosts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.label}</TableCell>
                    <TableCell className="text-right font-medium">{formatEuro(c.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCost.mutate({ id: c.id, monthId: c.financial_month_id })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-warning" /> Charges variables</span>
              <span className="font-bold">{formatEuro(totalVariable)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variableCosts.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Aucune charge variable</TableCell></TableRow>
                ) : variableCosts.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>{c.label}</TableCell>
                    <TableCell className="text-right font-medium">{formatEuro(c.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCost.mutate({ id: c.id, monthId: c.financial_month_id })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Manual cash movements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Mouvement de trésorerie manuel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={cashType} onValueChange={(v) => setCashType(v as "encaissement" | "decaissement")}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="encaissement">Encaissement</SelectItem>
                <SelectItem value="decaissement">Décaissement</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Libellé" value={cashLabel} onChange={e => setCashLabel(e.target.value)} className="flex-1" />
            <Input type="number" placeholder="Montant €" value={cashAmount} onChange={e => setCashAmount(e.target.value)} className="w-[130px]" />
            <Button onClick={handleAddCash} disabled={!monthId || createCash.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Ajouter
            </Button>
          </div>

          {cashManual.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Libellé</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cashManual.map(c => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className={c.type === "encaissement" ? "text-success font-medium" : "text-destructive font-medium"}>
                        {c.type === "encaissement" ? "↑ Encaissement" : "↓ Décaissement"}
                      </span>
                    </TableCell>
                    <TableCell>{c.label}</TableCell>
                    <TableCell className="text-right font-medium">{formatEuro(c.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteCash.mutate({ id: c.id, monthId: c.financial_month_id })}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
