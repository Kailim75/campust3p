import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserCheck,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle,
  LayoutList,
  Kanban,
  BarChart3,
} from "lucide-react";
import { useProspects, useDeleteProspect, useConvertProspect, useProspectsStats, type ProspectStatus, type Prospect } from "@/hooks/useProspects";
import { ProspectFormDialog } from "./ProspectFormDialog";
import { ProspectsDashboard } from "./ProspectsDashboard";
import { ProspectsKanban } from "./ProspectsKanban";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

const STATUS_LABELS: Record<ProspectStatus, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  relance: "À relancer",
  converti: "Converti",
  perdu: "Perdu",
};

const STATUS_COLORS: Record<ProspectStatus, string> = {
  nouveau: "bg-blue-100 text-blue-800",
  contacte: "bg-yellow-100 text-yellow-800",
  relance: "bg-orange-100 text-orange-800",
  converti: "bg-green-100 text-green-800",
  perdu: "bg-gray-100 text-gray-800",
};

const STATUS_ICONS: Record<ProspectStatus, React.ReactNode> = {
  nouveau: <Clock className="h-3 w-3" />,
  contacte: <Phone className="h-3 w-3" />,
  relance: <TrendingUp className="h-3 w-3" />,
  converti: <CheckCircle className="h-3 w-3" />,
  perdu: <XCircle className="h-3 w-3" />,
};

export function ProspectsPage() {
  const { data: prospects = [], isLoading } = useProspects();
  const { data: stats } = useProspectsStats();
  const deleteProspect = useDeleteProspect();
  const convertProspect = useConvertProspect();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [activeView, setActiveView] = useState<"list" | "kanban" | "dashboard">("list");
  const isMobile = useIsMobile();

  const filteredProspects = prospects.filter((prospect) => {
    const matchesSearch =
      prospect.nom.toLowerCase().includes(search.toLowerCase()) ||
      prospect.prenom.toLowerCase().includes(search.toLowerCase()) ||
      prospect.email?.toLowerCase().includes(search.toLowerCase()) ||
      prospect.telephone?.includes(search);
    const matchesStatus = statusFilter === "all" || prospect.statut === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (prospect: Prospect) => {
    setEditingProspect(prospect);
    setFormOpen(true);
  };

  const handleDelete = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setDeleteDialogOpen(true);
  };

  const handleConvert = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setConvertDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedProspect) {
      deleteProspect.mutate(selectedProspect.id);
    }
    setDeleteDialogOpen(false);
    setSelectedProspect(null);
  };

  const confirmConvert = () => {
    if (selectedProspect) {
      convertProspect.mutate(selectedProspect);
    }
    setConvertDialogOpen(false);
    setSelectedProspect(null);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingProspect(null);
  };

  return (
    <div className="space-y-6">
      <Header
        title="Prospects"
        subtitle="Gérez vos prospects et convertissez-les en contacts"
      />

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <LayoutList className="h-4 w-4" />
              Liste
            </TabsTrigger>
            <TabsTrigger value="kanban" className="gap-2">
              <Kanban className="h-4 w-4" />
              Kanban
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau prospect
          </Button>
        </div>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <ProspectsDashboard />
        </TabsContent>

        {/* Kanban Tab */}
        <TabsContent value="kanban" className="mt-6">
          <ProspectsKanban />
        </TabsContent>

        {/* List Tab */}
        <TabsContent value="list" className="mt-6 space-y-4">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total</div>
              </Card>
              <Card className="p-4 border-blue-200 bg-blue-50">
                <div className="text-2xl font-bold text-blue-700">{stats.nouveau}</div>
                <div className="text-sm text-blue-600">Nouveaux</div>
              </Card>
              <Card className="p-4 border-orange-200 bg-orange-50">
                <div className="text-2xl font-bold text-orange-700">{stats.relance}</div>
                <div className="text-sm text-orange-600">À relancer</div>
              </Card>
              <Card className="p-4 border-green-200 bg-green-50">
                <div className="text-2xl font-bold text-green-700">{stats.converti}</div>
                <div className="text-sm text-green-600">Convertis</div>
              </Card>
              <Card className="p-4 border-gray-200">
                <div className="text-2xl font-bold text-gray-700">{stats.perdu}</div>
                <div className="text-sm text-gray-600">Perdus</div>
              </Card>
            </div>
          )}

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

      {isLoading ? (
        <Card>
          <CardContent className="p-6 space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </CardContent>
        </Card>
      ) : filteredProspects.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aucun prospect"
          description="Ajoutez des prospects pour suivre vos opportunités commerciales."
          action={
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un prospect
            </Button>
          }
        />
      ) : isMobile ? (
        <div className="space-y-3">
          {filteredProspects.map((prospect) => (
            <Card key={prospect.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="font-semibold">
                    {prospect.prenom} {prospect.nom}
                  </div>
                  <div className="flex gap-2">
                    <Badge className={STATUS_COLORS[prospect.statut]}>
                      {STATUS_ICONS[prospect.statut]}
                      <span className="ml-1">{STATUS_LABELS[prospect.statut]}</span>
                    </Badge>
                    {prospect.formation_souhaitee && (
                      <Badge variant="outline">{prospect.formation_souhaitee}</Badge>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 text-sm">
                    {prospect.telephone && (
                      <a href={`tel:${prospect.telephone}`} className="flex items-center gap-1 text-primary">
                        <Phone className="h-3 w-3" />
                        {prospect.telephone}
                      </a>
                    )}
                    {prospect.email && (
                      <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 text-primary">
                        <Mail className="h-3 w-3" />
                        {prospect.email}
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Créé {formatDistanceToNow(new Date(prospect.created_at), { addSuffix: true, locale: fr })}
                  </div>
                </div>
                <div className="flex gap-2">
                  {prospect.statut !== "converti" && (
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleConvert(prospect)}
                    >
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(prospect)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Formation</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Créé</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProspects.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-medium">
                    {prospect.prenom} {prospect.nom}
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[prospect.statut]}>
                      {STATUS_ICONS[prospect.statut]}
                      <span className="ml-1">{STATUS_LABELS[prospect.statut]}</span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {prospect.formation_souhaitee ? (
                      <Badge variant="outline">{prospect.formation_souhaitee}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {prospect.telephone ? (
                      <a href={`tel:${prospect.telephone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3 w-3" />
                        {prospect.telephone}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {prospect.email ? (
                      <a href={`mailto:${prospect.email}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Mail className="h-3 w-3" />
                        {prospect.email}
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{prospect.source || "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(prospect.created_at), { addSuffix: true, locale: fr })}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {prospect.statut !== "converti" && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleConvert(prospect)}
                          title="Convertir en contact"
                        >
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(prospect)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(prospect)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
        </TabsContent>
      </Tabs>

      <ProspectFormDialog
        open={formOpen}
        onOpenChange={handleFormClose}
        prospect={editingProspect}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce prospect ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action masquera le prospect "{selectedProspect?.prenom} {selectedProspect?.nom}".
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

      {/* Convert Confirmation */}
      <AlertDialog open={convertDialogOpen} onOpenChange={setConvertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convertir en contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le prospect "{selectedProspect?.prenom} {selectedProspect?.nom}" sera converti en contact.
              Ses informations (nom, prénom, téléphone, email, formation) seront automatiquement reprises.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmConvert}>
              <UserCheck className="h-4 w-4 mr-2" />
              Convertir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
