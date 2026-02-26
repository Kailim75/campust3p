import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Receipt,
  Send,
  Pencil,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useFacture, FactureStatut, FinancementType, useDeleteFacture } from "@/hooks/useFactures";
import { useFacturePaiements, useDeletePaiement, ModePaiement } from "@/hooks/usePaiements";
import { PaiementFormDialog } from "./PaiementFormDialog";
import { toast } from "sonner";
import { useDocumentGenerator } from "@/hooks/useDocumentGenerator";
import { generateFacturePDF } from "@/lib/pdf-generator";
import { AlmaPaymentSection } from "./AlmaPaymentSection";
import { supabase } from "@/integrations/supabase/client";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { centreToCompanyInfo } from "@/lib/centre-to-company";
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
  alma: <CreditCard className="h-4 w-4" />,
};

const modeLabels: Record<ModePaiement, string> = {
  cb: "Carte bancaire",
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
  cpf: "CPF",
  alma: "Alma (3x/4x)",
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
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const { data: facture, isLoading } = useFacture(factureId);
  const { data: paiements = [] } = useFacturePaiements(factureId);
  const deleteFacture = useDeleteFacture();
  const deletePaiement = useDeletePaiement();
  const { generateDocument, getCompanyInfo } = useDocumentGenerator();

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
    const session = facture.session_inscription?.session;
    const sessionInfo = session ? {
      nom: session.catalogue_formation?.intitule || session.nom,
      formation_type: session.formation_type,
      date_debut: session.date_debut || "",
      date_fin: session.date_fin || "",
      duree_heures: session.duree_heures || undefined,
    } : undefined;
    generateDocument("facture", contactInfo, sessionInfo, factureInfo);
  };

  const handleSendEmail = async () => {
    if (!facture?.contact) return;
    const email = facture.contact.email;
    if (!email) {
      toast.error("Aucun email pour ce contact");
      return;
    }
    setIsSendingEmail(true);
    try {
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
      const session = facture.session_inscription?.session;
      const sessionInfo = session ? {
        nom: session.catalogue_formation?.intitule || session.nom,
        formation_type: session.formation_type,
        date_debut: session.date_debut || "",
        date_fin: session.date_fin || "",
        duree_heures: session.duree_heures || undefined,
      } : undefined;
      const company = getCompanyInfo();
      if (!company) {
        toast.error("Configuration du centre manquante");
        return;
      }
      const doc = generateFacturePDF(factureInfo, contactInfo, sessionInfo, company);
      const pdfBase64 = doc.output("datauristring").split(",")[1];
      const filename = `facture-${facture.numero_facture}.pdf`;
      const { error } = await supabase.functions.invoke("send-automated-emails", {
        body: {
          type: "document_envoi",
          to: email,
          recipientName: `${facture.contact.prenom} ${facture.contact.nom}`,
          subject: `Facture ${facture.numero_facture} - Ecole T3P Montrouge`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">📄 Facture ${facture.numero_facture}</h2>
              <p>Bonjour ${facture.contact.prenom},</p>
              <p>Veuillez trouver ci-joint votre facture <strong>${facture.numero_facture}</strong>.</p>
              <p><strong>Montant total :</strong> ${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</p>
              <p><strong>Reste à payer :</strong> ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€</p>
              <p>📎 <strong>Pièce jointe :</strong> ${filename}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #888; font-size: 12px;">
                Ecole T3P Montrouge - Centre de formation Taxi, VTC et VMDTR<br>
                📧 montrouge@ecolet3p.fr
              </p>
            </div>
          `,
          attachments: [{ filename, content: pdfBase64 }],
        },
      });
      if (error) throw error;
      toast.success(`Facture envoyée par email à ${email}`);
    } catch (err: any) {
      console.error("Erreur envoi facture:", err);
      toast.error(err.message || "Erreur lors de l'envoi de la facture");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleWhatsApp = () => {
    if (!facture?.contact) return;
    const phone = facture.contact.telephone?.replace(/\s/g, "").replace(/^0/, "33");
    if (!phone) {
      toast.error("Aucun numéro de téléphone");
      return;
    }
    const message = encodeURIComponent(
      `Bonjour ${facture.contact.prenom || ""},\n\nVoici votre facture ${facture.numero_facture} d'un montant de ${Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€.\n\nReste à payer: ${montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€\n\nCordialement`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[95vh] flex flex-col">
          {/* Fixed header with summary */}
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {facture?.numero_facture || "Facture"}
              </DrawerTitle>
              {facture && (
                <div className="flex items-center gap-1.5">
                  <Badge className={cn("text-[10px]", statutConfig[facture.statut].class)}>
                    {statutConfig[facture.statut].label}
                  </Badge>
                  <Badge className={cn("text-[10px]", financementConfig[facture.type_financement].class)}>
                    {financementConfig[facture.type_financement].label}
                  </Badge>
                </div>
              )}
            </div>

            {/* Compact amount bar - always visible */}
            {facture && (
              <div className="mt-3 p-3 rounded-xl bg-muted/50 border">
                <div className="flex justify-between items-baseline mb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-foreground">
                      {facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                    </span>
                  </div>
                  {montantRestant > 0 && (
                    <span className="text-sm font-medium text-destructive">
                      -{montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                    </span>
                  )}
                </div>
                <div className="h-2 w-full bg-background rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      paidPercentage >= 100 ? "bg-success" : paidPercentage > 0 ? "bg-warning" : "bg-destructive"
                    )}
                    style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </DrawerHeader>

          {/* Scrollable tabbed content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : facture ? (
            <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
              <TabsList className="mx-4 mb-2 grid grid-cols-3">
                <TabsTrigger value="details" className="text-xs">
                  <FileText className="h-3.5 w-3.5 mr-1" />
                  Détails
                </TabsTrigger>
                <TabsTrigger value="paiements" className="text-xs">
                  <Wallet className="h-3.5 w-3.5 mr-1" />
                  Paiements
                </TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">
                  <Send className="h-3.5 w-3.5 mr-1" />
                  Actions
                </TabsTrigger>
              </TabsList>

              {/* ─── TAB: Détails ─── */}
              <TabsContent value="details" className="flex-1 overflow-y-auto px-4 pb-6 mt-0">
                <div className="space-y-4">
                  {/* Contact */}
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
                        {facture.contact.telephone && (
                          <p className="text-sm text-muted-foreground">{facture.contact.telephone}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    {facture.date_emission && (
                      <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/30 rounded-lg">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs">Émission</p>
                          <p className="font-medium">
                            {format(new Date(facture.date_emission), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    )}
                    {facture.date_echeance && (
                      <div className="flex items-center gap-2 text-sm p-2.5 bg-muted/30 rounded-lg">
                        <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-muted-foreground text-xs">Échéance</p>
                          <p className="font-medium">
                            {format(new Date(facture.date_echeance), "dd MMM yyyy", { locale: fr })}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Session */}
                  {facture.session_inscription?.session && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground">Formation associée</p>
                      <p className="font-medium text-sm">{facture.session_inscription.session.catalogue_formation?.intitule || facture.session_inscription.session.nom}</p>
                    </div>
                  )}

                  {/* Comments */}
                  {facture.commentaires && (
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Commentaires</p>
                      <p className="text-sm">{facture.commentaires}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ─── TAB: Paiements ─── */}
              <TabsContent value="paiements" className="flex-1 overflow-y-auto px-4 pb-6 mt-0">
                <div className="space-y-4">
                  {/* Add payment button */}
                  {montantRestant > 0 && (
                    <Button className="w-full" onClick={() => setShowPaiementForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un paiement
                    </Button>
                  )}

                  {/* Payment modes quick access */}
                  {montantRestant > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Modes de paiement disponibles</p>
                      <div className="grid grid-cols-3 gap-2">
                        {(Object.entries(modeLabels) as [ModePaiement, string][])
                          .filter(([key]) => key !== 'alma')
                          .map(([key, label]) => (
                          <button
                            key={key}
                            onClick={() => setShowPaiementForm(true)}
                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/50 border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all text-center"
                          >
                            <div className="p-2 rounded-full bg-background">
                              {modeIcons[key]}
                            </div>
                            <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alma section */}
                  {montantRestant > 0 && facture.contact && (
                    <>
                      <Separator />
                      <AlmaPaymentSection
                        factureId={facture.id}
                        montantRestant={montantRestant}
                        customerFirstName={facture.contact.prenom}
                        customerLastName={facture.contact.nom}
                        customerEmail={facture.contact.email || ""}
                        customerPhone={facture.contact.telephone || undefined}
                        numeroFacture={facture.numero_facture}
                      />
                    </>
                  )}

                  {/* Existing payments list */}
                  <Separator />
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Historique ({paiements.length})
                    </h4>
                    {paiements.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
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
                                <p className="font-medium text-success text-sm">
                                  +{Number(paiement.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {modeLabels[paiement.mode_paiement]}
                                  {paiement.reference && ` • ${paiement.reference}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(paiement.date_paiement), "dd/MM/yy")}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setDeletingPaiementId(paiement.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* ─── TAB: Actions ─── */}
              <TabsContent value="actions" className="flex-1 overflow-y-auto px-4 pb-6 mt-0">
                <div className="space-y-4">
                  {/* Share */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Partager la facture</p>
                    <div className="grid grid-cols-1 gap-2">
                      <Button
                        variant="outline"
                        className="justify-start h-11"
                        onClick={handleGeneratePDF}
                      >
                        <Download className="h-4 w-4 mr-3 text-primary" />
                        Télécharger le PDF
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start h-11"
                        disabled={isSendingEmail}
                        onClick={handleSendEmail}
                      >
                        {isSendingEmail ? (
                          <Loader2 className="h-4 w-4 mr-3 animate-spin" />
                        ) : (
                          <Mail className="h-4 w-4 mr-3 text-primary" />
                        )}
                        Envoyer par email
                      </Button>
                      <Button
                        variant="outline"
                        className="justify-start h-11"
                        onClick={handleWhatsApp}
                      >
                        <MessageCircle className="h-4 w-4 mr-3 text-success" />
                        Envoyer par WhatsApp
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Manage */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Gérer</p>
                    <div className="grid grid-cols-1 gap-2">
                      {onEdit && (
                        <Button
                          variant="outline"
                          className="justify-start h-11"
                          onClick={onEdit}
                        >
                          <Pencil className="h-4 w-4 mr-3 text-primary" />
                          Modifier la facture
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="justify-start h-11 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                        onClick={() => setShowDeleteAlert(true)}
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        Supprimer la facture
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center h-48">
              <p className="text-muted-foreground">Facture non trouvée</p>
            </div>
          )}
        </DrawerContent>
      </Drawer>

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
