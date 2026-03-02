import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Users, ChevronRight, AlertTriangle, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

interface SessionsUpcomingProps {
  onClick?: () => void;
}

interface EnrichedSession {
  id: string;
  nom: string;
  date_debut: string;
  places_totales: number;
  formation_type: string;
  statut: string;
  prix_ht: number;
  prix: number;
  filled: number;
  fillRate: number;
  atRisk: boolean;
  manqueAGagner: number;
}

export function SessionsUpcoming({ onClick }: SessionsUpcomingProps) {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["dashboard", "sessions-enriched"],
    queryFn: async (): Promise<EnrichedSession[]> => {
      const today = new Date();
      const todayStr = today.toISOString().split("T")[0];

      const [sessionsRes, inscriptionsRes] = await Promise.all([
        supabase.from("sessions").select("id, nom, date_debut, places_totales, formation_type, statut, prix_ht, prix")
          .eq("archived", false).gte("date_fin", todayStr).order("date_debut", { ascending: true }).limit(5),
        supabase.from("session_inscriptions").select("session_id"),
      ]);

      const rawSessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];

      const counts: Record<string, number> = {};
      inscriptions.forEach(i => { counts[i.session_id] = (counts[i.session_id] || 0) + 1; });

      return rawSessions.map(s => {
        const filled = counts[s.id] || 0;
        const places = s.places_totales || 0;
        const fillRate = places > 0 ? Math.round((filled / places) * 100) : 0;
        const daysUntil = differenceInDays(parseISO(s.date_debut), today);
        const atRisk = fillRate < 50 && daysUntil <= 14;
        const prixUnit = s.prix_ht || s.prix || 0;
        const manqueAGagner = Math.max((places - filled) * prixUnit, 0);
        return { ...s, prix_ht: s.prix_ht || 0, prix: s.prix || 0, filled, fillRate, atRisk, manqueAGagner };
      });
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-5 w-40 mb-4" />
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full mb-3" />)}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-6 transition-all",
        onClick && "cursor-pointer hover:border-primary/30 hover:shadow-sm group"
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-foreground">Sessions à venir</h2>
        {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>

      {!sessions || sessions.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">Aucune session à venir</p>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const formColor = getFormationColor(session.formation_type);
            const isOverCapacity = session.fillRate > 100;
            const fillColor = isOverCapacity ? "bg-warning" : session.fillRate >= 70 ? "bg-success" : session.fillRate >= 40 ? "bg-warning" : "bg-destructive";
            const fillTextColor = isOverCapacity ? "text-warning" : session.fillRate >= 70 ? "text-success" : session.fillRate >= 40 ? "text-warning" : "text-destructive";
            const isCritical = session.fillRate < 40;

            return (
              <div key={session.id} className={cn(
                "p-4 rounded-lg border transition-all",
                isCritical ? "bg-destructive/5 border-destructive/30 ring-1 ring-destructive/10" : `${formColor.bg} ${formColor.border}`
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium text-foreground text-sm truncate">{session.nom}</h4>
                      {isOverCapacity && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 border-warning/40 text-warning">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          Capacité dépassée
                        </Badge>
                      )}
                      {session.atRisk && !isOverCapacity && (
                        <Badge variant="destructive" className="text-[10px] gap-1 px-1.5">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          À risque
                        </Badge>
                      )}
                      {isCritical && !session.atRisk && !isOverCapacity && (
                        <Badge variant="outline" className="text-[10px] gap-1 px-1.5 border-destructive/40 text-destructive">
                          Critique
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(session.date_debut), 'dd/MM/yyyy', { locale: fr })}
                      </span>
                      <Badge variant="outline" className={cn("text-[10px]", formColor.badge)}>
                        {getFormationLabel(session.formation_type)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className={cn("text-lg font-bold tabular-nums", fillTextColor)}>{session.fillRate}%</span>
                    <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-1">
                      <Users className="h-2.5 w-2.5" />
                      {session.filled}/{session.places_totales}
                    </p>
                  </div>
                </div>

                {/* Fill bar */}
                <div className="w-full h-2.5 rounded-full bg-muted/50 overflow-hidden">
                  <div 
                    className={cn("h-full rounded-full transition-all", fillColor)}
                    style={{ width: `${Math.min(session.fillRate, 100)}%` }}
                  />
                </div>

                {/* Manque à gagner */}
                {session.manqueAGagner > 0 && !isOverCapacity && (
                  <div className={cn(
                    "flex items-center justify-between mt-2 pt-2 border-t text-xs",
                    isCritical ? "border-destructive/20" : "border-border/50"
                  )}>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <TrendingDown className="h-3 w-3" />
                      Manque à gagner
                    </span>
                    <span className={cn("font-semibold tabular-nums", isCritical ? "text-destructive" : "text-warning")}>
                      - {session.manqueAGagner.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
