import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useFinancialSummary } from "@/hooks/useDashboardStats";
import { Euro, AlertCircle, CheckCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialSummaryCardProps {
  onClick?: () => void;
}

export function FinancialSummaryCard({ onClick }: FinancialSummaryCardProps) {
  const { data, isLoading } = useFinancialSummary();

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md group"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Euro className="h-4 w-4 text-primary" />
          Résumé financier
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Taux de recouvrement */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Taux de recouvrement</span>
            <span className={cn(
              "font-semibold",
              (data?.tauxRecouvrement || 0) >= 80 ? "text-success" :
              (data?.tauxRecouvrement || 0) >= 50 ? "text-warning" : "text-destructive"
            )}>
              {data?.tauxRecouvrement || 0}%
            </span>
          </div>
          <Progress 
            value={data?.tauxRecouvrement || 0} 
            className="h-2"
          />
        </div>

        {/* Stats détaillées */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-success/10 border border-success/20">
            <div className="flex items-center gap-2 text-success mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Encaissé</span>
            </div>
            <p className="text-lg font-bold text-success">
              {formatEuro(data?.totalPaye || 0)}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Impayé</span>
            </div>
            <p className="text-lg font-bold text-destructive">
              {formatEuro(data?.totalImpaye || 0)}
            </p>
          </div>
        </div>

        {/* Total facturé */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total facturé</span>
            <span className="text-lg font-bold">{formatEuro(data?.totalFacture || 0)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
