import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  Plus, 
  FileText, 
  History, 
  CheckCircle2, 
  Clock,
  Edit,
  Loader2,
  Users,
  Play
} from "lucide-react";
import { useCharterManagement } from "@/hooks/useSecurityCharter";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const AVAILABLE_ROLES = [
  { id: "admin", label: "Administrateur" },
  { id: "staff", label: "Secrétariat" },
  { id: "formateur", label: "Formateur" },
  { id: "super_admin", label: "Super Admin" },
];

export function SuperAdminCharter() {
  const { 
    charters, 
    acceptances, 
    isLoading, 
    createCharter, 
    updateCharter,
    activateCharter,
    isCreating,
    isActivating 
  } = useCharterManagement();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCharter, setEditingCharter] = useState<any>(null);
  const [formData, setFormData] = useState({
    titre: "Charte de Sécurité Interne",
    contenu: "",
    roles_requis: ["admin", "staff", "formateur"],
  });

  const handleCreate = async () => {
    try {
      await createCharter(formData);
      toast.success("Charte créée avec succès");
      setIsCreateDialogOpen(false);
      setFormData({
        titre: "Charte de Sécurité Interne",
        contenu: "",
        roles_requis: ["admin", "staff", "formateur"],
      });
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleUpdate = async () => {
    if (!editingCharter) return;
    try {
      await updateCharter({
        id: editingCharter.id,
        titre: formData.titre,
        contenu: formData.contenu,
        roles_requis: formData.roles_requis,
      });
      toast.success("Charte mise à jour");
      setIsEditDialogOpen(false);
      setEditingCharter(null);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleActivate = async (charterId: string) => {
    try {
      await activateCharter(charterId);
      toast.success("Nouvelle version de la charte activée. Tous les utilisateurs devront la ré-accepter.");
    } catch (error) {
      toast.error("Erreur lors de l'activation");
    }
  };

  const openEditDialog = (charter: any) => {
    setEditingCharter(charter);
    setFormData({
      titre: charter.titre,
      contenu: charter.contenu,
      roles_requis: charter.roles_requis || [],
    });
    setIsEditDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-500/30 dark:text-emerald-400">Active</Badge>;
      case "draft":
        return <Badge variant="outline">Brouillon</Badge>;
      case "archived":
        return <Badge variant="secondary">Archivée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const toggleRole = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      roles_requis: prev.roles_requis.includes(roleId)
        ? prev.roles_requis.filter((r) => r !== roleId)
        : [...prev.roles_requis, roleId],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-superadmin-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-superadmin-foreground">Charte de Sécurité</h1>
          <p className="text-superadmin-muted">Gérez les versions de la charte et suivez les acceptations</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-superadmin-primary hover:bg-superadmin-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle version</DialogTitle>
              <DialogDescription>
                Créez une nouvelle version de la charte. Elle sera en brouillon jusqu'à activation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="titre">Titre</Label>
                <Input
                  id="titre"
                  value={formData.titre}
                  onChange={(e) => setFormData((prev) => ({ ...prev, titre: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contenu">Contenu (Markdown supporté)</Label>
                <Textarea
                  id="contenu"
                  value={formData.contenu}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contenu: e.target.value }))}
                  rows={15}
                  placeholder="# Titre&#10;## Section&#10;- Point 1&#10;- Point 2"
                />
              </div>
              <div className="space-y-2">
                <Label>Rôles concernés</Label>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_ROLES.map((role) => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.roles_requis.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <Label htmlFor={`role-${role.id}`} className="cursor-pointer">
                        {role.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !formData.contenu}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Créer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList className="bg-superadmin-card border border-superadmin-border">
          <TabsTrigger value="versions" className="data-[state=active]:bg-superadmin-primary data-[state=active]:text-superadmin-primary-foreground">
            <FileText className="h-4 w-4 mr-2" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="acceptances" className="data-[state=active]:bg-superadmin-primary data-[state=active]:text-superadmin-primary-foreground">
            <History className="h-4 w-4 mr-2" />
            Historique des acceptations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="versions">
          <Card className="bg-superadmin-card border-superadmin-border">
            <CardHeader>
              <CardTitle className="text-superadmin-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-superadmin-primary" />
                Versions de la charte
              </CardTitle>
              <CardDescription className="text-superadmin-muted">
                Gérez les différentes versions de la charte de sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {charters && charters.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-superadmin-border">
                      <TableHead className="text-superadmin-muted">Version</TableHead>
                      <TableHead className="text-superadmin-muted">Titre</TableHead>
                      <TableHead className="text-superadmin-muted">Statut</TableHead>
                      <TableHead className="text-superadmin-muted">Rôles</TableHead>
                      <TableHead className="text-superadmin-muted">Date</TableHead>
                      <TableHead className="text-superadmin-muted text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {charters.map((charter) => (
                      <TableRow key={charter.id} className="border-superadmin-border">
                        <TableCell className="text-superadmin-foreground font-medium">
                          v{charter.version}
                        </TableCell>
                        <TableCell className="text-superadmin-foreground">
                          {charter.titre}
                        </TableCell>
                        <TableCell>{getStatusBadge(charter.status)}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {charter.roles_requis?.map((role: string) => (
                              <Badge key={role} variant="outline" className="text-xs">
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-superadmin-muted">
                          {format(new Date(charter.created_at), "dd MMM yyyy", { locale: fr })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(charter)}
                              disabled={charter.status === "archived"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {charter.status === "draft" && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
                                    <Play className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Activer cette version ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      L'activation de cette version archivera la version active actuelle. 
                                      Tous les utilisateurs devront ré-accepter la nouvelle charte.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleActivate(charter.id)}
                                      disabled={isActivating}
                                    >
                                      Activer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-superadmin-muted">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune version de charte créée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acceptances">
          <Card className="bg-superadmin-card border-superadmin-border">
            <CardHeader>
              <CardTitle className="text-superadmin-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-superadmin-primary" />
                Historique des acceptations
              </CardTitle>
              <CardDescription className="text-superadmin-muted">
                Journal de toutes les acceptations de la charte
              </CardDescription>
            </CardHeader>
            <CardContent>
              {acceptances && acceptances.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-superadmin-border">
                        <TableHead className="text-superadmin-muted">Utilisateur</TableHead>
                        <TableHead className="text-superadmin-muted">Rôle</TableHead>
                        <TableHead className="text-superadmin-muted">Version</TableHead>
                        <TableHead className="text-superadmin-muted">Date d'acceptation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {acceptances.map((acceptance) => (
                        <TableRow key={acceptance.id} className="border-superadmin-border">
                          <TableCell className="text-superadmin-foreground">
                            {acceptance.user_id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{acceptance.role_at_acceptance}</Badge>
                          </TableCell>
                          <TableCell className="text-superadmin-muted">
                            v{(acceptance as any).security_charters?.version || "?"}
                          </TableCell>
                          <TableCell className="text-superadmin-muted">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              {format(new Date(acceptance.accepted_at), "dd MMM yyyy à HH:mm", {
                                locale: fr,
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-superadmin-muted">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Aucune acceptation enregistrée</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier la charte</DialogTitle>
            <DialogDescription>
              Modifiez le contenu de la charte. Les modifications prendront effet immédiatement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="edit-titre">Titre</Label>
              <Input
                id="edit-titre"
                value={formData.titre}
                onChange={(e) => setFormData((prev) => ({ ...prev, titre: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contenu">Contenu</Label>
              <Textarea
                id="edit-contenu"
                value={formData.contenu}
                onChange={(e) => setFormData((prev) => ({ ...prev, contenu: e.target.value }))}
                rows={15}
              />
            </div>
            <div className="space-y-2">
              <Label>Rôles concernés</Label>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_ROLES.map((role) => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-role-${role.id}`}
                      checked={formData.roles_requis.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <Label htmlFor={`edit-role-${role.id}`} className="cursor-pointer">
                      {role.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
