import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Calendar, MapPin, Edit, Trash2, Copy, ChevronDown, ChevronRight,
  Layers, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SessionCardMobile } from "./SessionCardMobile";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Session } from "@/hooks/useSessions";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";
import { calculateHealthScore, type SessionFinancialData } from "@/hooks/useSessionFinancials";

import type { GroupByMode } from "@/hooks/useSessionsViewPreferences";
export type { GroupByMode };
type SortField = 'nom' | 'formation_type' | 'date_debut' | 'lieu' | 'inscrits' | 'statut' | 'score';
type SortOrder = 'asc' | 'desc';

const statusConfig: Record<string, { label: string; class: string }> = {
  a_venir: { label: "À venir", class: "bg-info/10 text-info border-info/20" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning border-warning/20" },
  terminee: { label: "Terminée", class: "bg-muted text-muted-foreground border-muted" },
  annulee: { label: "Annulée", class: "bg-destructive/10 text-destructive border-destructive/20" },
  complet: { label: "Complet", class: "bg-success/10 text-success border-success/20" },
};

const groupByOptions = [
  { value: "none", label: "Aucun regroupement" },
  { value: "formation", label: "Par type de formation" },
  { value: "status", label: "Par statut" },
  { value: "month", label: "Par mois" },
  { value: "lieu", label: "Par lieu" },
];

const sortOptions = [
  { value: "date_debut", label: "Date" },
  { value: "nom", label: "Nom" },
  { value: "inscrits", label: "Inscrits" },
  { value: "score", label: "Santé" },
  { value: "statut", label: "Statut" },
];

interface SessionsGroupedTableProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
  financials?: Record<string, SessionFinancialData>;
  showProfitability?: boolean;
  isLoading: boolean;
  groupBy: GroupByMode;
  activeSessionId?: string | null;
  onGroupByChange: (groupBy: GroupByMode) => void;
  onViewDetail: (session: Session) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onDelete: (id: string) => void;
}

interface GroupedSessions {
  key: string;
  label: string;
  sessions: Session[];
  badgeClass?: string;
}

function getSessionHealth(
  session: Session,
  inscriptionsCounts: Record<string, number>,
  financials: Record<string, SessionFinancialData>
) {
  const inscrits = inscriptionsCounts[session.id] || 0;
  const fin = financials[session.id];
  return calculateHealthScore(
    inscrits,
    session.places_totales,
    fin?.ca_securise || 0,
    Number(session.prix) || 0,
    session.date_debut,
    fin?.nb_payes || 0
  );
}

function isSessionCritical(
  session: Session,
  inscriptionsCounts: Record<string, number>
): boolean {
  if (session.statut !== 'a_venir') return false;
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntil > 14 || daysUntil < 0) return false;
  const inscrits = inscriptionsCounts[session.id] || 0;
  const fillRate = session.places_totales > 0 ? inscrits / session.places_totales : 0;
  return fillRate < 0.5;
}

