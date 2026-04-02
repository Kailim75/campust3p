import { useMemo } from "react";
import { differenceInDays } from "date-fns";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingUp, Lightbulb, ShieldAlert, Send, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FactureWithDetails } from "@/hooks/useFactures";

interface FacturationIntelligenceProps {
  factures: FactureWithDetails[];
  onRelance?: (factureId: string) => void;
  onNavigate?: (section: string) => void;
}

interface RiskResult {
  score: number;
  color: string;
  label: string;
  facturesAtRisk: FactureWithDetails[];
}

interface Recommendation {
  text: string;
  severity: "critical" | "important" | "info";
  factureId?: string;
}

interface Projection {
  encaissementProbable: number;
  manqueAGagner: number;
}

function computeRiskScore(factures: FactureWithDetails[]): RiskResult {
  const unpaid = factures.filter(f => 
    ["emise", "partiel", "impayee"].includes(f.statut)
  );
  const now = new Date();
  let score = 100;
  const atRisk: FactureWithDetails[] = [];

  for (const f of unpaid) {
    const montantRestant = Number(f.montant_total) - f.total_paye;
    if (montantRestant <= 0) continue;
    
    score -= 5;
    
    if (f.date_echeance) {
      const days = differenceInDays(now, new Date(f.date_echeance));
      if (days > 20) { score -= 15; atRisk.push(f); }
      else if (days > 10) { score -= 10; atRisk.push(f); }
    }
    
    if (montantRestant > 1000) score -= 10;
  }

  score = Math.max(0, Math.min(100, score));
  
  const color = score > 75 ? "text-success" : score >= 50 ? "text-warning" : "text-destructive";
  const label = score > 75 ? "Bon" : score >= 50 ? "Modéré" : "Critique";

  return { score, color, label, facturesAtRisk: atRisk };
}

function computeRecommendations(factures: FactureWithDetails[]): Recommendation[] {
  const now = new Date();
  const recos: Recommendation[] = [];
  const unpaid = factures
    .filter(f => ["emise", "partiel", "impayee"].includes(f.statut))
    .map(f => ({
      ...f,
      montantRestant: Number(f.montant_total) - f.total_paye,
      joursRetard: f.date_echeance ? differenceInDays(now, new Date(f.date_echeance)) : 0,
    }))
    .filter(f => f.montantRestant > 0);

  // Individual high-value relances
  const critiques = unpaid
    .filter(f => f.joursRetard > 7)
    .sort((a, b) => b.montantRestant - a.montantRestant);
  
  for (const f of critiques.slice(0, 2)) {
    const nom = f.contact ? `${f.contact.prenom} ${f.contact.nom}` : "Contact";
    recos.push({
      text: `Relancer ${nom} — ${f.montantRestant.toLocaleString("fr-FR")}€ en attente depuis ${f.joursRetard}j`,
      severity: f.joursRetard > 20 ? "critical" : "important",
      factureId: f.id,
    });
  }

  // Aggregate stats
  const bigUnpaid = unpaid.filter(f => f.montantRestant > 1000);
  if (bigUnpaid.length > 0) {
    const total = bigUnpaid.reduce((s, f) => s + f.montantRestant, 0);
    recos.push({
      text: `${bigUnpaid.length} facture${bigUnpaid.length > 1 ? "s" : ""} > 1 000€ non réglée${bigUnpaid.length > 1 ? "s" : ""} (${total.toLocaleString("fr-FR")}€)`,
      severity: "important",
    });
  }

  return recos.slice(0, 3);
}

function computeProjection(factures: FactureWithDetails[]): Projection {
  const now = new Date();
  let encaissementProbable = 0;
  let totalDu = 0;

  const unpaid = factures.filter(f => 
    ["emise", "partiel", "impayee"].includes(f.statut)
  );

  for (const f of unpaid) {
    const restant = Number(f.montant_total) - f.total_paye;
    if (restant <= 0) continue;
    totalDu += restant;

    const joursRetard = f.date_echeance ? differenceInDays(now, new Date(f.date_echeance)) : 0;

    if (f.statut === "partiel") {
      // Already paying — high probability
      encaissementProbable += restant * 0.8;
    } else if (joursRetard <= 0) {
      // Not yet due
      encaissementProbable += restant * 0.7;
    } else if (joursRetard <= 10) {
      encaissementProbable += restant * 0.4;
    } else {
      encaissementProbable += restant * 0.1;
    }
  }

  return {
    encaissementProbable: Math.round(encaissementProbable),
    manqueAGagner: Math.round(totalDu - encaissementProbable),
  };
}

