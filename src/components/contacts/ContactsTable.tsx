import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Search, Filter, MoreHorizontal, Phone, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  status: "prospect" | "inscrit" | "stagiaire" | "ancien";
  formation: string;
  source: string;
  dateContact: string;
}

const mockContacts: Contact[] = [
  { id: "1", nom: "Dupont", prenom: "Jean", email: "jean.dupont@email.com", telephone: "06 12 34 56 78", status: "prospect", formation: "Formation Taxi", source: "Google", dateContact: "10/01/2026" },
  { id: "2", nom: "Martin", prenom: "Marie", email: "marie.martin@email.com", telephone: "06 98 76 54 32", status: "inscrit", formation: "Formation VTC", source: "Site web", dateContact: "09/01/2026" },
  { id: "3", nom: "Bernard", prenom: "Pierre", email: "pierre.bernard@email.com", telephone: "06 11 22 33 44", status: "stagiaire", formation: "Formation Continue", source: "Recommandation", dateContact: "08/01/2026" },
  { id: "4", nom: "Petit", prenom: "Sophie", email: "sophie.petit@email.com", telephone: "06 55 66 77 88", status: "ancien", formation: "Formation VMDTR", source: "CPF", dateContact: "07/01/2026" },
  { id: "5", nom: "Robert", prenom: "Lucas", email: "lucas.robert@email.com", telephone: "06 33 44 55 66", status: "prospect", formation: "Formation Mobilité", source: "Téléphone", dateContact: "06/01/2026" },
  { id: "6", nom: "Moreau", prenom: "Emma", email: "emma.moreau@email.com", telephone: "06 77 88 99 00", status: "inscrit", formation: "Formation Taxi", source: "Entreprise", dateContact: "05/01/2026" },
];

const statusConfig = {
  prospect: { label: "Prospect", class: "bg-info/10 text-info border-info/20" },
  inscrit: { label: "Inscrit", class: "bg-warning/10 text-warning border-warning/20" },
  stagiaire: { label: "En formation", class: "bg-success/10 text-success border-success/20" },
  ancien: { label: "Ancien", class: "bg-muted text-muted-foreground border-muted" },
};

export function ContactsTable() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formationFilter, setFormationFilter] = useState<string>("all");

  const filteredContacts = mockContacts.filter((contact) => {
    const matchesSearch =
      contact.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || contact.status === statusFilter;
    const matchesFormation = formationFilter === "all" || contact.formation === formationFilter;
    
    return matchesSearch && matchesStatus && matchesFormation;
  });

  const formations = [...new Set(mockContacts.map((c) => c.formation))];

  return (
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
            <SelectItem value="prospect">Prospect</SelectItem>
            <SelectItem value="inscrit">Inscrit</SelectItem>
            <SelectItem value="stagiaire">En formation</SelectItem>
            <SelectItem value="ancien">Ancien</SelectItem>
          </SelectContent>
        </Select>

        <Select value={formationFilter} onValueChange={setFormationFilter}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder="Formation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les formations</SelectItem>
            {formations.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="card-elevated overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Contact</TableHead>
              <TableHead className="font-semibold">Téléphone</TableHead>
              <TableHead className="font-semibold">Formation</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContacts.map((contact) => {
              const initials = `${contact.prenom[0]}${contact.nom[0]}`.toUpperCase();
              
              return (
                <TableRow key={contact.id} className="table-row-hover">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {contact.prenom} {contact.nom}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {contact.email}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.telephone}
                  </TableCell>
                  <TableCell>{contact.formation}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.source}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", statusConfig[contact.status].class)}
                    >
                      {statusConfig[contact.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.dateContact}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {filteredContacts.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            Aucun contact trouvé
          </div>
        )}
      </div>
    </div>
  );
}
