import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Search, Filter, Phone, Mail, MessageCircle, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ContactDetailSheet } from "./ContactDetailSheet";
import { ContactFormDialog } from "./ContactFormDialog";
import { QuickStatusDropdown } from "./QuickStatusDropdown";
import { QuickEnrollDialog } from "./QuickEnrollDialog";

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
  const { data: contacts, isLoading, error } = useContacts();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [enrollContact, setEnrollContact] = useState<Contact | null>(null);
  const [enrollOpen, setEnrollOpen] = useState(false);

  // Handle URL parameter to open contact detail
  useEffect(() => {
    const idFromUrl = searchParams.get("id");
    if (idFromUrl) {
      setSelectedContactId(idFromUrl);
      setDetailOpen(true);
      // Clear the URL parameter
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredContacts = (contacts ?? []).filter((contact) => {
    const matchesSearch =
      contact.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    
    const matchesStatus = statusFilter === "all" || contact.statut === statusFilter;
    const matchesFormation = formationFilter === "all" || contact.formation === formationFilter;
    
    return matchesSearch && matchesStatus && matchesFormation;
  });

  const formations = [...new Set(contacts?.map((c) => c.formation).filter(Boolean) ?? [])];

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

          <Button onClick={handleAddNew}>
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>{filteredContacts.length} contact{filteredContacts.length > 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
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
                filteredContacts.map((contact) => {
                  const initials = `${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase();
                  const status = contact.statut ?? "En attente de validation";
                  
                  return (
                    <TableRow key={contact.id} className="table-row-hover cursor-pointer">
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
                                window.open(`tel:${contact.telephone}`, '_blank');
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
                                window.open(`mailto:${contact.email}`, '_blank');
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
                                window.open(`https://wa.me/${contact.telephone?.replace(/\s/g, '')}`, '_blank');
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

          {!isLoading && filteredContacts.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              Aucun contact trouvé
            </div>
          )}
        </div>
      </div>

      {/* Detail Sheet */}
      <ContactDetailSheet
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
    </>
  );
}
