import { Phone, Clock, User, PhoneOutgoing, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecentCalls, useCallStats } from "@/hooks/useRecentCalls";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";

interface RecentCallsCardProps {
  onClick?: () => void;
}

export function RecentCallsCard({ onClick }: RecentCallsCardProps) {
  const { data: calls, isLoading: callsLoading } = useRecentCalls(5);
  const { data: stats, isLoading: statsLoading } = useCallStats();

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "-";
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? mins : ""}`;
  };

  const formatTotalDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins > 0 ? `${mins}min` : ""}`;
  };

  if (callsLoading || statsLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-elevated h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-info/10 rounded-lg">
              <Phone className="h-5 w-5 text-info" />
            </div>
            <CardTitle className="text-lg">Appels récents</CardTitle>
          </div>
          {onClick && (
            <Button variant="ghost" size="sm" onClick={onClick} className="text-muted-foreground">
              Voir tout
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-2 pb-3 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.today || 0}</p>
            <p className="text-xs text-muted-foreground">Aujourd'hui</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.thisWeek || 0}</p>
            <p className="text-xs text-muted-foreground">Cette semaine</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">
              {formatTotalDuration(stats?.totalMinutesThisMonth || 0)}
            </p>
            <p className="text-xs text-muted-foreground">Durée totale</p>
          </div>
        </div>

        {/* Liste des appels */}
        {calls && calls.length > 0 ? (
          <div className="space-y-3">
            {calls.map((call) => (
              <div
                key={call.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="p-2 bg-info/10 rounded-full shrink-0">
                  <PhoneOutgoing className="h-4 w-4 text-info" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {call.contact?.prenom} {call.contact?.nom}
                    </span>
                    {call.contact?.formation && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {call.contact.formation}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{call.titre}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(call.duree_minutes)}
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(call.date_echange), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Phone className="h-10 w-10 mb-2 opacity-50" />
            <p className="text-sm">Aucun appel enregistré</p>
            <p className="text-xs">Les appels apparaîtront ici</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
