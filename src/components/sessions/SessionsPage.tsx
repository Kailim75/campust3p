import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useSessions, useAllSessionInscriptionsCounts, useCreateSession, type Session } from "@/hooks/useSessions";
import { useSoftDeleteWithUndo } from "@/hooks/useUndoableAction";
import { useReconcileFactures } from "@/hooks/useReconcileFactures";
import { useFormateursTable } from "@/hooks/useFormateurs";
import { useAutoUpdateSessionStatus } from "@/hooks/useAutoUpdateSessionStatus";
import { useSessionsViewPreferences } from "@/hooks/useSessionsViewPreferences";
import { useSessionsExport } from "@/hooks/useSessionsExport";
import { useSessionFinancials } from "@/hooks/useSessionFinancials";
import { useSessionsFilters, defaultFilters, type SessionFilters } from "@/hooks/useSessionsFilters";
import { SessionFormDialog } from "./SessionFormDialog";
import { SessionDetailSheet } from "./SessionDetailSheet";
import { SessionCalendar } from "./SessionCalendar";
import { SessionsKPICards } from "./SessionsKPICards";
import { SessionsGroupedTable } from "./SessionsGroupedTable";
import { SessionsKanban } from "./SessionsKanban";
import { SessionsToolbar } from "./SessionsToolbar";
import { ArchivedSessionsSheet } from "./ArchivedSessionsSheet";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { BookOpen } from "lucide-react";
import { toast } from "sonner";

export function SessionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: sessions, isLoading, error } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const { data: financials = {} } = useSessionFinancials();
  const { data: formateurs = [] } = useFormateursTable();
  const softDelete = useSoftDeleteWithUndo();
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
  }, [sessions?.length]);

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

  const handleAddNew = () => { setEditingSession(null); setFormOpen(true); };
  const handleEdit = (session: Session) => { setEditingSession(session); setFormOpen(true); };
  const handleViewDetail = (session: Session) => { setDetailSessionId(session.id); setDetailOpen(true); };

  const handleDelete = async (id: string) => {
    const session = sessions?.find(s => s.id === id);
    await softDelete({
      table: "sessions",
      id,
      message: session ? `Session « ${session.nom} » supprimée` : "Session supprimée",
    });
  };

  const handleDuplicate = async (session: Session) => {
    try {
      const { id, created_at, updated_at, numero_session, ...sessionData } = session as any;
      await createSession.mutateAsync({ ...sessionData, nom: `${session.nom} (copie)`, statut: 'a_venir' });
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
            try { localStorage.setItem('sessions-profitability', String(v)); } catch {}
          }}
          onExport={handleExport}
          onReconcile={() => reconcileFactures.mutate()}
          isReconciling={reconcileFactures.isPending}
          onArchiveOpen={() => setArchivedOpen(true)}
          onAddNew={handleAddNew}
          totalCount={sessions?.length || 0}
          filteredCount={filteredSessions.length}
          hasActiveFilters={hasActiveFilters}
        />

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

      <SessionFormDialog open={formOpen} onOpenChange={setFormOpen} session={editingSession} />
      <SessionDetailSheet
        sessionId={detailSessionId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(session) => { setDetailOpen(false); handleEdit(session); }}
      />
      <ArchivedSessionsSheet open={archivedOpen} onOpenChange={setArchivedOpen} />
    </div>
  );
}
