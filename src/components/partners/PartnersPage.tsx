import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Building2, Phone, Mail, MapPin, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { usePartners, useDeletePartner, type PartnerCategory, type Partner } from "@/hooks/usePartners";
import { PartnerFormDialog } from "./PartnerFormDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const CATEGORY_LABELS: Record<PartnerCategory, string> = {
  assurance: "Assurance",
  comptable: "Comptable",
  medecin: "Médecin",
  banque: "Banque",
  vehicule: "Véhicule",
  autre: "Autre",
};

const CATEGORY_COLORS: Record<PartnerCategory, string> = {
  assurance: "bg-blue-100 text-blue-800",
  comptable: "bg-green-100 text-green-800",
  medecin: "bg-red-100 text-red-800",
  banque: "bg-purple-100 text-purple-800",
  vehicule: "bg-orange-100 text-orange-800",
  autre: "bg-gray-100 text-gray-800",
};

export function PartnersPage() {
  const { data: partners = [], isLoading } = usePartners();
  const deletePartner = useDeletePartner();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const isMobile = useIsMobile();

  const filteredPartners = partners.filter((partner) => {
    const matchesSearch =
      partner.company_name.toLowerCase().includes(search.toLowerCase()) ||
      partner.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      partner.email?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || partner.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setFormOpen(true);
  };

  const handleDelete = (partner: Partner) => {
    setPartnerToDelete(partner);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (partnerToDelete) {
      deletePartner.mutate(partnerToDelete.id);
    }
    setDeleteDialogOpen(false);
    setPartnerToDelete(null);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingPartner(null);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Partenaires"
        subtitle="Gérez vos partenaires : assurances, comptables, médecins, banques, véhicules"
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un partenaire..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau partenaire
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredPartners.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aucun partenaire"
          description="Ajoutez vos partenaires pour faciliter la mise en relation avec vos stagiaires."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un partenaire
            </Button>
          }
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredPartners.map((partner) => (
            <Card key={partner.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="font-semibold">{partner.company_name}</div>
                  <Badge className={CATEGORY_COLORS[partner.category]}>
                    {CATEGORY_LABELS[partner.category]}
                  </Badge>
                  {partner.contact_name && (
                    <div className="text-sm text-muted-foreground">{partner.contact_name}</div>
                  )}
                  <div className="flex flex-col gap-1 text-sm">
                    {partner.phone && (
                      <a href={`tel:${partner.phone}`} className="flex items-center gap-1 text-primary">
                        <Phone className="h-3 w-3" />
                        {partner.phone}
                      </a>
                    )}
                    {partner.email && (
                      <a href={`mailto:${partner.email}`} className="flex items-center gap-1 text-primary">
                        <Mail className="h-3 w-3" />
                        {partner.email}
                      </a>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(partner)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(partner)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Société</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Adresse</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell className="font-medium">{partner.company_name}</TableCell>
                  <TableCell>
                    <Badge className={CATEGORY_COLORS[partner.category]}>
                      {CATEGORY_LABELS[partner.category]}
                    </Badge>
                  </TableCell>
                  <TableCell>{partner.contact_name || "-"}</TableCell>
                  <TableCell>
                    {partner.phone ? (
                      <a href={`tel:${partner.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {partner.phone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {partner.email ? (
                      <a href={`mailto:${partner.email}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Mail className="h-3 w-3" />
                        {partner.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {partner.address ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[200px]">{partner.address}</span>
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(partner)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(partner)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <PartnerFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        partner={editingPartner}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce partenaire ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action masquera le partenaire "{partnerToDelete?.company_name}".
              Les associations avec les stagiaires seront conservées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
