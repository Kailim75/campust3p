import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, UserCheck, ChevronRight } from "lucide-react";
import { useConversionRate } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ConversionKPICardProps {
  onClick?: () => void;
}

export function ConversionKPICard({ onClick }: ConversionKPICardProps) {
  const { data, isLoading } = useConversionRate();

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-2">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={cn(
        "card-elevated transition-all duration-200",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-md group"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Taux de conversion
          {onClick && (
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-3xl font-display font-bold text-primary">
              {data?.tauxConversion || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prospects → Clients
            </p>
          </div>
          <div className="h-16 w-px bg-border mx-4" />
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Prospects:</span>
              <span className="font-semibold">{data?.prospects || 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Clients:</span>
              <span className="font-semibold text-success">{data?.clients || 0}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
