import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  User,
  Mail,
  Phone,
  MapPin,
  Award,
  GraduationCap,
  Euro,
  FileText,
  Edit,
  Trash2,
  Plus,
  Calendar,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  useFormateur,
  useFormateurDocuments,
  useFormateurFactures,
  useCreateFormateurFacture,
  useUpdateFormateurFacture,
  useDeleteFormateurFacture,
  Formateur,
  FormateurFacture,
} from "@/hooks/useFormateurs";

interface FormateurDetailSheetProps {
  formateurId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (formateur: Formateur) => void;
}

const factureStatutConfig: Record<string, { label: string; icon: any; class: string }> = {
  en_attente: { label: "En attente", icon: Clock, class: "bg-warning/10 text-warning" },
  payee: { label: "Payée", icon: CheckCircle, class: "bg-success/10 text-success" },
  annulee: { label: "Annulée", icon: XCircle, class: "bg-muted text-muted-foreground" },
};

export function FormateurDetailSheet({ formateurId, open, onOpenChange, onEdit }: FormateurDetailSheetProps) {
  const { data: formateur, isLoading } = useFormateur(formateurId);
  const { data: documents = [] } = useFormateurDocuments(formateurId);
  const { data: factures = [] } = useFormateurFactures(formateurId);
  
  const createFacture = useCreateFormateurFacture();
  const updateFacture = useUpdateFormateurFacture();
  const deleteFacture = useDeleteFormateurFacture();

  const [showFactureForm, setShowFactureForm] = useState(false);
  const [factureForm, setFactureForm] = useState({
    numero_facture: "",
    date_facture: format(new Date(), "yyyy-MM-dd"),
    periode_debut: "",
    periode_fin: "",
    montant_ht: 0,
    tva_percent: 0,
    montant_ttc: 0,
    commentaires: "",
  });
  const [deleteFactureId, setDeleteFactureId] = useState<string | null>(null);

  const handleAddFacture = async () => {
    if (!formateurId || !factureForm.numero_facture) {
      toast.error("Numéro de facture obligatoire");
      return;
    }

    try {
      await createFacture.mutateAsync({
        formateur_id: formateurId,
        numero_facture: factureForm.numero_facture,
        date_facture: factureForm.date_facture,
        periode_debut: factureForm.periode_debut || null,
        periode_fin: factureForm.periode_fin || null,
        montant_ht: factureForm.montant_ht,
        tva_percent: factureForm.tva_percent,
        montant_ttc: factureForm.montant_ttc,
        statut: "en_attente",
        date_paiement: null,
        commentaires: factureForm.commentaires || null,
      });
      toast.success("Facture ajoutée");
      setShowFactureForm(false);
      setFactureForm({
        numero_facture: "",
        date_facture: format(new Date(), "yyyy-MM-dd"),
        periode_debut: "",
        periode_fin: "",
        montant_ht: 0,
        tva_percent: 0,
        montant_ttc: 0,
        commentaires: "",
      });
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleMarkAsPaid = async (facture: FormateurFacture) => {
    try {
      await updateFacture.mutateAsync({
        id: facture.id,
        statut: "payee",
        date_paiement: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Facture marquée comme payée");
    } catch {
      toast.error("Erreur");
    }
  };

  const handleDeleteFacture = async () => {
    if (!deleteFactureId) return;
    try {
      await deleteFacture.mutateAsync(deleteFactureId);
      toast.success("Facture supprimée");
      setDeleteFactureId(null);
    } catch {
      toast.error("Erreur");
    }
  };

  // Calculate TTC when HT or TVA changes
  const updateTTC = (ht: number, tva: number) => {
    const ttc = ht * (1 + tva / 100);
    setFactureForm((prev) => ({ ...prev, montant_ht: ht, tva_percent: tva, montant_ttc: Math.round(ttc * 100) / 100 }));
  };

  if (!open) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              {isLoading ? (
                <Skeleton className="h-6 w-40" />
              ) : (
                <span>{formateur?.prenom} {formateur?.nom}</span>
              )}
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-4 mt-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : formateur ? (
            <div className="mt-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                <Badge variant={formateur.actif ? "default" : "secondary"}>
                  {formateur.actif ? "Actif" : "Inactif"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => onEdit(formateur)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>

              <Tabs defaultValue="infos" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="infos">Infos</TabsTrigger>
                  <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
                  <TabsTrigger value="factures">Factures</TabsTrigger>
                </TabsList>

                {/* Infos Tab */}
                <TabsContent value="infos" className="space-y-4">
                  {/* Contact */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Contact</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {formateur.email && (
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <a href={`mailto:${formateur.email}`} className="text-primary hover:underline">
                            {formateur.email}
                          </a>
                        </div>
                      )}
                      {formateur.telephone && (
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a href={`tel:${formateur.telephone}`} className="hover:underline">
                            {formateur.telephone}
                          </a>
                        </div>
                      )}
                      {(formateur.adresse || formateur.ville) && (
                        <div className="flex items-center gap-3 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {formateur.adresse}
                            {formateur.adresse && formateur.ville && ", "}
                            {formateur.code_postal} {formateur.ville}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Billing */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Facturation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {formateur.siret && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SIRET</span>
                          <span className="font-mono">{formateur.siret}</span>
                        </div>
                      )}
                      {formateur.taux_horaire && Number(formateur.taux_horaire) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Taux horaire</span>
                          <span className="font-medium">{Number(formateur.taux_horaire).toFixed(2)}€/h</span>
                        </div>
                      )}
                      {formateur.rib && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">RIB</span>
                          <span className="font-mono text-xs">{formateur.rib}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  {formateur.notes && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Notes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {formateur.notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Qualifications Tab */}
                <TabsContent value="qualifications" className="space-y-4">
                  {/* Spécialités */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Spécialités
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formateur.specialites && formateur.specialites.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formateur.specialites.map((spec) => (
                            <Badge key={spec} variant="secondary">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucune spécialité</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Diplômes */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Diplômes & Certifications
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formateur.diplomes && formateur.diplomes.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {formateur.diplomes.map((diplome) => (
                            <Badge key={diplome} variant="outline">
                              {diplome}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Aucun diplôme enregistré</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Agrément */}
                  {(formateur.numero_agrement || formateur.date_agrement) && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Agrément</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {formateur.numero_agrement && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Numéro</span>
                            <span className="font-mono">{formateur.numero_agrement}</span>
                          </div>
                        )}
                        {formateur.date_agrement && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Date</span>
                            <span>{format(parseISO(formateur.date_agrement), "dd/MM/yyyy")}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Factures Tab */}
                <TabsContent value="factures" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Factures du formateur</h3>
                    <Button size="sm" onClick={() => setShowFactureForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>

                  {/* Facture Form */}
                  {showFactureForm && (
                    <Card className="border-primary">
                      <CardContent className="pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>N° Facture *</Label>
                            <Input
                              value={factureForm.numero_facture}
                              onChange={(e) => setFactureForm({ ...factureForm, numero_facture: e.target.value })}
                              placeholder="FORM-2024-001"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Date</Label>
                            <Input
                              type="date"
                              value={factureForm.date_facture}
                              onChange={(e) => setFactureForm({ ...factureForm, date_facture: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Période du</Label>
                            <Input
                              type="date"
                              value={factureForm.periode_debut}
                              onChange={(e) => setFactureForm({ ...factureForm, periode_debut: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Au</Label>
                            <Input
                              type="date"
                              value={factureForm.periode_fin}
                              onChange={(e) => setFactureForm({ ...factureForm, periode_fin: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Montant HT (€)</Label>
                            <Input
                              type="number"
                              value={factureForm.montant_ht}
                              onChange={(e) => updateTTC(parseFloat(e.target.value) || 0, factureForm.tva_percent)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>TVA (%)</Label>
                            <Input
                              type="number"
                              value={factureForm.tva_percent}
                              onChange={(e) => updateTTC(factureForm.montant_ht, parseFloat(e.target.value) || 0)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Montant TTC (€)</Label>
                            <Input
                              type="number"
                              value={factureForm.montant_ttc}
                              onChange={(e) => setFactureForm({ ...factureForm, montant_ttc: parseFloat(e.target.value) || 0 })}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowFactureForm(false)}>
                            Annuler
                          </Button>
                          <Button size="sm" onClick={handleAddFacture} disabled={createFacture.isPending}>
                            {createFacture.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Ajouter
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Factures List */}
                  {factures.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Aucune facture enregistrée</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {factures.map((facture) => {
                        const status = factureStatutConfig[facture.statut] || factureStatutConfig.en_attente;
                        const StatusIcon = status.icon;

                        return (
                          <Card key={facture.id}>
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-medium">
                                      {facture.numero_facture}
                                    </span>
                                    <Badge variant="secondary" className={cn("text-xs", status.class)}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {status.label}
                                    </Badge>
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                                    <Calendar className="h-3 w-3" />
                                    {format(parseISO(facture.date_facture), "dd/MM/yyyy")}
                                    {facture.periode_debut && facture.periode_fin && (
                                      <span>
                                        (du {format(parseISO(facture.periode_debut), "dd/MM")} au{" "}
                                        {format(parseISO(facture.periode_fin), "dd/MM")})
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {Number(facture.montant_ttc).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                                    </p>
                                    <p className="text-xs text-muted-foreground">TTC</p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    {facture.statut === "en_attente" && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-success"
                                        onClick={() => handleMarkAsPaid(facture)}
                                      >
                                        <CheckCircle className="h-4 w-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive"
                                      onClick={() => setDeleteFactureId(facture.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Delete Facture Confirmation */}
      <AlertDialog open={!!deleteFactureId} onOpenChange={() => setDeleteFactureId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFacture}>
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