export function SessionsGroupedTable({
  sessions,
  inscriptionsCounts,
  financials = {},
  showProfitability = false,
  isLoading,
  groupBy,
  activeSessionId,
  onGroupByChange,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
}: SessionsGroupedTableProps) {
  const isMobile = useIsMobile();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date_debut');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const aCrit = isSessionCritical(a, inscriptionsCounts);
      const bCrit = isSessionCritical(b, inscriptionsCounts);
      if (aCrit && !bCrit) return -1;
      if (!aCrit && bCrit) return 1;

      let compareValue = 0;
      switch (sortField) {
        case 'nom': compareValue = a.nom.localeCompare(b.nom); break;
        case 'formation_type': compareValue = a.formation_type.localeCompare(b.formation_type); break;
        case 'date_debut': compareValue = new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime(); break;
        case 'lieu': compareValue = (a.adresse_ville || a.lieu || '').localeCompare(b.adresse_ville || b.lieu || ''); break;
        case 'inscrits': compareValue = (inscriptionsCounts[a.id] || 0) - (inscriptionsCounts[b.id] || 0); break;
        case 'statut': compareValue = a.statut.localeCompare(b.statut); break;
        case 'score': {
          const sa = getSessionHealth(a, inscriptionsCounts, financials).score;
          const sb = getSessionHealth(b, inscriptionsCounts, financials).score;
          compareValue = sa - sb;
          break;
        }
      }
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [sessions, sortField, sortOrder, inscriptionsCounts, financials]);

  const groupedSessions = useMemo((): GroupedSessions[] => {
    if (groupBy === "none") {
      return [{ key: "all", label: "Toutes les sessions", sessions: sortedSessions }];
    }
    const groups: Record<string, Session[]> = {};
    sortedSessions.forEach((session) => {
      let key: string;
      switch (groupBy) {
        case "formation": key = session.formation_type; break;
        case "status": key = session.statut; break;
        case "month": key = format(parseISO(session.date_debut), "yyyy-MM"); break;
        case "lieu": key = session.adresse_ville || session.lieu || "Non défini"; break;
        default: key = "other";
      }
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
    });
    return Object.entries(groups).map(([key, sessions]) => {
      let label: string;
      let badgeClass: string | undefined;
      switch (groupBy) {
        case "formation": label = getFormationLabel(key); badgeClass = getFormationColor(key).badge; break;
        case "status": label = statusConfig[key]?.label || key; badgeClass = statusConfig[key]?.class; break;
        case "month": label = format(parseISO(`${key}-01`), "MMMM yyyy", { locale: fr }); label = label.charAt(0).toUpperCase() + label.slice(1); break;
        default: label = key;
      }
      return { key, label, sessions, badgeClass };
    }).sort((a, b) => groupBy === "month" ? a.key.localeCompare(b.key) : a.label.localeCompare(b.label));
  }, [sortedSessions, groupBy]);

  useMemo(() => {
    if (expandedGroups.size === 0 && groupedSessions.length > 0) {
      setExpandedGroups(new Set(groupedSessions.map(g => g.key)));
    }
  }, [groupedSessions.length]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortOrder('asc'); }
  };

  const handleMobileSortChange = (value: string) => {
    const field = value as SortField;
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  const renderHeaders = (hideFormation = false, hideStatus = false, hideLieu = false) => (
    <TableHeader>
      <TableRow className="bg-muted/50">
        {/* ZONE 1 — IDENTITÉ */}
        <TableHead className="font-semibold cursor-pointer hover:bg-muted/80 w-[40%]" onClick={() => handleSort('nom')}>
          <div className="flex items-center">Session<SortIcon field="nom" /></div>
        </TableHead>
        {/* ZONE 2 — PERFORMANCE */}
        <TableHead className="font-semibold cursor-pointer hover:bg-muted/80 w-[35%]" onClick={() => handleSort('inscrits')}>
          <div className="flex items-center">Performance<SortIcon field="inscrits" /></div>
        </TableHead>
        {/* ZONE 3 — STATUT & PRIORITÉ */}
        <TableHead className="font-semibold cursor-pointer hover:bg-muted/80" onClick={() => handleSort('statut')}>
          <div className="flex items-center">Statut & Priorité<SortIcon field="statut" /></div>
        </TableHead>
        <TableHead className="text-right font-semibold w-[100px]">Actions</TableHead>
      </TableRow>
    </TableHeader>
  );

  // ─── Loading state ───
  if (isLoading) {
    return (
      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b border-border"><Skeleton className="h-10 w-48" /></div>
        {isMobile ? (
          <div className="p-3 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <Table>
            {renderHeaders()}
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  }

  // ─── Mobile toolbar ───
  const renderMobileToolbar = () => (
    <div className="p-3 border-b border-border space-y-2">
      {/* Group by */}
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByMode)}>
          <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {groupByOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Sort + expand/collapse */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={sortField} onValueChange={handleMobileSortChange}>
          <SelectTrigger className="flex-1 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sortOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
        >
          {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>
        {groupBy !== "none" && (
          <>
            <Button variant="ghost" size="sm" className="h-9 text-xs px-2" onClick={() => setExpandedGroups(new Set(groupedSessions.map(g => g.key)))}>
              Tout
            </Button>
            <Button variant="ghost" size="sm" className="h-9 text-xs px-2" onClick={() => setExpandedGroups(new Set())}>
              Replier
            </Button>
          </>
        )}
      </div>
    </div>
  );

  // ─── Desktop toolbar ───
  const renderDesktopToolbar = () => (
    <div className="p-4 border-b border-border flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Regrouper par :</span>
        <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByMode)}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {groupByOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {groupBy !== "none" && (
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="ghost" size="sm" onClick={() => setExpandedGroups(new Set(groupedSessions.map(g => g.key)))}>Tout déplier</Button>
          <Button variant="ghost" size="sm" onClick={() => setExpandedGroups(new Set())}>Tout replier</Button>
        </div>
      )}
    </div>
  );

  // ─── Mobile group header ───
  const renderMobileGroupHeader = (group: GroupedSessions) => (
    <div className="flex items-center gap-2 p-3 hover:bg-muted/50 cursor-pointer transition-colors">
      {expandedGroups.has(group.key) ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
        {group.badgeClass ? (
          <Badge variant="outline" className={cn("text-xs", group.badgeClass)}>{group.label}</Badge>
        ) : (
          <span className="font-semibold text-sm text-foreground">{group.label}</span>
        )}
        <Badge variant="secondary" className="text-xs">
          {group.sessions.length}
        </Badge>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">
        {group.sessions.reduce((a, s) => a + (inscriptionsCounts[s.id] || 0), 0)}/{group.sessions.reduce((a, s) => a + s.places_totales, 0)}
      </span>
    </div>
  );

  // ─── Render mobile card for a session ───
  const renderMobileCard = (session: Session) => {
    const inscrits = inscriptionsCounts[session.id] || 0;
    const health = getSessionHealth(session, inscriptionsCounts, financials);
    return (
      <SessionCardMobile
        key={session.id}
        session={session}
        inscrits={inscrits}
        financial={financials[session.id]}
        health={health}
        isCritical={isSessionCritical(session, inscriptionsCounts)}
        isActive={activeSessionId === session.id}
        statusConfig={statusConfig}
        onViewDetail={onViewDetail}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    );
  };

  // ─── MOBILE RENDER ───
  if (isMobile) {
    return (
      <TooltipProvider>
        <div className="card-elevated overflow-hidden">
          {renderMobileToolbar()}

          {groupBy === "none" ? (
            <div className="p-3 space-y-2">
              {sortedSessions.map(renderMobileCard)}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groupedSessions.map((group) => (
                <Collapsible key={group.key} open={expandedGroups.has(group.key)} onOpenChange={() => toggleGroup(group.key)}>
                  <CollapsibleTrigger asChild>
                    {renderMobileGroupHeader(group)}
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      {group.sessions.map(renderMobileCard)}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}

          {sortedSessions.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title="Aucune session trouvée"
              description="Modifiez vos filtres ou créez une nouvelle session"
            />
          )}
        </div>
      </TooltipProvider>
    );
  }

  // ─── DESKTOP RENDER (unchanged) ───
  return (
    <TooltipProvider>
      <div className="card-elevated overflow-hidden">
        {renderDesktopToolbar()}

        {groupBy === "none" ? (
          <Table>
            {renderHeaders()}
            <TableBody>
              {sortedSessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  inscriptionsCounts={inscriptionsCounts}
                  financials={financials}
                  showProfitability={showProfitability}
                  isActive={activeSessionId === session.id}
                  isCritical={isSessionCritical(session, inscriptionsCounts)}
                  onViewDetail={onViewDetail}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="divide-y divide-border">
            {groupedSessions.map((group) => {
              const isMonthGroup = groupBy === "month";
              return (
                <Collapsible key={group.key} open={expandedGroups.has(group.key)} onOpenChange={() => toggleGroup(group.key)}>
                  <CollapsibleTrigger asChild>
                    <div className={cn(
                      "flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors",
                      isMonthGroup && "border-l-4 border-l-primary/30 bg-muted/20"
                    )}>
                      {expandedGroups.has(group.key) ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <div className="flex items-center gap-2">
                        {group.badgeClass ? (
                          <Badge variant="outline" className={cn("text-sm", group.badgeClass)}>{group.label}</Badge>
                        ) : (
                          <span className={cn(
                            "font-semibold text-foreground",
                            isMonthGroup && "text-base uppercase tracking-wide"
                          )}>{group.label}</span>
                        )}
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}
                      </Badge>
                      <span className="text-xs text-muted-foreground/70 ml-auto mr-4 flex items-center gap-3">
                        <span>
                          {group.sessions.reduce((a, s) => a + (inscriptionsCounts[s.id] || 0), 0)} inscrits
                          {' / '}
                          {group.sessions.reduce((a, s) => a + s.places_totales, 0)} places
                        </span>
                        {Object.keys(financials).length > 0 && (
                          <span className="text-success font-medium">
                            {group.sessions.reduce((a, s) => a + (financials[s.id]?.ca_securise || 0), 0).toLocaleString('fr-FR')} € sécurisés
                          </span>
                        )}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <Table>
                      {renderHeaders(groupBy === "formation", groupBy === "status", groupBy === "lieu")}
                      <TableBody>
                        {group.sessions.map((session) => (
                          <SessionRow
                            key={session.id}
                            session={session}
                            inscriptionsCounts={inscriptionsCounts}
                            financials={financials}
                            showProfitability={showProfitability}
                            isActive={activeSessionId === session.id}
                            isCritical={isSessionCritical(session, inscriptionsCounts)}
                            hideFormation={groupBy === "formation"}
                            hideStatus={groupBy === "status"}
                            hideLieu={groupBy === "lieu"}
                            onViewDetail={onViewDetail}
                            onEdit={onEdit}
                            onDuplicate={onDuplicate}
                            onDelete={onDelete}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {sortedSessions.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Aucune session trouvée"
            description="Modifiez vos filtres ou créez une nouvelle session"
          />
        )}
      </div>
    </TooltipProvider>
  );
}

function getBusinessPriority(session: Session, inscriptionsCounts: Record<string, number>) {
  const inscrits = inscriptionsCounts[session.id] || 0;
  const fillRate = session.places_totales > 0 ? (inscrits / session.places_totales) * 100 : 100;
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (fillRate < 50 && daysUntil <= 14 && daysUntil >= 0) {
    return { emoji: "🔴", label: "Risque élevé", class: "bg-destructive/10 text-destructive border-destructive/20" };
  }
  if (fillRate < 70) {
    return { emoji: "🟡", label: "À surveiller", class: "bg-warning/10 text-warning border-warning/20" };
  }
  return { emoji: "🟢", label: "OK", class: "bg-success/10 text-success border-success/20" };
}

/** Unified fill-rate color: red < 50, warning 50-69, success 70-99, strong-success ≥ 100 */
function getFillColor(fillRate: number) {
  if (fillRate >= 100) return { text: "text-emerald-600 dark:text-emerald-400", bar: "[&>div]:bg-emerald-600 dark:[&>div]:bg-emerald-400" };
  if (fillRate >= 70) return { text: "text-success", bar: "[&>div]:bg-success" };
  if (fillRate >= 50) return { text: "text-warning", bar: "[&>div]:bg-warning" };
  return { text: "text-destructive", bar: "[&>div]:bg-destructive" };
}

/** Micro-synthesis: one-line business interpretation */
function getMicroSynthesis(session: Session, fillRate: number, fin?: SessionFinancialData): string {
  const daysUntil = Math.ceil(
    (new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (session.statut === 'annulee') return "Session annulée";
  if (session.statut === 'terminee') {
    if (fillRate >= 80 && fin && fin.ca_securise > 0) return "Session terminée — rentable";
    if (fillRate < 50) return "Session terminée — faible performance";
    return "Session terminée";
  }
  if (fillRate >= 100 && fin && fin.ca_securise > 0) return "Session complète — rentable";
  if (fillRate >= 100) return "Session complète";
  if (fillRate < 50 && daysUntil <= 14 && daysUntil >= 0) return "Remplissage insuffisant — à risque";
  if (fillRate < 50 && daysUntil <= 7 && daysUntil >= 0) return "Démarrage imminent — critique";
  if (daysUntil <= 7 && daysUntil >= 0 && fillRate < 70) return "Démarrage proche — attention";
  if (fillRate < 50) return "Remplissage insuffisant";
  if (fillRate < 70) return "Remplissage en cours";
  return "Bonne trajectoire";
}

interface SessionRowProps {
  session: Session;
  inscriptionsCounts: Record<string, number>;
  financials: Record<string, SessionFinancialData>;
  showProfitability: boolean;
  isActive?: boolean;
  isCritical?: boolean;
  onViewDetail: (session: Session) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onDelete: (id: string) => void;
  hideFormation?: boolean;
  hideStatus?: boolean;
  hideLieu?: boolean;
}

function SessionRow({
  session, inscriptionsCounts, financials, showProfitability,
  isActive, isCritical, onViewDetail, onEdit, onDuplicate, onDelete,
  hideFormation, hideStatus, hideLieu,
}: SessionRowProps) {
  const formationColor = getFormationColor(session.formation_type);
  const inscrits = inscriptionsCounts[session.id] || 0;
  const fin = financials[session.id];
  const fillRate = session.places_totales > 0 ? Math.round((inscrits / session.places_totales) * 100) : 0;
  const fillColor = getFillColor(fillRate);
  const priority = getBusinessPriority(session, inscriptionsCounts);
  const synthesis = getMicroSynthesis(session, fillRate, fin);

  // Month display from date_debut
  const monthLabel = format(new Date(session.date_debut), 'MMM yyyy', { locale: fr });

  return (
    <TableRow
      className={cn(
        "transition-colors cursor-pointer group/row",
        isCritical
          ? "bg-destructive/[0.04] border-l-[3px] border-l-destructive hover:bg-destructive/[0.07]"
          : "hover:bg-muted/40 even:bg-muted/20",
        isActive && "bg-primary/5 ring-1 ring-inset ring-primary/20",
      )}
      onClick={() => onViewDetail(session)}
    >
      {/* ──── ZONE 1 — IDENTITÉ (≈40%) ──── */}
      <TableCell className="py-4">
        <div className={cn("absolute left-0 top-3 bottom-3 w-1 rounded-r-full", formationColor.dot)} />
        <div className="pl-3 space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground truncate max-w-[220px] group-hover/row:text-primary transition-colors">
              {session.nom}
            </p>
            {isCritical && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20 gap-0.5 shrink-0">
                <AlertTriangle className="h-3 w-3" /> Critique
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Month — dominant */}
            <span className="text-xs font-semibold uppercase text-foreground tracking-wide">
              {monthLabel}
            </span>
            {session.numero_session && (
              <span className="text-[10px] text-muted-foreground/70 font-mono">{session.numero_session}</span>
            )}
            <Badge variant="outline" className={cn("text-[10px]", formationColor.badge)}>
              {getFormationLabel(session.formation_type)}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(session.date_debut), 'dd/MM/yy', { locale: fr })} – {format(new Date(session.date_fin), 'dd/MM/yy', { locale: fr })}
            </span>
            {(session.adresse_ville || session.lieu) && (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <MapPin className="h-3 w-3" />
                {session.adresse_ville || session.lieu}
              </span>
            )}
          </div>
        </div>
      </TableCell>

      {/* ──── ZONE 2 — PERFORMANCE (≈35%) ──── */}
      <TableCell className="py-4">
        <div className="space-y-1.5">
          {/* Fill rate */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-sm font-semibold tabular-nums", fillColor.text)}>
                  {inscrits} / {session.places_totales} places
                </span>
                <span className={cn("text-xs font-medium tabular-nums", fillColor.text)}>
                  {fillRate}%
                </span>
              </div>
              <Progress
                value={Math.min(fillRate, 100)}
                className={cn("h-2.5 w-full", fillColor.bar)}
              />
            </div>
          </div>
          {/* Financial row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
            {fin && fin.nb_payes > 0 ? (
              <span>💳 {fin.nb_payes} payé{fin.nb_payes > 1 ? 's' : ''}</span>
            ) : (
              <span>💳 —</span>
            )}
            {fin && fin.ca_securise > 0 ? (
              <span className="font-medium text-success">
                {fin.ca_securise.toLocaleString('fr-FR')} €
              </span>
            ) : (
              <span>—</span>
            )}
          </div>
          {/* Micro-synthesis */}
          <p className={cn(
            "text-[11px] italic leading-tight",
            isCritical ? "text-destructive" : "text-muted-foreground"
          )}>
            {synthesis}
          </p>
        </div>
      </TableCell>

      {/* ──── ZONE 3 — STATUT & PRIORITÉ (≈25%) ──── */}
      <TableCell className="py-4">
        <div className="space-y-2">
          <Badge variant="outline" className={cn("text-xs", statusConfig[session.statut]?.class)}>
            {statusConfig[session.statut]?.label || session.statut}
          </Badge>
          <div>
            <Badge variant="outline" className={cn("text-xs gap-1", priority.class)}>
              {priority.emoji} {priority.label}
            </Badge>
          </div>
        </div>
      </TableCell>

      {/* ──── ACTIONS ──── */}
      <TableCell className="text-right py-4">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(session); }} title="Modifier">
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDuplicate(session); }} title="Dupliquer">
            <Copy className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Envoyer à la corbeille ?</AlertDialogTitle>
                <AlertDialogDescription>La session « {session.nom} » sera envoyée à la corbeille avec ses inscriptions et émargements. Vous pourrez la restaurer ultérieurement.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(session.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Envoyer à la corbeille</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
