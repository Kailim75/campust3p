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
import { EmptyState, EmptyStateAction } from "@/components/ui/empty-state";
import { BrandedLoader } from "@/components/ui/branded-loader";

const FORMATION_BADGE: Record<string, string> = {
  TAXI: "badge-soft badge-soft-blue",
  VTC: "badge-soft badge-soft-gray",
  VMDTR: "badge-soft badge-soft-teal",
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

const STATUT_BADGE: Record<string, string> = {
  "Nouveau": "badge-soft badge-soft-amber",
  "En formation": "badge-soft badge-soft-blue",
  "Examen T3P": "badge-soft badge-soft-teal",
  "T3P Obtenu": "badge-soft badge-soft-green",
  "Pratique": "badge-soft badge-soft-blue",
  "Diplômé": "badge-soft badge-soft-gray",
  "Abandonné": "badge-soft badge-soft-red",
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

  const activeCount = contacts?.length || 0;

  return (
    <div className="min-h-screen">
      <Header 
        title="Apprenants" 
        subtitle={`${activeCount} apprenant${activeCount > 1 ? "s" : ""} actifs`} 
        addLabel="Nouveau stagiaire" 
        onAddClick={() => setFormOpen(true)} 
      />

      <main className="p-6 space-y-5 animate-fade-in">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un apprenant..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl border-border bg-card"
            />
          </div>
          <Select value={formationFilter} onValueChange={setFormationFilter}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl">
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
        <div className="hidden md:block rounded-xl bg-card border border-border overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Apprenant</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Formation</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Statut</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Téléphone</TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground uppercase tracking-wider h-11">Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => {
                const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
                const statutLabel = STATUT_LABELS[contact.statut || ""] || contact.statut || "—";
                const statutClass = STATUT_BADGE[statutLabel] || "badge-soft badge-soft-gray";
                const formationClass = contact.formation ? (FORMATION_BADGE[contact.formation] || "badge-soft badge-soft-gray") : "";
                
                return (
                  <TableRow
                    key={contact.id}
                    className="cursor-pointer hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0"
                    style={{ height: '56px' }}
                    onClick={() => {
                      setSelectedContactId(contact.id);
                      setDetailOpen(true);
                    }}
                  >
                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-xs font-semibold bg-primary/8 text-foreground">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm text-foreground">{contact.prenom} {contact.nom}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.formation && (
                        <span className={formationClass}>{contact.formation}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={statutClass}>{statutLabel}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground font-mono text-[13px]">{contact.telephone || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{contact.email || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState
                      icon={search ? FileWarning : Users}
                      title={search ? "Aucun résultat" : "Aucun apprenant"}
                      description={search ? "Essayez avec d'autres mots-clés." : "Ajoutez votre premier stagiaire pour démarrer."}
                      tip={search ? "La recherche porte sur le nom, email et téléphone" : "Raccourci : Ctrl+N pour créer rapidement"}
                      action={!search ? <EmptyStateAction label="Nouveau stagiaire" onClick={() => setFormOpen(true)} /> : undefined}
                      variant="minimal"
                    />
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
              icon={search ? FileWarning : Users}
              title={search ? "Aucun résultat" : "Aucun apprenant"}
              description={search ? "Essayez avec d'autres mots-clés." : "Ajoutez votre premier stagiaire."}
              action={!search ? <EmptyStateAction label="Nouveau stagiaire" onClick={() => setFormOpen(true)} /> : undefined}
              variant="minimal"
            />
          )}
          {filtered.map((contact) => {
            const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
            const statutLabel = STATUT_LABELS[contact.statut || ""] || contact.statut || "—";
            const statutClass = STATUT_BADGE[statutLabel] || "badge-soft badge-soft-gray";
            const formationClass = contact.formation ? (FORMATION_BADGE[contact.formation] || "badge-soft badge-soft-gray") : "";
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
                    <p className="font-medium text-sm truncate">{contact.prenom} {contact.nom}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.email || contact.telephone || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  {contact.formation && (
                    <span className={formationClass}>{contact.formation}</span>
                  )}
                  <span className={statutClass}>{statutLabel}</span>
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