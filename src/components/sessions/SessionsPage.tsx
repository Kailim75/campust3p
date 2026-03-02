import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { useSessions, useDeleteSession, useAllSessionInscriptionsCounts, useCreateSession, type Session } from "@/hooks/useSessions";
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
import { toast } from "sonner";

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
    try { await deleteSession.mutateAsync(id); toast.success("Session supprimée"); }
    catch { toast.error("Erreur lors de la suppression"); }
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

      <main className="p-6 space-y-6 animate-fade-in">
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
          <div className="card-elevated p-12 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <svg className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Aucune session créée</h3>
              <p className="text-sm text-muted-foreground mt-1">Créez votre première session de formation pour commencer à gérer vos inscriptions.</p>
            </div>
            <button onClick={handleAddNew} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Créer ma première session
            </button>
          </div>
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
