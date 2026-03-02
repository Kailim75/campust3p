import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Euro, GraduationCap, BarChart3, AlertTriangle, TrendingDown } from "lucide-react";

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

      const [facturesRes, paiementsRes, sessionsRes, inscriptionsRes, contactsRes, chargesRes] = await Promise.all([
        supabase.from("factures").select("montant_total, statut, date_emission").not("statut", "eq", "annulee"),
        supabase.from("paiements").select("montant, date_paiement"),
        supabase.from("sessions").select("id, places_totales, prix, statut, date_debut, formation_type").eq("archived", false).gte("date_fin", todayStr),
        supabase.from("session_inscriptions").select("session_id"),
        supabase.from("contacts").select("id, statut, source").eq("archived", false),
        supabase.from("charges").select("montant").eq("type_charge", "fixe"),
      ]);

      const factures = facturesRes.data || [];
      const paiements = paiementsRes.data || [];
      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];
      const contacts = contactsRes.data || [];
      const charges = chargesRes.data || [];

      // FINANCE
      const caConfirme = factures
        .filter(f => f.date_emission && parseISO(f.date_emission) >= monthStart && parseISO(f.date_emission) <= monthEnd)
        .reduce((acc, f) => acc + Number(f.montant_total), 0);

      const totalPaye = paiements
        .filter(p => parseISO(p.date_paiement) >= monthStart)
        .reduce((acc, p) => acc + Number(p.montant), 0);

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

      // Objectif mensuel = charges fixes (seuil de rentabilité simplifié)
      const objectifMensuel = charges.reduce((acc, c) => acc + Number(c.montant), 0);

      // ACQUISITION
      const prospects = contacts.filter(c => c.statut === "En attente de validation").length;
      const clients = contacts.filter(c => c.statut === "Client" || c.statut === "Bravo").length;
      const total = contacts.length;
      const tauxConversion = total > 0 ? Math.round((clients / total) * 100) : 0;

      // Source principale
      const sourceCounts: Record<string, number> = {};
      contacts.forEach(c => {
        const src = c.source || "";
        if (src) sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });
      const sourceEntries = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]);
      const sourcePrincipale = sourceEntries[0]?.[0] || null;

      // Coût moyen par stagiaire = total charges / nb clients (simple estimation)
      const totalCharges = charges.reduce((acc, c) => acc + Number(c.montant), 0);
      const coutMoyenStagiaire = clients > 0 ? Math.round(totalCharges / clients) : null;

      return {
        money: { caConfirme, caPrevisionnel, caPotentiel, manqueAGagner, totalPaye, objectifMensuel },
        sessions: { totalPlaces, filledPlaces, tauxRemplissage, sessionsUnder40, count: upcomingSessions.length },
        acquisition: { prospects, clients, tauxConversion, sourcePrincipale, total, coutMoyenStagiaire },
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

  const remplissageColor = (s?.tauxRemplissage ?? 0) >= 70 ? "text-success" : (s?.tauxRemplissage ?? 0) >= 40 ? "text-warning" : "text-destructive";
  const remplissageBg = (s?.tauxRemplissage ?? 0) >= 70 ? "bg-success" : (s?.tauxRemplissage ?? 0) >= 40 ? "bg-warning" : "bg-destructive";

  const objectif = m?.objectifMensuel ?? 0;
  const progressObjectif = objectif > 0 ? Math.min(Math.round(((m?.caConfirme ?? 0) / objectif) * 100), 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 💰 FINANCE */}
      <div
        className="rounded-xl border border-border bg-card p-6 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
        onClick={() => onNavigate("paiements")}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-success/10">
            <Euro className="h-4 w-4 text-success" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Finance</h3>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">CA confirmé ce mois</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{formatEuro(m?.caConfirme ?? 0)}</p>
          </div>

          {/* Barre progression objectif mensuel */}
          {objectif > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Objectif mensuel</span>
                <span>{progressObjectif}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", progressObjectif >= 80 ? "bg-success" : progressObjectif >= 50 ? "bg-warning" : "bg-destructive")}
                  style={{ width: `${progressObjectif}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
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
              <TrendingDown className="h-3.5 w-3.5 text-warning flex-shrink-0" />
              <span className="text-xs text-warning">Manque à gagner : {formatEuro(m?.manqueAGagner ?? 0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 🎓 SESSIONS */}
      <div
        className="rounded-xl border border-border bg-card p-6 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
        onClick={() => onNavigate("sessions")}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-info/10">
            <GraduationCap className="h-4 w-4 text-info" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Sessions</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <p className={cn("text-3xl font-bold tabular-nums", remplissageColor)}>{s?.tauxRemplissage ?? 0}%</p>
            <span className="text-xs text-muted-foreground">remplissage moyen</span>
          </div>

          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>{s?.filledPlaces ?? 0} vendues</span>
              <span>{s?.totalPlaces ?? 0} ouvertes</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all", remplissageBg)}
                style={{ width: `${Math.min(s?.tauxRemplissage ?? 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total places</p>
              <p className="text-sm font-semibold tabular-nums">{s?.totalPlaces ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Places vendues</p>
              <p className="text-sm font-semibold tabular-nums text-foreground">{s?.filledPlaces ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions actives</p>
              <p className="text-sm font-semibold tabular-nums">{s?.count ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sessions &lt;40%</p>
              <p className={cn("text-sm font-semibold tabular-nums", (s?.sessionsUnder40 ?? 0) > 0 ? "text-destructive" : "text-foreground")}>
                {s?.sessionsUnder40 ?? 0}
              </p>
            </div>
          </div>

          {(s?.sessionsUnder40 ?? 0) > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/5 border border-destructive/10">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
              <span className="text-xs text-destructive">{s?.sessionsUnder40} session{(s?.sessionsUnder40 ?? 0) > 1 ? "s" : ""} sous 40% de remplissage</span>
            </div>
          )}
        </div>
      </div>

      {/* 📈 ACQUISITION */}
      <div
        className="rounded-xl border border-border bg-card p-6 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all"
        onClick={() => onNavigate("contacts")}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-sm text-foreground uppercase tracking-wider">Acquisition</h3>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Taux de conversion</p>
            <p className="text-3xl font-bold tabular-nums text-foreground">{a?.tauxConversion ?? 0}%</p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prospects actifs</p>
              <p className="text-sm font-semibold tabular-nums">{a?.prospects ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clients</p>
              <p className="text-sm font-semibold tabular-nums text-success">{a?.clients ?? 0}</p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-muted/50 space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Source principale</p>
              {a?.sourcePrincipale ? (
                <p className="text-sm font-medium text-foreground">{a.sourcePrincipale}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Données marketing non configurées</p>
              )}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Coût moyen / stagiaire</p>
              {a?.coutMoyenStagiaire !== null && a?.coutMoyenStagiaire !== undefined ? (
                <p className="text-sm font-medium text-foreground">{formatEuro(a.coutMoyenStagiaire)}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">Données marketing non configurées</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
