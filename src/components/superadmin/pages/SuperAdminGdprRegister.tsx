import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Database, 
  Plus, 
  Edit, 
  Archive, 
  FileDown, 
  History, 
  Loader2,
  Shield,
  Clock,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useGdprProcessingRegister, GdprProcessing, GdprProcessingHistory } from "@/hooks/useGdprProcessingRegister";
import { generateGdprRegisterPdf } from "@/lib/gdpr-register-pdf-generator";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const LEGAL_BASES = [
  "Consentement",
  "Exécution du contrat",
  "Obligation légale",
  "Intérêt légitime",
  "Mission d'intérêt public",
  "Sauvegarde des intérêts vitaux",
];

const DEFAULT_CATEGORIES_PERSONNES = [
  "Apprenants",
  "Candidats",
  "Formateurs",
  "Personnel interne",
  "Partenaires",
  "Entreprises clientes",
];

export default function SuperAdminGdprRegister() {
  const {
    activeProcessings,
    archivedProcessings,
    isLoading,
    activeCount,
    archivedCount,
    getProcessingHistory,
    createProcessing,
    updateProcessing,
    archiveProcessing,
    isCreating,
    isUpdating,
    isArchiving,
  } = useGdprProcessingRegister();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProcessing, setEditingProcessing] = useState<GdprProcessing | null>(null);
  const [viewingProcessing, setViewingProcessing] = useState<GdprProcessing | null>(null);
  const [historyData, setHistoryData] = useState<GdprProcessingHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    nom_traitement: "",
    description: "",
    finalites: "",
    base_legale: "Exécution du contrat",
    categories_personnes: [] as string[],
    categories_donnees: [] as string[],
    destinataires: [] as string[],
    delais_conservation: "",
    mesures_securite: [] as string[],
    responsable_traitement: "",
    source_donnees: "",
    decisions_automatisees: false,
    analyse_impact_requise: false,
  });

  const resetForm = () => {
    setFormData({
      code: "",
      nom_traitement: "",
      description: "",
      finalites: "",
      base_legale: "Exécution du contrat",
      categories_personnes: [],
      categories_donnees: [],
      destinataires: [],
      delais_conservation: "",
      mesures_securite: [],
      responsable_traitement: "",
      source_donnees: "",
      decisions_automatisees: false,
      analyse_impact_requise: false,
    });
  };

  const handleCreate = async () => {
    try {
      await createProcessing({
        ...formData,
        statut: 'actif',
        transferts_hors_ue: [],
        sous_traitants: [],
        date_mise_en_oeuvre: null,
      });
      toast.success("Traitement créé avec succès");
      setIsCreateOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleUpdate = async () => {
    if (!editingProcessing) return;
    try {
      await updateProcessing({
        id: editingProcessing.id,
        ...formData,
      });
      toast.success("Traitement mis à jour");
      setEditingProcessing(null);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleArchive = async (processing: GdprProcessing) => {
    try {
      await archiveProcessing(processing.id);
      toast.success("Traitement archivé");
    } catch (error) {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const handleViewHistory = async (processing: GdprProcessing) => {
    setViewingProcessing(processing);
    setHistoryLoading(true);
    try {
      const history = await getProcessingHistory(processing.id);
      setHistoryData(history);
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique");
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleExportPdf = () => {
    const doc = generateGdprRegisterPdf(activeProcessings || [], "CampusT3P");
    doc.save(`registre-traitements-rgpd-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Export PDF généré");
  };

  const openEditDialog = (processing: GdprProcessing) => {
    setEditingProcessing(processing);
    setFormData({
      code: processing.code,
      nom_traitement: processing.nom_traitement,
      description: processing.description || "",
      finalites: processing.finalites,
      base_legale: processing.base_legale,
      categories_personnes: processing.categories_personnes || [],
      categories_donnees: processing.categories_donnees || [],
      destinataires: processing.destinataires || [],
      delais_conservation: processing.delais_conservation || "",
      mesures_securite: processing.mesures_securite || [],
      responsable_traitement: processing.responsable_traitement || "",
      source_donnees: processing.source_donnees || "",
      decisions_automatisees: processing.decisions_automatisees || false,
      analyse_impact_requise: processing.analyse_impact_requise || false,
    });
  };

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Registre des Traitements RGPD
          </h2>
          <p className="text-muted-foreground mt-1">
            Article 30 du RGPD • Audit CNIL / Qualiopi
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileDown className="mr-2 h-4 w-4" />
            Exporter PDF
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nouveau traitement
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Ajouter un traitement</DialogTitle>
                <DialogDescription>
                  Créer une nouvelle fiche de traitement conforme à l'article 30
                </DialogDescription>
              </DialogHeader>
              <ProcessingForm 
                formData={formData} 
                setFormData={setFormData}
                legalBases={LEGAL_BASES}
                categoriesPersonnes={DEFAULT_CATEGORIES_PERSONNES}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                  Annuler
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Traitements actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Archive className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{archivedCount}</p>
                <p className="text-sm text-muted-foreground">Traitements archivés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {activeProcessings?.filter(p => p.analyse_impact_requise).length || 0}
                </p>
                <p className="text-sm text-muted-foreground">AIPD requises</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Actifs ({activeCount})
          </TabsTrigger>
          <TabsTrigger value="archived" className="gap-2">
            <Archive className="h-4 w-4" />
            Archivés ({archivedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <div className="grid gap-4">
            {activeProcessings?.map((processing) => (
              <ProcessingCard
                key={processing.id}
                processing={processing}
                onEdit={() => openEditDialog(processing)}
                onArchive={() => handleArchive(processing)}
                onViewHistory={() => handleViewHistory(processing)}
                isArchiving={isArchiving}
              />
            ))}
            {activeProcessings?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun traitement actif</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="archived" className="mt-4">
          <div className="grid gap-4">
            {archivedProcessings?.map((processing) => (
              <ProcessingCard
                key={processing.id}
                processing={processing}
                onViewHistory={() => handleViewHistory(processing)}
                archived
              />
            ))}
            {archivedProcessings?.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Aucun traitement archivé</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={!!editingProcessing} onOpenChange={() => { setEditingProcessing(null); resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le traitement</DialogTitle>
            <DialogDescription>
              {editingProcessing?.code} - {editingProcessing?.nom_traitement}
            </DialogDescription>
          </DialogHeader>
          <ProcessingForm 
            formData={formData} 
            setFormData={setFormData}
            legalBases={LEGAL_BASES}
            categoriesPersonnes={DEFAULT_CATEGORIES_PERSONNES}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditingProcessing(null); resetForm(); }}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Sheet */}
      <Sheet open={!!viewingProcessing} onOpenChange={() => setViewingProcessing(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Historique des modifications</SheetTitle>
            <SheetDescription>
              {viewingProcessing?.code} - {viewingProcessing?.nom_traitement}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {historyLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : historyData.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-4">
                  {historyData.map((item) => (
                    <Card key={item.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={
                            item.action === 'created' ? 'default' :
                            item.action === 'archived' ? 'secondary' : 'outline'
                          }>
                            {item.action === 'created' ? 'Création' :
                             item.action === 'archived' ? 'Archivage' : 'Modification'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(item.changed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                          </span>
                        </div>
                        {item.changed_fields && item.changed_fields.length > 0 && (
                          <p className="text-sm">
                            Champs modifiés : {item.changed_fields.join(", ")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Aucun historique disponible
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Processing Card Component
function ProcessingCard({ 
  processing, 
  onEdit, 
  onArchive, 
  onViewHistory,
  archived = false,
  isArchiving = false,
}: {
  processing: GdprProcessing;
  onEdit?: () => void;
  onArchive?: () => void;
  onViewHistory: () => void;
  archived?: boolean;
  isArchiving?: boolean;
}) {
  return (
    <Card className={archived ? "opacity-60" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className="font-mono">{processing.code}</Badge>
              {processing.nom_traitement}
              {processing.analyse_impact_requise && (
                <Badge variant="destructive" className="text-xs">AIPD requise</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {processing.description}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={onViewHistory}>
              <History className="h-4 w-4" />
            </Button>
            {!archived && onEdit && (
              <Button size="icon" variant="ghost" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {!archived && onArchive && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost">
                    <Archive className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archiver ce traitement ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le traitement sera conservé dans l'historique mais ne sera plus affiché comme actif.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={onArchive} disabled={isArchiving}>
                      Archiver
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="font-medium text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Base légale
            </p>
            <p>{processing.base_legale}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" /> Personnes concernées
            </p>
            <p>{processing.categories_personnes?.join(", ") || "-"}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Conservation
            </p>
            <p>{processing.delais_conservation || "-"}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Responsable</p>
            <p>{processing.responsable_traitement || "-"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Form Component
function ProcessingForm({
  formData,
  setFormData,
  legalBases,
  categoriesPersonnes,
}: {
  formData: any;
  setFormData: (data: any) => void;
  legalBases: string[];
  categoriesPersonnes: string[];
}) {
  return (
    <div className="space-y-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Code *</Label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            placeholder="TR-XXX"
          />
        </div>
        <div className="space-y-2">
          <Label>Nom du traitement *</Label>
          <Input
            value={formData.nom_traitement}
            onChange={(e) => setFormData({ ...formData, nom_traitement: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Finalités *</Label>
        <Textarea
          value={formData.finalites}
          onChange={(e) => setFormData({ ...formData, finalites: e.target.value })}
          rows={2}
          placeholder="Objectifs du traitement"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Base légale *</Label>
          <select
            value={formData.base_legale}
            onChange={(e) => setFormData({ ...formData, base_legale: e.target.value })}
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {legalBases.map(base => (
              <option key={base} value={base}>{base}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Délais de conservation</Label>
          <Input
            value={formData.delais_conservation}
            onChange={(e) => setFormData({ ...formData, delais_conservation: e.target.value })}
            placeholder="Ex: 5 ans après fin de contrat"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Catégories de personnes (séparées par virgule)</Label>
        <Input
          value={formData.categories_personnes.join(", ")}
          onChange={(e) => setFormData({ 
            ...formData, 
            categories_personnes: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean)
          })}
          placeholder="Apprenants, Formateurs, ..."
        />
      </div>

      <div className="space-y-2">
        <Label>Catégories de données (séparées par virgule)</Label>
        <Input
          value={formData.categories_donnees.join(", ")}
          onChange={(e) => setFormData({ 
            ...formData, 
            categories_donnees: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean)
          })}
          placeholder="Nom, prénom, email, ..."
        />
      </div>

      <div className="space-y-2">
        <Label>Destinataires (séparés par virgule)</Label>
        <Input
          value={formData.destinataires.join(", ")}
          onChange={(e) => setFormData({ 
            ...formData, 
            destinataires: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean)
          })}
          placeholder="Personnel administratif, Formateurs, ..."
        />
      </div>

      <div className="space-y-2">
        <Label>Mesures de sécurité (séparées par virgule)</Label>
        <Input
          value={formData.mesures_securite.join(", ")}
          onChange={(e) => setFormData({ 
            ...formData, 
            mesures_securite: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean)
          })}
          placeholder="Chiffrement TLS, Contrôle d'accès, ..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Responsable du traitement</Label>
          <Input
            value={formData.responsable_traitement}
            onChange={(e) => setFormData({ ...formData, responsable_traitement: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Source des données</Label>
          <Input
            value={formData.source_donnees}
            onChange={(e) => setFormData({ ...formData, source_donnees: e.target.value })}
            placeholder="Formulaire d'inscription, ..."
          />
        </div>
      </div>

      <div className="flex gap-6 pt-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.decisions_automatisees}
            onChange={(e) => setFormData({ ...formData, decisions_automatisees: e.target.checked })}
            className="rounded border-input"
          />
          <span className="text-sm">Décisions automatisées</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.analyse_impact_requise}
            onChange={(e) => setFormData({ ...formData, analyse_impact_requise: e.target.checked })}
            className="rounded border-input"
          />
          <span className="text-sm">AIPD requise</span>
        </label>
      </div>
    </div>
  );
}
