import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Users, FileWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { ApprenantDetailSheet } from "./ApprenantDetailSheet";
import { ContactFormDialog } from "@/components/contacts/ContactFormDialog";

const FORMATION_COLORS: Record<string, string> = {
  TAXI: "bg-primary",
  VTC: "bg-accent",
  VMDTR: "bg-info",
};

const STATUT_LABELS: Record<string, string> = {
  "En attente de validation": "Nouveau",
  "En formation théorique": "En formation",
  "Examen T3P programmé": "Examen T3P",
  "T3P obtenu": "T3P Obtenu",
  "En formation pratique": "Pratique",
  "Client": "Diplômé",
  "Bravo": "Diplômé",
  "Abandonné": "Abandonné",
};

export function ApprenantsPage() {
  const { data: contacts, isLoading } = useContacts();
  const [search, setSearch] = useState("");
  const [formationFilter, setFormationFilter] = useState("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter((c) => {
      const matchesSearch =
        !search ||
        `${c.prenom} ${c.nom}`.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.telephone?.includes(search);
      const matchesFormation = formationFilter === "all" || c.formation === formationFilter;
      return matchesSearch && matchesFormation;
    });
  }, [contacts, search, formationFilter]);

  return (
    <div className="min-h-screen">
      <Header title="Apprenants" subtitle={`${filtered.length} apprenant${filtered.length > 1 ? "s" : ""}`} addLabel="Nouveau stagiaire" onAddClick={() => setFormOpen(true)} />

      <main className="p-6 space-y-6 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un apprenant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
        </div>

        {/* Table — Desktop */}
        <Card className="overflow-hidden hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Apprenant</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => {
                const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
                const avatarColor = contact.formation ? FORMATION_COLORS[contact.formation] || "bg-primary" : "bg-primary";
                return (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={cn("text-xs font-semibold text-primary-foreground", avatarColor)}>
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">{contact.prenom} {contact.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.formation && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                          {contact.formation}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {STATUT_LABELS[contact.statut || ""] || contact.statut || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contact.telephone || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contact.email || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Aucun apprenant trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Cards — Mobile */}
        <div className="md:hidden space-y-3">
          {filtered.length === 0 && (
            <Card className="p-6 text-center text-muted-foreground text-sm">Aucun apprenant trouvé</Card>
          )}
          {filtered.map((contact) => {
            const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
            const avatarColor = contact.formation ? FORMATION_COLORS[contact.formation] || "bg-primary" : "bg-primary";
            return (
              <Card
                key={contact.id}
                className="p-4 cursor-pointer hover:shadow-soft transition-shadow active:scale-[0.99]"
                onClick={() => {
                  setSelectedContactId(contact.id);
                  setDetailOpen(true);
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={cn("text-xs font-semibold text-primary-foreground", avatarColor)}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{contact.prenom} {contact.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email || contact.telephone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {contact.formation && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      {contact.formation}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px]">
                    {STATUT_LABELS[contact.statut || ""] || contact.statut || "—"}
                  </Badge>
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
      />
      <ContactFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
}
