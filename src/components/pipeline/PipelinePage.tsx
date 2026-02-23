import { useState, useMemo, useCallback } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Header } from "@/components/layout/Header";
import { useContacts, useUpdateContact, Contact } from "@/hooks/useContacts";
import { useFormateurs } from "@/hooks/useFormateurs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Users, Filter, Plus, Globe, Phone, UserCheck, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ─── PIPELINE COLUMNS ────────────────────────────────────

const PIPELINE_COLUMNS = [
  { id: "nouveau_lead", label: "Nouveau lead", statut: "En attente de validation", color: "bg-muted-foreground" },
  { id: "contacte", label: "Contacté", statut: "En attente de validation", color: "bg-info" },
  { id: "en_formation", label: "En formation", statut: "En formation théorique", color: "bg-primary" },
  { id: "examen_theorique", label: "Examen T3P", statut: "Examen T3P programmé", color: "bg-accent" },
  { id: "t3p_obtenu", label: "T3P Obtenu", statut: "T3P obtenu", color: "bg-success" },
  { id: "formation_pratique", label: "Formation pratique", statut: "En formation pratique", color: "bg-info" },
  { id: "diplome", label: "Diplômé", statut: "Bravo", color: "bg-success" },
  { id: "abandonne", label: "Abandonné", statut: "Abandonné", color: "bg-destructive" },
];

// Map DB statuts to pipeline column IDs
const STATUT_TO_COLUMN: Record<string, string> = {
  "En attente de validation": "nouveau_lead",
  "En formation théorique": "en_formation",
  "Examen T3P programmé": "examen_theorique",
  "T3P obtenu": "t3p_obtenu",
  "En formation pratique": "formation_pratique",
  "Examen pratique programmé": "formation_pratique",
  "Client": "diplome",
  "Bravo": "diplome",
  "Abandonné": "abandonne",
};

// ─── FORMATION BADGES ────────────────────────────────────

const FORMATION_CONFIG: Record<string, { label: string; className: string; color: string }> = {
  TAXI: { label: "Taxi", className: "bg-accent/15 text-accent border-accent/20", color: "bg-accent" },
  VTC: { label: "VTC", className: "bg-primary/15 text-primary border-primary/20", color: "bg-primary" },
  VMDTR: { label: "VMDTR", className: "bg-info/15 text-info border-info/20", color: "bg-info" },
  "ACC VTC": { label: "ACC VTC", className: "bg-accent/15 text-accent border-accent/20", color: "bg-accent" },
  "ACC VTC 75": { label: "ACC VTC 75", className: "bg-accent/15 text-accent border-accent/20", color: "bg-accent" },
  "Formation continue Taxi": { label: "FC Taxi", className: "bg-success/15 text-success border-success/20", color: "bg-success" },
  "Formation continue VTC": { label: "FC VTC", className: "bg-success/15 text-success border-success/20", color: "bg-success" },
  "Mobilité Taxi": { label: "Mobilité", className: "bg-info/15 text-info border-info/20", color: "bg-info" },
};

// Source lead icons
const SOURCE_ICONS: Record<string, { icon: typeof Globe; label: string }> = {
  site_web: { icon: Globe, label: "Site web" },
  bouche_a_oreille: { icon: UserCheck, label: "Recommandation" },
  partenaire: { icon: Handshake, label: "Partenaire" },
  reseaux_sociaux: { icon: Globe, label: "Réseaux sociaux" },
  publicite: { icon: Globe, label: "Publicité" },
  salon: { icon: Users, label: "Salon" },
  autre: { icon: Phone, label: "Autre" },
};

// ─── DOCS PROGRESS HOOK ─────────────────────────────────

function useContactDocsCounts(contactIds: string[]) {
  return useQuery({
    queryKey: ["pipeline-docs-counts", contactIds.length],
    queryFn: async () => {
      if (contactIds.length === 0) return new Map<string, number>();
      const { data } = await supabase
        .from("contact_documents")
        .select("contact_id")
        .in("contact_id", contactIds);

      const counts = new Map<string, number>();
      (data || []).forEach((d) => {
        counts.set(d.contact_id, (counts.get(d.contact_id) || 0) + 1);
      });
      return counts;
    },
    enabled: contactIds.length > 0,
  });
}

