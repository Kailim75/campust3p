import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MinusCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  GraduationCap,
  ClipboardList,
  Star,
  Eye,
  Send,
  RefreshCw,
  Zap,
  UserPlus,
  FileSignature,
  Award,
  Download,
  Pencil,
  MapPin,
  Clock,
  Play,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessionQualiopi, type QualiopiCriterion } from "@/hooks/useSessionQualiopi";
import {
  computeQualiopiActions,
  getTopActions,
  getCTAsForCriterion,
  CTA_LABELS,
  type QualiopiAction,
  type QualiopiActionType,
} from "@/lib/qualio-actions";
import { toast } from "sonner";

export interface SessionQualiopiTabProps {
  sessionId: string;
  hasCatalogueFormation?: boolean;
  isTerminee?: boolean;
  inscriptionCount?: number;
  onAssignFormateur?: () => void;
  onSendDocuments?: (scope?: string) => void;
  onSendEmail?: (template?: string) => void;
  onEditSession?: () => void;
  onOpenEmargement?: () => void;
  onImportFromCatalogue?: (field: "objectifs" | "prerequis") => void;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType }> = {
  documents: { label: "Documents", icon: FileText },
  pedagogie: { label: "Pédagogie", icon: GraduationCap },
  administratif: { label: "Administratif", icon: ClipboardList },
  qualite: { label: "Qualité", icon: Star },
};

const statusIcons: Record<string, { icon: React.ElementType; class: string; label: string }> = {
  conforme: { icon: CheckCircle2, class: "text-success", label: "Conforme" },
  partiel: { icon: AlertTriangle, class: "text-warning", label: "Partiel" },
  non_conforme: { icon: XCircle, class: "text-destructive", label: "Non conforme" },
  na: { icon: MinusCircle, class: "text-muted-foreground", label: "N/A" },
};

const ACTION_ICONS: Record<string, React.ElementType> = {
  UserPlus, Send, FileSignature, Award, Star, RefreshCw, Download, Pencil, ClipboardList, MapPin, Clock,
};

function ActionPlanCard({
  action,
  onExecute,
}: {
  action: QualiopiAction;
  onExecute: (type: QualiopiActionType) => void;
}) {
  const Icon = ACTION_ICONS[action.icon] || Zap;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className={cn(
        "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
        action.ctaVariant === "primary" ? "bg-primary/10" : "bg-muted",
      )}>
        <Icon className={cn("h-4 w-4", action.ctaVariant === "primary" ? "text-primary" : "text-muted-foreground")} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{action.label}</p>
        <p className="text-xs text-muted-foreground">{action.description}</p>
        <Badge variant="outline" className="text-[9px] mt-1 bg-primary/5 text-primary border-primary/20">
          {action.impact}
        </Badge>
      </div>
      <Button
        size="sm"
        variant={action.ctaVariant === "primary" ? "default" : "outline"}
        className="h-7 text-xs shrink-0"
        onClick={() => onExecute(action.type)}
      >
        <Play className="h-3 w-3 mr-1" />
        Go
      </Button>
    </div>
  );
}

