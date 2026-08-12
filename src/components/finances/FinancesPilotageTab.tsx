/**
 * FinancesPilotageTab — Cockpit consolidé du module Finances.
 *
 * Affiche les KPI canoniques (CA facturé, Encaissé, Reste à encaisser, Panier
 * moyen, Recouvrement, Retards) en utilisant `useFinancesKpis` comme seule
 * source de vérité. Aucun recalcul local — toutes les valeurs proviennent du
 * Dashboard pour garantir la cohérence.
 *
 * Lecture seule. Aucune écriture DB.
 */
import { useFinancesKpis } from "@/hooks/useFinancesKpis";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Euro,
  TrendingUp,
  AlertCircle,
  ShoppingBag,
  Receipt,
  Clock,
  HelpCircle,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatEur(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + "€";
}

function formatDelta(current: number, previous: number): { text: string; cls: string } | null {
  if (previous === 0) return null;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: "= vs période préc.", cls: "text-muted-foreground" };
  const cls = pct > 0 ? "text-success" : "text-destructive";
  return { text: `${pct > 0 ? "+" : ""}${pct}% vs période préc.`, cls };
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sublabel?: string;
  delta?: { text: string; cls: string } | null;
  tone?: "default" | "success" | "warning" | "destructive" | "info";
  tooltip?: string;
}

function KpiCard({ icon: Icon, label, value, sublabel, delta, tone = "default", tooltip }: KpiCardProps) {
  const toneClasses: Record<NonNullable<KpiCardProps["tone"]>, string> = {
    default: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    destructive: "bg-destructive/10 text-destructive",
    info: "bg-info/10 text-info",
  };
  const valueTone: Record<NonNullable<KpiCardProps["tone"]>, string> = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    info: "text-info",
  };
  return (
    <div className="card-elevated p-5">
      <div className="flex items-start gap-3">
        <div className={cn("p-3 rounded-xl shrink-0", toneClasses[tone])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground truncate">{label}</p>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[280px] text-xs">
                    {tooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className={cn("text-2xl font-display font-bold", valueTone[tone])}>{value}</p>
          {sublabel && <p className="text-[11px] text-muted-foreground mt-0.5">{sublabel}</p>}
          {delta && <p className={cn("text-[11px] mt-1 font-medium", delta.cls)}>{delta.text}</p>}
        </div>
      </div>
    </div>
  );
}

export function FinancesPilotageTab() {
  const kpis = useFinancesKpis();

  if (kpis.isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête contexte période */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Pilotage financier</h2>
          <p className="text-xs text-muted-foreground">
            Période : {kpis.periodLabel} · Source de vérité unique (alignée Dashboard)
          </p>
        </div>
      </div>

      {/* KPI principaux */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Receipt}
          label="CA facturé"
          value={formatEur(kpis.caFacture)}
          sublabel="Hors brouillons et annulées"
          delta={formatDelta(kpis.caFacture, kpis.caFacturePrev)}
          tone="default"
          tooltip="Somme des factures émises sur la période (statut ≠ brouillon, ≠ annulée)."
        />
        <KpiCard
          icon={Euro}
          label="Encaissé"
          value={formatEur(kpis.encaissements)}
          sublabel={
            kpis.commissionsAlma > 0
              ? `Net après commissions Alma : ${formatEur(kpis.netEncaisse)}`
              : "Paiements reçus sur la période"
          }
          delta={formatDelta(kpis.encaissements, kpis.encaissementsPrev)}
          tone="success"
          tooltip="Somme des paiements enregistrés (tous modes) sur la période sélectionnée. Le net déduit les commissions Alma réellement retenues."
        />
        <KpiCard
          icon={CreditCard}
          label="Commissions Alma"
          value={kpis.commissionsAlma > 0 ? `− ${formatEur(kpis.commissionsAlma)}` : "0 €"}
          sublabel={
            kpis.commissionsAlmaEstimees > 0
              ? `${kpis.commissionsAlmaEstimees} paiement(s) estimé(s) au taux 4x`
              : "Frais retenus par Alma sur la période"
          }
          tone={kpis.commissionsAlma > 0 ? "warning" : "default"}
          tooltip="Commission marchand TTC par nombre de fois (1x 1,08 %, 2x 4,32 %, 3x 4,56 %, 4x 5,76 % — taux du contrat relevés le 12/08/2026). Les paiements Alma saisis sans nombre de fois sont estimés au taux 4x."
        />
        <KpiCard
          icon={AlertCircle}
          label="Reste à encaisser"
          value={formatEur(kpis.resteAEncaisser)}
          sublabel="Instantané, hors brouillons et annulées"
          tone={kpis.resteAEncaisser > 0 ? "destructive" : "default"}
          tooltip="Solde restant dû sur l'ensemble des factures émises ou partiellement payées (montant_total − total_paye)."
        />
        <KpiCard
          icon={ShoppingBag}
          label="Panier moyen"
          value={kpis.panierMoyen > 0 ? formatEur(kpis.panierMoyen) : "—"}
          sublabel={`${kpis.inscriptionsCount} inscription(s) sur la période`}
          delta={formatDelta(kpis.panierMoyen, kpis.panierMoyenPrev)}
          tone="info"
          tooltip="CA facturé divisé par le nombre d'inscriptions de la période."
        />
        <KpiCard
          icon={TrendingUp}
          label="Taux de recouvrement"
          value={`${kpis.tauxRecouvrement}%`}
          sublabel="Encaissé / CA facturé (période)"
          tone={
            kpis.tauxRecouvrement >= 75
              ? "success"
              : kpis.tauxRecouvrement >= 50
              ? "warning"
              : "destructive"
          }
          tooltip="Part du CA facturé déjà encaissée sur la même période."
        />
        <KpiCard
          icon={Clock}
          label="Paiements en retard"
          value={`${kpis.paiementsRetard}`}
          sublabel={
            kpis.paiementsRetardMontant > 0
              ? `${formatEur(kpis.paiementsRetardMontant)} à recouvrer`
              : "Aucun retard"
          }
          tone={kpis.paiementsRetard > 0 ? "warning" : "default"}
          tooltip="Factures émises ou partielles dont la date d'échéance est dépassée et le solde non nul."
        />
      </div>

      {/* Bandeau pédagogique : règles de calcul */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Règles de calcul (figées)</p>
        <ul className="list-disc ml-4 space-y-0.5">
          <li>Les factures <span className="font-medium">brouillon</span> et <span className="font-medium">annulées</span> ne sont jamais comptées dans le CA actif.</li>
          <li>Les paiements <span className="font-medium">partiels</span> sont comptés dans l'encaissé pour le montant effectivement reçu, jamais comme soldés.</li>
          <li>Les <span className="font-medium">commissions Alma</span> sont calculées en TTC (TVA non récupérable, formation exonérée) au taux du contrat selon le nombre de fois ; le net encaissé = encaissé − commissions.</li>
          <li>Le reste à encaisser est un <span className="font-medium">instantané</span> (toutes périodes confondues), pas un cumul par mois.</li>
        </ul>
      </div>
    </div>
  );
}
