import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, PiggyBank, TrendingDown } from "lucide-react";
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

  const createCost = useCreateFinancialCost();
  const deleteCost = useDeleteFinancialCost();
  const createCash = useCreateFinancialCash();
  const deleteCash = useDeleteFinancialCash();

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
            <Input placeholder="Libellé (ex: Loyer)" value={costLabel} onChange={e => setCostLabel(e.target.value)} className="flex-1" />
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
