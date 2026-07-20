import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PrioriteItem {
  id: string;
  contactId?: string;
  titre: string;
  detail: string;
  /** danger = délai dépassé ou blocage ; warning = à traiter aujourd'hui. */
  ton: "danger" | "warning";
  /** Ordre de gravité (plus petit = plus urgent). */
  rang: number;
}

interface PrioritesDuJourProps {
  items: PrioriteItem[];
  /** Nombre total d'actions listées plus bas (contexte, pas une injonction). */
  totalActions: number;
  openContact: (id: string) => void;
}

/**
 * Bandeau de tête du hub : répond à « par quoi je commence ? ».
 *
 * Le cockpit détecte beaucoup (plusieurs centaines de signaux, dont une
 * majorité d'hygiène de données) ; sans hiérarchie, l'équipe ne sait pas
 * où mordre. Ce bandeau ne montre QUE les échéances dépassées et les
 * blocages, au maximum 6, et renvoie le reste au corps de la page.
 */
export function PrioritesDuJour({ items, totalActions, openContact }: PrioritesDuJourProps) {
  if (items.length === 0) {
    return (
      <Card className="p-4 border-success/30 bg-success/5">
        <p className="text-sm font-medium text-success">Rien d'urgent aujourd'hui.</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {totalActions > 0
            ? `${totalActions} point${totalActions > 1 ? "s" : ""} de suivi plus bas, à traiter au fil de l'eau.`
            : "Tout est à jour."}
        </p>
      </Card>
    );
  }

  const top = [...items].sort((a, b) => a.rang - b.rang).slice(0, 6);
  const reste = items.length - top.length;

  return (
    <Card className="p-0 overflow-hidden border-destructive/30">
      <div className="px-5 py-3 border-b bg-destructive/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
            <Flame className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Par quoi commencer</h3>
            <p className="text-[11px] text-muted-foreground">
              {items.length} urgence{items.length > 1 ? "s" : ""} — échéances dépassées et blocages
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
          {items.length}
        </Badge>
      </div>
      <div className="divide-y">
        {top.map((item) => (
          <button
            key={item.id}
            onClick={() => item.contactId && openContact(item.contactId)}
            disabled={!item.contactId}
            className={cn(
              "w-full px-5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors",
              item.contactId ? "hover:bg-muted/30" : "cursor-default",
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn(
                "inline-block h-2 w-2 rounded-full shrink-0",
                item.ton === "danger" ? "bg-destructive" : "bg-warning",
              )} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.titre}</p>
                <p className="text-[11px] text-muted-foreground truncate">{item.detail}</p>
              </div>
            </div>
            {item.contactId && <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />}
          </button>
        ))}
      </div>
      {reste > 0 && (
        <div className="px-5 py-2 bg-muted/20 text-[11px] text-muted-foreground">
          et {reste} autre{reste > 1 ? "s" : ""} urgence{reste > 1 ? "s" : ""} dans les blocs ci-dessous
        </div>
      )}
    </Card>
  );
}
