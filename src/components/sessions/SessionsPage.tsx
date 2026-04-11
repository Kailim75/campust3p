import { lazy, Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useSessions, useDeleteSession, useAllSessionInscriptionsCounts, useCreateSession, type Session, type SessionInsert } from "@/hooks/useSessions";
import { useReconcileFactures } from "@/hooks/useReconcileFactures";
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useAutoUpdateSessionStatus } from "@/hooks/useAutoUpdateSessionStatus";
import { useSessionsViewPreferences } from "@/hooks/useSessionsViewPreferences";
import { useSessionsExport } from "@/hooks/useSessionsExport";
import { useSessionFinancials } from "@/hooks/useSessionFinancials";
import { useSessionsFilters, defaultFilters, type SessionFilters } from "@/hooks/useSessionsFilters";
import { SessionsKPICards } from "./SessionsKPICards";
import { SessionsToolbar } from "./SessionsToolbar";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SessionFormDialog = lazy(() =>
  import("./SessionFormDialog").then((m) => ({ default: m.SessionFormDialog }))
);
const SessionDetailSheet = lazy(() =>
  import("./SessionDetailSheet").then((m) => ({ default: m.SessionDetailSheet }))
);
const SessionCalendar = lazy(() =>
  import("./SessionCalendar").then((m) => ({ default: m.SessionCalendar }))
);
const SessionsGroupedTable = lazy(() =>
  import("./SessionsGroupedTable").then((m) => ({ default: m.SessionsGroupedTable }))
);
const SessionsKanban = lazy(() =>
  import("./SessionsKanban").then((m) => ({ default: m.SessionsKanban }))
);
const ArchivedSessionsSheet = lazy(() =>
  import("./ArchivedSessionsSheet").then((m) => ({ default: m.ArchivedSessionsSheet }))
);

function SessionsFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );
}

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sessions, isLoading, error } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const { data: financials = {} } = useSessionFinancials();
  const { data: formateurs = [] } = useFormateursTable();
  const deleteSession = useDeleteSession();
  const createSession = useCreateSession();
  const reconcileFactures = useReconcileFactures();
  const { updateSessionStatuses } = useAutoUpdateSessionStatus();
  const { exportSessions } = useSessionsExport();
  const { viewMode, groupBy, setViewMode, setGroupBy } = useSessionsViewPreferences();
  const [showProfitability, setShowProfitability] = useState(() => {
    try { return localStorage.getItem('sessions-profitability') === 'true'; } catch { return false; }
  });
  const [filters, setFilters] = useState<SessionFilters>(defaultFilters);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [detailSessionId, setDetailSessionId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);

  const { filteredSessions, hasActiveFilters } = useSessionsFilters(sessions, filters, inscriptionsCounts);

  useEffect(() => {
    if (sessions && sessions.length > 0) {
      updateSessionStatuses.mutate(sessions);
    }
  }, [sessions, updateSessionStatuses]);

  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setDetailSessionId(idFromUrl);
      setDetailOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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

  const upcomingSessionsCount = useMemo(
    () => sessions?.filter((session) => session.statut === "a_venir" || session.statut === "en_cours").length || 0,
    [sessions],
  );

  const criticalSessionsCount = useMemo(() => {
    if (!sessions) return 0;
    return sessions.filter((session) => {
      if (session.statut !== "a_venir") return false;
      const daysUntil = Math.ceil((new Date(session.date_debut).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil > 14 || daysUntil < 0) return false;
      const inscrits = inscriptionsCounts[session.id] || 0;
      const fillRate = session.places_totales > 0 ? inscrits / session.places_totales : 0;
      return fillRate < 0.5;
    }).length;
  }, [inscriptionsCounts, sessions]);

  const toolbarSummary = useMemo(() => {
    const parts = [
      `${filteredSessions.length} session${filteredSessions.length > 1 ? "s" : ""} visible${filteredSessions.length > 1 ? "s" : ""}`,
      `${upcomingSessionsCount} ouverte${upcomingSessionsCount > 1 ? "s" : ""}`,
    ];

    if (criticalSessionsCount > 0) {
      parts.push(`${criticalSessionsCount} critique${criticalSessionsCount > 1 ? "s" : ""}`);
    }

    if (hasActiveFilters) {
      parts.push(`filtres actifs sur ${sessions?.length || 0}`);
    }

    return parts.join(" · ");
  }, [criticalSessionsCount, filteredSessions.length, hasActiveFilters, sessions?.length, upcomingSessionsCount]);

  const handleAddNew = () => { setEditingSession(null); setFormOpen(true); };
  const handleEdit = (session: Session) => { setEditingSession(session); setFormOpen(true); };
  const handleViewDetail = (session: Session) => { setDetailSessionId(session.id); setDetailOpen(true); };

  const handleDelete = async (id: string) => {
    try { await deleteSession.mutateAsync({ id }); toast.success("Session envoyée à la corbeille"); }
    catch { toast.error("Erreur lors de la suppression"); }
  };

  const handleDuplicate = async (session: Session) => {
    try {
      const {
        id: _id,
        created_at: _createdAt,
        updated_at: _updatedAt,
        numero_session: _numeroSession,
        ...sessionData
      } = session;
      const duplicatedSession: SessionInsert = {
        ...sessionData,
        nom: `${session.nom} (copie)`,
        statut: "a_venir",
      };
      await createSession.mutateAsync(duplicatedSession);
      toast.success("Session dupliquée avec succès");
    } catch { toast.error("Erreur lors de la duplication"); }
  };

  const handleExport = (formatType: 'xlsx' | 'csv') => {
    exportSessions(filteredSessions, inscriptionsCounts, formatType);
    toast.success(`Export ${formatType.toUpperCase()} téléchargé`);
  };

  const handleToggleCriticalFilter = () => {
    setFilters(prev => ({ ...prev, criticalOnly: !prev.criticalOnly }));
  };

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  return (
    <div className="min-h-screen">
      <Header title="Sessions de formation" subtitle="Gérez vos sessions et inscriptions" />

      <main className="p-3 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
        {sessions && (
          <SessionsKPICards
            sessions={sessions}
            inscriptionsCounts={inscriptionsCounts}
            financials={financials}
            criticalOnly={filters.criticalOnly}
            onToggleCritical={handleToggleCriticalFilter}
          />
        )}

        <SessionsToolbar
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          filters={filters}
          onFiltersChange={setFilters}
          formateurs={formateurs}
          lieux={uniqueLieux}
          formationTypes={uniqueFormationTypes}
          showProfitability={showProfitability}
          onShowProfitabilityChange={(v) => {
            setShowProfitability(v);
            try { localStorage.setItem('sessions-profitability', String(v)); } catch { /* ignore storage errors */ }
          }}
          onExport={handleExport}
          onReconcile={() => reconcileFactures.mutate()}
          isReconciling={reconcileFactures.isPending}
          onArchiveOpen={() => setArchivedOpen(true)}
          onAddNew={handleAddNew}
          totalCount={sessions?.length || 0}
          filteredCount={filteredSessions.length}
          hasActiveFilters={hasActiveFilters}
          onResetFilters={handleResetFilters}
          summaryLine={toolbarSummary}
        />

        <Suspense fallback={<SessionsFallback />}>
          {viewMode === "calendar" && (
            <SessionCalendar sessions={filteredSessions} onSessionClick={handleViewDetail} onSessionEdit={handleEdit} />
          )}

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

          {viewMode === "list" && (
            <>
              {error ? (
                <div className="card-elevated p-8 text-center text-destructive">Erreur lors du chargement des sessions</div>
              ) : (
                <SessionsGroupedTable
                  sessions={filteredSessions}
                  inscriptionsCounts={inscriptionsCounts}
                  financials={financials}
                  showProfitability={showProfitability}
                  isLoading={isLoading}
                  groupBy={groupBy}
                  activeSessionId={detailOpen ? detailSessionId : null}
                  onGroupByChange={setGroupBy}
                  onViewDetail={handleViewDetail}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                />
              )}
            </>
          )}
        </Suspense>

        {/* État vide engageant */}
        {!isLoading && sessions && sessions.length === 0 && (
          <EmptyState
            icon={BookOpen}
            title="Aucune session créée"
            description="Créez votre première session de formation pour commencer à gérer vos inscriptions."
            action={
              <EmptyStateAction
                label="Créer ma première session"
                onClick={handleAddNew}
              />
            }
          />
        )}
      </main>

      {formOpen && (
        <Suspense fallback={null}>
          <SessionFormDialog open={formOpen} onOpenChange={setFormOpen} session={editingSession} />
        </Suspense>
      )}
      {detailOpen && (
        <Suspense fallback={null}>
          <SessionDetailSheet
            sessionId={detailSessionId}
            open={detailOpen}
            onOpenChange={setDetailOpen}
            onEdit={(session) => { setDetailOpen(false); handleEdit(session); }}
          />
        </Suspense>
      )}
      {archivedOpen && (
        <Suspense fallback={null}>
          <ArchivedSessionsSheet open={archivedOpen} onOpenChange={setArchivedOpen} />
        </Suspense>
      )}
    </div>
  );
}
