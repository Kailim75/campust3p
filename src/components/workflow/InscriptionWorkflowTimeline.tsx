import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileWarning, Mail, PenLine, FileCheck, ClipboardSignature } from "lucide-react";
import { WorkflowStepper } from "./WorkflowStepper";
import {
  buildWorkflowSteps,
  useInscriptionWorkflow,
  type InscriptionWorkflow,
} from "@/hooks/useInscriptionWorkflow";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  inscriptionId: string;
  /** Optionnel : action déclenchée quand l'utilisateur clique sur "Voir les documents" */
  onOpenDocuments?: () => void;
}

interface AlertDef {
  key: keyof InscriptionWorkflow["alerts"];
  label: string;
  icon: typeof AlertTriangle;
  tone: "warning" | "destructive";
}

const ALERTS: AlertDef[] = [
  { key: "contractUnsigned",   label: "Contrat / convention non signé(e)",     icon: ClipboardSignature, tone: "destructive" },
  { key: "convocationMissing", label: "Convocation à générer (J-7)",           icon: FileWarning,        tone: "warning" },
  { key: "convocationUnsent",  label: "Convocation à envoyer",                 icon: Mail,               tone: "warning" },
  { key: "emargementMissing",  label: "Émargement du jour manquant",           icon: PenLine,            tone: "destructive" },
  { key: "attestationLate",    label: "Attestation en retard (>48h fin)",      icon: FileCheck,          tone: "destructive" },
];

export function InscriptionWorkflowTimeline({ inscriptionId, onOpenDocuments }: Props) {
  const { data: wf, isLoading } = useInscriptionWorkflow(inscriptionId);

  if (isLoading) {
    return <Card className="p-4 h-32 animate-pulse bg-muted/30" />;
  }
  if (!wf) return null;

  const steps = buildWorkflowSteps(wf);
  const activeAlerts = ALERTS.filter(a => wf.alerts[a.key]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Parcours documentaire</h3>
          <p className="text-xs text-muted-foreground truncate">
            {wf.sessionNom ?? "Session"}
            {wf.dateDebut && (
              <> · {format(parseISO(wf.dateDebut), "dd MMM yyyy", { locale: fr })}
                {wf.dateFin && <> → {format(parseISO(wf.dateFin), "dd MMM yyyy", { locale: fr })}</>}
              </>
            )}
          </p>
        </div>
        {onOpenDocuments && (
          <Button size="sm" variant="outline" onClick={onOpenDocuments}>
            Voir les documents
          </Button>
        )}
      </div>

      <WorkflowStepper steps={steps} />

      <div className="grid grid-cols-3 gap-2 text-xs">
        <Stat label="Convocation" value={wf.convocationSent ? "Envoyée" : wf.convocationGenerated ? "Générée" : "—"} ok={wf.convocationSent} />
        <Stat label="Émargements" value={`${wf.emargementSigned}/${wf.emargementTotal || "?"}`} ok={wf.emargementSigned > 0} />
        <Stat label="Attestation" value={wf.attestationSent ? "Envoyée" : wf.attestationGenerated ? "Générée" : "—"} ok={wf.attestationSent} />
      </div>

      {activeAlerts.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t">
          <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <AlertTriangle className="h-3.5 w-3.5" />
            Alertes ({activeAlerts.length})
          </div>
          <ul className="space-y-1">
            {activeAlerts.map(a => {
              const Icon = a.icon;
              return (
                <li key={a.key} className="flex items-center gap-2 text-xs">
                  <Icon className={`h-3.5 w-3.5 ${a.tone === "destructive" ? "text-destructive" : "text-warning"}`} />
                  <span>{a.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <Badge variant={ok ? "default" : "outline"} className="mt-1 text-[10px]">{value}</Badge>
    </div>
  );
}
