import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CMA_DOC_LABELS } from "@/lib/cma-constants";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  CreditCard,
  FileWarning,
  Mail,
  MapPin,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import type { SessionPrepItem } from "./aujourdhui-types";

interface BlocSessionPreparationProps {
  sessions: SessionPrepItem[];
  onRelanceDocs: (session: SessionPrepItem) => void;
  onRelancePaiement: (session: SessionPrepItem) => void;
  onOpenSession?: (session: SessionPrepItem) => void;
}

const severityStyles = {
  ready: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
};

function buildChecklist(session: SessionPrepItem): string {
  const lines = [
    `Checklist session - ${session.nom}`,
    `Date : ${format(parseISO(session.date_debut), "dd/MM/yyyy", { locale: fr })}`,
    session.heure_debut ? `Horaire : ${session.heure_debut}${session.heure_fin ? `-${session.heure_fin}` : ""}` : null,
    session.addressLabel ? `Lieu : ${session.addressLabel}` : null,
    `Inscrits : ${session.inscriptionCount}/${session.placesTotales || "-"}`,
    "",
    `Documents à relancer : ${session.missingDocsContacts.length}`,
    `Paiements à relancer : ${session.unpaidContacts.length}`,
    `Coordonnées incomplètes : ${session.missingContactContacts.length}`,
    session.setupIssues.length ? `À compléter : ${session.setupIssues.join(", ")}` : "Configuration session : OK",
  ].filter(Boolean);

  if (session.missingDocsContacts.length > 0) {
    lines.push("", "Docs manquants :");
    session.missingDocsContacts.forEach((c) => {
      const dossierLabel = c.dossierShortLabel ? `${c.dossierShortLabel} - ` : "";
      lines.push(`- ${c.prenom} ${c.nom}: ${dossierLabel}${c.missingDocs.map((d) => CMA_DOC_LABELS[d] || d).join(", ")}`);
    });
  }

  if (session.unpaidContacts.length > 0) {
    lines.push("", "Paiements à suivre :");
    session.unpaidContacts.forEach((c) => {
      lines.push(`- ${c.prenom} ${c.nom}: ${c.statutPaiement || "statut inconnu"}`);
    });
  }

  return lines.join("\n");
}

async function copyChecklist(session: SessionPrepItem) {
  try {
    await navigator.clipboard.writeText(buildChecklist(session));
    toast.success("Checklist copiée");
  } catch {
    toast.error("Impossible de copier la checklist");
  }
}

export function BlocSessionPreparation({
  sessions,
  onRelanceDocs,
  onRelancePaiement,
  onOpenSession,
}: BlocSessionPreparationProps) {
  if (sessions.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Sessions à préparer</h3>
            <p className="text-[11px] text-muted-foreground">
              J-1 / Jour J : dossiers, paiements, lieu et checklist
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
          {sessions.length}
        </Badge>
      </div>

      <div className="divide-y">
        {sessions.map((session) => {
          const docsWithEmail = session.missingDocsContacts.filter((c) => c.email).length;
          const paymentsWithEmail = session.unpaidContacts.filter((c) => c.email).length;
          const issueCount =
            session.setupIssues.length +
            session.missingDocsContacts.length +
            session.unpaidContacts.length +
            session.missingContactContacts.length;

          return (
            <div key={session.id} className="px-5 py-4 hover:bg-muted/20 transition-colors">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-foreground">{session.nom}</span>
                    <Badge variant="outline" className={cn("text-[10px]", severityStyles[session.severity])}>
                      {session.severity === "ready" ? "Prête" : session.severity === "critical" ? "Critique" : "À vérifier"}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {session.timingLabel}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {format(parseISO(session.date_debut), "dd MMM", { locale: fr })}
                      {session.heure_debut ? ` · ${session.heure_debut}` : ""}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {session.inscriptionCount}/{session.placesTotales || "-"} inscrits
                    </span>
                    {session.addressLabel && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.addressLabel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="sm:w-32">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Préparation</span>
                    <span className="font-medium text-foreground">{session.readinessScore}%</span>
                  </div>
                  <Progress value={session.readinessScore} className="h-2" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                <StatusPill
                  icon={FileWarning}
                  label="Docs"
                  value={session.missingDocsContacts.length}
                  tone={session.missingDocsContacts.length > 0 ? "warning" : "success"}
                />
                <StatusPill
                  icon={CreditCard}
                  label="Paiements"
                  value={session.unpaidContacts.length}
                  tone={session.unpaidContacts.length > 0 ? "destructive" : "success"}
                />
                <StatusPill
                  icon={Mail}
                  label="Coordonnées"
                  value={session.missingContactContacts.length}
                  tone={session.missingContactContacts.length > 0 ? "warning" : "success"}
                />
                <StatusPill
                  icon={ClipboardCheck}
                  label="Session"
                  value={session.setupIssues.length}
                  tone={session.setupIssues.length > 0 ? "warning" : "success"}
                />
              </div>

              {issueCount === 0 ? (
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Session prête : rien d'urgent à relancer.
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-1">
                  {session.setupIssues.map((issue) => (
                    <Badge key={issue} variant="outline" className="text-[9px] bg-warning/10 text-warning border-warning/20">
                      {issue}
                    </Badge>
                  ))}
                  {session.daysUntil <= 0 && issueCount > 0 && (
                    <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      À traiter avant démarrage
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  disabled={docsWithEmail === 0}
                  onClick={() => onRelanceDocs(session)}
                >
                  <FileWarning className="h-3 w-3 mr-1" />
                  Relancer docs ({docsWithEmail})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px]"
                  disabled={paymentsWithEmail === 0}
                  onClick={() => onRelancePaiement(session)}
                >
                  <CreditCard className="h-3 w-3 mr-1" />
                  Relancer paiement ({paymentsWithEmail})
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[10px]"
                  onClick={() => copyChecklist(session)}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copier checklist
                </Button>
                {onOpenSession && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[10px]"
                    onClick={() => onOpenSession(session)}
                  >
                    Ouvrir session
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof FileWarning;
  label: string;
  value: number;
  tone: "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "bg-success/10 text-success border-success/20"
      : tone === "warning"
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <div className={cn("rounded-md border px-2.5 py-2 flex items-center gap-2", toneClass)}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[10px] leading-none opacity-80">{label}</div>
        <div className="text-sm font-semibold leading-tight">{value}</div>
      </div>
    </div>
  );
}
