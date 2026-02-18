import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Calendar, 
  MapPin, 
  Edit, 
  Trash2, 
  Copy, 
  ChevronDown, 
  ChevronRight,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SessionEnrollmentBadge } from "./SessionEnrollmentBadge";
import type { Session } from "@/hooks/useSessions";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

import type { GroupByMode } from "@/hooks/useSessionsViewPreferences";
export type { GroupByMode };
type SortField = 'nom' | 'formation_type' | 'date_debut' | 'lieu' | 'inscrits' | 'statut';
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

interface SessionsGroupedTableProps {
  sessions: Session[];
  inscriptionsCounts: Record<string, number>;
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

export function SessionsGroupedTable({
  sessions,
  inscriptionsCounts,
  isLoading,
  groupBy,
  activeSessionId,
  onGroupByChange,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
}: SessionsGroupedTableProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date_debut');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      let compareValue = 0;
      
      switch (sortField) {
        case 'nom':
          compareValue = a.nom.localeCompare(b.nom);
          break;
        case 'formation_type':
          compareValue = a.formation_type.localeCompare(b.formation_type);
          break;
        case 'date_debut':
          compareValue = new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime();
          break;
        case 'lieu':
          const lieuA = a.adresse_ville || a.lieu || '';
          const lieuB = b.adresse_ville || b.lieu || '';
          compareValue = lieuA.localeCompare(lieuB);
          break;
        case 'inscrits':
          compareValue = (inscriptionsCounts[a.id] || 0) - (inscriptionsCounts[b.id] || 0);
          break;
        case 'statut':
          compareValue = a.statut.localeCompare(b.statut);
          break;
      }
      
      return sortOrder === 'asc' ? compareValue : -compareValue;
    });
  }, [sessions, sortField, sortOrder, inscriptionsCounts]);

  // Group sessions based on groupBy mode
  const groupedSessions = useMemo((): GroupedSessions[] => {
    if (groupBy === "none") {
      return [{ key: "all", label: "Toutes les sessions", sessions: sortedSessions }];
    }

    const groups: Record<string, Session[]> = {};

    sortedSessions.forEach((session) => {
      let key: string;
      
      switch (groupBy) {
        case "formation":
          key = session.formation_type;
          break;
        case "status":
          key = session.statut;
          break;
        case "month":
          key = format(parseISO(session.date_debut), "yyyy-MM");
          break;
        case "lieu":
          key = session.adresse_ville || session.lieu || "Non défini";
          break;
        default:
          key = "other";
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(session);
    });

    // Convert to array and sort groups
    return Object.entries(groups)
      .map(([key, sessions]) => {
        let label: string;
        let badgeClass: string | undefined;

        switch (groupBy) {
          case "formation":
            label = getFormationLabel(key);
            badgeClass = getFormationColor(key).badge;
            break;
          case "status":
            label = statusConfig[key]?.label || key;
            badgeClass = statusConfig[key]?.class;
            break;
          case "month":
            label = format(parseISO(`${key}-01`), "MMMM yyyy", { locale: fr });
            label = label.charAt(0).toUpperCase() + label.slice(1);
            break;
          case "lieu":
            label = key;
            break;
          default:
            label = key;
        }

        return { key, label, sessions, badgeClass };
      })
      .sort((a, b) => {
        if (groupBy === "month") {
          return a.key.localeCompare(b.key);
        }
        return a.label.localeCompare(b.label);
      });
  }, [sortedSessions, groupBy]);

  // Initialize all groups as expanded
  useMemo(() => {
    if (expandedGroups.size === 0 && groupedSessions.length > 0) {
      setExpandedGroups(new Set(groupedSessions.map(g => g.key)));
    }
  }, [groupedSessions.length]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedGroups(new Set(groupedSessions.map(g => g.key)));
  };

  const collapseAll = () => {
    setExpandedGroups(new Set());
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  if (isLoading) {
    return (
      <div className="card-elevated overflow-hidden">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-10 w-48" />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Session</TableHead>
              <TableHead className="font-semibold">Formation</TableHead>
              <TableHead className="font-semibold">Dates</TableHead>
              <TableHead className="font-semibold">Lieu</TableHead>
              <TableHead className="font-semibold">Inscrits</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="card-elevated overflow-hidden">
      {/* Group controls */}
      <div className="p-4 border-b border-border flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Regrouper par :</span>
          <Select value={groupBy} onValueChange={(v) => onGroupByChange(v as GroupByMode)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupByOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {groupBy !== "none" && (
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              Tout déplier
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              Tout replier
            </Button>
          </div>
        )}
      </div>

      {/* Grouped content */}
      {groupBy === "none" ? (
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('nom')}
              >
                <div className="flex items-center">
                  Session
                  <SortIcon field="nom" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('formation_type')}
              >
                <div className="flex items-center">
                  Formation
                  <SortIcon field="formation_type" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('date_debut')}
              >
                <div className="flex items-center">
                  Dates
                  <SortIcon field="date_debut" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('lieu')}
              >
                <div className="flex items-center">
                  Lieu
                  <SortIcon field="lieu" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('inscrits')}
              >
                <div className="flex items-center">
                  Inscrits
                  <SortIcon field="inscrits" />
                </div>
              </TableHead>
              <TableHead 
                className="font-semibold cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort('statut')}
              >
                <div className="flex items-center">
                  Statut
                  <SortIcon field="statut" />
                </div>
              </TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSessions.map((session) => (
              <SessionRow 
                key={session.id} 
                session={session} 
                inscriptionsCounts={inscriptionsCounts}
                isActive={activeSessionId === session.id}
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
          {groupedSessions.map((group) => (
            <Collapsible
              key={group.key}
              open={expandedGroups.has(group.key)}
              onOpenChange={() => toggleGroup(group.key)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                  {expandedGroups.has(group.key) ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  
                  <div className="flex items-center gap-2">
                    {group.badgeClass ? (
                      <Badge variant="outline" className={cn("text-sm", group.badgeClass)}>
                        {group.label}
                      </Badge>
                    ) : (
                      <span className="font-semibold text-foreground">{group.label}</span>
                    )}
                  </div>

                  <Badge variant="secondary" className="ml-2">
                    {group.sessions.length} session{group.sessions.length > 1 ? 's' : ''}
                  </Badge>
                </div>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('nom')}
                      >
                        <div className="flex items-center">
                          Session
                          <SortIcon field="nom" />
                        </div>
                      </TableHead>
                      {groupBy !== "formation" && (
                        <TableHead 
                          className="font-semibold cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('formation_type')}
                        >
                          <div className="flex items-center">
                            Formation
                            <SortIcon field="formation_type" />
                          </div>
                        </TableHead>
                      )}
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('date_debut')}
                      >
                        <div className="flex items-center">
                          Dates
                          <SortIcon field="date_debut" />
                        </div>
                      </TableHead>
                      {groupBy !== "lieu" && (
                        <TableHead 
                          className="font-semibold cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('lieu')}
                        >
                          <div className="flex items-center">
                            Lieu
                            <SortIcon field="lieu" />
                          </div>
                        </TableHead>
                      )}
                      <TableHead 
                        className="font-semibold cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('inscrits')}
                      >
                        <div className="flex items-center">
                          Inscrits
                          <SortIcon field="inscrits" />
                        </div>
                      </TableHead>
                      {groupBy !== "status" && (
                        <TableHead 
                          className="font-semibold cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort('statut')}
                        >
                          <div className="flex items-center">
                            Statut
                            <SortIcon field="statut" />
                          </div>
                        </TableHead>
                      )}
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.sessions.map((session) => (
                      <SessionRow 
                        key={session.id} 
                        session={session} 
                        inscriptionsCounts={inscriptionsCounts}
                        isActive={activeSessionId === session.id}
                        onViewDetail={onViewDetail}
                        onEdit={onEdit}
                        onDuplicate={onDuplicate}
                        onDelete={onDelete}
                        hideFormation={groupBy === "formation"}
                        hideStatus={groupBy === "status"}
                        hideLieu={groupBy === "lieu"}
                      />
                    ))}
                  </TableBody>
                </Table>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {sortedSessions.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          Aucune session trouvée
        </div>
      )}
    </div>
  );
}

interface SessionRowProps {
  session: Session;
  inscriptionsCounts: Record<string, number>;
  isActive?: boolean;
  onViewDetail: (session: Session) => void;
  onEdit: (session: Session) => void;
  onDuplicate: (session: Session) => void;
  onDelete: (id: string) => void;
  hideFormation?: boolean;
  hideStatus?: boolean;
  hideLieu?: boolean;
}

function SessionRow({
  session,
  inscriptionsCounts,
  isActive,
  onViewDetail,
  onEdit,
  onDuplicate,
  onDelete,
  hideFormation,
  hideStatus,
  hideLieu,
}: SessionRowProps) {
  const formationColor = getFormationColor(session.formation_type);
  
  return (
    <TableRow 
      className={cn(
        "table-row-hover transition-colors cursor-pointer group/row",
        "even:bg-muted/20",
        isActive && "bg-primary/5 ring-1 ring-inset ring-primary/20"
      )}
      onClick={() => onViewDetail(session)}
    >
      <TableCell className="relative">
        <div className={cn(
          "absolute left-0 top-2 bottom-2 w-1 rounded-r-full",
          formationColor.dot
        )} />
        <div className="pl-3">
          <p className="font-medium text-foreground group-hover/row:text-primary transition-colors">{session.nom}</p>
          {session.numero_session && (
            <p className="text-xs text-muted-foreground font-mono">
              {session.numero_session}
            </p>
          )}
          {session.formateur && (
            <p className="text-sm text-muted-foreground">
              Formateur: {session.formateur}
            </p>
          )}
        </div>
      </TableCell>
      
      {!hideFormation && (
        <TableCell>
          <Badge variant="outline" className={cn("text-xs", getFormationColor(session.formation_type).badge)}>
            {getFormationLabel(session.formation_type)}
          </Badge>
        </TableCell>
      )}
      
      <TableCell>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">
            {format(new Date(session.date_debut), 'dd/MM/yyyy', { locale: fr })}
            {' - '}
            {format(new Date(session.date_fin), 'dd/MM/yyyy', { locale: fr })}
          </span>
        </div>
      </TableCell>
      
      {!hideLieu && (
        <TableCell>
          {(session.adresse_ville || session.lieu) ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{session.adresse_ville || session.lieu}</span>
            </div>
          ) : '-'}
        </TableCell>
      )}
      
      <TableCell>
        <SessionEnrollmentBadge
          enrolled={inscriptionsCounts[session.id] || 0}
          total={session.places_totales}
        />
      </TableCell>
      
      {!hideStatus && (
        <TableCell>
          <Badge
            variant="outline"
            className={cn("text-xs", statusConfig[session.statut]?.class)}
          >
            {statusConfig[session.statut]?.label || session.statut}
          </Badge>
        </TableCell>
      )}
      
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onEdit(session); }}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); onDuplicate(session); }}
            title="Dupliquer"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Toutes les inscriptions associées seront également supprimées.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(session.id)}>
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TableCell>
    </TableRow>
  );
}
