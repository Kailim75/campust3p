import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileWarning, Download, RefreshCw, CheckSquare, Send, GraduationCap, XCircle, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnrichedContacts, type EnrichedContact } from "@/hooks/useEnrichedContacts";
import { isActiveApprenant, isTerminated, type StatutApprenant } from "@/lib/apprenant-active";
import { useUpdateContact } from "@/hooks/useContacts";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ContactFormDialog as EditContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ProspectFormDialog } from "@/components/prospects/ProspectFormDialog";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { ApprenantsToolbar } from "./ApprenantsToolbar";
import { ApprenantTableRow } from "./ApprenantTableRow";
import { DuplicatesDialog } from "./DuplicatesDialog";
import { differenceInDays } from "date-fns";
import { openWhatsApp } from "@/lib/phone-utils";
import { toast } from "sonner";

// Local storage key for expert mode
const EXPERT_MODE_KEY = "apprenants_expert_mode";

function getInitialExpertMode(): boolean {
  try {
    return localStorage.getItem(EXPERT_MODE_KEY) === "true";
  } catch {
    return false;
  }
}

interface ApprenantsPageProps {
  initialContactId?: string | null;
  onContactOpened?: () => void;
}

export function ApprenantsPage({ initialContactId, onContactOpened }: ApprenantsPageProps = {}) {
  const { data: contacts, isLoading } = useEnrichedContacts();
  const updateContact = useUpdateContact();
  const [search, setSearch] = useState("");
  const [formationFilter, setFormationFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState<"actifs" | "tous" | "inactifs" | "termines">("actifs");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Open contact sheet when initialContactId is provided (e.g. from IA Director)
  useEffect(() => {
    if (initialContactId) {
      setSelectedContactId(initialContactId);
      setDetailOpen(true);
      onContactOpened?.();
    }
  }, [initialContactId, onContactOpened]);
  const [formOpen, setFormOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [expertMode, setExpertMode] = useState(getInitialExpertMode);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [duplicatesOpen, setDuplicatesOpen] = useState(false);

  const toggleExpertMode = useCallback(() => {
    setExpertMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EXPERT_MODE_KEY, String(next));
      } catch {}
      if (!next) setSelectedIds(new Set());
      return next;
    });
  }, []);

  // Compute critical count (for badge) - no extra query
  const criticalCount = useMemo(() => {
    if (!contacts) return 0;
    return contacts.filter((c) => {
      const isRetard = c.paymentStatus === "retard";
      const isDossierIncomplete = c.documentsManquants >= 3;
      const isSessionSoon =
        c.sessionDateDebut &&
        differenceInDays(new Date(c.sessionDateDebut), new Date()) <= 14 &&
        differenceInDays(new Date(c.sessionDateDebut), new Date()) >= 0;
      return isRetard || isDossierIncomplete || isSessionSoon;
    }).length;
  }, [contacts]);

  // Activity counts — uses official statut_apprenant
  const activityCounts = useMemo(() => {
    if (!contacts) return { actifs: 0, inactifs: 0, tous: 0, termines: 0 };
    let actifs = 0;
    let inactifs = 0;
    let termines = 0;
    contacts.forEach(c => {
      if (isTerminated(c as any)) { termines++; return; }
      if (isActiveApprenant(c)) actifs++;
      else inactifs++;
    });
    return { actifs, inactifs, tous: contacts.length, termines };
  }, [contacts]);

  // Bulk status change handler
  const handleBulkStatusChange = useCallback(async (newStatus: StatutApprenant) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const label = { actif: "Actif", diplome: "Diplômé", abandon: "Abandon", archive: "Archivé" }[newStatus];
    try {
      await Promise.all(ids.map(id =>
        updateContact.mutateAsync({ id, updates: { statut_apprenant: newStatus } as any })
      ));
      toast.success(`${ids.length} apprenant(s) marqué(s) "${label}"`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  }, [selectedIds, updateContact]);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      // Activity filter — uses official statut_apprenant
      if (activityFilter === "termines") {
        if (!isTerminated(c as any)) return false;
      } else if (activityFilter === "actifs") {
        if (isTerminated(c as any)) return false;
        if (!isActiveApprenant(c)) return false;
      } else if (activityFilter === "inactifs") {
        if (isTerminated(c as any)) return false;
        if (isActiveApprenant(c)) return false;
      }
      // "tous" shows everything

      // Text search
      const matchesSearch =
        !search ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.telephone?.includes(search);
      const matchesFormation = formationFilter === "all" || c.formation === formationFilter;

      // Quick filters
      let matchesQuick = true;
      if (quickFilter === "retard") matchesQuick = c.paymentStatus === "retard";
      else if (quickFilter === "dossier") matchesQuick = c.documentsManquants >= 3;
      else if (quickFilter === "session14") {
        matchesQuick = !!(
          c.sessionDateDebut &&
          differenceInDays(new Date(c.sessionDateDebut), new Date()) <= 14 &&
          differenceInDays(new Date(c.sessionDateDebut), new Date()) >= 0
        );
      } else if (quickFilter === "critical") {
        const isRetard = c.paymentStatus === "retard";
        const isDossierIncomplete = c.documentsManquants >= 3;
        const isSessionSoon =
          c.sessionDateDebut &&
          differenceInDays(new Date(c.sessionDateDebut), new Date()) <= 14 &&
          differenceInDays(new Date(c.sessionDateDebut), new Date()) >= 0;
        matchesQuick = isRetard || isDossierIncomplete || !!isSessionSoon;
      }

      return matchesSearch && matchesFormation && matchesQuick;
    });
  }, [contacts, search, formationFilter, quickFilter, activityFilter]);

  // Client-side pagination
  const PAGE_SIZE = 30;
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [search, formationFilter, quickFilter, activityFilter]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedFiltered = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const allSelected = paginatedFiltered.length > 0 && paginatedFiltered.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((c) => c.id)));
    }
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const activeCount = contacts?.length || 0;

  return (
    <div className="min-h-screen">
      <Header
        title="Apprenants"
        subtitle={`${activeCount} apprenant${activeCount > 1 ? "s" : ""} actifs`}
        addLabel="Nouvel apprenant"
        onAddClick={() => setFormOpen(true)}
        extraActions={
          <Button variant="outline" size="sm" onClick={() => setProspectFormOpen(true)}>
            Nouveau prospect
          </Button>
        }
      />

      <main className="p-6 space-y-4 animate-fade-in">
        <ApprenantsToolbar
          search={search}
          onSearchChange={setSearch}
          formationFilter={formationFilter}
          onFormationFilterChange={setFormationFilter}
          quickFilter={quickFilter}
          onQuickFilterChange={setQuickFilter}
          activityFilter={activityFilter}
          onActivityFilterChange={setActivityFilter}
          activityCounts={activityCounts}
          expertMode={expertMode}
          onExpertModeToggle={toggleExpertMode}
          filteredCount={filtered.length}
          criticalCount={criticalCount}
          onOpenDuplicates={() => setDuplicatesOpen(true)}
        />

        {/* Bulk actions bar (expert mode) */}
        {expertMode && someSelected && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in slide-in-from-top-2">
            <Badge variant="secondary" className="text-sm font-medium">
              {selectedIds.size} sélectionné{selectedIds.size > 1 ? "s" : ""}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
              Désélectionner
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleBulkStatusChange("diplome")}>
                <GraduationCap className="h-3.5 w-3.5" /> Diplômé
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleBulkStatusChange("abandon")}>
                <XCircle className="h-3.5 w-3.5" /> Abandon
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleBulkStatusChange("archive")}>
                <Archive className="h-3.5 w-3.5" /> Archiver
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => handleBulkStatusChange("actif")}>
                <RefreshCw className="h-3.5 w-3.5" /> Réactiver
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
            </div>
          </div>
        )}

        {/* Critical filter: no results = green badge */}
        {quickFilter === "critical" && filtered.length === 0 && contacts && contacts.length > 0 && (
          <div className="flex items-center justify-center py-6">
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-sm px-4 py-2">
              ✓ Aucun élève critique
            </Badge>
          </div>
        )}

        {/* Table — Desktop */}
        <div className="hidden md:block rounded-xl bg-card border border-border overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                {expertMode && (
                  <TableHead className="w-10 h-11">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                  Apprenant
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                  Formation
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                  Session
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                  Statut
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                  Paiement
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11 w-28">
                  Actions
                </TableHead>
                {expertMode && (
                  <>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                      Dossier
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                      Examen
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                      Progression
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                      Facturé
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                      Payé
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">
                      Reste dû
                    </TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFiltered.map((contact) => (
                <ApprenantTableRow
                  key={contact.id}
                  contact={contact}
                  expertMode={expertMode}
                  selected={selectedIds.has(contact.id)}
                  onSelect={(checked) => toggleSelect(contact.id, checked)}
                  onClick={() => {
                    setSelectedContactId(contact.id);
                    setDetailOpen(true);
                  }}
                />
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={expertMode ? 13 : 7} className="p-0">
                    {quickFilter === "critical" && contacts && contacts.length > 0 ? null : search ? (
                      <EmptyState
                        variant="search"
                        searchQuery={search}
                        onReset={() => setSearch("")}
                      />
                    ) : quickFilter !== "all" || formationFilter !== "all" || activityFilter !== "actifs" ? (
                      <EmptyState
                        variant="filter"
                        description="Aucun apprenant ne correspond à ces filtres. Réinitialisez pour tout afficher."
                        onReset={() => {
                          setQuickFilter("all");
                          setFormationFilter("all");
                          setActivityFilter("actifs");
                        }}
                      />
                    ) : (
                      <EmptyState
                        icon={Users}
                        title="Aucun apprenant"
                        description="Créez votre premier apprenant pour suivre ses formations, documents et paiements."
                        action={{ label: "Créer un apprenant", onClick: () => setFormOpen(true) }}
                        secondaryAction={{
                          label: "Importer depuis Excel",
                          onClick: () => toast.info("L'import Excel sera bientôt disponible."),
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-2 py-3">
            <span className="text-xs text-muted-foreground">
              {filtered.length} résultat{filtered.length > 1 ? "s" : ""} · page {page}/{totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                Précédent
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Suivant
              </Button>
            </div>
          </div>
        )}

        {/* Cards — Mobile */}
        <div className="md:hidden space-y-3">
          {paginatedFiltered.length === 0 && (
            search ? (
              <EmptyState
                variant="search"
                searchQuery={search}
                onReset={() => setSearch("")}
              />
            ) : quickFilter !== "all" || formationFilter !== "all" || activityFilter !== "actifs" ? (
              <EmptyState
                variant="filter"
                description="Aucun apprenant ne correspond à ces filtres."
                onReset={() => {
                  setQuickFilter("all");
                  setFormationFilter("all");
                  setActivityFilter("actifs");
                }}
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Aucun apprenant"
                description="Créez votre premier apprenant pour suivre ses formations, documents et paiements."
                action={{ label: "Créer un apprenant", onClick: () => setFormOpen(true) }}
                secondaryAction={{
                  label: "Importer depuis Excel",
                  onClick: () => toast.info("L'import Excel sera bientôt disponible."),
                }}
              />
            )
          )}
          {paginatedFiltered.map((contact) => {
            const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
            const formationClass = contact.formation
              ? { TAXI: "badge-soft badge-soft-blue", VTC: "badge-soft badge-soft-gray", VMDTR: "badge-soft badge-soft-teal" }[contact.formation] || "badge-soft badge-soft-gray"
              : "";
            const payLabel = (() => {
              if (contact.totalFacture <= 0) return { text: "Non facturé", cls: "text-muted-foreground" };
              if (contact.totalPaye >= contact.totalFacture) return { text: "Soldé", cls: "text-success" };
              if (contact.totalPaye > 0) return { text: `Partiel · ${contact.totalFacture - contact.totalPaye}€`, cls: "text-warning" };
              if (contact.paymentStatus === "retard") return { text: `Impayé · ${contact.totalFacture}€`, cls: "text-destructive" };
              return { text: `En attente · ${contact.totalFacture}€`, cls: "text-muted-foreground" };
            })();
            return (
              <Card
                key={contact.id}
                className="p-4 cursor-pointer hover:shadow-soft transition-shadow active:scale-[0.99] rounded-xl"
                onClick={() => {
                  setSelectedContactId(contact.id);
                  setDetailOpen(true);
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="text-xs font-semibold bg-primary/8 text-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {contact.prenom} {contact.nom}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.sessionName || contact.email || contact.telephone || "—"}
                    </p>
                  </div>
                  <span className={cn("text-xs font-medium", payLabel.cls)}>
                    {payLabel.text}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {contact.formation && <span className={formationClass}>{contact.formation}</span>}
                  <span className={
                    contact.paymentStatus === "retard"
                      ? "badge-soft badge-soft-red"
                      : "badge-soft badge-soft-gray"
                  }>
                    {contact.statut === "Abandonné" ? "Abandon" : contact.statut === "Client" || contact.statut === "Bravo" ? "Diplômé" : "En formation"}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </main>

      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(contact) => {
          setEditContact(contact);
          setDetailOpen(false);
        }}
      />
      <ContactFormDialog open={formOpen} onOpenChange={setFormOpen} />
      <ProspectFormDialog open={prospectFormOpen} onOpenChange={setProspectFormOpen} />
      {editContact && (
        <EditContactFormDialog
          open={!!editContact}
          onOpenChange={(open) => { if (!open) setEditContact(null); }}
          contact={editContact}
        />
      )}
      <DuplicatesDialog open={duplicatesOpen} onOpenChange={setDuplicatesOpen} />
    </div>
  );
}