const severityConfig = {
  critical: { bg: "bg-destructive/10", text: "text-destructive", border: "border-destructive/20" },
  important: { bg: "bg-warning/10", text: "text-warning", border: "border-warning/20" },
  info: { bg: "bg-info/10", text: "text-info", border: "border-info/20" },
};

export function FacturationIntelligence({ factures, onRelance }: FacturationIntelligenceProps) {
  const risk = useMemo(() => computeRiskScore(factures), [factures]);
  const recommendations = useMemo(() => computeRecommendations(factures), [factures]);
  const projection = useMemo(() => computeProjection(factures), [factures]);

  const hasData = factures.some(f => ["emise", "partiel", "impayee"].includes(f.statut));
  if (!hasData) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Risk Score */}
      <div className="card-elevated p-5 border-l-4 border-l-current" style={{ borderLeftColor: risk.score > 75 ? 'hsl(var(--success))' : risk.score >= 50 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))' }}>
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Score Trésorerie</h3>
        </div>
        <div className="flex items-end gap-3">
          <span className={cn("text-4xl font-display font-bold", risk.color)}>
            {risk.score}
          </span>
          <span className="text-muted-foreground text-sm mb-1">/ 100</span>
          <Badge variant="outline" className={cn("ml-auto text-xs", risk.color)}>
            {risk.label}
          </Badge>
        </div>
        {risk.facturesAtRisk.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            ⚠ {risk.facturesAtRisk.length} facture{risk.facturesAtRisk.length > 1 ? "s" : ""} à risque élevé
          </p>
        )}
      </div>

      {/* 30-day Projection */}
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Projection 30j</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Encaissement probable</span>
            <span className="text-lg font-bold text-success">
              {projection.encaissementProbable.toLocaleString("fr-FR")}€
            </span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-sm text-muted-foreground">Manque à gagner</span>
            <span className="text-lg font-bold text-destructive">
              {projection.manqueAGagner.toLocaleString("fr-FR")}€
            </span>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="card-elevated p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Actions recommandées</h3>
        </div>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune action urgente</p>
        ) : (
          <div className="space-y-2">
            {recommendations.map((reco, i) => {
              const cfg = severityConfig[reco.severity];
              return (
                <div key={i} className={cn("rounded-lg px-3 py-2 text-xs border", cfg.bg, cfg.border)}>
                  <div className="flex items-start justify-between gap-2">
                    <span className={cn("leading-relaxed", cfg.text)}>{reco.text}</span>
                    {reco.factureId && onRelance && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => onRelance(reco.factureId!)}
                      >
                        <Send className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Utility to check if a facture is high-risk (used by table for badges)
export function isHighRiskFacture(facture: FactureWithDetails): boolean {
  if (!["emise", "partiel", "impayee"].includes(facture.statut)) return false;
  const montantRestant = Number(facture.montant_total) - facture.total_paye;
  if (montantRestant <= 0) return false;
  if (!facture.date_echeance) return false;
  const days = differenceInDays(new Date(), new Date(facture.date_echeance));
  return days >= 10;
}

// Sort factures by risk priority (unpaid first, then oldest, then highest amount)
export function sortByRiskPriority(a: FactureWithDetails, b: FactureWithDetails): number {
  const unpaidStatuses = ["impayee", "partiel", "emise"];
  const aUnpaid = unpaidStatuses.includes(a.statut) ? 1 : 0;
  const bUnpaid = unpaidStatuses.includes(b.statut) ? 1 : 0;
  if (bUnpaid !== aUnpaid) return bUnpaid - aUnpaid;

  // By age (oldest first)
  const aDate = a.date_echeance ? new Date(a.date_echeance).getTime() : Infinity;
  const bDate = b.date_echeance ? new Date(b.date_echeance).getTime() : Infinity;
  if (aDate !== bDate) return aDate - bDate;

  // By amount (highest first)
  return Number(b.montant_total) - Number(a.montant_total);
}
