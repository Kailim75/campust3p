import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CalendarCheck, Calendar, Mail, Phone, ExternalLink } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { LastActionLine, MarkDoneBtn } from "./AujourdhuiShared";
import { isHandledToday } from "@/lib/aujourdhui-actions";
import type { BlocProspectSharedProps } from "./aujourdhui-types";
import type { Prospect } from "@/hooks/useProspects";

interface BlocRdvProps extends BlocProspectSharedProps {
  rdvToday: Prospect[];
  handleRdvConfirm: (p: any) => void;
  handleRdvAppel: (p: any) => void;
  handleRdvWhatsApp: (p: any) => void;
  onNavigate?: (section: string) => void;
}

export function BlocRdv({
  rdvToday, handleRdvConfirm, handleRdvAppel, handleRdvWhatsApp,
  todayNotes, recentNotes, openProspect, markDone, onNavigate,
}: BlocRdvProps) {
  const isRdvHandledToday = (contactId: string) =>
    isHandledToday(contactId, todayNotes, ["RDV", "Confirmation"]);

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <CalendarCheck className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">RDV du jour</h3>
            <p className="text-[11px] text-muted-foreground">{rdvToday.length} rendez-vous prévus</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{rdvToday.length}</Badge>
      </div>
      <div className="divide-y max-h-80 overflow-y-auto">
        {rdvToday.length === 0 ? (
          <div className="p-4 text-center space-y-2">
            <Calendar className="h-6 w-6 mx-auto text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">Aucun RDV prévu aujourd'hui</p>
            {onNavigate && (
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => { onNavigate("prospects-agenda"); }}>
                  <CalendarCheck className="h-3 w-3 mr-1" /> Planifier
                </Button>
              </div>
            )}
          </div>
        ) : rdvToday.map((p) => {
          const handledToday = isRdvHandledToday(p.id);
          return (
            <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {p.prenom} {p.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                  <Badge variant="outline" className="text-[9px] bg-warning/15 text-warning border-warning/30">
                    <CalendarCheck className="h-2.5 w-2.5 mr-0.5" /> RDV
                  </Badge>
                </div>
                {p.formation_souhaitee && <Badge variant="outline" className="text-[10px]">{p.formation_souhaitee}</Badge>}
              </div>
              <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={p.id} />
              <div className="flex gap-1.5 mt-1">
                {p.email && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={handledToday} onClick={() => handleRdvConfirm(p)}>
                            <Mail className="h-3 w-3 mr-1" /> Confirmer RDV
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {handledToday && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                )}
                {p.telephone && (
                  <>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
                      <a href={`tel:${p.telephone}`} onClick={() => handleRdvAppel(p)}><Phone className="h-3 w-3 mr-1" /> Appeler</a>
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => handleRdvWhatsApp(p)}>
                      <SiWhatsapp className="h-3 w-3" />
                    </Button>
                  </>
                )}
                <MarkDoneBtn contactId={p.id} bloc="RDV" markDone={markDone} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
