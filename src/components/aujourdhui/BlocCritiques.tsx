import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FolderOpen, CreditCard, ExternalLink, CheckCircle2 } from "lucide-react";
import { LastActionLine, UrgencyDot, MarkDoneBtn } from "./AujourdhuiShared";
import type { BlocSharedProps } from "./aujourdhui-types";

interface BlocCritiquesProps extends BlocSharedProps {
  critiques: any[];
  handleCritiqueDemanderDocs: (item: any) => void;
  handleCritiqueRelancePaiement: (item: any) => void;
}

export function BlocCritiques({
  critiques, handleCritiqueDemanderDocs, handleCritiqueRelancePaiement,
  todayNotes, recentNotes, openContact, markDone,
}: BlocCritiquesProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Apprenants critiques</h3>
            <p className="text-[11px] text-muted-foreground">{critiques.length} action{critiques.length > 1 ? "s" : ""} requise{critiques.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">{critiques.length}</Badge>
      </div>
      <div className="divide-y max-h-80 overflow-y-auto">
        {critiques.length === 0 ? (
          <div className="p-5 text-center text-muted-foreground text-xs">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1.5 text-success/50" />
            Aucun apprenant en situation critique
          </div>
        ) : critiques.map((item) => (
          <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <UrgencyDot urgency={item.urgency} />
                <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                  {item.prenom} {item.nom}
                  <ExternalLink className="h-3 w-3 opacity-40" />
                </button>
              </div>
              {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {item.reasons.map((r: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                  {r}
                </Badge>
              ))}
            </div>
            <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.id} />
            <div className="flex gap-1.5 mt-1">
              {item.missingCMA.length > 0 && item.email && (
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleCritiqueDemanderDocs(item)}>
                  <FolderOpen className="h-3 w-3 mr-1" /> Demander docs
                </Button>
              )}
              {item.hasLatePayment && item.email && (
                <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20" onClick={() => handleCritiqueRelancePaiement(item)}>
                  <CreditCard className="h-3 w-3 mr-1" /> Relance paiement
                </Button>
              )}
              <MarkDoneBtn contactId={item.id} bloc="Critique" markDone={markDone} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
