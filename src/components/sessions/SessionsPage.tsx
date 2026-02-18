import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Plus, List, CalendarDays, Download, Kanban, Archive } from "lucide-react";
import { useSessions, useDeleteSession, useAllSessionInscriptionsCounts, useCreateSession, type Session } from "@/hooks/useSessions";
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useAutoUpdateSessionStatus } from "@/hooks/useAutoUpdateSessionStatus";
import { useSessionsViewPreferences } from "@/hooks/useSessionsViewPreferences";
import { useSessionsExport } from "@/hooks/useSessionsExport";
import { parseISO, isAfter, isBefore } from "date-fns";
import { SessionFormDialog } from "./SessionFormDialog";
import { SessionDetailSheet } from "./SessionDetailSheet";
import { SessionCalendar } from "./SessionCalendar";
import { SessionsKPICards } from "./SessionsKPICards";
import { SessionsAdvancedFilters, type SessionFilters } from "./SessionsAdvancedFilters";
import { SessionsGroupedTable } from "./SessionsGroupedTable";
import { SessionsKanban } from "./SessionsKanban";
import { ArchivedSessionsSheet } from "./ArchivedSessionsSheet";
import { toast } from "sonner";

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sessions, isLoading, error } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const { data: formateurs = [] } = useFormateursTable();
  const deleteSession = useDeleteSession();
  const createSession = useCreateSession();
  const { updateSessionStatuses } = useAutoUpdateSessionStatus();
  const { exportSessions } = useSessionsExport();
  const { viewMode, groupBy, setViewMode, setGroupBy } = useSessionsViewPreferences();
  const [filters, setFilters] = useState<SessionFilters>({
    search: "",
    status: "all",
    formationType: "all",
    formateurId: "all",
    lieu: "all",
    dateStart: "",
    dateEnd: "",
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

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
    exportSessions(filteredSessions, inscriptionsCounts, formatType);
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

        {/* Toolbar */}
        <div className="space-y-3">
          {/* Row 1: View toggle + Search + Primary action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "list" | "calendar" | "kanban")}>
              <TabsList>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">Liste</span>
                </TabsTrigger>
                <TabsTrigger value="kanban" className="gap-2">
                  <Kanban className="h-4 w-4" />
                  <span className="hidden sm:inline">Kanban</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendrier</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une session..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 input-focus"
              />
            </div>

            <div className="flex items-center gap-2">
              <SessionsAdvancedFilters
                filters={filters}
                onFiltersChange={setFilters}
                formateurs={formateurs}
                lieux={uniqueLieux}
                formationTypes={uniqueFormationTypes}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Download className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                    Export Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport('csv')}>
                    Export CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="outline" size="icon" className="shrink-0" onClick={() => setArchivedOpen(true)}>
                <Archive className="h-4 w-4" />
              </Button>

              <Button onClick={handleAddNew} className="shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouvelle session</span>
                <span className="sm:hidden">Nouveau</span>
              </Button>
            </div>
          </div>

          {/* Result count */}
          <div className="text-sm text-muted-foreground">
            {filteredSessions.length} session{filteredSessions.length > 1 ? 's' : ''}
            {filters.search || filters.status !== "all" || filters.formationType !== "all" || filters.formateurId !== "all" || filters.lieu !== "all" || filters.dateStart || filters.dateEnd
              ? ` (filtrée${filteredSessions.length > 1 ? 's' : ''} sur ${sessions?.length || 0})`
              : ''
            }
          </div>
        </div>

        {/* Calendar View */}
        {viewMode === "calendar" && (
          <SessionCalendar
            sessions={filteredSessions}
            onSessionClick={handleViewDetail}
            onSessionEdit={handleEdit}
          />
        )}

        {/* Kanban View */}
        {viewMode === "kanban" && (
          <SessionsKanban
            sessions={filteredSessions}
            inscriptionsCounts={inscriptionsCounts}
            isLoading={isLoading}
            onViewDetail={handleViewDetail}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
          />
        )}

        {/* Table View with Grouping */}
        {viewMode === "list" && (
          <>
            {error ? (
              <div className="card-elevated p-8 text-center text-destructive">
                Erreur lors du chargement des sessions
              </div>
            ) : (
              <SessionsGroupedTable
                sessions={filteredSessions}
                inscriptionsCounts={inscriptionsCounts}
                isLoading={isLoading}
                groupBy={groupBy}
                onGroupByChange={setGroupBy}
                onViewDetail={handleViewDetail}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
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

      {/* Archived Sessions Sheet */}
      <ArchivedSessionsSheet
        open={archivedOpen}
        onOpenChange={setArchivedOpen}
      />
    </div>
  );
}
