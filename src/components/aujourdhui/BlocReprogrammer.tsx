import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { LastActionLine, MarkDoneBtn } from "./AujourdhuiShared";
import type { BlocSharedProps } from "./aujourdhui-types";

interface BlocReprogrammerProps extends BlocSharedProps {
  reprogramItems: any[];
}

export function BlocReprogrammer({
  reprogramItems, todayNotes, recentNotes, openContact, markDone,
}: BlocReprogrammerProps) {
  if (reprogramItems.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <RotateCcw className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">À reprogrammer</h3>
            <p className="text-[11px] text-muted-foreground">{reprogramItems.length} examen{reprogramItems.length > 1 ? "s" : ""} échoué{reprogramItems.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">{reprogramItems.length}</Badge>
      </div>
      <div className="divide-y max-h-60 overflow-y-auto">
        {reprogramItems.map((item: any) => (
          <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", item.type === "pratique" ? "bg-destructive" : "bg-warning")} />
                <button onClick={() => openContact(item.contactId)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                  {item.prenom} {item.nom}
                  <ExternalLink className="h-3 w-3 opacity-40" />
                </button>
              </div>
              <Badge variant="outline" className={cn("text-[9px]", item.type === "pratique" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                {item.label}
              </Badge>
            </div>
            {item.formation && <p className="text-[10px] text-muted-foreground mb-1">{item.formation}</p>}
            <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.contactId} />
            <div className="flex gap-1.5 mt-1">
              <MarkDoneBtn contactId={item.contactId} bloc="Reprogrammation" markDone={markDone} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
