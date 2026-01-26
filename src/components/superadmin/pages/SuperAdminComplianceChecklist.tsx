import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  MinusCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Award,
  FileText,
  Download,
  History,
  AlertTriangle,
  ClipboardCheck
} from "lucide-react";
import { useComplianceChecklist, ItemWithValidation, ValidationStatut } from "@/hooks/useComplianceChecklist";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import jsPDF from "jspdf";

const STATUS_CONFIG: Record<ValidationStatut, { label: string; icon: React.ElementType; color: string }> = {
  non_valide: { label: "Non validé", icon: XCircle, color: "text-destructive" },
  en_cours: { label: "En cours", icon: Clock, color: "text-warning" },
  valide: { label: "Validé", icon: CheckCircle2, color: "text-primary" },
  non_applicable: { label: "N/A", icon: MinusCircle, color: "text-muted-foreground" },
};

const CRITICITE_BADGE: Record<string, "default" | "secondary" | "outline"> = {
  obligatoire: "destructive" as "default",
  recommande: "secondary",
  optionnel: "outline",
};

export default function SuperAdminComplianceChecklist() {
  const { 
    cnilGroups, 
    qualiopiGroups, 
    isLoading, 
    globalStats, 
    cnilStats, 
    qualiopiStats,
    upsertValidation,
    isUpdating,
    getValidationHistory
  } = useComplianceChecklist();

  const [activeTab, setActiveTab] = useState("cnil");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [selectedItem, setSelectedItem] = useState<ItemWithValidation | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);

  // Form state
  const [formStatut, setFormStatut] = useState<ValidationStatut>("non_valide");
  const [formCommentaire, setFormCommentaire] = useState("");

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const openItemDialog = (item: ItemWithValidation) => {
    setSelectedItem(item);
    setFormStatut(item.validation?.statut || "non_valide");
    setFormCommentaire(item.validation?.commentaire || "");
  };

  const handleSaveValidation = async () => {
    if (!selectedItem) return;
    try {
      await upsertValidation({
        item_id: selectedItem.id,
        centre_id: null,
        statut: formStatut,
        commentaire: formCommentaire || null,
      });
      toast.success("Validation enregistrée");
      setSelectedItem(null);
    } catch (error: any) {
      toast.error("Erreur: " + error.message);
    }
  };

  const handleViewHistory = async (item: ItemWithValidation) => {
    if (!item.validation) {
      toast.info("Aucun historique disponible");
      return;
    }
    try {
      const history = await getValidationHistory(item.validation.id);
      setHistoryData(history);
      setShowHistoryDialog(true);
    } catch (error) {
      toast.error("Erreur lors du chargement de l'historique");
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    
    // Header
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Checklist de Conformité CNIL / Qualiopi", 20, 20);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Généré le ${format(now, "dd MMMM yyyy à HH:mm", { locale: fr })}`, 20, 30);
    
    // Stats globales
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Résumé de conformité", 20, 45);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Conformité globale: ${globalStats.conformitePct}%`, 20, 55);
    doc.text(`Items validés: ${globalStats.valides}/${globalStats.total}`, 20, 62);
    doc.text(`Obligatoires validés: ${globalStats.validesObligatoires}/${globalStats.obligatoires}`, 20, 69);
    
    let yPos = 85;
    
    // Section CNIL
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("CNIL / RGPD", 20, yPos);
    doc.text(`${cnilStats.conformitePct}%`, 180, yPos);
    yPos += 10;
    
    Object.entries(cnilGroups).forEach(([group, items]) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(group, 25, yPos);
      yPos += 6;
      
      items.forEach(item => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const status = item.validation?.statut || 'non_valide';
        const statusLabel = STATUS_CONFIG[status].label;
        const criticite = item.criticite === 'obligatoire' ? '[OBL]' : item.criticite === 'recommande' ? '[REC]' : '[OPT]';
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`${criticite} ${item.code} - ${item.titre}`, 30, yPos);
        doc.text(statusLabel, 170, yPos);
        yPos += 5;
      });
      yPos += 3;
    });
    
    // Section Qualiopi
    yPos += 10;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("QUALIOPI", 20, yPos);
    doc.text(`${qualiopiStats.conformitePct}%`, 180, yPos);
    yPos += 10;
    
    Object.entries(qualiopiGroups).forEach(([group, items]) => {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(group, 25, yPos);
      yPos += 6;
      
      items.forEach(item => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const status = item.validation?.statut || 'non_valide';
        const statusLabel = STATUS_CONFIG[status].label;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text(`${item.code} - ${item.titre}`, 30, yPos);
        doc.text(statusLabel, 170, yPos);
        yPos += 5;
      });
      yPos += 3;
    });
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Page ${i}/${pageCount}`, 105, 290, { align: "center" });
    }
    
    doc.save(`checklist-conformite-${format(now, "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exporté avec succès");
  };

  const renderChecklistGroup = (groups: Record<string, ItemWithValidation[]>) => (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, items]) => (
        <Collapsible 
          key={groupName} 
          open={expandedGroups[groupName] !== false}
          onOpenChange={() => toggleGroup(groupName)}
        >
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {expandedGroups[groupName] !== false ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CardTitle className="text-lg">{groupName}</CardTitle>
                    <Badge variant="secondary">{items.length} items</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {items.filter(i => i.validation?.statut === 'valide').length}/{items.length} validés
                    </span>
                    <Progress 
                      value={(items.filter(i => i.validation?.statut === 'valide').length / items.length) * 100}
                      className="w-20 h-2"
                    />
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="divide-y">
                  {items.map(item => {
                    const status = item.validation?.statut || 'non_valide';
                    const StatusIcon = STATUS_CONFIG[status].icon;
                    
                    return (
                      <div 
                        key={item.id}
                        className="py-3 flex items-start gap-4 hover:bg-muted/30 -mx-2 px-2 rounded cursor-pointer"
                        onClick={() => openItemDialog(item)}
                      >
                        <StatusIcon className={`h-5 w-5 mt-0.5 ${STATUS_CONFIG[status].color}`} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs text-muted-foreground">{item.code}</span>
                            <Badge 
                              variant={CRITICITE_BADGE[item.criticite] || "outline"}
                              className="text-xs"
                            >
                              {item.criticite}
                            </Badge>
                          </div>
                          <p className="font-medium">{item.titre}</p>
                          {item.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
                          )}
                          {item.reference_legale && (
                            <p className="text-xs text-muted-foreground mt-1">📚 {item.reference_legale}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewHistory(item);
                            }}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ))}
    </div>
  );

  if (isLoading) {
    return <div className="flex justify-center py-12 text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Checklist de Conformité</h1>
            <p className="text-muted-foreground">
              Suivi CNIL/RGPD et Qualiopi pour audits
            </p>
          </div>
        </div>
        <Button onClick={exportToPDF}>
          <Download className="h-4 w-4 mr-2" />
          Export PDF Audit
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conformité Globale</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{globalStats.conformitePct}%</span>
              {globalStats.conformitePct >= 80 ? (
                <CheckCircle2 className="h-6 w-6 text-primary" />
              ) : globalStats.conformitePct >= 50 ? (
                <AlertTriangle className="h-6 w-6 text-warning" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
            </div>
            <Progress value={globalStats.conformitePct} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {globalStats.valides}/{globalStats.total} items validés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              CNIL / RGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cnilStats.conformitePct}%</div>
            <Progress value={cnilStats.conformitePct} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {cnilStats.valides}/{cnilStats.total - cnilStats.nonApplicables} validés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Qualiopi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualiopiStats.conformitePct}%</div>
            <Progress value={qualiopiStats.conformitePct} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {qualiopiStats.valides}/{qualiopiStats.total - qualiopiStats.nonApplicables} validés
            </p>
          </CardContent>
        </Card>

        <Card className={globalStats.nonValides > 0 ? "border-destructive" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Items à traiter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{globalStats.nonValides}</div>
            <div className="flex gap-2 mt-2 text-xs">
              <span className="text-warning">{globalStats.enCours} en cours</span>
              <span className="text-muted-foreground">{globalStats.nonApplicables} N/A</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cnil" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            CNIL / RGPD ({cnilStats.valides}/{cnilStats.total})
          </TabsTrigger>
          <TabsTrigger value="qualiopi" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            Qualiopi ({qualiopiStats.valides}/{qualiopiStats.total})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cnil" className="mt-4">
          {renderChecklistGroup(cnilGroups)}
        </TabsContent>

        <TabsContent value="qualiopi" className="mt-4">
          {renderChecklistGroup(qualiopiGroups)}
        </TabsContent>
      </Tabs>

      {/* Validation Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-lg">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm">{selectedItem.code}</span>
                  <Badge variant={CRITICITE_BADGE[selectedItem.criticite] || "outline"}>
                    {selectedItem.criticite}
                  </Badge>
                </DialogTitle>
                <DialogDescription>{selectedItem.titre}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedItem.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{selectedItem.description}</p>
                  </div>
                )}
                
                {selectedItem.reference_legale && (
                  <div>
                    <Label className="text-muted-foreground">Référence légale</Label>
                    <p className="text-sm mt-1 font-mono">{selectedItem.reference_legale}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Statut de validation</Label>
                  <Select value={formStatut} onValueChange={(v) => setFormStatut(v as ValidationStatut)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <config.icon className={`h-4 w-4 ${config.color}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Commentaire / Preuve</Label>
                  <Textarea
                    value={formCommentaire}
                    onChange={(e) => setFormCommentaire(e.target.value)}
                    placeholder="Décrivez les actions réalisées, les documents de preuve..."
                    rows={3}
                  />
                </div>

                {selectedItem.validation?.valide_at && (
                  <div className="text-xs text-muted-foreground">
                    Dernière validation: {format(new Date(selectedItem.validation.valide_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedItem(null)}>
                  Annuler
                </Button>
                <Button onClick={handleSaveValidation} disabled={isUpdating}>
                  {isUpdating ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Historique des validations
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-80 overflow-y-auto">
            {historyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun historique
              </p>
            ) : (
              historyData.map((entry) => (
                <div key={entry.id} className="border-l-2 border-muted pl-3 py-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium capitalize">{entry.action.replace('_', ' ')}</span>
                    {entry.ancien_statut && entry.nouveau_statut && (
                      <span className="text-muted-foreground">
                        {STATUS_CONFIG[entry.ancien_statut as ValidationStatut]?.label || entry.ancien_statut} → {STATUS_CONFIG[entry.nouveau_statut as ValidationStatut]?.label || entry.nouveau_statut}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                  </div>
                  {entry.commentaire && (
                    <p className="text-sm mt-1">{entry.commentaire}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
