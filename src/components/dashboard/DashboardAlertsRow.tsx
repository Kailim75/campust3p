import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CreditCard, Calendar, UserPlus, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardAlertsRowProps {
  onNavigate: (section: string) => void;
  onNavigateWithContact: (section: string, contactId?: string) => void;
}

function useAlertsData() {
  return useQuery({
    queryKey: ["dashboard", "alerts-row"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];

      const [sessionsRes, facturesRes, prospectsRes, inscriptionsRes] = await Promise.all([
        supabase.from("sessions").select("id, places_totales, date_debut, statut")
          .eq("archived", false).eq("statut", "en_cours").gte("date_fin", todayStr),
        supabase.from("factures").select("id, statut, date_echeance")
          .eq("statut", "emise"),
        supabase.from("prospects").select("id, created_at")
          .eq("statut", "nouveau"),
        supabase.from("session_inscriptions").select("session_id"),
      ]);

      const sessions = sessionsRes.data || [];
      const factures = facturesRes.data || [];
      const prospects = prospectsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];

      // Sessions at risk: < 50% fill rate
      const sessionCounts = inscriptions.reduce((acc: Record<string, number>, ins) => {
        acc[ins.session_id] = (acc[ins.session_id] || 0) + 1;
        return acc;
      }, {});
      const sessionsAtRisk = sessions.filter(s => {
        const filled = sessionCounts[s.id] || 0;
        const total = s.places_totales || 1;
        return (filled / total) < 0.5;
      }).length;

      // Late payments
      const latePayments = factures.filter(f => 
        f.date_echeance && f.date_echeance < todayStr
      ).length;

      return { sessionsAtRisk, latePayments, newProspects: prospects.length, pendingInvoices: factures.length };
    },
    staleTime: 60_000,
  });
}

const alertCards = [
  { key: "sessionsAtRisk", label: "Sessions à risque", icon: AlertTriangle, section: "sessions", variant: "warning" as const },
  { key: "latePayments", label: "Paiements en retard", icon: CreditCard, section: "finances", variant: "destructive" as const },
  { key: "pendingInvoices", label: "Factures en attente", icon: Calendar, section: "finances", variant: "muted" as const },
  { key: "newProspects", label: "Prospects à traiter", icon: UserPlus, section: "prospects", variant: "primary" as const },
] as const;

const variantStyles = {
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
  primary: "text-primary",
};

export function DashboardAlertsRow({ onNavigate }: DashboardAlertsRowProps) {
  const { data, isLoading } = useAlertsData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
      {alertCards.map((card) => {
        const Icon = card.icon;
        const value = data?.[card.key as keyof typeof data] ?? 0;
        const hasAlert = (value as number) > 0;
        return (
          <button
            key={card.key}
            onClick={() => onNavigate(card.section)}
            className={cn(
              "rounded-xl border bg-card p-6 text-left transition-all group",
              hasAlert ? "border-border hover:border-primary/30 hover:shadow-sm" : "border-border/50"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center h-8 w-8 rounded-lg",
                  hasAlert ? "bg-muted" : "bg-muted/50"
                )}>
                  <Icon className={cn("h-4 w-4", hasAlert ? variantStyles[card.variant] : "text-muted-foreground/50")} />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.label}</span>
              </div>
              {hasAlert && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
            </div>
            <p className={cn(
              "text-3xl font-bold tracking-tight",
              hasAlert ? "text-foreground" : "text-muted-foreground/40"
            )}>{value}</p>
          </button>
        );
      })}
    </div>
  );
}
