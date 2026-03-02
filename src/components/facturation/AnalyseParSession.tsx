import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart3, AlertTriangle, Lightbulb, ChevronDown, ChevronUp,
  Send, Users, Euro, ShieldAlert, TrendingDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────
interface SessionAnalysis {
  id: string;
  nom: string;
  formation_type: string;
  date_debut: string | null;
  date_fin: string | null;
  places_totales: number;
  prix: number;
  placesVendues: number;
  totalTheorique: number;
  totalFacture: number;
  totalEncaisse: number;
  resteAEncaisser: number;
  tauxRemplissage: number;
  tauxRecouvrement: number;
  healthScore: number;
  healthLevel: "saine" | "surveiller" | "danger";
  riskBadge: string | null;
  stagiaires: StagiaireDetail[];
}

interface StagiaireDetail {
  contactId: string;
  nom: string;
  prenom: string;
  montantDu: number;
  montantPaye: number;
  reste: number;
  statut: string;
  dateEcheance: string | null;
  factureId: string;
}

interface Recommendation {
  text: string;
  severity: "critical" | "important" | "info";
  sessionId?: string;
}

// ─── Data Hook ───────────────────────────────────────────────
function useSessionAnalysis() {
  return useQuery({
    queryKey: ["session_financial_analysis"],
    queryFn: async () => {
      // Fetch sessions, inscriptions with factures+paiements in parallel
      const [sessionsRes, inscriptionsRes] = await Promise.all([
        supabase
          .from("sessions")
          .select("id, nom, formation_type, date_debut, date_fin, places_totales, prix, statut")
          .in("statut", ["a_venir", "en_cours", "terminee"])
          .order("date_debut", { ascending: false }),
        supabase
          .from("session_inscriptions")
          .select(`
            id, session_id, contact_id,
            contact:contacts(id, nom, prenom),
            factures:factures!factures_session_inscription_id_fkey(
              id, montant_total, statut, date_echeance,
              paiements:paiements!paiements_facture_id_fkey(montant)
            )
          `),
      ]);

      if (sessionsRes.error) throw sessionsRes.error;
      if (inscriptionsRes.error) throw inscriptionsRes.error;

      const sessions = sessionsRes.data || [];
      const inscriptions = inscriptionsRes.data || [];

      // Group inscriptions by session
      const inscBySession: Record<string, any[]> = {};
      for (const insc of inscriptions) {
        const sid = insc.session_id;
        if (!inscBySession[sid]) inscBySession[sid] = [];
        inscBySession[sid].push(insc);
      }

      const now = new Date();
      const results: SessionAnalysis[] = [];

      for (const session of sessions) {
        const inscs = inscBySession[session.id] || [];
        const prix = Number(session.prix) || 0;
        const placesTotales = session.places_totales || 0;
        const placesVendues = inscs.length;
        const totalTheorique = placesTotales * prix;

        let totalFacture = 0;
        let totalEncaisse = 0;
        const stagiaires: StagiaireDetail[] = [];

        for (const insc of inscs) {
          const contact = (insc as any).contact;
          const factures = (insc as any).factures || [];

          for (const f of factures) {
            const montant = Number(f.montant_total) || 0;
            const paiements = f.paiements || [];
            const paye = paiements.reduce((s: number, p: any) => s + (Number(p.montant) || 0), 0);

            totalFacture += montant;
            totalEncaisse += paye;

            stagiaires.push({
              contactId: insc.contact_id,
              nom: contact?.nom || "—",
              prenom: contact?.prenom || "",
              montantDu: montant,
              montantPaye: paye,
              reste: montant - paye,
              statut: f.statut,
              dateEcheance: f.date_echeance,
              factureId: f.id,
            });
          }
        }

        const resteAEncaisser = totalFacture - totalEncaisse;
        const tauxRemplissage = placesTotales > 0 ? (placesVendues / placesTotales) * 100 : 0;
        const tauxRecouvrement = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;

        // Health Score
        const daysUntil = session.date_debut
          ? differenceInDays(new Date(session.date_debut), now)
          : 999;
        let facteurTemps = 100;
        if (daysUntil <= 7 && tauxRecouvrement < 50) facteurTemps = 20;
        else if (daysUntil <= 14) facteurTemps = 50;
        else if (daysUntil <= 30) facteurTemps = 75;

        const healthScore = Math.round(
          Math.min(tauxRemplissage, 100) * 0.4 +
          Math.min(tauxRecouvrement, 100) * 0.4 +
          facteurTemps * 0.2
        );
        const healthLevel: SessionAnalysis["healthLevel"] =
          healthScore >= 75 ? "saine" : healthScore >= 50 ? "surveiller" : "danger";

        // Risk Badge
        let riskBadge: string | null = null;
        if (tauxRemplissage >= 70 && tauxRecouvrement < 50) {
          riskBadge = "⚠ Risque trésorerie élevé";
        } else if (tauxRemplissage < 40 && tauxRecouvrement < 40) {
          riskBadge = "🔴 Double risque";
        }

        results.push({
          id: session.id,
          nom: session.nom,
          formation_type: session.formation_type,
          date_debut: session.date_debut,
          date_fin: session.date_fin,
          places_totales: placesTotales,
          prix,
          placesVendues,
          totalTheorique,
          totalFacture,
          totalEncaisse,
          resteAEncaisser,
          tauxRemplissage: Math.round(tauxRemplissage),
          tauxRecouvrement: Math.round(tauxRecouvrement),
          healthScore,
          healthLevel,
          riskBadge,
          stagiaires,
        });
      }

      // Sort by health score ascending (worst first)
      results.sort((a, b) => a.healthScore - b.healthScore);

      return results;
    },
    staleTime: 30_000,
  });
}

