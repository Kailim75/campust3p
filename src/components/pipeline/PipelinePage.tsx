import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Header } from "@/components/layout/Header";
import { useContacts, useUpdateContact, Contact } from "@/hooks/useContacts";
import { useProspects, useUpdateProspect, type Prospect } from "@/hooks/useProspects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Search, Users, Target, TrendingUp, AlertTriangle, Lightbulb, Clock, DollarSign, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { toast } from "sonner";

// ─── CONSTANTS ───────────────────────────────────────────

const TARIF_MOYEN = 990; // €
const OBJECTIF_INSCRIPTIONS_MENSUEL = 15;

// ─── STRATEGIC COLUMNS ──────────────────────────────────

const PIPELINE_COLUMNS = [
  { id: "nouveau_lead", label: "Nouveau lead", emoji: "🟦", bgClass: "bg-info/10", borderClass: "border-info/30", dotColor: "bg-info" },
  { id: "a_relancer", label: "À relancer", emoji: "🟨", bgClass: "bg-warning/10", borderClass: "border-warning/30", dotColor: "bg-warning" },
  { id: "inscrit", label: "Inscrit", emoji: "🟩", bgClass: "bg-success/10", borderClass: "border-success/30", dotColor: "bg-success" },
  { id: "perdu", label: "Perdu", emoji: "⬛", bgClass: "bg-muted/20", borderClass: "border-muted-foreground/20", dotColor: "bg-muted-foreground" },
];

// ─── TYPES ───────────────────────────────────────────────

interface PipelineItem {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  formation: string | null;
  source: string | null;
  columnId: string;
  lastActionDate: string;
  daysSinceAction: number;
  type: "prospect" | "contact";
  originalProspect?: Prospect;
  originalContact?: Contact;
}

// ─── HELPERS ─────────────────────────────────────────────

function classifyProspect(p: Prospect): string {
  if (p.statut === "perdu") return "perdu";
  if (p.statut === "converti") return "inscrit";
  if (p.statut === "nouveau") {
    const days = differenceInDays(new Date(), parseISO(p.created_at));
    return days > 3 ? "a_relancer" : "nouveau_lead";
  }
  // contacte / relance
  const days = differenceInDays(new Date(), parseISO(p.updated_at));
  return days > 3 ? "a_relancer" : "nouveau_lead";
}

function classifyContact(c: Contact): string {
  const statut = c.statut || "En attente de validation";
  if (statut === "Abandonné") return "perdu";
  if (statut === "En attente de validation") {
    const days = differenceInDays(new Date(), parseISO(c.updated_at));
    return days > 3 ? "a_relancer" : "nouveau_lead";
  }
  // All other statuses = inscrit
  return "inscrit";
}

function getStagnationBadge(days: number) {
  if (days >= 5) return { label: `${days}j`, className: "bg-destructive/15 text-destructive border-destructive/20" };
  if (days >= 3) return { label: `${days}j`, className: "bg-warning/15 text-warning border-warning/20" };
  return null;
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-destructive";
}

