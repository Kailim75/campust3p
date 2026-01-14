import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Euro,
  Calendar,
  User,
  FileText,
  Plus,
  Trash2,
  CreditCard,
  Banknote,
  Landmark,
  Wallet,
  BookOpen,
  Loader2,
  Download,
  MessageCircle,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFacture, FactureStatut, FinancementType, useDeleteFacture } from "@/hooks/useFactures";
import { useFacturePaiements, useDeletePaiement, ModePaiement } from "@/hooks/usePaiements";
import { PaiementFormDialog } from "./PaiementFormDialog";
import { toast } from "sonner";
import { useDocumentGenerator } from "@/hooks/useDocumentGenerator";
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

interface FactureDetailSheetProps {
  factureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

const statutConfig: Record<FactureStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", class: "bg-info/10 text-info" },
  payee: { label: "Payée", class: "bg-success text-success-foreground" },
  partiel: { label: "Partiel", class: "bg-warning text-warning-foreground" },
  impayee: { label: "Impayée", class: "bg-destructive text-destructive-foreground" },
  annulee: { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

const financementConfig: Record<FinancementType, { label: string; class: string }> = {
  personnel: { label: "Personnel", class: "bg-muted text-muted-foreground" },
  entreprise: { label: "Entreprise", class: "bg-info/10 text-info" },
  cpf: { label: "CPF", class: "bg-success/10 text-success" },
  opco: { label: "OPCO", class: "bg-primary/10 text-primary" },
};

const modeIcons: Record<ModePaiement, React.ReactNode> = {
  cb: <CreditCard className="h-4 w-4" />,
  virement: <Landmark className="h-4 w-4" />,
  cheque: <FileText className="h-4 w-4" />,
  especes: <Banknote className="h-4 w-4" />,
  cpf: <BookOpen className="h-4 w-4" />,
};

const modeLabels: Record<ModePaiement, string> = {
  cb: "Carte bancaire",
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
  cpf: "CPF",
};

export function FactureDetailSheet({
  factureId,
  open,
  onOpenChange,
  onEdit,
}: FactureDetailSheetProps) {
  const [showPaiementForm, setShowPaiementForm] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [deletingPaiementId, setDeletingPaiementId] = useState<string | null>(null);

  const { data: facture, isLoading } = useFacture(factureId);
  const { data: paiements = [] } = useFacturePaiements(factureId);
  const deleteFacture = useDeleteFacture();
  const deletePaiement = useDeletePaiement();
  const { generateDocument } = useDocumentGenerator();

  if (!factureId) return null;

  const montantRestant = facture
    ? Number(facture.montant_total) - facture.total_paye
    : 0;

  const paidPercentage = facture
    ? (facture.total_paye / Number(facture.montant_total)) * 100
    : 0;

  const handleDeleteFacture = async () => {
    if (!factureId) return;
    try {
      await deleteFacture.mutateAsync(factureId);
      toast.success("Facture supprimée");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleDeletePaiement = async (paiementId: string) => {
    if (!factureId) return;
    try {
      await deletePaiement.mutateAsync({ id: paiementId, factureId });
      toast.success("Paiement supprimé");
      setDeletingPaiementId(null);
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleGeneratePDF = () => {
    if (!facture || !facture.contact) return;
    
    const contactInfo = {
      nom: facture.contact.nom,
      prenom: facture.contact.prenom,
      email: facture.contact.email || undefined,
      telephone: facture.contact.telephone || undefined,
    };
    
    const factureInfo = {
      numero_facture: facture.numero_facture,
      montant_total: Number(facture.montant_total),
      total_paye: facture.total_paye,
      statut: facture.statut,
      type_financement: facture.type_financement,
      date_emission: facture.date_emission || undefined,
      date_echeance: facture.date_echeance || undefined,
      commentaires: facture.commentaires || undefined,
    };
    
    const sessionInfo = facture.session_inscription?.session ? {
      nom: facture.session_inscription.session.nom,
      formation_type: facture.session_inscription.session.formation_type,
      date_debut: "", // Would need to fetch from session
      date_fin: "",
    } : undefined;
    
    generateDocument("facture", contactInfo, sessionInfo, factureInfo);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {facture?.numero_facture || "Facture"}
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : facture ? (
            <ScrollArea className="h-[calc(100vh-140px)] pr-4">
              <div className="space-y-6 py-4">
                {/* Status and financing */}
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", statutConfig[facture.statut].class)}>
                    {statutConfig[facture.statut].label}
                  </Badge>
                  <Badge className={cn("text-xs", financementConfig[facture.type_financement].class)}>
                    {financementConfig[facture.type_financement].label}
                  </Badge>
                </div>

                {/* Amount progress */}
                <div className="card-elevated p-4">
                  <div className="flex justify-between items-end mb-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Encaissé</p>
                      <p className="text-2xl font-bold text-foreground">
                        {facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-semibold text-muted-foreground">
                        {Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        paidPercentage >= 100 ? "bg-success" : paidPercentage > 0 ? "bg-warning" : "bg-destructive"
                      )}
                      style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                    />
                  </div>
                  {montantRestant > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Reste à payer : <span className="font-semibold text-destructive">{montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</span>
                    </p>
                  )}
                </div>

                {/* Contact info */}
                {facture.contact && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-full bg-primary/10">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {facture.contact.prenom} {facture.contact.nom}
                      </p>
                      {facture.contact.email && (
                        <p className="text-sm text-muted-foreground">{facture.contact.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {facture.date_emission && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Émission</p>
                        <p className="font-medium">
                          {format(new Date(facture.date_emission), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}
                  {facture.date_echeance && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground">Échéance</p>
                        <p className="font-medium">
                          {format(new Date(facture.date_echeance), "dd MMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Session info */}
                {facture.session_inscription?.session && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Formation associée</p>
                    <p className="font-medium">{facture.session_inscription.session.nom}</p>
                  </div>
                )}

                {/* Comments */}
                {facture.commentaires && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Commentaires</p>
                    <p className="text-sm">{facture.commentaires}</p>
                  </div>
                )}

                <Separator />

                {/* Payments section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Paiements ({paiements.length})
                    </h3>
                    {montantRestant > 0 && (
                      <Button size="sm" onClick={() => setShowPaiementForm(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Ajouter
                      </Button>
                    )}
                  </div>

                  {paiements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun paiement enregistré
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {paiements.map((paiement) => (
                        <div
                          key={paiement.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-success/10 text-success">
                              {modeIcons[paiement.mode_paiement]}
                            </div>
                            <div>
                              <p className="font-medium text-success">
                                +{Number(paiement.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {modeLabels[paiement.mode_paiement]}
                                {paiement.reference && ` • ${paiement.reference}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(paiement.date_paiement), "dd/MM/yy")}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setDeletingPaiementId(paiement.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Share actions */}
                <div>
                  <h3 className="font-semibold mb-3">Partager la facture</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleGeneratePDF}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const phone = facture.contact?.telephone?.replace(/\s/g, "").replace(/^0/, "33");
                        if (!phone) {
                          toast.error("Aucun numéro de téléphone");
                          return;
                        }
                        const message = encodeURIComponent(
                          `Bonjour ${facture.contact?.prenom || ""},\n\nVoici votre facture ${facture.numero_facture} d'un montant de ${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€.\n\nReste à payer: ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€\n\nCordialement`
                        );
                        window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
                      }}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const email = facture.contact?.email;
                        if (!email) {
                          toast.error("Aucun email");
                          return;
                        }
                        const subject = encodeURIComponent(`Facture ${facture.numero_facture}`);
                        const body = encodeURIComponent(
                          `Bonjour ${facture.contact?.prenom || ""},\n\nVeuillez trouver ci-joint votre facture ${facture.numero_facture}.\n\nMontant total: ${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€\nReste à payer: ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€\n\nCordialement`
                        );
                        window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
                      }}
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Actions */}
                <div className="flex gap-2">
                  {onEdit && (
                    <Button variant="outline" className="flex-1" onClick={onEdit}>
                      Modifier
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => setShowDeleteAlert(true)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">Facture non trouvée</p>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {factureId && (
        <PaiementFormDialog
          open={showPaiementForm}
          onOpenChange={setShowPaiementForm}
          factureId={factureId}
          montantRestant={montantRestant}
        />
      )}

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera également tous les paiements associés.
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

      <AlertDialog
        open={!!deletingPaiementId}
        onOpenChange={(open) => !open && setDeletingPaiementId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPaiementId && handleDeletePaiement(deletingPaiementId)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
