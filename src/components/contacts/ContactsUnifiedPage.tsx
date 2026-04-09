import { useState, useMemo, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { PageHeader } from "@/components/layout/PageHeader";
import { useNavigation } from "@/contexts/NavigationContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Search, 
  Users, 
  Filter, 
  LayoutList, 
  Kanban, 
  UserPlus, 
  Plus,
  BarChart3,
  Trash2,
  X,
  Eye,
  SquareUser
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { useContacts, useUpdateContact, Contact } from "@/hooks/useContacts";
import { useProspects, useDeleteProspect, useConvertProspect, useProspectsStats, type Prospect } from "@/hooks/useProspects";
import { ContactsTable } from "./ContactsTable";
import { ContactFormDialog } from "./ContactFormDialog";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ProspectFormDialog } from "@/components/prospects/ProspectFormDialog";
import { ProspectsDashboard } from "@/components/prospects/ProspectsDashboard";
import { ProspectDetailSheet } from "@/components/prospects/ProspectDetailSheet";
import { BulkChevaletDialog } from "@/components/chevalets/BulkChevaletDialog";

// Pipeline column configuration for contacts (stagiaires)
const PIPELINE_COLUMNS = [
  { id: "inscription", label: "Inscription", statut: "En attente de validation", color: "bg-slate-500" },
  { id: "formation_theorique", label: "Formation Théorique", statut: "En formation théorique", color: "bg-blue-500" },
  { id: "examen_theorique", label: "Examen T3P Programmé", statut: "Examen T3P programmé", color: "bg-indigo-500" },
  { id: "t3p_obtenu", label: "T3P Obtenu", statut: "T3P obtenu", color: "bg-purple-500" },
  { id: "formation_pratique", label: "Formation Pratique", statut: "En formation pratique", color: "bg-cyan-500" },
  { id: "examen_pratique", label: "Examen Pratique Programmé", statut: "Examen pratique programmé", color: "bg-teal-500" },
  { id: "carte_pro", label: "Diplômé / Carte Pro", statut: "Bravo", color: "bg-green-500" },
  { id: "abandonne", label: "Abandonné", statut: "Abandonné", color: "bg-red-500" },
];

const STATUT_TO_COLUMN: Record<string, string> = {
  "En attente de validation": "inscription",
  "En formation théorique": "formation_theorique",
  "Examen T3P programmé": "examen_theorique",
  "T3P obtenu": "t3p_obtenu",
  "En formation pratique": "formation_pratique",
  "Examen pratique programmé": "examen_pratique",
  "Client": "carte_pro",
  "Bravo": "carte_pro",
  "Abandonné": "abandonne",
};

