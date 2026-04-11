import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreditCard, Mail, Check, ExternalLink } from "lucide-react";
import { isHandledToday } from "@/lib/aujourdhui-actions";
import { LastActionLine, MarkDoneBtn } from "./AujourdhuiShared";
import type { BlocSharedProps } from "./aujourdhui-types";
import { CARTE_PRO_KEYWORDS } from "./aujourdhui-types";

interface BlocCarteProProps extends BlocSharedProps {
  cartePro: any[];
  handleCarteProEmail: (item: any) => void;
  handleCarteProMarkDone: (item: any) => void;
}

export function BlocCartePro({
  cartePro, handleCarteProEmail, handleCarteProMarkDone,
  todayNotes, recentNotes, openContact, markDone,
}: BlocCarteProProps) {
  if (cartePro.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <CreditCard className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Carte Pro à envoyer</h3>
            <p className="text-[11px] text-muted-foreground">{cartePro.length} apprenant{cartePro.length > 1 ? "s" : ""} — pratique réussie</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{cartePro.length}</Badge>
      </div>
      <div className="divide-y max-h-80 overflow-y-auto">
        {cartePro.map((item: any) => {
          const carteProDoneToday = isHandledToday(item.id, todayNotes, CARTE_PRO_KEYWORDS);
          return (
            <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                    {item.prenom} {item.nom}
                    <ExternalLink className="h-3 w-3 opacity-40" />
                  </button>
                </div>
                {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
              </div>
              <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.id} />
              <div className="flex gap-1.5 mt-1">
                {item.email && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            size="sm" variant="outline" className="h-7 text-[10px] border-warning text-warning hover:bg-warning/10"
                            disabled={carteProDoneToday}
                            onClick={() => handleCarteProEmail(item)}
                          >
                            <Mail className="h-3 w-3 mr-1" /> Envoyer démarches
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {carteProDoneToday && <TooltipContent><p>Déjà envoyé aujourd'hui</p></TooltipContent>}
                    </Tooltip>
                  </TooltipProvider>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground"
                          disabled={carteProDoneToday}
                          onClick={() => handleCarteProMarkDone(item)}
                        >
                          <Check className="h-3 w-3 mr-1" /> Marquer envoyé
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {carteProDoneToday && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
                <MarkDoneBtn contactId={item.id} bloc="Carte Pro" markDone={markDone} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