function getScoreBg(score: number) {
  if (score >= 75) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

// ─── PIPELINE CARD ───────────────────────────────────────

function StrategicPipelineCard({
  item,
  index,
  onClick,
}: {
  item: PipelineItem;
  index: number;
  onClick: () => void;
}) {
  const stagnation = getStagnationBadge(item.daysSinceAction);

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "p-3 mb-2 cursor-pointer transition-all hover:shadow-md border",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/40 rotate-1",
            item.daysSinceAction >= 5 && "border-destructive/30"
          )}
        >
          <div className="flex items-start gap-2.5">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                {`${item.prenom.charAt(0)}${item.nom.charAt(0)}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between gap-1">
                <p className="font-medium text-sm truncate text-foreground">
                  {item.prenom} {item.nom}
                </p>
                {stagnation && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", stagnation.className)}>
                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                    {stagnation.label}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {item.formation && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {item.formation}
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(parseISO(item.lastActionDate), { addSuffix: true, locale: fr })}
                </span>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <DollarSign className="h-2.5 w-2.5" />
                <span className="tabular-nums">{TARIF_MOYEN.toLocaleString("fr-FR")}€ potentiel</span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </Draggable>
  );
}

// ─── PIPELINE COLUMN ─────────────────────────────────────

function StrategicColumn({
  column,
  items,
  onCardClick,
}: {
  column: (typeof PIPELINE_COLUMNS)[0];
  items: PipelineItem[];
  onCardClick: (item: PipelineItem) => void;
}) {
  const potentiel = items.length * TARIF_MOYEN;

  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-muted/40 rounded-xl p-3 h-full flex flex-col border border-border/50">
        {/* Header */}
        <div className={cn("rounded-lg border p-3 mb-3", column.bgClass, column.borderClass)}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div className={cn("w-2.5 h-2.5 rounded-full", column.dotColor)} />
              <h3 className="font-semibold text-sm text-foreground">{column.label}</h3>
            </div>
            <Badge variant="secondary" className="text-xs h-5 min-w-5 justify-center">
              {items.length}
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Potentiel : <span className="font-semibold tabular-nums text-foreground">{potentiel.toLocaleString("fr-FR")}€</span>
          </p>
        </div>

        {/* Droppable */}
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex-1 min-h-[200px] rounded-lg transition-colors p-1",
                snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20"
              )}
            >
              <ScrollArea className="h-[calc(100vh-420px)]">
                <div className="pr-2">
                  {items.map((item, index) => (
                    <StrategicPipelineCard
                      key={item.id}
                      item={item}
                      index={index}
                      onClick={() => onCardClick(item)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              </ScrollArea>
              {items.length === 0 && (
                <div className="text-center text-muted-foreground text-xs py-8">Aucun prospect</div>
              )}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

// ─── ACQUISITION SCORE ───────────────────────────────────

function AcquisitionScoreCard({
  score,
  tauxConversion,
  leadsActifs,
  leadsStagnants,
  totalLeads,
}: {
  score: number;
  tauxConversion: number;
  leadsActifs: number;
  leadsStagnants: number;
  totalLeads: number;
}) {
  return (
    <Card className="border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <TrendingUp className="h-4 w-4" />
          Score Acquisition
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="3"
              />
              <path
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${score}, 100`}
                className={getScoreColor(score)}
              />
            </svg>
            <span className={cn("absolute inset-0 flex items-center justify-center text-lg font-bold", getScoreColor(score))}>
              {score}
            </span>
          </div>
          <div className="flex-1 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taux conversion</span>
              <span className="font-semibold tabular-nums">{tauxConversion}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leads actifs</span>
              <span className="font-semibold tabular-nums">{leadsActifs}/{totalLeads}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Leads stagnants</span>
              <span className={cn("font-semibold tabular-nums", leadsStagnants > 5 && "text-destructive")}>{leadsStagnants}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 30-DAY OBJECTIVE ────────────────────────────────────

