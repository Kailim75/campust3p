import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useSessions } from "@/hooks/useSessions";
import { Users, TrendingUp } from "lucide-react";

export function FillRateCard() {
  const { data: sessions, isLoading } = useSessions();

  // Calculate fill rate for upcoming sessions
  const upcomingSessions = sessions?.filter(s => s.statut === "a_venir" || s.statut === "complet") || [];
  
  const totalPlaces = upcomingSessions.reduce((sum, s) => sum + (s.places_totales || 0), 0);
  const filledPlaces = upcomingSessions.reduce((sum, s) => {
    const inscriptions = (s as any).session_inscriptions?.length || 0;
    return sum + inscriptions;
  }, 0);
  
  const fillRate = totalPlaces > 0 ? Math.round((filledPlaces / totalPlaces) * 100) : 0;
  
  const getVariant = (rate: number) => {
    if (rate >= 80) return "text-success";
    if (rate >= 50) return "text-warning";
    return "text-muted-foreground";
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Taux de remplissage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="h-20 flex items-center justify-center">
            <span className="text-muted-foreground">Chargement...</span>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between">
              <div>
                <span className={`text-4xl font-bold ${getVariant(fillRate)}`}>
                  {fillRate}%
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {filledPlaces} / {totalPlaces} places
                </p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  <span>{upcomingSessions.length} sessions</span>
                </div>
                <p className="text-xs text-muted-foreground">à venir</p>
              </div>
            </div>
            <Progress value={fillRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Faible</span>
              <span>Optimal</span>
              <span>Complet</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
