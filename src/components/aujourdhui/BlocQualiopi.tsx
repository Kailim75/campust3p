import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

interface BlocQualiopiProps {
  qualiopiSessions: any[];
  onNavigate?: (section: string) => void;
}

export function BlocQualiopi({ qualiopiSessions, onNavigate }: BlocQualiopiProps) {
  if (qualiopiSessions.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Qualiopi à régulariser</h3>
            <p className="text-[11px] text-muted-foreground">{qualiopiSessions.length} session{qualiopiSessions.length > 1 ? "s" : ""} avec critères manquants</p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{qualiopiSessions.length}</Badge>
      </div>
      <div className="divide-y max-h-60 overflow-y-auto">
        {qualiopiSessions.map((s: any) => (
          <div key={s.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">{s.nom}</span>
              <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning">
                {s.issues.length} critère{s.issues.length > 1 ? "s" : ""}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {s.issues.map((issue: string, i: number) => (
                <Badge key={i} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                  {issue}
                </Badge>
              ))}
            </div>
            {onNavigate && (
              <Button
                size="sm" variant="outline"
                className="h-6 text-[10px] gap-1"
                onClick={() => onNavigate(`session-qualiopi-${s.id}`)}
              >
                <Shield className="h-3 w-3" /> Ouvrir Qualiopi
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