// ─── Recommendations Generator ──────────────────────────────
function generateRecommendations(sessions: SessionAnalysis[]): Recommendation[] {
  const recos: Recommendation[] = [];

  // Sessions with high uncollected amounts
  const highUncollected = sessions
    .filter(s => s.resteAEncaisser > 500)
    .sort((a, b) => b.resteAEncaisser - a.resteAEncaisser);

  for (const s of highUncollected.slice(0, 1)) {
    recos.push({
      text: `${s.nom} : ${s.resteAEncaisser.toLocaleString("fr-FR")}€ encore non encaissés`,
      severity: s.tauxRecouvrement < 30 ? "critical" : "important",
      sessionId: s.id,
    });
  }

  // Sessions with low fill + unpaid
  const dualRisk = sessions.filter(
    s => s.tauxRemplissage < 60 && s.resteAEncaisser > 0 && s.placesVendues > 0
  );
  for (const s of dualRisk.slice(0, 1)) {
    const placesVides = s.places_totales - s.placesVendues;
    const impayees = s.stagiaires.filter(st => st.reste > 0).length;
    recos.push({
      text: `${s.nom} : ${placesVides} places vides + ${impayees} impayé${impayees > 1 ? "s" : ""}`,
      severity: "important",
      sessionId: s.id,
    });
  }

  // Global low recovery
  const totalFacture = sessions.reduce((s, x) => s + x.totalFacture, 0);
  const totalEncaisse = sessions.reduce((s, x) => s + x.totalEncaisse, 0);
  const globalRecovery = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 100;
  if (globalRecovery < 60 && totalFacture > 0) {
    recos.push({
      text: `Recouvrement global faible : ${Math.round(globalRecovery)}% sur les sessions actives`,
      severity: "info",
    });
  }

  return recos.slice(0, 3);
}

// ─── Severity Config ─────────────────────────────────────────
const severityConfig = {
  critical: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  important: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
  info: { bg: "bg-info/10", text: "text-info", border: "border-info/20" },
};

const healthColors = {
  saine: "text-success",
  surveiller: "text-warning",
  danger: "text-destructive",
};

