import { ArrowRight, Phone, FileText, UserX, MessageCircle, CalendarClock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTodayActions, ActionItem } from "@/hooks/useDashboardActionData";
import { formatEur } from "@/lib/format-currency";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  onNavigate: (section: string, params?: Record<string, string>) => void;
  onOpenContact: (contactId: string) => void;
}

const typeConfig: Record<ActionItem["type"], { icon: typeof Phone; color: string; sectionLabel: string }> = {
  prospect: { icon: Phone, color: "text-primary", sectionLabel: "Relances prospects" },
  facture: { icon: FileText, color: "text-warning", sectionLabel: "Factures / paiements" },
  apprenant: { icon: UserX, color: "text-destructive", sectionLabel: "Apprenants / docs" },
};

function QuickActions({ item }: { item: ActionItem }) {
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.telephone) {
      const phone = item.telephone.replace(/\s/g, "").replace(/^0/, "33");
      window.open(`https://wa.me/${phone}`, "_blank");
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.telephone) {
      window.open(`tel:${item.telephone}`, "_self");
    }
  };

  return (
    <div className="flex items-center gap-0.5 shrink-0">
      {item.telephone && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleWhatsApp}
                className="p-1 rounded hover:bg-primary/10 transition-colors"
              >
                <MessageCircle className="h-3.5 w-3.5 text-green-600" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">WhatsApp</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleCall}
                className="p-1 rounded hover:bg-primary/10 transition-colors"
              >
                <Phone className="h-3.5 w-3.5 text-primary" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">Appeler</TooltipContent>
          </Tooltip>
        </>
      )}
    </div>
  );
}

export function ActionPanelToday({ onNavigate, onOpenContact }: Props) {
  const { data: items, isLoading } = useTodayActions();

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40 mb-4" />
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full mb-2" />)}
      </div>
    );
  }

  const grouped = {
    prospect: (items || []).filter(i => i.type === "prospect"),
    facture: (items || []).filter(i => i.type === "facture"),
    apprenant: (items || []).filter(i => i.type === "apprenant"),
  };

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">À traiter aujourd'hui</h3>
          <Badge variant="secondary" className="text-xs">
            {(items || []).length}
          </Badge>
        </div>

        {(items || []).length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">Rien à traiter — tout est en ordre 🎉</p>
        )}

        {(["prospect", "facture", "apprenant"] as const).map(type => {
          const group = grouped[type];
          if (group.length === 0) return null;
          const config = typeConfig[type];
          const Icon = config.icon;
          return (
            <div key={type} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("h-3.5 w-3.5", config.color)} />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {config.sectionLabel}
                </span>
              </div>
              <div className="space-y-1">
                {group.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.type === "apprenant") onOpenContact(item.entityId);
                      else onNavigate(item.section);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                        {item.montant != null && item.montant > 0 && (
                          <span className="text-xs font-semibold text-foreground shrink-0">
                            {formatEur(item.montant)}
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs",
                        item.retardDays && item.retardDays > 0 ? "text-destructive font-medium" : "text-muted-foreground"
                      )}>
                        {item.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {item.track && (
                        <Badge variant="outline" className="text-[10px] ml-1">
                          {item.track === "initial" ? "CMA" : "Carte Pro"}
                        </Badge>
                      )}
                      <QuickActions item={item} />
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
              <button
                onClick={() => onNavigate(group[0].section)}
                className="text-xs text-primary hover:underline mt-1 ml-3"
              >
                Tout voir →
              </button>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