function CriterionRow({
  criterion,
  ctaTypes,
  onExecute,
}: {
  criterion: QualiopiCriterion;
  ctaTypes: QualiopiActionType[];
  onExecute: (type: QualiopiActionType) => void;
}) {
  const statusInfo = statusIcons[criterion.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
      criterion.status === "conforme" && "bg-success/5 border-success/20",
      criterion.status === "partiel" && "bg-warning/5 border-warning/20",
      criterion.status === "non_conforme" && "bg-destructive/5 border-destructive/20",
      criterion.status === "na" && "bg-muted/30 border-muted",
    )}>
      <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", statusInfo.class)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{criterion.label}</span>
          {criterion.required && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
              Obligatoire
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", statusInfo.class)}>
            {statusInfo.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{criterion.description}</p>
        {criterion.detail && (
          <p className={cn("text-xs mt-1 font-medium", statusInfo.class)}>
            {criterion.detail}
          </p>
        )}
        {/* Business CTAs */}
        {ctaTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {ctaTypes.map((type, i) => (
              <Button
                key={type}
                variant={i === 0 ? "default" : "outline"}
                size="sm"
                className="h-6 text-[10px] px-2 gap-1"
                onClick={() => onExecute(type)}
              >
                {CTA_LABELS[type]}
              </Button>
            ))}
          </div>
        )}
      </div>
      {criterion.status === "conforme" && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-success hover:text-success">
              <Eye className="h-3 w-3" />
              Détail
            </Button>
          </TooltipTrigger>
          <TooltipContent>Voir le détail</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function SessionQualiopiTab({
  sessionId,
  hasCatalogueFormation = false,
  isTerminee = false,
  inscriptionCount = 0,
  onAssignFormateur,
  onSendDocuments,
  onSendEmail,
  onEditSession,
  onOpenEmargement,
  onImportFromCatalogue,
}: SessionQualiopiTabProps) {
  const { data: qualiopi, isLoading } = useSessionQualiopi(sessionId);
  const [showAlertesDialog, setShowAlertesDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<QualiopiActionType>>(new Set());
  const [bulkRunning, setBulkRunning] = useState(false);
  const [showManualInput, setShowManualInput] = useState<"objectifs" | "prerequis" | null>(null);
  const [manualText, setManualText] = useState("");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (!qualiopi) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">Aucune donnée Qualiopi disponible</p>
        <p className="text-xs text-muted-foreground mt-1">Les critères seront calculés automatiquement.</p>
      </div>
    );
  }

  const allActions = computeQualiopiActions({
    criteria: qualiopi.criteria,
    hasCatalogueFormation,
    inscriptionCount,
    isTerminee,
  });
  const topActions = getTopActions(allActions, 3);

  const progressBg = qualiopi.score >= 80 ? "hsl(var(--success))" : qualiopi.score >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  const isAuditReady = qualiopi.score >= 80;

  const preuvesOk = qualiopi.criteria.filter(c => c.status === "conforme").length;
  const preuvesManquantes = qualiopi.criteria.filter(c => c.status === "non_conforme").length;
  const preuvesPartielles = qualiopi.criteria.filter(c => c.status === "partiel").length;

  const grouped = qualiopi.criteria.reduce((acc, c) => {
    if (!acc[c.category]) acc[c.category] = [];
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, QualiopiCriterion[]>);

  const handleExecuteAction = (type: QualiopiActionType) => {
    switch (type) {
      case "assigner_formateur":
        onEditSession?.();
        toast.info("Modifiez la session pour assigner un formateur");
        break;
      case "envoyer_convocations":
        onSendDocuments?.("convocation");
        break;
      case "envoyer_conventions":
        onSendDocuments?.("convention");
        break;
      case "emettre_attestations":
        onSendDocuments?.("attestation");
        break;
      case "envoyer_satisfaction":
      case "relancer_satisfaction":
        onSendEmail?.("satisfaction");
        break;
      case "importer_objectifs":
        onImportFromCatalogue?.("objectifs");
        break;
      case "importer_prerequis":
        onImportFromCatalogue?.("prerequis");
        break;
      case "renseigner_objectifs":
        setShowManualInput("objectifs");
        setManualText("");
        break;
      case "renseigner_prerequis":
        setShowManualInput("prerequis");
        setManualText("");
        break;
      case "creer_emargement":
        onOpenEmargement?.();
        break;
      case "renseigner_lieu":
      case "renseigner_duree":
        onEditSession?.();
        toast.info("Modifiez la session pour renseigner cette information");
        break;
    }
  };

  const handleOpenBulk = () => {
    setBulkSelected(new Set(allActions.map(a => a.type)));
    setShowBulkDialog(true);
  };

  const handleBulkExecute = async () => {
    setBulkRunning(true);
    const selected = allActions.filter(a => bulkSelected.has(a.type));
    for (let i = 0; i < selected.length; i++) {
      toast.info(`Étape ${i + 1}/${selected.length} : ${selected[i].label}`);
      handleExecuteAction(selected[i].type);
      // Small delay between actions
      await new Promise(r => setTimeout(r, 500));
    }
    setBulkRunning(false);
    setShowBulkDialog(false);
    toast.success(`${selected.length} action(s) lancée(s)`);
  };

  const handleSaveManual = () => {
    if (!manualText.trim()) return;
    // Trigger edit session with the text - the parent will handle saving
    onEditSession?.();
    toast.info(`Modifiez la session pour sauvegarder les ${showManualInput === "objectifs" ? "objectifs" : "prérequis"}`);
    setShowManualInput(null);
  };

  return (
    <div className="space-y-5">
      {/* Header — Qualiopi état du dossier */}
      <div className={cn(
        "p-4 rounded-xl border-2 space-y-3",
        isAuditReady
          ? "bg-success/5 border-success/30"
          : qualiopi.score >= 50
          ? "bg-warning/5 border-warning/30"
          : "bg-destructive/5 border-destructive/30"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isAuditReady ? (
              <ShieldCheck className="h-5 w-5 text-success" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-warning" />
            )}
            <h3 className="font-semibold text-sm">Qualiopi — état du dossier</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "text-xs font-semibold px-2.5 py-0.5",
                isAuditReady
                  ? "bg-success/10 text-success border-success/30"
                  : "bg-warning/10 text-warning border-warning/30"
              )}
            >
              {isAuditReady ? "✅ Audit-ready" : "⚠️ À compléter"}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">Complétion</span>
            <span className={cn(
              "text-2xl font-bold tabular-nums",
              qualiopi.score >= 80 ? "text-success" : qualiopi.score >= 50 ? "text-warning" : "text-destructive"
            )}>
              {qualiopi.score}%
            </span>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{ width: `${qualiopi.score}%`, backgroundColor: progressBg }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {qualiopi.conformeCount} critères conformes sur {qualiopi.totalApplicable} applicables
          </p>
        </div>
      </div>

      {/* ═══ A) Plan d'action (top 3) ═══ */}
      {topActions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Plan d'action ({topActions.length})</h4>
            </div>
            {allActions.length > 0 && (
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1.5"
                onClick={handleOpenBulk}
              >
                <ShieldCheck className="h-3 w-3" />
                Mettre en conformité ({allActions.length})
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {topActions.map(action => (
              <ActionPlanCard
                key={action.type}
                action={action}
                onExecute={handleExecuteAction}
              />
            ))}
          </div>
        </div>
      )}

      {/* 3 compteurs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-lg font-bold text-success tabular-nums">{preuvesOk}</span>
          </div>
          <span className="text-[11px] text-muted-foreground text-center">Preuves OK</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-lg font-bold text-destructive tabular-nums">{preuvesManquantes}</span>
          </div>
          <span className="text-[11px] text-muted-foreground text-center">Manquantes</span>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border bg-card">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span className="text-lg font-bold text-warning tabular-nums">{preuvesPartielles}</span>
          </div>
          <span className="text-[11px] text-muted-foreground text-center">À compléter</span>
        </div>
      </div>

      {/* Alertes */}
      {qualiopi.alertes.length > 0 && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">
            {qualiopi.alertes.length} point(s) d'attention
          </AlertTitle>
          <AlertDescription>
            <ul className="mt-1 space-y-1 text-xs">
              {qualiopi.alertes.slice(0, 3).map((a, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="shrink-0">•</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
            {qualiopi.alertes.length > 3 && (
              <Button
                variant="link"
                size="sm"
                className="text-xs p-0 h-auto mt-1 text-destructive"
                onClick={() => setShowAlertesDialog(true)}
              >
                Voir les {qualiopi.alertes.length} alertes →
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Preuves requises — checklist par catégorie */}
      <div className="space-y-1">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Preuves requises
        </h4>
      </div>

      {Object.entries(grouped).map(([category, criteria]) => {
        const config = categoryConfig[category] || { label: category, icon: Shield };
        const CategoryIcon = config.icon;
        const conformes = criteria.filter(c => c.status === "conforme").length;
        const applicable = criteria.filter(c => c.status !== "na").length;
        const allConformes = conformes === applicable && applicable > 0;

        return (
          <div key={category} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {config.label}
                </h4>
              </div>
              <Badge variant="outline" className={cn(
                "text-[10px]",
                allConformes
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground"
              )}>
                {conformes}/{applicable}
              </Badge>
            </div>
            <div className="space-y-1.5">
              {criteria.map(c => {
                const ctaTypes = getCTAsForCriterion(c.id, c.status, { hasCatalogueFormation, isTerminee });
                return (
                  <CriterionRow
                    key={c.id}
                    criterion={c}
                    ctaTypes={ctaTypes}
                    onExecute={handleExecuteAction}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Dialog alertes complètes */}
      <Dialog open={showAlertesDialog} onOpenChange={setShowAlertesDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Points d'attention Qualiopi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {qualiopi.alertes.map((a, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg border bg-destructive/5">
                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <span className="text-sm">{a}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ C) Bulk compliance modal ═══ */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Mettre en conformité
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Sélectionnez les actions à lancer. Elles s'exécuteront étape par étape.
          </p>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto">
            {allActions.map((action, i) => (
              <div key={action.type} className="flex items-center gap-3 p-2 rounded-lg border">
                <Checkbox
                  checked={bulkSelected.has(action.type)}
                  onCheckedChange={(checked) => {
                    setBulkSelected(prev => {
                      const next = new Set(prev);
                      checked ? next.add(action.type) : next.delete(action.type);
                      return next;
                    });
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-muted">{i + 1}</Badge>
                    <span className="text-sm font-medium">{action.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </div>
                <Badge variant="outline" className="text-[9px] bg-primary/5 text-primary shrink-0">
                  {action.impact}
                </Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Annuler
            </Button>
            <Button
              disabled={bulkSelected.size === 0 || bulkRunning}
              onClick={handleBulkExecute}
            >
              {bulkRunning ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> En cours...</>
              ) : (
                <>Lancer {bulkSelected.size} action(s)</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manual input dialog for objectifs/prérequis */}
      <Dialog open={!!showManualInput} onOpenChange={(open) => !open && setShowManualInput(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showManualInput === "objectifs" ? "Renseigner les objectifs pédagogiques" : "Renseigner les prérequis"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label className="text-sm">
              {showManualInput === "objectifs"
                ? "Décrivez les objectifs pédagogiques de cette formation"
                : "Décrivez les prérequis pour cette formation"}
            </Label>
            <Textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder={showManualInput === "objectifs"
                ? "Ex: À l'issue de la formation, le stagiaire sera capable de..."
                : "Ex: Être titulaire du permis de conduire catégorie B..."}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              💡 Pour sauvegarder, modifiez la session via le formulaire d'édition.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowManualInput(null)}>Annuler</Button>
            <Button onClick={handleSaveManual}>
              <Pencil className="h-4 w-4 mr-2" />
              Modifier la session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