const FORMATION_BADGES: Record<string, { label: string; className: string }> = {
  "TAXI": { label: "Taxi", className: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30" },
  "VTC": { label: "VTC", className: "bg-blue-500/20 text-blue-700 border-blue-500/30" },
  "VMDTR": { label: "VMDTR", className: "bg-purple-500/20 text-purple-700 border-purple-500/30" },
  "ACC VTC": { label: "ACC VTC", className: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  "ACC VTC 75": { label: "ACC VTC 75", className: "bg-orange-500/20 text-orange-700 border-orange-500/30" },
  "Mobilité Taxi": { label: "Mobilité", className: "bg-green-500/20 text-green-700 border-green-500/30" },
  "Formation continue Taxi": { label: "FC Taxi", className: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30" },
  "Formation continue VTC": { label: "FC VTC", className: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30" },
};

function getAncienneteColor(createdAt: string): string {
  const days = differenceInDays(new Date(), parseISO(createdAt));
  if (days <= 7) return "border-l-green-500";
  if (days <= 30) return "border-l-yellow-500";
  if (days <= 60) return "border-l-orange-500";
  return "border-l-red-500";
}

function getInitials(prenom: string, nom: string): string {
  return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
}

interface PipelineCardProps {
  contact: Contact;
  index: number;
  onClick: () => void;
}

function PipelineCard({ contact, index, onClick }: PipelineCardProps) {
  const formationBadge = contact.formation ? FORMATION_BADGES[contact.formation] : null;
  const ancienneteColor = getAncienneteColor(contact.created_at);

  return (
    <Draggable draggableId={contact.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "p-3 mb-2 cursor-pointer border-l-4 transition-all hover:shadow-md",
            ancienneteColor,
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/50 rotate-2"
          )}
        >
          <div className="flex items-start gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {getInitials(contact.prenom, contact.nom)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">
                {contact.prenom} {contact.nom}
              </p>
              {formationBadge && (
                <Badge 
                  variant="outline" 
                  className={cn("text-[10px] px-1.5 py-0 mt-1", formationBadge.className)}
                >
                  {formationBadge.label}
                </Badge>
              )}
            </div>
          </div>
        </Card>
      )}
    </Draggable>
  );
}

interface PipelineColumnProps {
  column: typeof PIPELINE_COLUMNS[0];
  contacts: Contact[];
  onCardClick: (contact: Contact) => void;
}

function PipelineColumn({ column, contacts, onCardClick }: PipelineColumnProps) {
  return (
    <div className="flex-shrink-0 w-64">
      <div className="bg-muted/50 rounded-lg p-3 h-full flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", column.color)} />
            <h3 className="font-medium text-sm">{column.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>

        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex-1 min-h-[200px] rounded-md transition-colors p-1",
                snapshot.isDraggingOver && "bg-primary/5 ring-2 ring-primary/20"
              )}
            >
              <ScrollArea className="h-[calc(100vh-320px)]">
                <div className="pr-3">
                  {contacts.map((contact, index) => (
                    <PipelineCard
                      key={contact.id}
                      contact={contact}
                      index={index}
                      onClick={() => onCardClick(contact)}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              </ScrollArea>
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

type ViewMode = "list" | "pipeline" | "prospects" | "analytics";

interface ContactsUnifiedPageProps {
  selectedContactId?: string | null;
  onContactOpened?: () => void;
}

export function ContactsUnifiedPage({ selectedContactId: propContactId, onContactOpened }: ContactsUnifiedPageProps) {
  const { data: contacts, isLoading: loadingContacts } = useContacts();
  const { data: prospects = [] } = useProspects();
  const { data: prospectsStats } = useProspectsStats();
  const updateContact = useUpdateContact();
  const convertProspect = useConvertProspect();

  const [activeView, setActiveView] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [prospectFormOpen, setProspectFormOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bulkChevaletOpen, setBulkChevaletOpen] = useState(false);

  // Open contact sheet when selectedContactId prop is passed
  useEffect(() => {
    if (propContactId && contacts) {
      const contact = contacts.find(c => c.id === propContactId);
      if (contact) {
        setSelectedContact(contact);
        setDetailOpen(true);
        onContactOpened?.();
      }
    }
  }, [propContactId, contacts, onContactOpened]);

  // Calculate stats
  const totalContacts = contacts?.length || 0;
  const totalProspects = prospects?.length || 0;
  const prospectsToConvert = prospects.filter(p => p.statut !== 'converti' && p.statut !== 'perdu').length;

  // Group contacts by pipeline column
  const groupedContacts = useMemo(() => {
    if (!contacts) return {};

    const filtered = contacts.filter((contact) => {
      const matchesSearch = searchQuery === "" || 
        `${contact.prenom} ${contact.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFormation = formationFilter === "all" || contact.formation === formationFilter;
      return matchesSearch && matchesFormation;
    });

    const groups: Record<string, Contact[]> = {};
    PIPELINE_COLUMNS.forEach((col) => {
      groups[col.id] = [];
    });

    filtered.forEach((contact) => {
      const columnId = STATUT_TO_COLUMN[contact.statut || "En attente de validation"] || "inscription";
      if (groups[columnId]) {
        groups[columnId].push(contact);
      }
    });

    return groups;
  }, [contacts, searchQuery, formationFilter]);

  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const column = PIPELINE_COLUMNS.find((col) => col.id === destination.droppableId);
    if (!column) return;

    updateContact.mutate({
      id: draggableId,
      updates: { statut: column.statut as any },
    });
  };

  const handleCardClick = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  const handleAddNew = () => {
    if (activeView === "prospects") {
      setProspectFormOpen(true);
    } else {
      setContactFormOpen(true);
    }
  };

  const { setActiveTab } = useNavigation();
  
  // Update breadcrumb when tab changes
  useEffect(() => {
    setActiveTab(activeView);
  }, [activeView, setActiveTab]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Contacts & Prospects" 
        subtitle={`${totalContacts} stagiaires • ${prospectsToConvert} prospects en cours`}
        addLabel={activeView === "prospects" ? "Nouveau prospect" : "Nouveau contact"}
        onAddClick={handleAddNew}
      />

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto">
            <TabsTrigger value="list" className="gap-2">
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Liste</span>
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </TabsTrigger>
            <TabsTrigger value="prospects" className="gap-2">
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Prospects</span>
              {prospectsToConvert > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {prospectsToConvert}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
          </TabsList>

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              <span>{totalContacts} contacts</span>
            </div>
            <span className="text-muted-foreground/50">|</span>
            <div className="flex items-center gap-1.5">
              <UserPlus className="h-4 w-4" />
              <span>{totalProspects} prospects</span>
            </div>
            <span className="text-muted-foreground/50">|</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5"
              onClick={() => setBulkChevaletOpen(true)}
              disabled={!contacts?.length}
            >
              <SquareUser className="h-3.5 w-3.5" />
              Chevalets
            </Button>
          </div>
        </div>

        {/* List View - uses existing ContactsTable */}
        <TabsContent value="list" className="mt-4">
          <ContactsTable />
        </TabsContent>

        {/* Pipeline View */}
        <TabsContent value="pipeline" className="mt-4">
          {/* Pipeline Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un candidat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={formationFilter} onValueChange={setFormationFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Type formation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes formations</SelectItem>
                <SelectItem value="TAXI">Taxi</SelectItem>
                <SelectItem value="VTC">VTC</SelectItem>
                <SelectItem value="VMDTR">VMDTR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingContacts ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {PIPELINE_COLUMNS.map((col) => (
                <div key={col.id} className="flex-shrink-0 w-64">
                  <Skeleton className="h-[400px] rounded-lg" />
                </div>
              ))}
            </div>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="flex gap-4 overflow-x-auto pb-4">
                {PIPELINE_COLUMNS.map((column) => (
                  <PipelineColumn
                    key={column.id}
                    column={column}
                    contacts={groupedContacts[column.id] || []}
                    onCardClick={handleCardClick}
                  />
                ))}
              </div>
            </DragDropContext>
          )}

          {/* Legend */}
          <div className="mt-4 flex items-center gap-6 text-xs text-muted-foreground">
            <span className="font-medium">Ancienneté:</span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-green-500" />
              <span>&lt; 7j</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-yellow-500" />
              <span>7-30j</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-orange-500" />
              <span>30-60j</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 border-l-4 border-red-500" />
              <span>&gt; 60j</span>
            </div>
          </div>
        </TabsContent>

        {/* Prospects View - redirects to ProspectsPage content */}
        <TabsContent value="prospects" className="mt-4">
          <ProspectsEmbedded />
        </TabsContent>

        {/* Analytics View */}
        <TabsContent value="analytics" className="mt-4">
          <ProspectsDashboard />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ContactFormDialog
        open={contactFormOpen}
        onOpenChange={setContactFormOpen}
      />

      <ProspectFormDialog
        open={prospectFormOpen}
        onOpenChange={setProspectFormOpen}
      />

      <ApprenantDetailSheet
        contactId={selectedContact?.id || null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {}}
      />
    </div>
  );
}

// Embedded prospects list (simplified from ProspectsPage)
function ProspectsEmbedded() {
  const { data: prospects = [], isLoading } = useProspects();
  const deleteProspect = useDeleteProspect();
  const convertProspect = useConvertProspect();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [viewingProspect, setViewingProspect] = useState<Prospect | null>(null);

  const handleViewDetail = (prospect: Prospect) => {
    setViewingProspect(prospect);
    setDetailSheetOpen(true);
  };

  const STATUS_LABELS: Record<string, string> = {
    nouveau: "Nouveau",
    contacte: "Contacté",
    relance: "À relancer",
    converti: "Converti",
    perdu: "Perdu",
  };

  const STATUS_COLORS: Record<string, string> = {
    nouveau: "bg-blue-100 text-blue-800",
    contacte: "bg-yellow-100 text-yellow-800",
    relance: "bg-orange-100 text-orange-800",
    converti: "bg-green-100 text-green-800",
    perdu: "bg-gray-100 text-gray-800",
  };

  const filteredProspects = prospects.filter((prospect) => {
    const matchesSearch =
      prospect.nom.toLowerCase().includes(search.toLowerCase()) ||
      prospect.prenom.toLowerCase().includes(search.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || prospect.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConvert = (prospect: Prospect) => {
    convertProspect.mutate(prospect);
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProspects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProspects.map((p) => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        await deleteProspect.mutateAsync(id);
      }
      toast.success(`${ids.length} prospect(s) supprimé(s)`);
      setSelectedIds(new Set());
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
    setShowDeleteDialog(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un prospect..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Prospects List */}
      {filteredProspects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Aucun prospect trouvé
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All Header */}
          <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg">
            <Checkbox
              checked={filteredProspects.length > 0 && selectedIds.size === filteredProspects.length}
              onCheckedChange={toggleSelectAll}
              aria-label="Sélectionner tout"
            />
            <span className="text-sm text-muted-foreground">
              {selectedIds.size > 0
                ? `${selectedIds.size} sélectionné(s)`
                : "Sélectionner tout"}
            </span>
          </div>

          {filteredProspects.map((prospect) => (
            <Card
              key={prospect.id}
              className={cn(
                "p-4 transition-colors",
                selectedIds.has(prospect.id) && "bg-muted/50 border-primary/50"
              )}
            >
              <div className="flex justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={selectedIds.has(prospect.id)}
                    onCheckedChange={() => toggleSelect(prospect.id)}
                    aria-label={`Sélectionner ${prospect.prenom} ${prospect.nom}`}
                  />
                  <div className="space-y-1">
                    <div className="font-medium">
                      {prospect.prenom} {prospect.nom}
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge className={STATUS_COLORS[prospect.statut]}>
                        {STATUS_LABELS[prospect.statut]}
                      </Badge>
                      {prospect.formation_souhaitee && (
                        <Badge variant="outline">{prospect.formation_souhaitee}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {prospect.email} • {prospect.telephone}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleViewDetail(prospect)}
                    title="Voir la fiche"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {prospect.statut !== "converti" && (
                    <Button
                      size="sm"
                      onClick={() => handleConvert(prospect)}
                      disabled={convertProspect.isPending}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Convertir
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in-0">
          <div className="flex items-center gap-3 bg-background border shadow-lg rounded-lg px-4 py-3">
            <span className="text-sm font-medium">
              {selectedIds.size} prospect(s) sélectionné(s)
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer {selectedIds.size} prospect(s) ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Prospect Detail Sheet */}
      <ProspectDetailSheet
        prospect={viewingProspect}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}
