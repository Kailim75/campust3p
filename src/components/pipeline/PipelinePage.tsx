import { useState, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Header } from "@/components/layout/Header";
import { useContacts, useUpdateContact, Contact } from "@/hooks/useContacts";
import { useFormateurs } from "@/hooks/useFormateurs";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { differenceInDays, parseISO } from "date-fns";
import { ContactDetailSheet } from "@/components/contacts/ContactDetailSheet";

// Pipeline column configuration
const PIPELINE_COLUMNS = [
  { id: "inscription", label: "Inscription", statut: "En attente de validation", color: "bg-slate-500" },
  { id: "formation_theorique", label: "Formation Théorique", statut: "En formation théorique", color: "bg-blue-500" },
  { id: "examen_theorique", label: "Examen T3P Programmé", statut: "Examen T3P programmé", color: "bg-indigo-500" },
  { id: "t3p_obtenu", label: "T3P Obtenu", statut: "T3P obtenu", color: "bg-purple-500" },
  { id: "formation_pratique", label: "Formation Pratique", statut: "En formation pratique", color: "bg-cyan-500" },
  { id: "examen_pratique", label: "Examen Pratique Programmé", statut: "Examen pratique programmé", color: "bg-teal-500" },
  { id: "carte_pro", label: "Carte Pro Obtenue", statut: "Bravo", color: "bg-green-500" },
  { id: "abandonne", label: "Abandonné", statut: "Abandonné", color: "bg-red-500" },
];

// Map existing statuts to pipeline columns
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

// Formation types from the database enum
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
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
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
    <div className="flex-shrink-0 w-72">
      <div className="bg-muted/50 rounded-lg p-3 h-full flex flex-col">
        {/* Column Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded-full", column.color)} />
            <h3 className="font-medium text-sm">{column.label}</h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {contacts.length}
          </Badge>
        </div>

        {/* Droppable Area */}
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
              <ScrollArea className="h-[calc(100vh-280px)]">
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

export function PipelinePage() {
  const { data: contacts, isLoading } = useContacts();
  const { data: formateurs } = useFormateurs();
  const updateContact = useUpdateContact();

  const [searchQuery, setSearchQuery] = useState("");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Group contacts by pipeline column
  const groupedContacts = useMemo(() => {
    if (!contacts) return {};

    const filtered = contacts.filter((contact) => {
      // Search filter
      const matchesSearch = searchQuery === "" || 
        `${contact.prenom} ${contact.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Formation filter
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

  // Handle drag end
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const column = PIPELINE_COLUMNS.find((col) => col.id === destination.droppableId);
    if (!column) return;

    // Update contact status
    updateContact.mutate({
      id: draggableId,
      updates: { statut: column.statut as any },
    });
  };

  // Handle card click
  const handleCardClick = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailOpen(true);
  };

  // Calculate total by formation type
  const formationStats = useMemo(() => {
    if (!contacts) return { taxi: 0, vtc: 0, vmdtr: 0, other: 0 };
    return contacts.reduce((acc, c) => {
      if (c.formation === "TAXI") acc.taxi++;
      else if (c.formation === "VTC") acc.vtc++;
      else if (c.formation === "VMDTR") acc.vmdtr++;
      else acc.other++;
      return acc;
    }, { taxi: 0, vtc: 0, vmdtr: 0, other: 0 });
  }, [contacts]);

  if (isLoading) {
    return (
      <div className="p-6">
        <Header title="Pipeline Candidats" subtitle="Suivi visuel de la progression" />
        <div className="flex gap-4 mt-6 overflow-x-auto pb-4">
          {PIPELINE_COLUMNS.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-72">
              <Skeleton className="h-[500px] rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Header 
        title="Pipeline Candidats" 
        subtitle="Glissez-déposez pour changer le statut"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mt-6 mb-4">
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
            <SelectItem value="taxi">Taxi</SelectItem>
            <SelectItem value="vtc">VTC</SelectItem>
            <SelectItem value="vmdtr">VMDTR</SelectItem>
            <SelectItem value="taxi_vtc">Taxi+VTC</SelectItem>
            <SelectItem value="mobilite">Mobilité</SelectItem>
            <SelectItem value="continue">Continue</SelectItem>
          </SelectContent>
        </Select>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 ml-auto text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{contacts?.length || 0} candidats</span>
          </div>
          <span className="text-muted-foreground/50">|</span>
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            Taxi: {formationStats.taxi}
          </Badge>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
            VTC: {formationStats.vtc}
          </Badge>
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 border-purple-500/20">
            VMDTR: {formationStats.vmdtr}
          </Badge>
        </div>
      </div>

      {/* Kanban Board */}
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

      {/* Contact Detail Sheet */}
      <ContactDetailSheet
        contactId={selectedContact?.id || null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {}}
      />

      {/* Legend */}
      <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground">
        <span className="font-medium">Ancienneté:</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-l-4 border-green-500" />
          <span>&lt; 7 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-l-4 border-yellow-500" />
          <span>7-30 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-l-4 border-orange-500" />
          <span>30-60 jours</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-l-4 border-red-500" />
          <span>&gt; 60 jours</span>
        </div>
      </div>
    </div>
  );
}
