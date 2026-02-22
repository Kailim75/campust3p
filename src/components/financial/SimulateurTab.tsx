import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, TrendingDown, Target, Users, Euro, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinancialSynthesis } from "@/hooks/useFinancialCockpit";

interface Props {
  synthesis: FinancialSynthesis | null;
}

const formatEuro = (v: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export function SimulateurTab({ synthesis }: Props) {
  const defaults = synthesis || {
    studentsCount: 10,
    prixMoyen: 1500,
    totalFixed: 5000,
    totalVariable: 0,
    variableParEleve: 200,
  };

  const [nbEleves, setNbEleves] = useState(Math.max(defaults.studentsCount, 1));
  const [prixMoyen, setPrixMoyen] = useState(Math.round(defaults.prixMoyen) || 1500);
  const [chargesFixes, setChargesFixes] = useState(Math.round(defaults.totalFixed));
  const [chargesVarParEleve, setChargesVarParEleve] = useState(
    Math.round(defaults.variableParEleve) || 200
  );

  const sim = useMemo(() => {
    const totalCA = nbEleves * prixMoyen;
    const totalVariable = nbEleves * chargesVarParEleve;
    const totalCharges = chargesFixes + totalVariable;
    const resultat = totalCA - totalCharges;
    const margePct = totalCA > 0 ? (resultat / totalCA) * 100 : 0;
    const coutParEleve = nbEleves > 0 ? totalCharges / nbEleves : 0;
    const margeContributive = prixMoyen - chargesVarParEleve;
    const seuilRentabilite = margeContributive > 0 ? chargesFixes / margeContributive : 0;
    const cashflow = resultat;

    return { totalCA, totalVariable, totalCharges, resultat, margePct, coutParEleve, margeContributive, seuilRentabilite, cashflow };
  }, [nbEleves, prixMoyen, chargesFixes, chargesVarParEleve]);

  return (
    <div className="space-y-6">
      {/* Sliders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paramètres de simulation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Nombre d'élèves</span>
              <span className="font-bold">{nbEleves}</span>
            </div>
            <Slider value={[nbEleves]} onValueChange={([v]) => setNbEleves(v)} min={1} max={100} step={1} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Prix moyen par élève</span>
              <span className="font-bold">{formatEuro(prixMoyen)}</span>
            </div>
            <Slider value={[prixMoyen]} onValueChange={([v]) => setPrixMoyen(v)} min={500} max={10000} step={100} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Charges fixes mensuelles</span>
              <span className="font-bold">{formatEuro(chargesFixes)}</span>
            </div>
            <Slider value={[chargesFixes]} onValueChange={([v]) => setChargesFixes(v)} min={0} max={50000} step={500} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Charges variables / élève</span>
              <span className="font-bold">{formatEuro(chargesVarParEleve)}</span>
            </div>
            <Slider value={[chargesVarParEleve]} onValueChange={([v]) => setChargesVarParEleve(v)} min={0} max={5000} step={50} />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <ResultCard title="CA simulé" value={formatEuro(sim.totalCA)} icon={Euro} />
        <ResultCard
          title="Résultat"
          value={formatEuro(sim.resultat)}
          icon={sim.resultat >= 0 ? TrendingUp : TrendingDown}
          variant={sim.resultat >= 0 ? "success" : "danger"}
        />
        <ResultCard
          title="Marge"
          value={`${sim.margePct.toFixed(1)}%`}
          icon={TrendingUp}
          variant={sim.margePct >= 20 ? "success" : sim.margePct >= 0 ? "warning" : "danger"}
        />
        <ResultCard title="Coût / élève" value={formatEuro(sim.coutParEleve)} icon={Users} />
        <ResultCard
          title="Seuil de rentabilité"
          value={`${Math.ceil(sim.seuilRentabilite)} élèves`}
          icon={Target}
          variant={nbEleves >= sim.seuilRentabilite ? "success" : "warning"}
        />
        <ResultCard
          title="Cashflow"
          value={formatEuro(sim.cashflow)}
          icon={Wallet}
          variant={sim.cashflow >= 0 ? "success" : "danger"}
        />
      </div>
    </div>
  );
}

function ResultCard({
  title,
  value,
  icon: Icon,
  variant = "default",
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const bg = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
          <div className={cn("p-2 rounded-lg", bg[variant])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
