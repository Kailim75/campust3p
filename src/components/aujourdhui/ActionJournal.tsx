import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollText, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface JournalEntry {
  id: string;
  contact_id: string;
  titre: string;
  created_at: string;
  contactName?: string;
}

interface ActionJournalProps {
  entries: JournalEntry[];
  onOpenContact: (contactId: string) => void;
}

export function ActionJournal({ entries, onOpenContact }: ActionJournalProps) {
  if (entries.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
          <ScrollText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Journal d'actions — Aujourd'hui</h3>
          <p className="text-[11px] text-muted-foreground">{entries.length} action{entries.length > 1 ? "s" : ""} enregistrée{entries.length > 1 ? "s" : ""}</p>
        </div>
      </div>
      <div className="divide-y max-h-60 overflow-y-auto">
        {entries.map((entry) => {
          // Handle both compact "[AUTO] Label" and legacy "[AUTO] DD/MM/YYYY HH:MM — Label"
          const legacyMatch = entry.titre.match(/\[AUTO\]\s*\d{2}\/\d{2}\/\d{4}\s*\d{2}:\d{2}\s*—\s*(.*)/);
          const compactMatch = entry.titre.match(/^\[AUTO\]\s*(.*)/);
          const actionLabel = legacyMatch ? legacyMatch[1] : compactMatch ? compactMatch[1] : entry.titre;
          const timeMatch = entry.titre.match(/(\d{2}:\d{2})/);
          const time = timeMatch ? timeMatch[1] : format(parseISO(entry.created_at), "HH:mm");

          return (
            <div key={entry.id} className="px-5 py-2.5 flex items-center gap-3 text-xs hover:bg-muted/20 transition-colors">
              <span className="text-muted-foreground font-mono w-10 shrink-0">{time}</span>
              <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary border-primary/15 shrink-0">AUTO</Badge>
              {entry.contactName && (
                <span className="font-medium text-foreground shrink-0">{entry.contactName}</span>
              )}
              <span className="text-muted-foreground truncate flex-1">{actionLabel}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] shrink-0"
                onClick={() => onOpenContact(entry.contact_id)}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Fiche
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
