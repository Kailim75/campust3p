import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Filter, Phone, Mail, MessageCircle, Plus, UserPlus, Download, FileText, Users } from "lucide-react";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { useContacts, useContactsPaginated, type Contact } from "@/hooks/useContacts";
import { useDebounce } from "@/hooks/useDebounce";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ContactFormDialog } from "./ContactFormDialog";
import { QuickStatusDropdown } from "./QuickStatusDropdown";
import { QuickEnrollDialog } from "./QuickEnrollDialog";
import { BulkActionsBar } from "./BulkActionsBar";
import { BulkEnrollDialog } from "./BulkEnrollDialog";
import { BulkSendDocumentsDialog } from "./BulkSendDocumentsDialog";
import { ContactMobileCard } from "./ContactMobileCard";
import { CallLogDialog } from "./CallLogDialog";
import { useExportData } from "@/hooks/useExportData";
import { useIsMobile } from "@/hooks/use-mobile";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { EmptyState } from "@/components/ui/empty-state";

const statusConfig = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info border-info/20" },
  "Client": { label: "Client", class: "bg-success/10 text-success border-success/20" },
  "Bravo": { label: "Bravo", class: "bg-warning/10 text-warning border-warning/20" },
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

export function ContactsTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // Debounce search for server queries
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, statusFilter, formationFilter]);
  
  // Server-side paginated query
  const { data: paginatedResult, isLoading, error } = useContactsPaginated({
    page: currentPage,
    pageSize,
    search: debouncedSearch,
    statusFilter,
    formationFilter,
  });

  // Keep full contacts list for formation filter options & exports
  const { data: allContacts } = useContacts();

  const contacts = paginatedResult?.data ?? [];
  const totalCount = paginatedResult?.totalCount ?? 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = totalCount > 0 ? (currentPage - 1) * pageSize + 1 : 0;
  const endIndex = Math.min(currentPage * pageSize, totalCount);
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [enrollContact, setEnrollContact] = useState<Contact | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);
  
  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEnrollOpen, setBulkEnrollOpen] = useState(false);
  const [bulkSendDocsOpen, setBulkSendDocsOpen] = useState(false);
  const { composerProps, openComposer } = useEmailComposer();
  
  // Call log state
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [callLogContact, setCallLogContact] = useState<Contact | null>(null);
  
  const { exportFilteredContacts, exportContacts } = useExportData();
  const isMobile = useIsMobile();

  const handleCallClick = (contact: Contact) => {
    if (contact.telephone) {
      window.open(`tel:${contact.telephone}`, '_blank');
      setCallLogContact(contact);
      setCallLogOpen(true);
    }
  };

  // Handle URL parameter to open contact detail
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setSelectedContactId(idFromUrl);
      setDetailOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const formations = [...new Set(allContacts?.map((c) => c.formation).filter(Boolean) ?? [])];

  // Get selected contacts for bulk operations
  const selectedContacts = useMemo(() => {
    return contacts.filter((c) => selectedIds.has(c.id));
  }, [contacts, selectedIds]);

  // Check if all visible contacts are selected
  const allSelected = contacts.length > 0 && contacts.every((c) => selectedIds.has(c.id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all paginated items
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (contactId: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(contactId);
    } else {
      newSet.delete(contactId);
    }
    setSelectedIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleContactClick = (contact: Contact) => {
    setSelectedContactId(contact.id);
    setDetailOpen(true);
  };

  const handleEditFromDetail = (contact: Contact) => {
    setDetailOpen(false);
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleAddNew = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleEnrollClick = (contact: Contact) => {
    setEnrollContact(contact);
    setEnrollOpen(true);
  };

  if (error) {
    return (
      <div className="card-elevated p-8 text-center text-destructive">
        Erreur lors du chargement des contacts
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 input-focus"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-44">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="En attente de validation">En attente</SelectItem>
              <SelectItem value="Client">Client</SelectItem>
              <SelectItem value="Bravo">Bravo</SelectItem>
            </SelectContent>
          </Select>

          <Select value={formationFilter} onValueChange={setFormationFilter}>
            <SelectTrigger className="w-full sm:w-52">
              <SelectValue placeholder="Formation" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les formations</SelectItem>
              {formations.map((f) => (
                <SelectItem key={f} value={f!}>
                  {formationLabels[f!] || f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportFilteredContacts(contacts)}>
                <FileText className="h-4 w-4 mr-2" />
                Exporter cette page ({contacts.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportContacts()}>
                <FileText className="h-4 w-4 mr-2" />
                Exporter tous les contacts
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{totalCount} contact{totalCount > 1 ? 's' : ''}</span>
        </div>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedContacts={selectedContacts}
          onClearSelection={handleClearSelection}
          onBulkEnroll={() => setBulkEnrollOpen(true)}
          onBulkSendDocuments={() => setBulkSendDocsOpen(true)}
        />

        {/* Table / Cards */}
        {isMobile ? (
          // Mobile: Card view
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card-elevated p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                </div>
              ))
            ) : totalCount === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucun contact trouvé"
                description="Modifiez vos filtres ou ajoutez un nouveau contact"
              />
            ) : (
              <>
                {contacts.map((contact) => (
                  <ContactMobileCard
                    key={contact.id}
                    contact={contact}
                    onClick={() => handleContactClick(contact)}
                    onEnroll={() => handleEnrollClick(contact)}
                    onCall={() => handleCallClick(contact)}
                    onEmail={contact.email ? () => openComposer({
                      recipients: [{ id: contact.id, email: contact.email!, prenom: contact.prenom, nom: contact.nom }],
                      defaultSubject: "",
                      defaultBody: `Bonjour ${contact.prenom},\n\n\n\nCordialement,\nT3P Campus`,
                    }) : undefined}
                    isSelected={selectedIds.has(contact.id)}
                  />
                ))}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  startIndex={startIndex}
                  endIndex={endIndex}
                  pageSize={pageSize}
                  hasNextPage={(currentPage < totalPages)}
                  hasPreviousPage={(currentPage > 1)}
                  onNextPage={(() => setCurrentPage(p => Math.min(p + 1, totalPages)))}
                  onPreviousPage={(() => setCurrentPage(p => Math.max(p - 1, 1)))}
                  onGoToPage={((p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages))))}
                  onPageSizeChange={((s: number) => { setPageSize(s); setCurrentPage(1); })}
                />
              </>
            )}
          </div>
        ) : (
          // Desktop: Table view
          <div className="card-elevated overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Sélectionner tout"
                      className={someSelected ? "data-[state=checked]:bg-primary/50" : ""}
                    />
                  </TableHead>
                  <TableHead className="font-semibold">ID</TableHead>
                  <TableHead className="font-semibold">Contact</TableHead>
                  <TableHead className="font-semibold">Téléphone</TableHead>
                  <TableHead className="font-semibold">Ville</TableHead>
                  <TableHead className="font-semibold">Formation</TableHead>
                  <TableHead className="font-semibold">Source</TableHead>
                  <TableHead className="font-semibold">Statut</TableHead>
                  <TableHead className="font-semibold">Date</TableHead>
                  <TableHead className="text-right font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 rounded-full" />
                          <div className="space-y-1">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-28 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : (
                  contacts.map((contact) => {
                    const initials = `${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase();
                    const status = contact.statut ?? "En attente de validation";
                    const isSelected = selectedIds.has(contact.id);
                    
                    return (
                      <TableRow key={contact.id} className={cn("table-row-hover cursor-pointer", isSelected && "bg-primary/5")}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                            aria-label={`Sélectionner ${contact.prenom} ${contact.nom}`}
                          />
                        </TableCell>
                        <TableCell 
                          className="text-muted-foreground font-mono text-xs"
                          onClick={() => handleContactClick(contact)}
                        >
                          {contact.custom_id || '-'}
                        </TableCell>
                        <TableCell onClick={() => handleContactClick(contact)}>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                                {initials || '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-foreground hover:text-primary transition-colors">
                                {contact.civilite ? `${contact.civilite} ` : ''}{contact.prenom} {contact.nom}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {contact.email || 'Pas d\'email'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground" onClick={() => handleContactClick(contact)}>
                          {contact.telephone || '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground" onClick={() => handleContactClick(contact)}>
                          {contact.ville || '-'}
                        </TableCell>
                        <TableCell onClick={() => handleContactClick(contact)}>
                          {contact.formation ? (
                            <Badge variant="outline" className="text-xs">
                              {formationLabels[contact.formation] || contact.formation}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground" onClick={() => handleContactClick(contact)}>
                          {contact.source || '-'}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <QuickStatusDropdown contact={contact} />
                        </TableCell>
                        <TableCell className="text-muted-foreground" onClick={() => handleContactClick(contact)}>
                          {format(new Date(contact.created_at), 'dd/MM/yyyy', { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title="Inscrire à une session"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEnrollClick(contact);
                              }}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                            {contact.telephone && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCallClick(contact);
                                }}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            )}
                            {contact.email && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openComposer({
                                    recipients: [{ id: contact.id, email: contact.email!, prenom: contact.prenom, nom: contact.nom }],
                                    defaultSubject: "",
                                    defaultBody: `Bonjour ${contact.prenom},\n\n\n\nCordialement,\nT3P Campus`,
                                  });
                                }}
                              >
                                <Mail className="h-4 w-4" />
                              </Button>
                            )}
                            {contact.telephone && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openWhatsApp(contact.telephone);
                                }}
                              >
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {!isLoading && totalCount === 0 ? (
              <EmptyState
                icon={Users}
                title="Aucun contact trouvé"
                description="Modifiez vos filtres ou ajoutez un nouveau contact"
                className="py-12"
              />
            ) : !isLoading && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                startIndex={startIndex}
                endIndex={endIndex}
                pageSize={pageSize}
                hasNextPage={(currentPage < totalPages)}
                hasPreviousPage={(currentPage > 1)}
                onNextPage={(() => setCurrentPage(p => Math.min(p + 1, totalPages)))}
                onPreviousPage={(() => setCurrentPage(p => Math.max(p - 1, 1)))}
                onGoToPage={((p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages))))}
                onPageSizeChange={((s: number) => { setPageSize(s); setCurrentPage(1); })}
                className="px-4 border-t"
              />
            )}
          </div>
        )}
      </div>

      {/* Detail Sheet */}
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={handleEditFromDetail}
      />

      {/* Form Dialog */}
      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
      />

      {/* Quick Enroll Dialog */}
      <QuickEnrollDialog
        contact={enrollContact}
        open={enrollOpen}
        onOpenChange={setEnrollOpen}
      />

      {/* Bulk Enroll Dialog */}
      <BulkEnrollDialog
        open={bulkEnrollOpen}
        onOpenChange={setBulkEnrollOpen}
        selectedContacts={selectedContacts}
        onSuccess={handleClearSelection}
      />

      {/* Bulk Send Documents Dialog */}
      <BulkSendDocumentsDialog
        open={bulkSendDocsOpen}
        onOpenChange={setBulkSendDocsOpen}
        selectedContacts={selectedContacts}
        onSuccess={handleClearSelection}
      />

      {/* Call Log Dialog */}
      {callLogContact && (
        <CallLogDialog
          contactId={callLogContact.id}
          contactName={`${callLogContact.prenom} ${callLogContact.nom}`}
          phoneNumber={callLogContact.telephone || ""}
          open={callLogOpen}
          onOpenChange={setCallLogOpen}
        />
      )}
      <EmailComposerModal {...composerProps} />
    </>
  );
}
