import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, GraduationCap, TrendingUp, AlertTriangle, Users, BarChart3 } from "lucide-react";

interface StrategicPillarsProps {
  onNavigate: (section: string) => void;
}

function useStrategicData() {
  return useQuery({
    queryKey: ["dashboard", "strategic-pillars"],
    queryFn: async () => {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const todayStr = now.toISOString().split("T")[0];

      const [facturesRes, paiementsRes, sessionsRes, inscriptionsRes, contactsRes] = await Promise.all([
        supabase.from("factures").select("montant_total, statut, date_emission").not("statut", "eq", "annulee"),
        supabase.from("paiements").select("montant, date_paiement"),
        supabase.from("sessions").select("id, places_totales, prix, statut, date_debut, formation_type").eq("archived", false).gte("date_fin", todayStr),
        supabase.from("session_inscriptions").select("session_id"),
        supabase.from("contacts").select("id, statut, source").eq("archived", false),
      ]);

      const factures = facturesRes.data || [];
      const paiements = paiementsRes.data || [];
      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const contacts = contactsRes.data || [];

      // MONEY
      const caConfirme = factures
        .filter(f => f.date_emission && parseISO(f.date_emission) >= monthStart && parseISO(f.date_emission) <= monthEnd)
        .reduce((acc, f) => acc + Number(f.montant_total), 0);

      const totalPaye = paiements
        .filter(p => parseISO(p.date_paiement) >= monthStart)
        .reduce((acc, p) => acc + Number(p.montant), 0);

      // Inscription counts
      const inscCounts: Record<string, number> = {};
      inscriptions.forEach(i => { inscCounts[i.session_id] = (inscCounts[i.session_id] || 0) + 1; });

      const upcomingSessions = sessions.filter(s => s.statut === "a_venir" || s.statut === "en_cours" || s.statut === "complet");
      
      let caPrevisionnel = 0;
      let caPotentiel = 0;
      let totalPlaces = 0;
      let filledPlaces = 0;
      let sessionsUnder40 = 0;

      upcomingSessions.forEach(s => {
        const filled = inscCounts[s.id] || 0;
        const places = s.places_totales || 0;
        const prix = Number(s.prix || 0);
        const rate = places > 0 ? filled / places : 0;

        caPrevisionnel += filled * prix;
        caPotentiel += places * prix;
        totalPlaces += places;
        filledPlaces += filled;

        if (rate < 0.4 && places > 0) sessionsUnder40++;
      });

      const tauxRemplissage = totalPlaces > 0 ? Math.round((filledPlaces / totalPlaces) * 100) : 0;
      const manqueAGagner = caPotentiel - caPrevisionnel;

      // ACQUISITION
      const prospects = contacts.filter(c => c.statut === "En attente de validation").length;
      const clients = contacts.filter(c => c.statut === "Client" || c.statut === "Bravo").length;
      const total = contacts.length;
      const tauxConversion = total > 0 ? Math.round((clients / total) * 100) : 0;

      // Source principale
      const sourceCounts: Record<string, number> = {};
      contacts.forEach(c => {
        const src = c.source || "Non défini";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      const sourcePrincipale = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Non défini";

      return {
        money: { caConfirme, caPrevisionnel, caPotentiel, manqueAGagner, totalPaye },
        sessions: { totalPlaces, filledPlaces, tauxRemplissage, sessionsUnder40, count: upcomingSessions.length },
        acquisition: { prospects, clients, tauxConversion, sourcePrincipale, total },
      };
    },
    staleTime: 2 * 60 * 1000,
  });
}

const formatEuro = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);

export function StrategicPillars({ onNavigate }: StrategicPillarsProps) {
  const { data, isLoading } = useStrategicData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-border bg-card p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-10 w-24 mb-3" />
            <Skeleton className="h-3 w-full mb-2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const m = data?.money;
  const s = data?.sessions;
  const a = data?.acquisition;

  const remplissageLevel = (s?.tauxRemplissage ?? 0) >= 70 ? "success" : (s?.tauxRemplissage ?? 0) >= 40 ? "warning" : "destructive";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ARGENT */}
      <div 
        className="rounded-xl border border-border bg-card p-6 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
        onClick={() => onNavigate("paiements")}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-success/10">
            <Euro className="h-4 w-4 text-success" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Argent</h3>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CA confirmé ce mois</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{formatEuro(m?.caConfirme ?? 0)}</p>
          </div>

          {/* Progress bar: CA confirmé vs potentiel */}
          {(m?.caPotentiel ?? 0) > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Confirmé</span>
                <span>{Math.round(((m?.caConfirme ?? 0) / (m?.caPotentiel ?? 1)) * 100)}% du potentiel</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <div 
                  className="h-full rounded-full bg-success transition-all"
                  style={{ width: `${Math.min(((m?.caConfirme ?? 0) / (m?.caPotentiel ?? 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prévisionnel</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{formatEuro(m?.caPrevisionnel ?? 0)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Potentiel</p>
              <p className="text-sm font-semibold tabular-nums text-success">{formatEuro(m?.caPotentiel ?? 0)}</p>
            </div>
          </div>

          {(m?.manqueAGagner ?? 0) > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/5 border border-warning/10">
              <AlertTriangle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
              <span className="text-xs text-warning">Manque à gagner : {formatEuro(m?.manqueAGagner ?? 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* SESSIONS */}
      <div 
        className="rounded-xl border border-border bg-card p-6 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
        onClick={() => onNavigate("sessions")}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-info/10">
            <GraduationCap className="h-4 w-4 text-info" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Sessions</h3>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Taux de remplissage</p>
              <p className={cn("text-3xl font-bold tabular-nums", `text-${remplissageLevel}`)}>{s?.tauxRemplissage ?? 0}%</p>
            </div>
            {(s?.tauxRemplissage ?? 0) < 40 && (
              <span className="text-[10px] font-semibold px-2 py-1 rounded-md bg-destructive/10 text-destructive uppercase tracking-wider">
                Critique
              </span>
            )}
          </div>

          <div>
            <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
              <span>{s?.filledPlaces ?? 0} vendues</span>
              <span>{s?.totalPlaces ?? 0} total</span>
            </div>
            <Progress value={s?.tauxRemplissage ?? 0} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions</p>
              <p className="text-sm font-semibold tabular-nums">{s?.count ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sous 40%</p>
              <p className={cn("text-sm font-semibold tabular-nums", (s?.sessionsUnder40 ?? 0) > 0 ? "text-destructive" : "text-foreground")}>
                {s?.sessionsUnder40 ?? 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ACQUISITION */}
      <div 
        className="rounded-xl border border-border bg-card p-6 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
        onClick={() => onNavigate("contacts")}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Acquisition</h3>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Taux de conversion</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{a?.tauxConversion ?? 0}%</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prospects</p>
              <p className="text-sm font-semibold tabular-nums">{a?.prospects ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clients</p>
              <p className="text-sm font-semibold tabular-nums text-success">{a?.clients ?? 0}</p>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Source principale</p>
            <p className={cn("text-sm font-medium", a?.sourcePrincipale && a.sourcePrincipale !== "Non défini" ? "text-foreground" : "text-muted-foreground italic")}>
              {a?.sourcePrincipale && a.sourcePrincipale !== "Non défini" ? a.sourcePrincipale : "Aucune source configurée"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
