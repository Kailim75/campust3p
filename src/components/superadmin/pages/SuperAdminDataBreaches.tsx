import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertTriangle, 
  Plus, 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle,
  FileText,
  History,
  Bell,
  Users,
  Calendar
} from "lucide-react";
import { useDataBreaches, DataBreach, BreachSeverity, BreachType, BreachStatus, BreachOrigin, RiskLevel } from "@/hooks/useDataBreaches";
import { toast } from "sonner";
import { format, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";

const SEVERITY_CONFIG: Record<BreachSeverity, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  faible: { label: "Faible", variant: "secondary", color: "text-muted-foreground" },
  moyenne: { label: "Moyenne", variant: "outline", color: "text-warning" },
  elevee: { label: "Élevée", variant: "destructive", color: "text-destructive" },
  critique: { label: "Critique", variant: "destructive", color: "text-destructive" },
};

const STATUS_CONFIG: Record<BreachStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  detectee: { label: "Détectée", variant: "destructive" },
  en_analyse: { label: "En analyse", variant: "outline" },
  notifiee_cnil: { label: "Notifiée CNIL", variant: "secondary" },
  notifiee_personnes: { label: "Personnes notifiées", variant: "secondary" },
  corrigee: { label: "Corrigée", variant: "default" },
  cloturee: { label: "Clôturée", variant: "secondary" },
};

const TYPE_LABELS: Record<BreachType, string> = {
  confidentialite: "Confidentialité",
  integrite: "Intégrité",
  disponibilite: "Disponibilité",
};

const ORIGIN_LABELS: Record<BreachOrigin, string> = {
  externe: "Externe (cyberattaque)",
  interne: "Interne (malveillance)",
  sous_traitant: "Sous-traitant",
  erreur_humaine: "Erreur humaine",
  technique: "Défaillance technique",
  autre: "Autre",
};

