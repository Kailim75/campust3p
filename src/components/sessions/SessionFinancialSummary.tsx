import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Euro, Receipt, CheckCircle, AlertCircle } from "lucide-react";
import { useFactures } from "@/hooks/useFactures";
import { useSessionInscriptions } from "@/hooks/useSessions";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionFinancialSummaryProps {
  sessionId: string;
}

export function SessionFinancialSummary({ sessionId }: SessionFinancialSummaryProps) {
  const { data: inscriptions, isLoading: inscriptionsLoading } = useSessionInscriptions(sessionId);
  const { data: allFactures, isLoading: facturesLoading } = useFactures();

  const financialData = useMemo(() => {
    if (!inscriptions || !allFactures) return null;

    const inscriptionIds = inscriptions.map((i) => i.id);
    const sessionFactures = allFactures.filter(
      (f) => f.session_inscription_id && inscriptionIds.includes(f.session_inscription_id)
    );

    const totalFacture = sessionFactures.reduce((sum, f) => sum + Number(f.montant_total || 0), 0);
    const totalEncaisse = sessionFactures.reduce((sum, f) => sum + Number(f.total_paye || 0), 0);
    const restantDu = totalFacture - totalEncaisse;
    const tauxRecouvrement = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;
    
    const facturesPayees = sessionFactures.filter((f) => f.statut === "payee").length;
    const facturesEnAttente = sessionFactures.filter((f) => f.statut === "emise" || f.statut === "annulee").length;
    const facturesPartielles = sessionFactures.filter((f) => f.statut === "partiel").length;

    return {
      totalFacture,
      totalEncaisse,
      restantDu,
      tauxRecouvrement,
      nbFactures: sessionFactures.length,
      facturesPayees,
      facturesEnAttente,
      facturesPartielles,
    };
  }, [inscriptions, allFactures]);

  const isLoading = inscriptionsLoading || facturesLoading;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (!financialData || financialData.nbFactures === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Aucune facture liée à cette session
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main financial metrics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Receipt className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Total facturé</p>
            <p className="text-lg font-bold text-primary">
              {financialData.totalFacture.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground">Encaissé</p>
            <p className="text-lg font-bold text-success">
              {financialData.totalEncaisse.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3 text-center">
            <AlertCircle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground">Restant dû</p>
            <p className="text-lg font-bold text-warning">
              {financialData.restantDu.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taux de recouvrement</span>
          <span className="font-medium">{financialData.tauxRecouvrement.toFixed(0)}%</span>
        </div>
        <Progress 
          value={financialData.tauxRecouvrement} 
          className="h-2"
        />
      </div>

      {/* Invoice status breakdown */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span>{financialData.facturesPayees} payée{financialData.facturesPayees > 1 ? "s" : ""}</span>
        </div>
        {financialData.facturesPartielles > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span>{financialData.facturesPartielles} partielle{financialData.facturesPartielles > 1 ? "s" : ""}</span>
          </div>
        )}
        {financialData.facturesEnAttente > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span>{financialData.facturesEnAttente} en attente</span>
          </div>
        )}
      </div>
    </div>
  );
}