// ─── PIPELINE CARD ───────────────────────────────────────

function PipelineCard({
  contact,
  index,
  onClick,
  docCount,
}: {
  contact: Contact;
  index: number;
  onClick: () => void;
  docCount: number;
}) {
  const formation = contact.formation ? FORMATION_CONFIG[contact.formation] : null;
  const source = contact.source ? SOURCE_ICONS[contact.source] || SOURCE_ICONS.autre : null;
  const SourceIcon = source?.icon || Globe;

  const totalRequiredDocs = 7;
  const progressPct = Math.round((docCount / totalRequiredDocs) * 100);
  const progressColor =
    progressPct < 50 ? "bg-destructive" : progressPct < 80 ? "bg-accent" : "bg-success";

  const timeAgo = formatDistanceToNow(parseISO(contact.created_at), { addSuffix: false, locale: fr });

  return (
    <Draggable draggableId={contact.id} index={index}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "p-3 mb-2 cursor-pointer transition-all hover:shadow-md border",
            snapshot.isDragging && "shadow-lg ring-2 ring-primary/40 rotate-1"
          )}
        >
          <div className="flex items-start gap-2.5">
            {/* Avatar initiales */}
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback
                className={cn(
                  "text-xs font-semibold text-primary-foreground",
                  formation?.color || "bg-primary"
                )}
              >
                {`${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Name */}
              <p className="font-medium text-sm truncate text-foreground">
                {contact.prenom} {contact.nom}
              </p>

              {/* Badges row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {formation && (
                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", formation.className)}>
                    {formation.label}
                  </Badge>
                )}
                {source && (
                  <SourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>

              {/* Progress bar documents */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{docCount}/{totalRequiredDocs} docs</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", progressColor)}
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
              </div>

              {/* Time */}
              <p className="text-[10px] text-muted-foreground">il y a {timeAgo}</p>
            </div>
          </div>
        </Card>
      )}
    </Draggable>
  );
}

// ─── PIPELINE COLUMN ─────────────────────────────────────

function PipelineColumn({
  column,
  contacts,
  onCardClick,
  docCounts,
  onAddClick,
}: {
  column: (typeof PIPELINE_COLUMNS)[0];
  contacts: Contact[];
  onCardClick: (c: Contact) => void;
  docCounts: Map<string, number>;
  onAddClick: () => void;
}) {
  return (
    <div className="flex-shrink-0 w-72">
      <div className="bg-muted/40 rounded-xl p-3 h-full flex flex-col border border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full", column.color)} />
            <h3 className="font-semibold text-sm text-foreground">{column.label}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs h-5 min-w-5 justify-center">
              {contacts.length}
            </Badge>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onAddClick}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Droppable */}
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                "flex-1 min-h-[200px] rounded-lg transition-colors p-1",
                snapshot.isDraggingOver && "bg-primary/5 ring-1 ring-primary/20"
              )}
            >
              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="pr-2">
                  {contacts.map((contact, index) => (
                    <PipelineCard
                      key={contact.id}
                      contact={contact}
                      index={index}
                      onClick={() => onCardClick(contact)}
                      docCount={docCounts.get(contact.id) || 0}
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

// ─── QUICK ADD DIALOG ────────────────────────────────────

function QuickAddDialog({
  open,
  onOpenChange,
  defaultColumn,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultColumn: string;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    telephone: "",
    formation: "" as string,
    source: "site_web" as string,
  });

  const createContact = useMutation({
    mutationFn: async () => {
      const col = PIPELINE_COLUMNS.find((c) => c.id === defaultColumn);
      const { error } = await supabase.from("contacts").insert({
        prenom: form.prenom,
        nom: form.nom,
        telephone: form.telephone || null,
        formation: (form.formation || null) as any,
        source: form.source as any,
        statut: (col?.statut || "En attente de validation") as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Apprenant ajouté");
      onOpenChange(false);
      setForm({ prenom: "", nom: "", telephone: "", formation: "", source: "site_web" });
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajout rapide</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Prénom *</Label>
              <Input value={form.prenom} onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))} />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input value={form.nom} onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Téléphone</Label>
            <Input value={form.telephone} onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))} />
          </div>
          <div>
            <Label>Formation</Label>
            <Select value={form.formation} onValueChange={(v) => setForm((p) => ({ ...p, formation: v }))}>
              <SelectTrigger><SelectValue placeholder="Type de formation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="TAXI">Taxi Initial</SelectItem>
                <SelectItem value="VTC">VTC</SelectItem>
                <SelectItem value="VMDTR">VMDTR</SelectItem>
                <SelectItem value="Formation continue Taxi">Recyclage Taxi</SelectItem>
                <SelectItem value="Formation continue VTC">Recyclage VTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="site_web">🌐 Site web</SelectItem>
                <SelectItem value="bouche_a_oreille">👥 Recommandation</SelectItem>
                <SelectItem value="partenaire">🤝 Partenaire</SelectItem>
                <SelectItem value="autre">📞 Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            disabled={!form.prenom || !form.nom || createContact.isPending}
            onClick={() => createContact.mutate()}
          >
            {createContact.isPending ? "Ajout..." : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MAIN PIPELINE PAGE ──────────────────────────────────

export function PipelinePage() {
  const { data: contacts, isLoading } = useContacts();
  const updateContact = useUpdateContact();

  const [searchQuery, setSearchQuery] = useState("");
  const [formationFilter, setFormationFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddColumn, setQuickAddColumn] = useState("nouveau_lead");

  // Doc counts
  const contactIds = useMemo(() => (contacts || []).map((c) => c.id), [contacts]);
  const { data: docCounts } = useContactDocsCounts(contactIds);

  // Group contacts by column
  const groupedContacts = useMemo(() => {
    if (!contacts) return {} as Record<string, Contact[]>;

    const filtered = contacts.filter((c) => {
      const matchesSearch =
        searchQuery === "" ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFormation = formationFilter === "all" || c.formation === formationFilter;
      const matchesSource = sourceFilter === "all" || c.source === sourceFilter;
      return matchesSearch && matchesFormation && matchesSource;
    });

    const groups: Record<string, Contact[]> = {};
    PIPELINE_COLUMNS.forEach((col) => (groups[col.id] = []));

    filtered.forEach((c) => {
      const colId = STATUT_TO_COLUMN[c.statut || "En attente de validation"] || "nouveau_lead";
      groups[colId]?.push(c);
    });

    return groups;
  }, [contacts, searchQuery, formationFilter, sourceFilter]);

  // Drag & drop
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, draggableId } = result;
      if (!destination) return;

      const column = PIPELINE_COLUMNS.find((col) => col.id === destination.droppableId);
      if (!column) return;

      updateContact.mutate({
        id: draggableId,
        updates: { statut: column.statut as any },
      });
    },
    [updateContact]
  );

  const handleAddClick = (columnId: string) => {
    setQuickAddColumn(columnId);
    setQuickAddOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Pipeline" subtitle="Suivi des apprenants" />
        <div className="flex gap-4 p-6 overflow-x-auto">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <Skeleton className="h-[500px] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Pipeline" subtitle="Glissez-déposez pour changer le statut" />

      {/* Filters */}
      <div className="px-6 pt-6 pb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un apprenant..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={formationFilter} onValueChange={setFormationFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Formation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="TAXI">Taxi</SelectItem>
            <SelectItem value="VTC">VTC</SelectItem>
            <SelectItem value="VMDTR">VMDTR</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sources</SelectItem>
            <SelectItem value="site_web">Site web</SelectItem>
            <SelectItem value="bouche_a_oreille">Recommandation</SelectItem>
            <SelectItem value="partenaire">Partenaire</SelectItem>
            <SelectItem value="autre">Autre</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 ml-auto text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{contacts?.length || 0} apprenants</span>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="px-6 pb-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4">
            {PIPELINE_COLUMNS.map((column) => (
              <PipelineColumn
                key={column.id}
                column={column}
                contacts={groupedContacts[column.id] || []}
                onCardClick={(c) => {
                  setSelectedContact(c);
                  setDetailOpen(true);
                }}
                docCounts={docCounts || new Map()}
                onAddClick={() => handleAddClick(column.id)}
              />
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contactId={selectedContact?.id || null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {}}
      />

      {/* Quick Add Dialog */}
      <QuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        defaultColumn={quickAddColumn}
      />
    </div>
  );
}
