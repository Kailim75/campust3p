import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Mail, ExternalLink, CheckCircle2, ListChecks } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { isPast, parseISO, differenceInDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { computeProspectUrgency } from "@/lib/urgency-utils";
import { UrgencyDot, LastActionLine, MarkDoneBtn } from "./AujourdhuiShared";
import type { BlocProspectSharedProps } from "./aujourdhui-types";
import type { Prospect } from "@/hooks/useProspects";

interface BlocRelancesProps extends BlocProspectSharedProps {
  relances: Prospect[];
  bulkRelanceSelected: Set<string>;
  toggleBulkRelance: (id: string) => void;
  bulkProcessing: boolean;
  handleBulkRelance: (items: any[]) => void;
  handleRelanceEmail: (p: any) => void;
  handleRelanceWhatsApp: (p: any) => void;
}

export function BlocRelances({
  relances, bulkRelanceSelected, toggleBulkRelance, bulkProcessing,
  handleBulkRelance, handleRelanceEmail, handleRelanceWhatsApp,
  todayNotes, recentNotes, openProspect, markDone,
}: BlocRelancesProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <Clock className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Relances à faire</h3>
            <p className="text-[11px] text-muted-foreground">{relances.length} prospect{relances.length > 1 ? "s" : ""} en attente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bulkRelanceSelected.size > 0 && (
            <div className="flex items-center gap-1.5">
              <Button
                size="sm" variant="default" className="h-7 text-[10px] gap-1"
                disabled={bulkProcessing}
                onClick={() => handleBulkRelance(relances)}
              >
                <ListChecks className="h-3 w-3" />
                Relancer {bulkRelanceSelected.size}
              </Button>
              {bulkRelanceSelected.size > 10 && (
                <span className="text-[9px] text-warning font-medium">⚠️ {bulkRelanceSelected.size} dest.</span>
              )}
            </div>
          )}
          <Badge variant="outline" className="text-xs bg-accent/10 text-accent">{relances.length}</Badge>
        </div>
      </div>
      <div className="divide-y max-h-80 overflow-y-auto">
        {relances.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1.5 text-success/50" />
            Toutes les relances sont à jour
          </div>
        ) : relances.map((p) => {
          const actionDate = (p as any).next_action_at || p.date_prochaine_relance;
          const daysLate = actionDate && isPast(parseISO(actionDate))
            ? Math.abs(differenceInDays(parseISO(actionDate), new Date()))
            : 0;
          const urgency = computeProspectUrgency({ daysLate });
          return (
            <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={bulkRelanceSelected.has(p.id)}
                    onCheckedChange={() => toggleBulkRelance(p.id)}
                    className="h-3.5 w-3.5"
                  />
                  <UrgencyDot urgency={urgency} />
                  <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {p.prenom} {p.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                </div>
                {actionDate && (
                  <Badge variant="outline" className={cn(
                    "text-[10px]",
                    isPast(parseISO(actionDate)) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                  )}>
                    {isPast(parseISO(actionDate))
                      ? `${daysLate}j retard`
                      : format(parseISO(actionDate), "dd/MM", { locale: fr })
                    }
                  </Badge>
                )}
              </div>
              {p.formation_souhaitee && <p className="text-xs text-muted-foreground mb-1 pl-8">{p.formation_souhaitee}</p>}
              <div className="pl-8">
                <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={p.id} />
              </div>
              <div className="flex gap-1.5 mt-1 pl-8">
                {p.email && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleRelanceEmail(p)}>
                    <Mail className="h-3 w-3 mr-1" /> Relancer
                  </Button>
                )}
                {p.telephone && (
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => handleRelanceWhatsApp(p)}>
                    <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
                  </Button>
                )}
                <MarkDoneBtn contactId={p.id} bloc="Relance" markDone={markDone} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