export default function SuperAdminDataBreaches() {
  const { 
    breaches, 
    activeBreaches, 
    criticalBreaches, 
    pendingCnilNotification,
    isLoading, 
    generateBreachCode,
    createBreach, 
    updateBreach,
    closeBreach,
    isCreating,
    isUpdating 
  } = useDataBreaches();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedBreach, setSelectedBreach] = useState<DataBreach | null>(null);
  const [activeTab, setActiveTab] = useState("actives");

  // Form state
  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    type_violation: "confidentialite" as BreachType,
    origine: "externe" as BreachOrigin,
    severite: "moyenne" as BreachSeverity,
    detecte_par: "",
    categories_donnees: [] as string[],
    categories_personnes: [] as string[],
    nombre_personnes_affectees: 0,
    risque_pour_personnes: "faible" as RiskLevel,
    mesures_immediates: "",
    notification_cnil_requise: false,
    notification_personnes_requise: false,
  });

  const handleCreateBreach = async () => {
    try {
      const code = await generateBreachCode();
      await createBreach({
        code,
        ...formData,
        date_detection: new Date().toISOString(),
        date_notification_cnil: null,
        date_notification_personnes: null,
        mesures_correctives: null,
        mesures_preventives: null,
        justification_non_notification: null,
        statut: 'detectee',
        responsable_traitement: null,
        documents_associes: null,
      });
      toast.success("Violation de données enregistrée");
      setShowCreateDialog(false);
      resetForm();
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const handleUpdateStatus = async (breach: DataBreach, newStatus: BreachStatus) => {
    try {
      const updates: Partial<DataBreach> & { id: string } = { id: breach.id, statut: newStatus };
      
      if (newStatus === 'notifiee_cnil') {
        updates.date_notification_cnil = new Date().toISOString();
      } else if (newStatus === 'notifiee_personnes') {
        updates.date_notification_personnes = new Date().toISOString();
      }
      
      await updateBreach(updates);
      toast.success("Statut mis à jour");
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const handleCloseBreach = async (id: string) => {
    try {
      await closeBreach(id);
      toast.success("Violation clôturée");
      setSelectedBreach(null);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      titre: "",
      description: "",
      type_violation: "confidentialite",
      origine: "externe",
      severite: "moyenne",
      detecte_par: "",
      categories_donnees: [],
      categories_personnes: [],
      nombre_personnes_affectees: 0,
      risque_pour_personnes: "faible",
      mesures_immediates: "",
      notification_cnil_requise: false,
      notification_personnes_requise: false,
    });
  };

  const getHoursUntilDeadline = (detection: string) => {
    const detectionDate = new Date(detection);
    const deadline = new Date(detectionDate.getTime() + 72 * 60 * 60 * 1000);
    return differenceInHours(deadline, new Date());
  };

  const filteredBreaches = activeTab === "actives" 
    ? activeBreaches 
    : breaches?.filter(b => b.statut === 'cloturee') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="text-2xl font-bold">Gestion des Violations de Données</h1>
            <p className="text-muted-foreground">
              Procédure conforme au RGPD (Articles 33 & 34)
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Déclarer une violation
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-destructive" />
              Violations actives
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeBreaches.length}</div>
          </CardContent>
        </Card>

        <Card className={criticalBreaches.length > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Niveau critique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{criticalBreaches.length}</div>
          </CardContent>
        </Card>

        <Card className={pendingCnilNotification.length > 0 ? "border-warning" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="h-4 w-4 text-warning" />
              En attente CNIL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCnilNotification.length}</div>
            {pendingCnilNotification.length > 0 && (
              <p className="text-xs text-warning">Délai 72h en cours</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Total clôturées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {breaches?.filter(b => b.statut === 'cloturee').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert for 72h deadline */}
      {pendingCnilNotification.map(breach => {
        const hoursLeft = getHoursUntilDeadline(breach.date_detection);
        if (hoursLeft <= 72 && hoursLeft > 0) {
          return (
            <Card key={breach.id} className="border-destructive bg-destructive/10">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">
                      ⚠️ {breach.code} - Délai CNIL: {hoursLeft}h restantes
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {breach.titre} - Notification obligatoire dans les 72h
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleUpdateStatus(breach, 'notifiee_cnil')}
                  >
                    Marquer notifiée
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="actives">
            Violations actives ({activeBreaches.length})
          </TabsTrigger>
          <TabsTrigger value="cloturees">
            Historique clôturé
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : filteredBreaches.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune violation {activeTab === "actives" ? "active" : "clôturée"}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredBreaches.map(breach => (
                <Card 
                  key={breach.id} 
                  className={`cursor-pointer hover:border-primary transition-colors ${
                    breach.severite === 'critique' ? 'border-destructive' : ''
                  }`}
                  onClick={() => setSelectedBreach(breach)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">{breach.code}</span>
                          <Badge variant={SEVERITY_CONFIG[breach.severite].variant}>
                            {SEVERITY_CONFIG[breach.severite].label}
                          </Badge>
                          <Badge variant={STATUS_CONFIG[breach.statut].variant}>
                            {STATUS_CONFIG[breach.statut].label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold">{breach.titre}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {breach.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(breach.date_detection), "dd MMM yyyy HH:mm", { locale: fr })}
                          </span>
                          <span>{TYPE_LABELS[breach.type_violation]}</span>
                          {breach.nombre_personnes_affectees && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {breach.nombre_personnes_affectees} personnes
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {breach.notification_cnil_requise && !breach.date_notification_cnil && (
                          <Badge variant="destructive" className="text-xs">
                            CNIL en attente
                          </Badge>
                        )}
                        {breach.date_notification_cnil && (
                          <Badge variant="secondary" className="text-xs">
                            CNIL ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Déclarer une violation de données
            </DialogTitle>
            <DialogDescription>
              Conformément au RGPD Article 33, toute violation doit être documentée et, 
              si nécessaire, notifiée à la CNIL dans les 72 heures.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Titre de la violation *</Label>
                <Input
                  value={formData.titre}
                  onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                  placeholder="Ex: Accès non autorisé aux données"
                />
              </div>
              <div className="space-y-2">
                <Label>Détecté par</Label>
                <Input
                  value={formData.detecte_par}
                  onChange={(e) => setFormData({ ...formData, detecte_par: e.target.value })}
                  placeholder="Nom ou service"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description détaillée *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Décrivez la nature de la violation, les circonstances..."
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Type de violation *</Label>
                <Select 
                  value={formData.type_violation} 
                  onValueChange={(v) => setFormData({ ...formData, type_violation: v as BreachType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Origine</Label>
                <Select 
                  value={formData.origine} 
                  onValueChange={(v) => setFormData({ ...formData, origine: v as BreachOrigin })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORIGIN_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sévérité *</Label>
                <Select 
                  value={formData.severite} 
                  onValueChange={(v) => setFormData({ ...formData, severite: v as BreachSeverity })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEVERITY_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Nombre de personnes affectées (estimation)</Label>
                <Input
                  type="number"
                  value={formData.nombre_personnes_affectees}
                  onChange={(e) => setFormData({ ...formData, nombre_personnes_affectees: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Risque pour les personnes</Label>
                <Select 
                  value={formData.risque_pour_personnes} 
                  onValueChange={(v) => setFormData({ ...formData, risque_pour_personnes: v as RiskLevel })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucun">Aucun risque</SelectItem>
                    <SelectItem value="faible">Risque faible</SelectItem>
                    <SelectItem value="eleve">Risque élevé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Mesures immédiates prises</Label>
              <Textarea
                value={formData.mesures_immediates}
                onChange={(e) => setFormData({ ...formData, mesures_immediates: e.target.value })}
                placeholder="Actions immédiates pour limiter l'impact..."
                rows={2}
              />
            </div>

            <Card className="bg-muted/50">
              <CardContent className="py-4 space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Obligations de notification
                </h4>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notification_cnil_requise}
                      onChange={(e) => setFormData({ ...formData, notification_cnil_requise: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Notification CNIL requise (72h)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.notification_personnes_requise}
                      onChange={(e) => setFormData({ ...formData, notification_personnes_requise: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm">Notification aux personnes requise</span>
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  La notification CNIL est obligatoire sauf si la violation n'est pas susceptible 
                  d'engendrer un risque pour les droits et libertés des personnes.
                </p>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleCreateBreach} 
              disabled={isCreating || !formData.titre || !formData.description}
            >
              {isCreating ? "Enregistrement..." : "Enregistrer la violation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!selectedBreach} onOpenChange={() => setSelectedBreach(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedBreach && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm">{selectedBreach.code}</span>
                  <Badge variant={SEVERITY_CONFIG[selectedBreach.severite].variant}>
                    {SEVERITY_CONFIG[selectedBreach.severite].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>{selectedBreach.titre}</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details">
                <TabsList>
                  <TabsTrigger value="details">
                    <FileText className="h-4 w-4 mr-1" />
                    Détails
                  </TabsTrigger>
                  <TabsTrigger value="actions">
                    <Shield className="h-4 w-4 mr-1" />
                    Actions
                  </TabsTrigger>
                  <TabsTrigger value="historique">
                    <History className="h-4 w-4 mr-1" />
                    Historique
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Date de détection</Label>
                      <p className="font-medium">
                        {format(new Date(selectedBreach.date_detection), "dd MMMM yyyy à HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Statut actuel</Label>
                      <Badge variant={STATUS_CONFIG[selectedBreach.statut].variant} className="mt-1">
                        {STATUS_CONFIG[selectedBreach.statut].label}
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Type</Label>
                      <p className="font-medium">{TYPE_LABELS[selectedBreach.type_violation]}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Origine</Label>
                      <p className="font-medium">
                        {selectedBreach.origine ? ORIGIN_LABELS[selectedBreach.origine] : "-"}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Personnes affectées</Label>
                      <p className="font-medium">{selectedBreach.nombre_personnes_affectees || "Non estimé"}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Risque pour les personnes</Label>
                      <p className="font-medium capitalize">{selectedBreach.risque_pour_personnes || "-"}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="mt-1">{selectedBreach.description}</p>
                  </div>

                  {selectedBreach.mesures_immediates && (
                    <div>
                      <Label className="text-muted-foreground">Mesures immédiates</Label>
                      <p className="mt-1">{selectedBreach.mesures_immediates}</p>
                    </div>
                  )}

                  <Card className="bg-muted/50">
                    <CardContent className="py-4">
                      <h4 className="font-medium mb-3">État des notifications</h4>
                      <div className="grid gap-2 md:grid-cols-2">
                        <div className="flex items-center gap-2">
                          {selectedBreach.date_notification_cnil ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : selectedBreach.notification_cnil_requise ? (
                            <Clock className="h-4 w-4 text-destructive" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">
                            CNIL: {selectedBreach.date_notification_cnil 
                              ? format(new Date(selectedBreach.date_notification_cnil), "dd/MM/yyyy")
                              : selectedBreach.notification_cnil_requise 
                                ? "En attente" 
                                : "Non requise"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedBreach.date_notification_personnes ? (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          ) : selectedBreach.notification_personnes_requise ? (
                            <Clock className="h-4 w-4 text-warning" />
                          ) : (
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm">
                            Personnes: {selectedBreach.date_notification_personnes 
                              ? format(new Date(selectedBreach.date_notification_personnes), "dd/MM/yyyy")
                              : selectedBreach.notification_personnes_requise 
                                ? "En attente" 
                                : "Non requise"}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  {selectedBreach.statut !== 'cloturee' && (
                    <>
                      <div className="space-y-2">
                        <Label>Modifier le statut</Label>
                        <Select 
                          value={selectedBreach.statut}
                          onValueChange={(v) => handleUpdateStatus(selectedBreach, v as BreachStatus)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                              <SelectItem key={key} value={key}>{config.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex gap-2">
                        {selectedBreach.notification_cnil_requise && !selectedBreach.date_notification_cnil && (
                          <Button 
                            variant="outline"
                            onClick={() => handleUpdateStatus(selectedBreach, 'notifiee_cnil')}
                          >
                            <Bell className="h-4 w-4 mr-2" />
                            Marquer CNIL notifiée
                          </Button>
                        )}
                        {selectedBreach.notification_personnes_requise && !selectedBreach.date_notification_personnes && (
                          <Button 
                            variant="outline"
                            onClick={() => handleUpdateStatus(selectedBreach, 'notifiee_personnes')}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Marquer personnes notifiées
                          </Button>
                        )}
                      </div>

                      <div className="pt-4 border-t">
                        <Button 
                          variant="destructive"
                          onClick={() => handleCloseBreach(selectedBreach.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Clôturer la violation
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          La clôture est définitive et horodate la fin du traitement.
                        </p>
                      </div>
                    </>
                  )}

                  {selectedBreach.statut === 'cloturee' && (
                    <Card className="bg-muted/50">
                      <CardContent className="py-4 text-center">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-primary mb-2" />
                        <p className="font-medium">Violation clôturée</p>
                        {selectedBreach.closed_at && (
                          <p className="text-sm text-muted-foreground">
                            le {format(new Date(selectedBreach.closed_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="historique" className="mt-4">
                  <p className="text-sm text-muted-foreground">
                    L'historique complet des modifications est conservé pour la conformité RGPD.
                  </p>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