// ─── Component ───────────────────────────────────────────────
export function AnalyseParSession() {
  const { data: sessions = [], isLoading } = useSessionAnalysis();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const recommendations = useMemo(() => generateRecommendations(sessions), [sessions]);

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card-elevated p-4 animate-pulse h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="card-elevated p-8 text-center text-muted-foreground">
        <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Aucune session avec données financières</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="card-elevated p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-warning" />
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Opportunités prioritaires
            </h3>
          </div>
          <div className="space-y-2">
            {recommendations.map((reco, i) => {
              const cfg = severityConfig[reco.severity];
              return (
                <div key={i} className={cn("rounded-lg px-3 py-2 text-sm border", cfg.bg, cfg.border)}>
                  <span className={cfg.text}>{reco.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Session Table */}
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Session</TableHead>
              <TableHead className="text-center">Remplissage</TableHead>
              <TableHead className="text-right">CA Théorique</TableHead>
              <TableHead className="text-right">Facturé</TableHead>
              <TableHead className="text-right">Encaissé</TableHead>
              <TableHead className="text-right">Reste</TableHead>
              <TableHead className="text-center">Recouvrement</TableHead>
              <TableHead className="text-center">Santé</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                isExpanded={expandedId === s.id}
                onToggle={() => toggle(s.id)}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ─── Session Row ─────────────────────────────────────────────
function SessionRow({
  session: s,
  isExpanded,
  onToggle,
}: {
  session: SessionAnalysis;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={onToggle}
      >
        <TableCell className="w-8">
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <div className="font-medium">{s.nom}</div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">{s.formation_type}</Badge>
              {s.date_debut && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(s.date_debut), "dd MMM yyyy", { locale: fr })}
                </span>
              )}
              {s.riskBadge && (
                <Badge variant="destructive" className="text-xs">
                  {s.riskBadge}
                </Badge>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium">
              {s.placesVendues}/{s.places_totales}
            </span>
            <Progress
              value={Math.min(s.tauxRemplissage, 100)}
              className="h-1.5 w-16"
            />
            <span className="text-xs text-muted-foreground">{s.tauxRemplissage}%</span>
          </div>
        </TableCell>
        <TableCell className="text-right text-sm">
          {s.totalTheorique.toLocaleString("fr-FR")}€
        </TableCell>
        <TableCell className="text-right text-sm">
          {s.totalFacture.toLocaleString("fr-FR")}€
        </TableCell>
        <TableCell className="text-right text-sm font-medium text-success">
          {s.totalEncaisse.toLocaleString("fr-FR")}€
        </TableCell>
        <TableCell className="text-right text-sm font-medium text-destructive">
          {s.resteAEncaisser > 0
            ? `${s.resteAEncaisser.toLocaleString("fr-FR")}€`
            : "—"}
        </TableCell>
        <TableCell className="text-center">
          <span
            className={cn(
              "text-sm font-bold",
              s.tauxRecouvrement >= 75
                ? "text-success"
                : s.tauxRecouvrement >= 50
                  ? "text-warning"
                  : "text-destructive"
            )}
          >
            {s.tauxRecouvrement}%
          </span>
        </TableCell>
        <TableCell className="text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className={cn("text-lg font-bold", healthColors[s.healthLevel])}>
              {s.healthScore}
            </span>
            <span className="text-[10px] text-muted-foreground uppercase">/100</span>
          </div>
        </TableCell>
        <TableCell />
      </TableRow>

      {/* Expanded Detail */}
      {isExpanded && (
        <TableRow>
          <TableCell colSpan={10} className="bg-muted/30 p-0">
            <SessionDetail session={s} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Session Detail (stagiaires) ─────────────────────────────
function SessionDetail({ session: s }: { session: SessionAnalysis }) {
  const unpaidStagiaires = s.stagiaires.filter(st => st.reste > 0);
  const now = new Date();

  const handleRelancerTous = () => {
    toast.success(
      `Relance initiée pour ${unpaidStagiaires.length} stagiaire${unpaidStagiaires.length > 1 ? "s" : ""} impayé${unpaidStagiaires.length > 1 ? "s" : ""}`
    );
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Users className="h-4 w-4" />
          Détail stagiaires — {s.nom}
        </h4>
        {unpaidStagiaires.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleRelancerTous}>
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Relancer tous les impayés ({unpaidStagiaires.length})
          </Button>
        )}
      </div>

      {s.stagiaires.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune facture liée à cette session</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stagiaire</TableHead>
              <TableHead className="text-right">Montant dû</TableHead>
              <TableHead className="text-right">Payé</TableHead>
              <TableHead className="text-right">Reste</TableHead>
              <TableHead className="text-center">Statut</TableHead>
              <TableHead>Échéance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {s.stagiaires.map((st, i) => {
              const isOverdue = st.dateEcheance && differenceInDays(now, new Date(st.dateEcheance)) > 0;
              return (
                <TableRow key={`${st.factureId}-${i}`}>
                  <TableCell className="font-medium">
                    {st.prenom} {st.nom}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {st.montantDu.toLocaleString("fr-FR")}€
                  </TableCell>
                  <TableCell className="text-right text-sm text-success">
                    {st.montantPaye.toLocaleString("fr-FR")}€
                  </TableCell>
                  <TableCell className={cn("text-right text-sm font-medium", st.reste > 0 ? "text-destructive" : "text-success")}>
                    {st.reste > 0 ? `${st.reste.toLocaleString("fr-FR")}€` : "✓"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={st.statut === "payee" ? "default" : "outline"}
                      className={cn(
                        "text-xs",
                        st.statut === "payee" && "bg-success text-success-foreground",
                        st.statut === "partiel" && "bg-warning/10 text-warning border-warning/20",
                        ["emise", "impayee"].includes(st.statut) && isOverdue && "bg-destructive/10 text-destructive border-destructive/20"
                      )}
                    >
                      {st.statut === "payee" ? "Payé" : st.statut === "partiel" ? "Partiel" : isOverdue ? "En retard" : "En attente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {st.dateEcheance
                      ? format(new Date(st.dateEcheance), "dd/MM/yyyy")
                      : "—"}
                    {isOverdue && st.reste > 0 && (
                      <span className="ml-1 text-destructive text-xs">
                        ({differenceInDays(now, new Date(st.dateEcheance!))}j)
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
