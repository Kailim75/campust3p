import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePeriodComparison, type ComparisonPeriod } from "@/hooks/usePeriodComparison";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Minus, 
  TrendingUp, 
  TrendingDown,
  Euro,
  Users,
  Calendar,
  Target,
  GraduationCap,
  UserCheck,
  CreditCard,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  trend: "up" | "down" | "stable";
  value: number;
  isPercentage?: boolean;
  invertColors?: boolean;
}

function TrendIndicator({ trend, value, isPercentage, invertColors }: TrendIndicatorProps) {
  const isPositive = trend === "up";
  const isNegative = trend === "down";
  
  // For some metrics like costs, up is bad and down is good
  const colorClass = invertColors 
    ? (isPositive ? "text-destructive" : isNegative ? "text-success" : "text-muted-foreground")
    : (isPositive ? "text-success" : isNegative ? "text-destructive" : "text-muted-foreground");

  const bgClass = invertColors
    ? (isPositive ? "bg-destructive/10" : isNegative ? "bg-success/10" : "bg-muted")
    : (isPositive ? "bg-success/10" : isNegative ? "bg-destructive/10" : "bg-muted");

  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", bgClass, colorClass)}>
      {trend === "up" && <ArrowUpRight className="h-3 w-3" />}
      {trend === "down" && <ArrowDownRight className="h-3 w-3" />}
      {trend === "stable" && <Minus className="h-3 w-3" />}
      {value > 0 && "+"}
      {value}
      {isPercentage && "%"}
    </Badge>
  );
}

interface MetricComparisonCardProps {
  label: string;
  icon: React.ReactNode;
  currentValue: string | number;
  previousValue: string | number;
  change: number;
  changePercent: number;
  trend: "up" | "down" | "stable";
  currentPeriodLabel: string;
  previousPeriodLabel: string;
  isPercentage?: boolean;
  invertColors?: boolean;
}

function MetricComparisonCard({
  label,
  icon,
  currentValue,
  previousValue,
  change,
  changePercent,
  trend,
  currentPeriodLabel,
  previousPeriodLabel,
  isPercentage,
  invertColors,
}: MetricComparisonCardProps) {
  return (
    <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-sm font-medium">{label}</span>
        </div>
        <TrendIndicator 
          trend={trend} 
          value={changePercent} 
          isPercentage 
          invertColors={invertColors}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Current period */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground capitalize">{currentPeriodLabel}</p>
          <p className="text-xl font-bold text-foreground">
            {currentValue}
            {isPercentage && "%"}
          </p>
        </div>
        
        {/* Previous period */}
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground capitalize">{previousPeriodLabel}</p>
          <p className="text-lg text-muted-foreground">
            {previousValue}
            {isPercentage && "%"}
          </p>
        </div>
      </div>

      {/* Visual comparison bar */}
      <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full rounded-full transition-all duration-500",
            trend === "up" && !invertColors && "bg-success",
            trend === "down" && !invertColors && "bg-destructive",
            trend === "up" && invertColors && "bg-destructive",
            trend === "down" && invertColors && "bg-success",
            trend === "stable" && "bg-muted-foreground"
          )}
          style={{ 
            width: `${Math.min(100, Math.max(10, 50 + changePercent / 2))}%` 
          }}
        />
      </div>
    </div>
  );
}