function ObjectifCard({
  inscriptionsActuelles,
  objectif,
  manqueAGagner,
}: {
  inscriptionsActuelles: number;
  objectif: number;
  manqueAGagner: number;
}) {
  const manquantes = Math.max(0, objectif - inscriptionsActuelles);
  const progressPct = Math.min(100, Math.round((inscriptionsActuelles / objectif) * 100));

  return (
    <Card className="border-accent/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <Target className="h-4 w-4" />
          Objectif inscriptions 30 jours
        </div>
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-3xl font-bold text-foreground tabular-nums">{inscriptionsActuelles}</span>
              <span className="text-lg text-muted-foreground">/{objectif}</span>
            </div>
            {manquantes > 0 ? (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-xs">
                Il manque {manquantes} inscription{manquantes > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-xs">
                ✓ Objectif atteint
              </Badge>
            )}
          </div>
          <Progress value={progressPct} className="h-2" />
          {manquantes > 0 && (
            <p className="text-xs text-muted-foreground">
              Valeur correspondante : <span className="font-semibold text-foreground">{(manquantes * TARIF_MOYEN).toLocaleString("fr-FR")}€</span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── RECOMMENDATIONS ─────────────────────────────────────

function RecommendationsCard({ recommendations }: { recommendations: { text: string; severity: "critical" | "warning" | "info" }[] }) {
  if (recommendations.length === 0) return null;

  const severityConfig = {
    critical: { icon: AlertTriangle, className: "text-destructive" },
    warning: { icon: AlertTriangle, className: "text-warning" },
    info: { icon: Lightbulb, className: "text-info" },
  };

  return (
    <Card className="border-accent/20">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
          <Lightbulb className="h-4 w-4" />
          Recommandations Acquisition
        </div>
        <div className="space-y-2">
          {recommendations.slice(0, 3).map((rec, i) => {
            const config = severityConfig[rec.severity];
            const Icon = config.icon;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.className)} />
                <span className="text-foreground">{rec.text}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── PREDICTIVE ALERT ────────────────────────────────────

function PredictiveAlert({ show, score }: { show: boolean; score: number }) {
  if (!show) return null;
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
      <div>
        <p className="text-sm font-semibold text-destructive">
          🔴 Risque de non-atteinte objectif faute d'acquisition
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Score acquisition : {score}/100 — Pipeline insuffisant pour couvrir les objectifs mensuels.
        </p>
      </div>
    </div>
  );
}

// ─── MAIN PIPELINE PAGE ──────────────────────────────────

export function PipelinePage() {
  const { data: contacts = [], isLoading: contactsLoading } = useContacts();
  const { data: prospects = [], isLoading: prospectsLoading } = useProspects();
  const updateContact = useUpdateContact();
  const updateProspect = useUpdateProspect();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const isLoading = contactsLoading || prospectsLoading;

  // Build unified pipeline items
  const allItems = useMemo((): PipelineItem[] => {
    const items: PipelineItem[] = [];
    const convertedProspectContactIds = new Set(
      prospects.filter(p => p.converted_contact_id).map(p => p.converted_contact_id!)
    );

    // Add prospects (not yet converted)
    prospects.forEach((p) => {
      if (p.converted_contact_id) return; // Skip converted
      const daysSince = differenceInDays(new Date(), parseISO(p.updated_at));
      items.push({
        id: `prospect-${p.id}`,
        prenom: p.prenom,
        nom: p.nom,
        email: p.email,
        telephone: p.telephone,
        formation: p.formation_souhaitee,
        source: p.source,
        columnId: classifyProspect(p),
        lastActionDate: p.updated_at,
        daysSinceAction: daysSince,
        type: "prospect",
        originalProspect: p,
      });
    });

    // Add contacts (not from converted prospects to avoid dupes)
    contacts.forEach((c) => {
      if (convertedProspectContactIds.has(c.id)) {
        // This contact came from a prospect, classify as inscrit
        const daysSince = differenceInDays(new Date(), parseISO(c.updated_at));
        items.push({
          id: `contact-${c.id}`,
          prenom: c.prenom,
          nom: c.nom,
          email: c.email,
          telephone: c.telephone,
          formation: c.formation,
          source: c.source,
          columnId: "inscrit",
          lastActionDate: c.updated_at,
          daysSinceAction: daysSince,
          type: "contact",
          originalContact: c,
        });
        return;
      }
      const daysSince = differenceInDays(new Date(), parseISO(c.updated_at));
      items.push({
        id: `contact-${c.id}`,
        prenom: c.prenom,
        nom: c.nom,
        email: c.email,
        telephone: c.telephone,
        formation: c.formation,
        source: c.source,
        columnId: classifyContact(c),
        lastActionDate: c.updated_at,
        daysSinceAction: daysSince,
        type: "contact",
        originalContact: c,
      });
    });

    return items;
  }, [contacts, prospects]);

  // Filter & group
  const grouped = useMemo(() => {
    const filtered = allItems.filter((item) => {
      if (!searchQuery) return true;
      return `${item.prenom} ${item.nom}`.toLowerCase().includes(searchQuery.toLowerCase());
    });

    const groups: Record<string, PipelineItem[]> = {};
    PIPELINE_COLUMNS.forEach((col) => (groups[col.id] = []));
    filtered.forEach((item) => {
      groups[item.columnId]?.push(item);
    });

    // Sort: stagnant first
    Object.values(groups).forEach((arr) => arr.sort((a, b) => b.daysSinceAction - a.daysSinceAction));

    return groups;
  }, [allItems, searchQuery]);

  // ─── METRICS ───────────────────────────────────────────

  const metrics = useMemo(() => {
    const nouveaux = grouped.nouveau_lead?.length || 0;
    const aRelancer = grouped.a_relancer?.length || 0;
    const inscrits = grouped.inscrit?.length || 0;
    const perdus = grouped.perdu?.length || 0;
    const totalLeads = nouveaux + aRelancer;
    const totalAll = nouveaux + aRelancer + inscrits + perdus;

    const tauxConversion = totalAll > 0 ? Math.round((inscrits / totalAll) * 100) : 0;

    const stagnants = allItems.filter((i) => (i.columnId === "nouveau_lead" || i.columnId === "a_relancer") && i.daysSinceAction >= 3);
    const leadsActifs = totalLeads - stagnants.length;

    const stagnationPenalty = totalLeads > 0 ? Math.round((stagnants.length / totalLeads) * 100) : 0;
    const ratioActifs = totalLeads > 0 ? Math.round((leadsActifs / Math.max(totalLeads, 1)) * 100) : 0;

    const acquisitionScore = Math.max(0, Math.min(100, Math.round(
      0.5 * Math.min(tauxConversion * 2, 100) +
      0.3 * ratioActifs +
      0.2 * (100 - stagnationPenalty)
    )));

    const manquantes = Math.max(0, OBJECTIF_INSCRIPTIONS_MENSUEL - inscrits);

    // Recommendations
    const recommendations: { text: string; severity: "critical" | "warning" | "info" }[] = [];

    if (stagnants.length > 0) {
      const potentiel = stagnants.length * TARIF_MOYEN;
      recommendations.push({
        text: `Relancer ${stagnants.length} prospect${stagnants.length > 1 ? "s" : ""} inactif${stagnants.length > 1 ? "s" : ""} (potentiel ${potentiel.toLocaleString("fr-FR")}€)`,
        severity: stagnants.length > 5 ? "critical" : "warning",
      });
    }

    if (tauxConversion < 50) {
      recommendations.push({
        text: `Améliorer taux de conversion (actuel ${tauxConversion}%)`,
        severity: tauxConversion < 30 ? "critical" : "warning",
      });
    }

    if (manquantes > 0 && totalLeads < manquantes * 2) {
      recommendations.push({
        text: `Pipeline insuffisant pour atteindre l'objectif (${totalLeads} leads pour ${manquantes} inscriptions manquantes)`,
        severity: "critical",
      });
    }

    if (recommendations.length === 0 && inscrits > 0) {
      recommendations.push({
        text: `${inscrits} inscriptions confirmées ce mois — bonne dynamique`,
        severity: "info",
      });
    }

    const showPredictiveAlert = acquisitionScore < 50 && manquantes > 3;

    return {
      tauxConversion,
      leadsActifs,
      leadsStagnants: stagnants.length,
      totalLeads,
      acquisitionScore,
      inscrits,
      manquantes,
      recommendations,
      showPredictiveAlert,
    };
  }, [grouped, allItems]);

  // ─── DRAG & DROP ───────────────────────────────────────

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result;
      if (!destination) return;

      const newColumnId = destination.droppableId;
      const [type, rawId] = draggableId.split("-") as [string, string];
      const realId = draggableId.substring(type.length + 1);

      if (type === "prospect") {
        let newStatut: string = "nouveau";
        if (newColumnId === "a_relancer") newStatut = "relance";
        else if (newColumnId === "inscrit") newStatut = "converti";
        else if (newColumnId === "perdu") newStatut = "perdu";

        updateProspect.mutate({ id: realId, updates: { statut: newStatut as any } });
        toast.success(`Prospect déplacé vers "${PIPELINE_COLUMNS.find(c => c.id === newColumnId)?.label}"`);
      } else {
        let newStatut = "En attente de validation";
        if (newColumnId === "a_relancer") newStatut = "En attente de validation";
        else if (newColumnId === "inscrit") newStatut = "En formation théorique";
        else if (newColumnId === "perdu") newStatut = "Abandonné";

        updateContact.mutate({ id: realId, updates: { statut: newStatut as any } });
        toast.success(`Apprenant déplacé vers "${PIPELINE_COLUMNS.find(c => c.id === newColumnId)?.label}"`);
      }
    },
    [updateContact, updateProspect]
  );

  // ─── CARD CLICK ────────────────────────────────────────

  const handleCardClick = (item: PipelineItem) => {
    if (item.type === "contact" && item.originalContact) {
      setSelectedContactId(item.originalContact.id);
      setDetailOpen(true);
    }
  };

  // ─── RENDER ────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Pipeline Stratégique" subtitle="Pilotage acquisition & conversion" />
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="flex gap-4">
            {PIPELINE_COLUMNS.map((col) => (
              <Skeleton key={col.id} className="h-[400px] w-72" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Pipeline Stratégique" subtitle="Pilotage acquisition & conversion" />

      <div className="px-6 pt-6 space-y-4">
        {/* Predictive Alert */}
        <PredictiveAlert show={metrics.showPredictiveAlert} score={metrics.acquisitionScore} />

        {/* Strategic KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AcquisitionScoreCard
            score={metrics.acquisitionScore}
            tauxConversion={metrics.tauxConversion}
            leadsActifs={metrics.leadsActifs}
            leadsStagnants={metrics.leadsStagnants}
            totalLeads={metrics.totalLeads}
          />
          <ObjectifCard
            inscriptionsActuelles={metrics.inscrits}
            objectif={OBJECTIF_INSCRIPTIONS_MENSUEL}
            manqueAGagner={metrics.manquantes * TARIF_MOYEN}
          />
          <RecommendationsCard recommendations={metrics.recommendations} />
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{allItems.length} dans le pipeline</span>
          </div>
        </div>

        {/* Kanban Board */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-6">
            {PIPELINE_COLUMNS.map((column) => (
              <StrategicColumn
                key={column.id}
                column={column}
                items={grouped[column.id] || []}
                onCardClick={handleCardClick}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Detail Sheet */}
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
