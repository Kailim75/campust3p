import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { FileText, Plus, CheckCircle2, Edit, Power, Loader2, History, Users } from "lucide-react";
import { useLegalDocumentsManagement } from "@/hooks/useLegalDocuments";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const AVAILABLE_ROLES = [
  { id: "admin", label: "Administrateur" },
  { id: "staff", label: "Staff" },
  { id: "formateur", label: "Formateur" },
  { id: "secretariat", label: "Secrétariat" },
];

export default function SuperAdminPrivacyPolicy() {
  const { 
    privacyPolicies, 
    acceptances,
    isLoading,
    createDocument,
    updateDocument,
    activateDocument,
    isCreating,
    isUpdating,
    isActivating,
  } = useLegalDocumentsManagement();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<any>(null);
  const [formData, setFormData] = useState({
    titre: "Politique de Confidentialité RGPD",
    contenu: "",
    roles_requis: ["admin", "staff", "formateur"] as string[],
  });

  const handleCreate = async () => {
    try {
      await createDocument({
        ...formData,
        document_type: 'privacy_policy',
      });
      toast.success("Politique créée avec succès");
      setIsCreateOpen(false);
      setFormData({
        titre: "Politique de Confidentialité RGPD",
        contenu: "",
        roles_requis: ["admin", "staff", "formateur"],
      });
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleUpdate = async () => {
    if (!editingPolicy) return;
    try {
      await updateDocument({
        id: editingPolicy.id,
        titre: formData.titre,
        contenu: formData.contenu,
        roles_requis: formData.roles_requis,
      });
      toast.success("Politique mise à jour");
      setEditingPolicy(null);
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleActivate = async (policy: any) => {
    try {
      await activateDocument({ documentId: policy.id, documentType: 'privacy_policy' });
      toast.success("Politique activée - Tous les utilisateurs devront l'accepter");
    } catch (error) {
      toast.error("Erreur lors de l'activation");
    }
  };

  const toggleRole = (roleId: string) => {
    setFormData(prev => ({
      ...prev,
      roles_requis: prev.roles_requis.includes(roleId)
        ? prev.roles_requis.filter(r => r !== roleId)
        : [...prev.roles_requis, roleId],
    }));
  };

  const policyAcceptances = acceptances?.filter(
    a => a.security_charters?.document_type === 'privacy_policy'
  ) || [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Politique de Confidentialité RGPD
          </h2>
          <p className="text-muted-foreground mt-1">
            Gérez les versions de la politique de confidentialité et suivez les acceptations
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Créer une nouvelle version</DialogTitle>
              <DialogDescription>
                La nouvelle version devra être activée manuellement
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Contenu (Markdown supporté)</Label>
                <Textarea
                  value={formData.contenu}
                  onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                  placeholder="# Politique de Confidentialité&#10;&#10;## Article 1 - ..."
                />
              </div>
              <div className="space-y-2">
                <Label>Rôles concernés</Label>
                <div className="flex flex-wrap gap-3">
                  {AVAILABLE_ROLES.map(role => (
                    <div key={role.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-${role.id}`}
                        checked={formData.roles_requis.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <label htmlFor={`role-${role.id}`} className="text-sm cursor-pointer">
                        {role.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Créer (brouillon)
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="versions">
        <TabsList>
          <TabsTrigger value="versions" className="gap-2">
            <History className="h-4 w-4" />
            Versions
          </TabsTrigger>
          <TabsTrigger value="acceptances" className="gap-2">
            <Users className="h-4 w-4" />
            Historique des acceptations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="mt-4">
          <div className="grid gap-4">
            {privacyPolicies?.map((policy) => (
              <Card key={policy.id} className={policy.status === 'active' ? 'border-blue-500 border-2' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {policy.titre}
                        <Badge variant={
                          policy.status === 'active' ? 'default' : 
                          policy.status === 'draft' ? 'secondary' : 'outline'
                        }>
                          {policy.status === 'active' ? 'Active' : 
                           policy.status === 'draft' ? 'Brouillon' : 'Archivée'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Version {policy.version} • Créée le {format(new Date(policy.created_at), "dd MMMM yyyy", { locale: fr })}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {policy.status === 'draft' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPolicy(policy);
                              setFormData({
                                titre: policy.titre,
                                contenu: policy.contenu,
                                roles_requis: policy.roles_requis || [],
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="default">
                                <Power className="mr-1 h-4 w-4" />
                                Activer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Activer cette version ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tous les utilisateurs devront accepter cette nouvelle version 
                                  de la politique de confidentialité lors de leur prochaine connexion.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleActivate(policy)}
                                  disabled={isActivating}
                                >
                                  {isActivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                  Activer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {policy.status === 'active' && (
                        <Badge variant="outline" className="text-primary border-primary">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          En vigueur
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-32 rounded border p-3 bg-muted/30">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {policy.contenu.slice(0, 500)}...
                    </pre>
                  </ScrollArea>
                  <div className="mt-2 flex gap-2">
                    {policy.roles_requis?.map((role: string) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {privacyPolicies?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucune politique de confidentialité</p>
                  <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer la première version
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="acceptances" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Historique des acceptations</CardTitle>
              <CardDescription>
                Liste des utilisateurs ayant accepté la politique de confidentialité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {policyAcceptances.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Date d'acceptation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policyAcceptances.map((acceptance) => (
                      <TableRow key={acceptance.id}>
                        <TableCell className="font-medium">
                          {acceptance.user_id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{acceptance.role_at_acceptance}</Badge>
                        </TableCell>
                        <TableCell>
                          v{acceptance.security_charters?.version}
                        </TableCell>
                        <TableCell>
                          {format(new Date(acceptance.accepted_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucune acceptation enregistrée
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingPolicy} onOpenChange={() => setEditingPolicy(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Modifier la politique</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={formData.titre}
                onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                value={formData.contenu}
                onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Rôles concernés</Label>
              <div className="flex flex-wrap gap-3">
                {AVAILABLE_ROLES.map(role => (
                  <div key={role.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`edit-role-${role.id}`}
                      checked={formData.roles_requis.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <label htmlFor={`edit-role-${role.id}`} className="text-sm cursor-pointer">
                      {role.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPolicy(null)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
