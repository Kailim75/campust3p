import { useState, useMemo, useCallback, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, FileWarning, Download, RefreshCw, CheckSquare, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEnrichedContacts, type EnrichedContact } from "@/hooks/useEnrichedContacts";
import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";
import { ContactFormDialog as EditContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";
import { ProspectFormDialog } from "@/components/prospects/ProspectFormDialog";
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { ApprenantsToolbar } from "./ApprenantsToolbar";
import { ApprenantTableRow } from "./ApprenantTableRow";
import { differenceInDays } from "date-fns";
import { openWhatsApp } from "@/lib/phone-utils";

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
  const [search, setSearch] = useState("");
  const [formationFilter, setFormationFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
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

  const filtered = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
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
  }, [contacts, search, formationFilter, quickFilter]);

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.has(c.id));
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
          expertMode={expertMode}
          onExpertModeToggle={toggleExpertMode}
          filteredCount={filtered.length}
          criticalCount={criticalCount}
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
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Changer statut
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Send className="h-3.5 w-3.5" /> Envoyer relance
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button variant="outline" size="sm" className="text-xs gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /> Dossier complet
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
              {filtered.map((contact) => (
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
                    {quickFilter === "critical" && contacts && contacts.length > 0 ? null : (
                      <EmptyState
                        icon={search || quickFilter !== "all" ? FileWarning : Users}
                        title={search || quickFilter !== "all" ? "Aucun résultat" : "Aucun apprenant"}
                        description={
                          search || quickFilter !== "all"
                            ? "Essayez avec d'autres critères."
                            : "Aucun apprenant enregistré."
                        }
                        action={
                          !search && quickFilter === "all" ? (
                            <EmptyStateAction label="Nouvel apprenant" onClick={() => setFormOpen(true)} />
                          ) : undefined
                        }
                        variant="minimal"
                      />
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Cards — Mobile */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 && (
            <EmptyState
              icon={search || quickFilter !== "all" ? FileWarning : Users}
              title={search || quickFilter !== "all" ? "Aucun résultat" : "Aucun apprenant"}
              description={
                search || quickFilter !== "all"
                  ? "Essayez avec d'autres critères."
                  : "Aucun apprenant enregistré."
              }
              action={
                !search && quickFilter === "all" ? (
                  <EmptyStateAction label="Nouvel apprenant" onClick={() => setFormOpen(true)} />
                ) : undefined
              }
              variant="minimal"
            />
          )}
          {filtered.map((contact) => {
            const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
            const formationClass = contact.formation
              ? { TAXI: "badge-soft badge-soft-blue", VTC: "badge-soft badge-soft-gray", VMDTR: "badge-soft badge-soft-teal" }[contact.formation] || "badge-soft badge-soft-gray"
              : "";
            const payLabel = contact.totalFacture > 0 ? `${contact.totalPaye}€/${contact.totalFacture}€` : null;
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
                  {payLabel && (
                    <span className={cn("text-xs font-mono", {
                      "text-emerald-600": contact.paymentStatus === "paye",
                      "text-amber-600": contact.paymentStatus === "partiel",
                      "text-destructive": contact.paymentStatus === "retard",
                      "text-muted-foreground": contact.paymentStatus === "attente",
                    })}>
                      {payLabel}
                    </span>
                  )}
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

      <ContactDetailSheet
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
    </div>
  );
}
