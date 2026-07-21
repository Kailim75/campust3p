import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Euro, Receipt, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  useSessionFactures,
  estFactureActive,
  estFactureEnRetard,
  type SessionFacturesData,
} from "@/hooks/useSessionFactures";
import { useSessionInscriptions } from "@/hooks/useSessions";
import { Skeleton } from "@/components/ui/skeleton";

interface SessionFinancialSummaryProps {
  sessionId: string;
}

interface SessionInfoRow {
  nom: string;
  prix: number | null;
  date_debut: string | null;
}

/**
 * Synthèse calculée hors composant (pas de hook après retour anticipé).
 * Règles canoniques de l'audit Finances : brouillons et annulées exclus des
 * totaux, restant dû clampé par facture, « en attente » = émise + impayée.
 * Le potentiel (inscrits × prix session) rend visible le manque à facturer
 * — l'ancienne synthèse affichait « recouvrement 100 % » sur une session
 * dont la moitié des inscrits n'avait jamais été facturée.
 */
function calculerSynthese(
  data: SessionFacturesData,
  nbInscritsFacturables: number,
  exonereeIds: Set<string>,
  prixSession: number,
) {
  const actives = data.factures.filter(estFactureActive);
  const totalFacture = actives.reduce((s, f) => s + f.montant_total, 0);
  const totalEncaisse = actives.reduce((s, f) => s + f.total_paye, 0);
  const restantDu = actives.reduce((s, f) => s + Math.max(0, f.montant_total - f.total_paye), 0);
  const enRetard = actives.filter(estFactureEnRetard);
  const retardMontant = enRetard.reduce((s, f) => s + Math.max(0, f.montant_total - f.total_paye), 0);
  const tauxRecouvrement = totalFacture > 0 ? (totalEncaisse / totalFacture) * 100 : 0;

  const nonFactures = Object.entries(data.parInscription).filter(
    ([id, fs]) => !exonereeIds.has(id) && fs.filter(estFactureActive).length === 0,
  ).length;
  // Les repassages déjà payés ne comptent ni dans le potentiel ni dans le
  // manque à facturer : leur formation a été réglée sur une session passée.
  const potentiel = nbInscritsFacturables * prixSession;
  const manqueAFacturer = Math.max(0, potentiel - totalFacture);

  return {
    totalFacture,
    totalEncaisse,
    restantDu,
    tauxRecouvrement,
    nbFactures: actives.length,
    facturesPayees: actives.filter((f) => f.statut === "payee").length,
    facturesEnAttente: actives.filter((f) => f.statut === "emise" || f.statut === "impayee").length,
    facturesPartielles: actives.filter((f) => f.statut === "partiel").length,
    enRetardCount: enRetard.length,
    retardMontant,
    nonFactures,
    potentiel,
    manqueAFacturer,
    repassages: exonereeIds.size,
  };
}

export function SessionFinancialSummary({ sessionId }: SessionFinancialSummaryProps) {
  const { data: inscriptions, isLoading: inscriptionsLoading } = useSessionInscriptions(sessionId);
  const { data: facturesData, isLoading: facturesLoading } = useSessionFactures(sessionId);
  const { data: sessionInfo } = useQuery({
    queryKey: ["session-facturation-info", sessionId],
    queryFn: async (): Promise<SessionInfoRow> => {
      const { data, error } = await supabase
        .from("sessions")
        .select("nom, prix, date_debut")
        .eq("id", sessionId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const isLoading = inscriptionsLoading || facturesLoading;
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (!facturesData) return null;

  const exonereeIds = new Set(
    (inscriptions || [])
      .filter((i) => (i as { facturation_exoneree?: boolean | null }).facturation_exoneree)
      .map((i) => i.id),
  );
  const synthese = calculerSynthese(
    facturesData,
    (inscriptions?.length || 0) - exonereeIds.size,
    exonereeIds,
    Number(sessionInfo?.prix || 0),
  );

  if (synthese.nbFactures === 0 && synthese.potentiel === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Aucune facture liée à cette session
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="bg-muted/40">
          <CardContent className="p-3 text-center">
            <Euro className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Potentiel</p>
            <p className="text-lg font-bold text-foreground">
              {synthese.potentiel.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 text-center">
            <Receipt className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Facturé</p>
            <p className="text-lg font-bold text-primary">
              {synthese.totalFacture.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>

        <Card className="bg-success/5 border-success/20">
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-4 w-4 mx-auto mb-1 text-success" />
            <p className="text-xs text-muted-foreground">Encaissé</p>
            <p className="text-lg font-bold text-success">
              {synthese.totalEncaisse.toLocaleString("fr-FR")} €
            </p>
          </CardContent>
        </Card>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="p-3 text-center">
            <AlertCircle className="h-4 w-4 mx-auto mb-1 text-warning" />
            <p className="text-xs text-muted-foreground">Restant dû</p>
            <p className="text-lg font-bold text-warning">
              {synthese.restantDu.toLocaleString("fr-FR")} €
            </p>
            {synthese.enRetardCount > 0 && (
              <p className="text-[10px] text-destructive">
                dont {synthese.retardMontant.toLocaleString("fr-FR")} € en retard
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {synthese.manqueAFacturer > 0 && synthese.nonFactures > 0 && (
        <p className="text-xs text-warning flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {synthese.nonFactures} inscrit{synthese.nonFactures > 1 ? "s" : ""} non facturé
          {synthese.nonFactures > 1 ? "s" : ""} — {synthese.manqueAFacturer.toLocaleString("fr-FR")} €
          de manque à facturer sur le potentiel.
        </p>
      )}

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Taux de recouvrement (sur facturé)</span>
          <span className="font-medium">{synthese.tauxRecouvrement.toFixed(0)}%</span>
        </div>
        <Progress value={synthese.tauxRecouvrement} className="h-2" />
      </div>

      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-success" />
          <span>{synthese.facturesPayees} payée{synthese.facturesPayees > 1 ? "s" : ""}</span>
        </div>
        {synthese.facturesPartielles > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span>{synthese.facturesPartielles} partielle{synthese.facturesPartielles > 1 ? "s" : ""}</span>
          </div>
        )}
        {synthese.facturesEnAttente > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span>{synthese.facturesEnAttente} en attente</span>
          </div>
        )}
        {synthese.enRetardCount > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-destructive" />
            <span>{synthese.enRetardCount} en retard</span>
          </div>
        )}
        {synthese.repassages > 0 && (
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span>{synthese.repassages} repassage{synthese.repassages > 1 ? "s" : ""} sans frais</span>
          </div>
        )}
      </div>
    </div>
  );
}
