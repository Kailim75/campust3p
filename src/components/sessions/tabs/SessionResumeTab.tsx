import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Users, UserCheck, Percent, FileWarning, AlertCircle, ClipboardList,
  Star, Award, Shield, Mail, ClipboardCheck, CreditCard, CheckCircle2, CalendarPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionQualiopi } from "@/hooks/useSessionQualiopi";
import { SessionTimeline } from "../SessionTimeline";
import type { Session } from "@/hooks/useSessions";

interface SessionResumeTabProps {
  session: Session;
  inscriptionCount: number;
  onNavigateTab: (tab: string) => void;
  onOpenClosure: () => void;
  onAddInscription: () => void;
  onSendDocuments: () => void;
}

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  intent?: "neutral" | "success" | "warning" | "danger";
  onClick?: () => void;
  children?: React.ReactNode;
}

function KpiCard({ icon: Icon, label, value, intent = "neutral", onClick, children }: KpiCardProps) {
  const intentClass = {
    neutral: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[intent];
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp
      onClick={onClick}
      className={cn(
        "bg-card border rounded-lg p-3 text-left space-y-1 transition-colors w-full",
        onClick && "hover:bg-muted/30 cursor-pointer"
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", intentClass)} />
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      </div>
      <div className={cn("text-base font-bold", intentClass)}>{value}</div>
      {children}
    </Comp>
  );
}

/**
 * Résumé opérationnel d'une session — vue de pilotage.
 * 100% lecture, aucune mutation. Réutilise useSessionQualiopi pour les alertes.
 */
export function SessionResumeTab({
  session,
  inscriptionCount,
  onNavigateTab,
  onOpenClosure,
  onAddInscription,
  onSendDocuments,
}: SessionResumeTabProps) {
  const { data: qualiopi } = useSessionQualiopi(session.id);

  const placesRestantes = Math.max(0, session.places_totales - inscriptionCount);
  const fillRate = session.places_totales > 0
    ? Math.round((inscriptionCount / session.places_totales) * 100)
    : 0;

  // Derive operational KPIs from Qualiopi criteria (single source of truth)
  const kpis = useMemo(() => {
    const c = qualiopi?.criteria ?? [];
    const findDetail = (id: string) => c.find(x => x.id === id);
    const docs = findDetail("convocations");
    const contrats = findDetail("contrats");
    const emarg = findDetail("emargements") || findDetail("emargement");
    const attest = findDetail("attestations");
    const satisf = findDetail("satisfaction");
    const programme = findDetail("programme");

    // Parse "x/y …" patterns from detail strings when present
    const parseMissing = (detail?: string): number | null => {
      if (!detail) return null;
      const m = detail.match(/(\d+)\s*\/\s*(\d+)/);
      if (m) return Math.max(0, parseInt(m[2], 10) - parseInt(m[1], 10));
      return null;
    };

    return {
      docsMissing: parseMissing(docs?.detail) ?? (docs?.status === "non_conforme" ? inscriptionCount : 0),
      contratsMissing: parseMissing(contrats?.detail) ?? (contrats?.status === "non_conforme" ? inscriptionCount : 0),
      emargMissing: emarg?.status === "non_conforme" || emarg?.status === "partiel" ? 1 : 0,
      attestMissing: parseMissing(attest?.detail) ?? (attest?.status === "non_conforme" ? inscriptionCount : 0),
      satisfMissing: parseMissing(satisf?.detail) ?? (satisf?.status === "non_conforme" ? inscriptionCount : 0),
      programmeOk: programme?.status === "conforme",
    };
  }, [qualiopi, inscriptionCount]);

  const alertes = qualiopi?.alertes ?? [];

  return (
    <div className="space-y-5">
      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard
          icon={Users}
          label="Inscrits"
          value={`${inscriptionCount} / ${session.places_totales}`}
          onClick={() => onNavigateTab("inscriptions")}
        />
        <KpiCard
          icon={UserCheck}
          label="Places restantes"
          value={placesRestantes}
          intent={placesRestantes === 0 ? "success" : "neutral"}
        />
        <KpiCard
          icon={Percent}
          label="Remplissage"
          value={`${fillRate}%`}
          intent={fillRate >= 80 ? "success" : fillRate >= 50 ? "neutral" : "warning"}
        >
          <Progress value={fillRate} className="h-1 mt-1" />
        </KpiCard>
        <KpiCard
          icon={FileWarning}
          label="Documents manquants"
          value={kpis.docsMissing}
          intent={kpis.docsMissing > 0 ? "warning" : "success"}
          onClick={() => onNavigateTab("documents")}
        />
        <KpiCard
          icon={CreditCard}
          label="Contrats à signer"
          value={kpis.contratsMissing}
          intent={kpis.contratsMissing > 0 ? "warning" : "success"}
          onClick={() => onNavigateTab("finances")}
        />
        <KpiCard
          icon={ClipboardList}
          label="Émargement"
          value={kpis.emargMissing > 0 ? "Incomplet" : "OK"}
          intent={kpis.emargMissing > 0 ? "warning" : "success"}
          onClick={() => onNavigateTab("emargement")}
        />
        <KpiCard
          icon={Star}
          label="Satisfaction à envoyer"
          value={kpis.satisfMissing}
          intent={kpis.satisfMissing > 0 ? "warning" : "success"}
          onClick={() => onNavigateTab("parcours")}
        />
        <KpiCard
          icon={Award}
          label="Attestations à générer"
          value={kpis.attestMissing}
          intent={kpis.attestMissing > 0 ? "warning" : "success"}
          onClick={() => onNavigateTab("documents")}
        />
      </div>

      {/* Qualiopi alerts */}
      {alertes.length > 0 && (
        <Card className="p-3 border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-warning" />
            <p className="text-sm font-semibold text-foreground">Alertes Qualiopi</p>
            <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20">
              {alertes.length}
            </Badge>
          </div>
          <ul className="space-y-1">
            {alertes.slice(0, 6).map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <AlertCircle className="h-3 w-3 text-warning mt-0.5 shrink-0" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Separator />

      {/* Action shortcuts */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Raccourcis</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="text-xs" onClick={onAddInscription}>
            <CalendarPlus className="h-3 w-3 mr-1" /> Inscrire un apprenant
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={onSendDocuments}>
            <Mail className="h-3 w-3 mr-1" /> Envoyer documents
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onNavigateTab("finances")}>
            <CreditCard className="h-3 w-3 mr-1" /> Voir paiements
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onNavigateTab("emargement")}>
            <ClipboardCheck className="h-3 w-3 mr-1" /> Émargement
          </Button>
          <Button
            size="sm"
            variant="default"
            className="text-xs"
            onClick={onOpenClosure}
            disabled={inscriptionCount === 0 || session.statut === "terminee" || session.archived}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" /> Clôturer la session
          </Button>
        </div>
      </div>

      <Separator />

      {/* Timeline */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Parcours de la session
        </p>
        <SessionTimeline sessionId={session.id} />
      </div>
    </div>
  );
}
