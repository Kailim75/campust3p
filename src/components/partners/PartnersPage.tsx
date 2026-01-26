import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Building2, Phone, Mail, Users, Euro, TrendingUp, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { usePartners, usePartnerStats, useDeletePartner, type PartnerType, type PartnerStatus, type Partner } from "@/hooks/usePartners";
import { PartnerFormDialog } from "./PartnerFormDialog";
import { PartnerDetailSheet } from "./PartnerDetailSheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";

const TYPE_LABELS: Record<PartnerType, string> = {
  apporteur_affaires: "Apporteur d'affaires",
  auto_ecole: "Auto-école",
  entreprise: "Entreprise",
  organisme_formation: "Org. formation",
  prescripteur: "Prescripteur",
  autre: "Autre",
};

const STATUS_LABELS: Record<PartnerStatus, string> = {
  actif: "Actif",
  inactif: "Inactif",
  suspendu: "Suspendu",
};

const STATUS_COLORS: Record<PartnerStatus, string> = {
  actif: "bg-green-100 text-green-800",
  inactif: "bg-gray-100 text-gray-800",
  suspendu: "bg-red-100 text-red-800",
};

export function PartnersPage() {
  const { data: partners = [], isLoading } = usePartners();
  const { data: stats = [] } = usePartnerStats();
  const deletePartner = useDeletePartner();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [partnerToDelete, setPartnerToDelete] = useState<Partner | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  // Merge partners with their stats
  const partnersWithStats = partners.map((partner) => {
    const partnerStats = stats.find((s) => s.partner_id === partner.id);
    return {
      ...partner,
      nb_apprenants: partnerStats?.nb_apprenants || 0,
      ca_genere: partnerStats?.ca_genere || 0,
      commission_calculee: partnerStats?.commission_calculee || 0,
      commission_restante: partnerStats?.commission_restante || 0,
    };
  });

  const filteredPartners = partnersWithStats.filter((partner) => {
    const matchesSearch =
      partner.company_name.toLowerCase().includes(search.toLowerCase()) ||
      partner.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      partner.email?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || partner.type_partenaire === typeFilter;
    const matchesStatus = statusFilter === "all" || partner.statut_partenaire === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Calculate totals
  const totalApprenants = filteredPartners.reduce((sum, p) => sum + p.nb_apprenants, 0);
  const totalCA = filteredPartners.reduce((sum, p) => sum + p.ca_genere, 0);
  const totalCommissionsRestantes = filteredPartners.reduce((sum, p) => sum + p.commission_restante, 0);

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Partenaires"
        subtitle="Gérez vos partenaires commerciaux et suivez leurs performances"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Apprenants apportés</p>
                <p className="text-2xl font-bold">{totalApprenants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">CA généré</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCA)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <Euro className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commissions à payer</p>
                <p className="text-2xl font-bold">{formatCurrency(totalCommissionsRestantes)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
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
          description="Ajoutez vos partenaires commerciaux pour suivre les apports d'apprenants et les commissions."
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
            <Card 
              key={partner.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedPartnerId(partner.id)}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="font-semibold">{partner.company_name}</div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={STATUS_COLORS[partner.statut_partenaire || "actif"]}>
                      {STATUS_LABELS[partner.statut_partenaire || "actif"]}
                    </Badge>
                    <Badge variant="outline">
                      {TYPE_LABELS[partner.type_partenaire || "autre"]}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      <span>{partner.nb_apprenants} apprenants</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3 text-muted-foreground" />
                      <span>{formatCurrency(partner.ca_genere)}</span>
                    </div>
                  </div>
                  {partner.commission_restante > 0 && (
                    <div className="text-sm text-orange-600">
                      Commission à payer: {formatCurrency(partner.commission_restante)}
                    </div>
                  )}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedPartnerId(partner.id); }}>
                      <Eye className="h-4 w-4 mr-2" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(partner); }}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => { e.stopPropagation(); handleDelete(partner); }}
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
                <TableHead>Type</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Apprenants</TableHead>
                <TableHead className="text-right">CA généré</TableHead>
                <TableHead className="text-right">Commission restante</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow 
                  key={partner.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPartnerId(partner.id)}
                >
                  <TableCell className="font-medium">{partner.company_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {TYPE_LABELS[partner.type_partenaire || "autre"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[partner.statut_partenaire || "actif"]}>
                      {STATUS_LABELS[partner.statut_partenaire || "actif"]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {partner.contact_name && <div className="text-sm">{partner.contact_name}</div>}
                      {partner.phone && (
                        <a href={`tel:${partner.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          <Phone className="h-3 w-3" />
                          {partner.phone}
                        </a>
                      )}
                      {partner.email && (
                        <a href={`mailto:${partner.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                          <Mail className="h-3 w-3" />
                          {partner.email}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{partner.nb_apprenants}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(partner.ca_genere)}</TableCell>
                  <TableCell className="text-right">
                    {partner.commission_restante > 0 ? (
                      <span className="font-medium text-orange-600">
                        {formatCurrency(partner.commission_restante)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedPartnerId(partner.id); }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(partner); }}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); handleDelete(partner); }}
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

      <PartnerDetailSheet
        partnerId={selectedPartnerId}
        open={!!selectedPartnerId}
        onOpenChange={(open) => !open && setSelectedPartnerId(null)}
        onEdit={(partner) => {
          setSelectedPartnerId(null);
          handleEdit(partner);
        }}
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
