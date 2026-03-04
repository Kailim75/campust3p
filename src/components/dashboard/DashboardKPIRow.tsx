import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth } from "date-fns";
import { Euro, GraduationCap, Calendar, UserPlus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DashboardKPIRowProps {
  onNavigate: (section: string) => void;
}

function useKPIData() {
  return useQuery({
    queryKey: ["dashboard", "kpi-row"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();
      const todayStr = now.toISOString().split("T")[0];

      const [facturesRes, sessionsRes, contactsRes, prospectsRes] = await Promise.all([
        supabase.from("factures").select("montant_total, statut, date_emission")
          .not("statut", "eq", "annulee")
          .gte("date_emission", monthStart)
          .lte("date_emission", monthEnd),
        supabase.from("sessions").select("id, statut, date_debut, date_fin")
          .eq("archived", false)
          .gte("date_fin", todayStr),
        supabase.from("contacts").select("id, statut").eq("archived", false),
        supabase.from("prospects").select("id, created_at")
          .gte("created_at", monthStart),
      ]);

      const factures = facturesRes.data || [];
      const sessions = sessionsRes.data || [];
      const contacts = contactsRes.data || [];
      const prospects = prospectsRes.data || [];

      const caMonth = factures.reduce((s, f) => s + (f.montant_total || 0), 0);
      const activeSessions = sessions.filter(s => s.statut === "en_cours" || s.statut === "a_venir").length;
      const activeApprenants = contacts.filter(c => c.statut === "En formation théorique" || c.statut === "En formation pratique").length;
      const newProspects = prospects.length;

      return { caMonth, activeSessions, activeApprenants, newProspects };
    },
    staleTime: 60_000,
  });
}

const kpiCards = [
  { key: "caMonth", label: "CA du mois", icon: Euro, section: "finances", format: (v: number) => `${(v / 1000).toFixed(1)}k €` },
  { key: "activeApprenants", label: "Apprenants actifs", icon: GraduationCap, section: "contacts", format: (v: number) => String(v) },
  { key: "activeSessions", label: "Sessions actives", icon: Calendar, section: "sessions", format: (v: number) => String(v) },
  { key: "newProspects", label: "Nouveaux prospects", icon: UserPlus, section: "prospects", format: (v: number) => String(v) },
] as const;

export function DashboardKPIRow({ onNavigate }: DashboardKPIRowProps) {
  const { data, isLoading } = useKPIData();

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
      {kpiCards.map((kpi) => {
        const Icon = kpi.icon;
        const value = data?.[kpi.key as keyof typeof data] ?? 0;
        return (
          <button
            key={kpi.key}
            onClick={() => onNavigate(kpi.section)}
            className="rounded-xl border border-border bg-card p-6 text-left hover:border-primary/30 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground tracking-tight">{kpi.format(value as number)}</p>
          </button>
        );
      })}
    </div>
  );
}
