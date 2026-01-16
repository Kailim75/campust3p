import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, Calendar, MapPin, Edit, Trash2, Eye, List, CalendarDays, Copy, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions, useDeleteSession, useAllSessionInscriptionsCounts, useCreateSession, type Session } from "@/hooks/useSessions";
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useAutoUpdateSessionStatus } from "@/hooks/useAutoUpdateSessionStatus";
import { useSessionsExport } from "@/hooks/useSessionsExport";
import { format, parseISO, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { SessionFormDialog } from "./SessionFormDialog";
import { SessionDetailSheet } from "./SessionDetailSheet";
import { SessionEnrollmentBadge } from "./SessionEnrollmentBadge";
import { SessionCalendar } from "./SessionCalendar";
import { SessionsKPICards } from "./SessionsKPICards";
import { SessionsAdvancedFilters, type SessionFilters } from "./SessionsAdvancedFilters";
import { toast } from "sonner";
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

const statusConfig = {
  a_venir: { label: "À venir", class: "bg-info/10 text-info border-info/20" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning border-warning/20" },
  terminee: { label: "Terminée", class: "bg-muted text-muted-foreground border-muted" },
  annulee: { label: "Annulée", class: "bg-destructive/10 text-destructive border-destructive/20" },
  complet: { label: "Complet", class: "bg-success/10 text-success border-success/20" },
};

const formationLabels: Record<string, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "Continue Taxi",
  "Formation continue VTC": "Continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};

type SortField = 'nom' | 'formation_type' | 'date_debut' | 'lieu' | 'inscrits' | 'statut';
type SortOrder = 'asc' | 'desc';

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sessions, isLoading, error } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const { data: formateurs = [] } = useFormateursTable();
  const deleteSession = useDeleteSession();
  const createSession = useCreateSession();
  const { updateSessionStatuses } = useAutoUpdateSessionStatus();
  const { exportSessions } = useSessionsExport();
  
  const [filters, setFilters] = useState<SessionFilters>({
    search: "",
    status: "all",
    formationType: "all",
    formateurId: "all",
    lieu: "all",
    dateStart: "",
    dateEnd: "",
  });
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('date_debut');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Auto-update session statuses on load
  useEffect(() => {
    if (sessions && sessions.length > 0) {
      updateSessionStatuses.mutate(sessions);
    }
  }, [sessions?.length]);

  // Handle URL parameter to open session detail
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setDetailSessionId(idFromUrl);
      setDetailOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Extract unique lieux and formation types for filters
  const uniqueLieux = useMemo(() => {
    if (!sessions) return [];
    const lieux = sessions
      .map(s => s.adresse_ville || s.lieu)
      .filter((v, i, arr) => v && arr.indexOf(v) === i) as string[];
    return lieux.sort();
  }, [sessions]);

  const uniqueFormationTypes = useMemo(() => {
    if (!sessions) return [];
    return [...new Set(sessions.map(s => s.formation_type))].sort();
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter((session) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          session.nom.toLowerCase().includes(searchLower) ||
          session.formation_type.toLowerCase().includes(searchLower) ||
          session.numero_session?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }
      
      // Status filter
      if (filters.status !== "all" && session.statut !== filters.status) return false;
      
      // Formation type filter
      if (filters.formationType !== "all" && session.formation_type !== filters.formationType) return false;
      
      // Formateur filter
      if (filters.formateurId !== "all" && session.formateur_id !== filters.formateurId) return false;
      
      // Lieu filter
      if (filters.lieu !== "all") {
        const sessionLieu = session.adresse_ville || session.lieu;
        if (sessionLieu !== filters.lieu) return false;
      }
      
      // Date filters
      if (filters.dateStart) {
        const filterStart = parseISO(filters.dateStart);
        const sessionStart = parseISO(session.date_debut);
        if (isBefore(sessionStart, filterStart)) return false;
      }
      
      if (filters.dateEnd) {
        const filterEnd = parseISO(filters.dateEnd);
        const sessionEnd = parseISO(session.date_fin);
        if (isAfter(sessionEnd, filterEnd)) return false;
      }
      
      return true;
    });
  }, [sessions, filters]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
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
  }, [filteredSessions, sortField, sortOrder, inscriptionsCounts]);

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

  const handleAddNew = () => {
    setEditingSession(null);
    setFormOpen(true);
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setFormOpen(true);
  };

  const handleViewDetail = (session: Session) => {
    setDetailSessionId(session.id);
    setDetailOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSession.mutateAsync(id);
      toast.success("Session supprimée");
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDuplicate = async (session: Session) => {
    try {
      const { id, created_at, updated_at, numero_session, ...sessionData } = session as any;
      await createSession.mutateAsync({
        ...sessionData,
        nom: `${session.nom} (copie)`,
        statut: 'a_venir',
      });
      toast.success("Session dupliquée avec succès");
    } catch {
      toast.error("Erreur lors de la duplication");
    }
  };

  const handleExport = (formatType: 'xlsx' | 'csv') => {
    exportSessions(sortedSessions, inscriptionsCounts, formatType);
    toast.success(`Export ${formatType.toUpperCase()} téléchargé`);
  };

  return (
    <div className="min-h-screen">
      <Header 
        title="Sessions de formation" 
        subtitle="Gérez vos sessions et inscriptions"
      />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* KPI Cards */}
        {sessions && (
          <SessionsKPICards 
            sessions={sessions} 
            inscriptionsCounts={inscriptionsCounts} 
          />
        )}

        {/* View Toggle + Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View mode toggle */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar")}>
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <List className="h-4 w-4" />
                Liste
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-2">
                <CalendarDays className="h-4 w-4" />
                Calendrier
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une session..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-9 input-focus"
            />
          </div>
          
          <SessionsAdvancedFilters
            filters={filters}
            onFiltersChange={setFilters}
            formateurs={formateurs}
            lieux={uniqueLieux}
            formationTypes={uniqueFormationTypes}
          />

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exporter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Export Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle session
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{sortedSessions.length} session{sortedSessions.length > 1 ? 's' : ''}</span>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <SessionCalendar
            sessions={filteredSessions}
            onSessionClick={handleViewDetail}
            onSessionEdit={handleEdit}
          />
        )}

        {/* Table View */}
        {viewMode === "list" && (
          <>
            {error ? (
              <div className="card-elevated p-8 text-center text-destructive">
                Erreur lors du chargement des sessions
              </div>
            ) : (
              <div className="card-elevated overflow-hidden">
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
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                          <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                          <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      sortedSessions.map((session) => (
                        <TableRow key={session.id} className="table-row-hover">
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{session.nom}</p>
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
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {formationLabels[session.formation_type] || session.formation_type}
                            </Badge>
                          </TableCell>
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
                          <TableCell>
                            {(session.adresse_ville || session.lieu) ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span className="text-sm">{session.adresse_ville || session.lieu}</span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <SessionEnrollmentBadge
                              enrolled={inscriptionsCounts[session.id] || 0}
                              total={session.places_totales}
                            />
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statusConfig[session.statut]?.class)}
                            >
                              {statusConfig[session.statut]?.label || session.statut}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetail(session)}
                                title="Voir les détails"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(session)}
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDuplicate(session)}
                                title="Dupliquer"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
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
                                    <AlertDialogAction onClick={() => handleDelete(session.id)}>
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {!isLoading && sortedSessions.length === 0 && (
                  <div className="py-12 text-center text-muted-foreground">
                    Aucune session trouvée
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Form Dialog */}
      <SessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        session={editingSession}
      />

      {/* Detail Sheet */}
      <SessionDetailSheet
        sessionId={detailSessionId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(session) => {
          setDetailOpen(false);
          handleEdit(session);
        }}
      />
    </div>
  );
}