export function PeriodComparisonDashboard() {
  const [periodType, setPeriodType] = useState<ComparisonPeriod>("month");
  const { data, isLoading } = usePeriodComparison(periodType);

  const formatEuro = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Comparaison entre périodes
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-medium text-foreground capitalize">{data?.currentPeriod.label}</span>
            {" "}vs{" "}
            <span className="capitalize">{data?.previousPeriod.label}</span>
          </p>
        </div>
        
        <Tabs value={periodType} onValueChange={(v) => setPeriodType(v as ComparisonPeriod)}>
          <TabsList>
            <TabsTrigger value="month">Mois</TabsTrigger>
            <TabsTrigger value="quarter">Trimestre</TabsTrigger>
            <TabsTrigger value="year">Année</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      
      <CardContent>
        {/* Summary row */}
        <div className="flex items-center justify-between p-4 mb-6 rounded-lg bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">CA total</p>
              <p className="text-2xl font-bold text-primary">{formatEuro(data?.metrics.ca.current || 0)}</p>
              <TrendIndicator 
                trend={data?.metrics.ca.trend || "stable"} 
                value={data?.metrics.ca.changePercent || 0} 
                isPercentage 
              />
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Encaissé</p>
              <p className="text-2xl font-bold text-success">{formatEuro(data?.metrics.encaisse.current || 0)}</p>
              <TrendIndicator 
                trend={data?.metrics.encaisse.trend || "stable"} 
                value={data?.metrics.encaisse.changePercent || 0} 
                isPercentage 
              />
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Taux réussite</p>
              <p className="text-2xl font-bold text-info">{data?.metrics.tauxReussite.current || 0}%</p>
              <TrendIndicator 
                trend={data?.metrics.tauxReussite.trend || "stable"} 
                value={data?.metrics.tauxReussite.changePercent || 0} 
                isPercentage 
              />
            </div>
          </div>
          
          {/* Global trend indicator */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-background/50">
            {data?.metrics.ca.trend === "up" ? (
              <TrendingUp className="h-8 w-8 text-success" />
            ) : data?.metrics.ca.trend === "down" ? (
              <TrendingDown className="h-8 w-8 text-destructive" />
            ) : (
              <Minus className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                {data?.metrics.ca.trend === "up" ? "En hausse" : 
                 data?.metrics.ca.trend === "down" ? "En baisse" : "Stable"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data?.metrics.ca.changePercent > 0 && "+"}
                {data?.metrics.ca.changePercent}% vs période précédente
              </p>
            </div>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricComparisonCard
            label="Chiffre d'affaires"
            icon={<Euro className="h-4 w-4" />}
            currentValue={formatEuro(data?.metrics.ca.current || 0)}
            previousValue={formatEuro(data?.metrics.ca.previous || 0)}
            change={data?.metrics.ca.change || 0}
            changePercent={data?.metrics.ca.changePercent || 0}
            trend={data?.metrics.ca.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
          />
          
          <MetricComparisonCard
            label="Encaissements"
            icon={<CreditCard className="h-4 w-4" />}
            currentValue={formatEuro(data?.metrics.encaisse.current || 0)}
            previousValue={formatEuro(data?.metrics.encaisse.previous || 0)}
            change={data?.metrics.encaisse.change || 0}
            changePercent={data?.metrics.encaisse.changePercent || 0}
            trend={data?.metrics.encaisse.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
          />
          
          <MetricComparisonCard
            label="Nouveaux contacts"
            icon={<Users className="h-4 w-4" />}
            currentValue={data?.metrics.nouveauxContacts.current || 0}
            previousValue={data?.metrics.nouveauxContacts.previous || 0}
            change={data?.metrics.nouveauxContacts.change || 0}
            changePercent={data?.metrics.nouveauxContacts.changePercent || 0}
            trend={data?.metrics.nouveauxContacts.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
          />
          
          <MetricComparisonCard
            label="Nouveaux clients"
            icon={<UserCheck className="h-4 w-4" />}
            currentValue={data?.metrics.nouveauxClients.current || 0}
            previousValue={data?.metrics.nouveauxClients.previous || 0}
            change={data?.metrics.nouveauxClients.change || 0}
            changePercent={data?.metrics.nouveauxClients.changePercent || 0}
            trend={data?.metrics.nouveauxClients.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
          />
          
          <MetricComparisonCard
            label="Sessions"
            icon={<Calendar className="h-4 w-4" />}
            currentValue={data?.metrics.sessions.current || 0}
            previousValue={data?.metrics.sessions.previous || 0}
            change={data?.metrics.sessions.change || 0}
            changePercent={data?.metrics.sessions.changePercent || 0}
            trend={data?.metrics.sessions.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
          />
          
          <MetricComparisonCard
            label="Inscriptions"
            icon={<GraduationCap className="h-4 w-4" />}
            currentValue={data?.metrics.inscriptions.current || 0}
            previousValue={data?.metrics.inscriptions.previous || 0}
            change={data?.metrics.inscriptions.change || 0}
            changePercent={data?.metrics.inscriptions.changePercent || 0}
            trend={data?.metrics.inscriptions.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
          />
          
          <MetricComparisonCard
            label="Taux de réussite"
            icon={<Target className="h-4 w-4" />}
            currentValue={data?.metrics.tauxReussite.current || 0}
            previousValue={data?.metrics.tauxReussite.previous || 0}
            change={data?.metrics.tauxReussite.change || 0}
            changePercent={data?.metrics.tauxReussite.changePercent || 0}
            trend={data?.metrics.tauxReussite.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
            isPercentage
          />
          
          <MetricComparisonCard
            label="Taux de conversion"
            icon={<TrendingUp className="h-4 w-4" />}
            currentValue={data?.metrics.tauxConversion.current || 0}
            previousValue={data?.metrics.tauxConversion.previous || 0}
            change={data?.metrics.tauxConversion.change || 0}
            changePercent={data?.metrics.tauxConversion.changePercent || 0}
            trend={data?.metrics.tauxConversion.trend || "stable"}
            currentPeriodLabel={data?.currentPeriod.label || ""}
            previousPeriodLabel={data?.previousPeriod.label || ""}
            isPercentage
          />
        </div>
      </CardContent>
    </Card>
  );
}
