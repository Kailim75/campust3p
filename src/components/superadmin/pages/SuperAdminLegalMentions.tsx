import { useState } from "react";
import { useLegalMentions, LegalMention } from "@/hooks/useLegalMentions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Edit,
  Check,
  History,
  Eye,
  Loader2,
  Building2,
  Globe,
  Server,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  active: { label: "Publiée", variant: "default" },
  archived: { label: "Archivée", variant: "outline" },
};

export default function SuperAdminLegalMentions() {
  const {
    mentions,
    isLoading,
    createMention,
    updateMention,
    activateMention,
    isCreating,
    isUpdating,
    isActivating,
    useHistory,
  } = useLegalMentions();

  const [selectedMention, setSelectedMention] = useState<LegalMention | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showHistorySheet, setShowHistorySheet] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [formData, setFormData] = useState<Partial<LegalMention>>({});

  const { data: history = [] } = useHistory(selectedMention?.id || null);

  const activeMention = mentions.find((m) => m.status === "active");
  const draftMentions = mentions.filter((m) => m.status === "draft");
  const archivedMentions = mentions.filter((m) => m.status === "archived");

  const handleCreate = () => {
    setSelectedMention(null);
    setFormData({
      contenu: `# Mentions Légales

## Éditeur du site

Le présent site est édité par **{RAISON_SOCIALE}**, {FORME_JURIDIQUE}.

**Siège social** : {SIEGE_SOCIAL}

**SIRET** : {SIRET}

**Numéro de Déclaration d'Activité (NDA)** : {NDA}

**Directeur de la publication** : {DIRECTEUR_PUBLICATION}

**Contact** : {EMAIL_CONTACT} | {TELEPHONE_CONTACT}

## Hébergement

Ce site est hébergé par :

**{HEBERGEUR_NOM}**

{HEBERGEUR_ADRESSE}

{HEBERGEUR_CONTACT}

## Propriété intellectuelle

L'ensemble du contenu de ce site (textes, images, vidéos, logos, etc.) est protégé par le droit d'auteur.

## Protection des données personnelles

Conformément au RGPD, consultez notre [Politique de Confidentialité](/politique-confidentialite).

---

*Dernière mise à jour : {DATE_MISE_A_JOUR}*`,
    });
    setIsEditing(true);
  };

  const handleEdit = (mention: LegalMention) => {
    setSelectedMention(mention);
    setFormData(mention);
    setIsEditing(true);
  };

  const handleSave = () => {
    if (selectedMention) {
      updateMention({ id: selectedMention.id, ...formData });
    } else {
      createMention(formData);
    }
    setIsEditing(false);
    setSelectedMention(null);
    setFormData({});
  };

  const handleActivate = () => {
    if (selectedMention) {
      activateMention(selectedMention.id);
      setShowActivateDialog(false);
      setSelectedMention(null);
    }
  };

  const handleViewHistory = (mention: LegalMention) => {
    setSelectedMention(mention);
    setShowHistorySheet(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mentions Légales</h2>
          <p className="text-muted-foreground">
            Gestion des mentions légales obligatoires (Article 6 LCEN)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href="/mentions-legales" target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-2" />
              Voir la page
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle version
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Version active</CardTitle>
            <Check className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeMention ? `v${activeMention.version}` : "Aucune"}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeMention?.activated_at
                ? `Publiée le ${format(new Date(activeMention.activated_at), "dd/MM/yyyy", { locale: fr })}`
                : "Non publiée"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Brouillons</CardTitle>
            <Edit className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftMentions.length}</div>
            <p className="text-xs text-muted-foreground">En attente de publication</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Historique</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{archivedMentions.length}</div>
            <p className="text-xs text-muted-foreground">Versions archivées</p>
          </CardContent>
        </Card>
      </div>

      {/* Editing Form */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedMention ? `Modifier la version ${selectedMention.version}` : "Nouvelle version"}
            </CardTitle>
            <CardDescription>
              Utilisez les placeholders {"{RAISON_SOCIALE}"}, {"{SIRET}"}, etc. pour insérer les données dynamiques
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs defaultValue="info" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">
                  <Building2 className="h-4 w-4 mr-2" />
                  Informations
                </TabsTrigger>
                <TabsTrigger value="hebergeur">
                  <Server className="h-4 w-4 mr-2" />
                  Hébergeur
                </TabsTrigger>
                <TabsTrigger value="contenu">
                  <FileText className="h-4 w-4 mr-2" />
                  Contenu
                </TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="raison_sociale">Raison sociale</Label>
                    <Input
                      id="raison_sociale"
                      value={formData.raison_sociale || ""}
                      onChange={(e) => setFormData({ ...formData, raison_sociale: e.target.value })}
                      placeholder="Ex: CampusT3P SAS"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forme_juridique">Forme juridique</Label>
                    <Input
                      id="forme_juridique"
                      value={formData.forme_juridique || ""}
                      onChange={(e) => setFormData({ ...formData, forme_juridique: e.target.value })}
                      placeholder="Ex: SAS au capital de 10 000€"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siege_social">Siège social</Label>
                    <Input
                      id="siege_social"
                      value={formData.siege_social || ""}
                      onChange={(e) => setFormData({ ...formData, siege_social: e.target.value })}
                      placeholder="Adresse complète"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="siret">SIRET</Label>
                    <Input
                      id="siret"
                      value={formData.siret || ""}
                      onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                      placeholder="Ex: 123 456 789 00012"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rcs">RCS</Label>
                    <Input
                      id="rcs"
                      value={formData.rcs || ""}
                      onChange={(e) => setFormData({ ...formData, rcs: e.target.value })}
                      placeholder="Ex: RCS Paris B 123 456 789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nda">N° Déclaration d'Activité (NDA)</Label>
                    <Input
                      id="nda"
                      value={formData.nda || ""}
                      onChange={(e) => setFormData({ ...formData, nda: e.target.value })}
                      placeholder="Ex: 11 75 12345 75"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="directeur_publication">Directeur de publication</Label>
                    <Input
                      id="directeur_publication"
                      value={formData.directeur_publication || ""}
                      onChange={(e) => setFormData({ ...formData, directeur_publication: e.target.value })}
                      placeholder="Nom du responsable"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email_contact">Email de contact</Label>
                    <Input
                      id="email_contact"
                      type="email"
                      value={formData.email_contact || ""}
                      onChange={(e) => setFormData({ ...formData, email_contact: e.target.value })}
                      placeholder="contact@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone_contact">Téléphone</Label>
                    <Input
                      id="telephone_contact"
                      value={formData.telephone_contact || ""}
                      onChange={(e) => setFormData({ ...formData, telephone_contact: e.target.value })}
                      placeholder="Ex: 01 23 45 67 89"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hebergeur" className="space-y-4 pt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="hebergeur_nom">Nom de l'hébergeur</Label>
                    <Input
                      id="hebergeur_nom"
                      value={formData.hebergeur_nom || ""}
                      onChange={(e) => setFormData({ ...formData, hebergeur_nom: e.target.value })}
                      placeholder="Ex: Supabase Inc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hebergeur_contact">Contact hébergeur</Label>
                    <Input
                      id="hebergeur_contact"
                      value={formData.hebergeur_contact || ""}
                      onChange={(e) => setFormData({ ...formData, hebergeur_contact: e.target.value })}
                      placeholder="Email ou téléphone"
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="hebergeur_adresse">Adresse de l'hébergeur</Label>
                    <Input
                      id="hebergeur_adresse"
                      value={formData.hebergeur_adresse || ""}
                      onChange={(e) => setFormData({ ...formData, hebergeur_adresse: e.target.value })}
                      placeholder="Adresse complète"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contenu" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="contenu">Contenu Markdown</Label>
                  <Textarea
                    id="contenu"
                    value={formData.contenu || ""}
                    onChange={(e) => setFormData({ ...formData, contenu: e.target.value })}
                    placeholder="Contenu des mentions légales en Markdown..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Placeholders disponibles : {"{RAISON_SOCIALE}"}, {"{FORME_JURIDIQUE}"}, {"{SIEGE_SOCIAL}"}, {"{SIRET}"}, {"{RCS}"}, {"{NDA}"}, {"{DIRECTEUR_PUBLICATION}"}, {"{EMAIL_CONTACT}"}, {"{TELEPHONE_CONTACT}"}, {"{HEBERGEUR_NOM}"}, {"{HEBERGEUR_ADRESSE}"}, {"{HEBERGEUR_CONTACT}"}, {"{DATE_MISE_A_JOUR}"}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedMention(null);
                  setFormData({});
                }}
              >
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isCreating || isUpdating}>
                {(isCreating || isUpdating) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Versions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Toutes les versions</CardTitle>
          <CardDescription>Historique complet des mentions légales</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Publiée le</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mentions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Aucune mention légale créée
                  </TableCell>
                </TableRow>
              ) : (
                mentions.map((mention) => (
                  <TableRow key={mention.id}>
                    <TableCell className="font-medium">v{mention.version}</TableCell>
                    <TableCell>
                      <Badge variant={statusLabels[mention.status]?.variant || "secondary"}>
                        {statusLabels[mention.status]?.label || mention.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(mention.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      {mention.activated_at
                        ? format(new Date(mention.activated_at), "dd/MM/yyyy HH:mm", { locale: fr })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewHistory(mention)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {mention.status === "draft" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(mention)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-primary"
                          onClick={() => {
                            setSelectedMention(mention);
                            setShowActivateDialog(true);
                          }}
                        >
                              <Check className="h-4 w-4 text-green-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* History Sheet */}
      <Sheet open={showHistorySheet} onOpenChange={setShowHistorySheet}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Historique des modifications</SheetTitle>
            <SheetDescription>
              Version {selectedMention?.version} - Toutes les modifications
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-4 pr-4">
              {history.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Aucun historique disponible
                </p>
              ) : (
                history.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">{entry.action}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                      </span>
                    </div>
                    {entry.changed_fields && entry.changed_fields.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        Champs modifiés : {entry.changed_fields.join(", ")}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Activate Dialog */}
      <AlertDialog open={showActivateDialog} onOpenChange={setShowActivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publier cette version ?</AlertDialogTitle>
            <AlertDialogDescription>
              La version {selectedMention?.version} sera publiée et visible par tous les utilisateurs.
              La version actuellement active sera automatiquement archivée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivate} disabled={isActivating}>
              {isActivating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Publier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
