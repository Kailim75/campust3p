import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Calendar,
  Edit,
  Trash2,
  User,
  GraduationCap,
  FileText,
  CreditCard,
  Car,
  ClipboardList,
  FolderOpen,
  History,
  Download,
  Plus,
  File,
  AlertCircle,
  Euro,
  Receipt,
  MessageSquare,
  Users,
  Clock,
  Bell,
  BellOff,
  FileSignature,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContact } from "@/hooks/useContact";
import { useDeleteContact, type Contact } from "@/hooks/useContacts";
import { format, differenceInDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
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
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  useContactDocuments,
  useDeleteDocument,
  downloadDocument,
  documentTypes,
} from "@/hooks/useContactDocuments";
import { DocumentUploadDialog } from "./DocumentUploadDialog";
import { GenerateDocumentDialog } from "./GenerateDocumentDialog";
import { useContactFactures, FactureStatut, FinancementType } from "@/hooks/useFactures";
import { useContactHistorique, useDeleteHistorique, useUpdateHistoriqueAlert, HistoriqueType } from "@/hooks/useContactHistorique";
import { HistoriqueFormDialog } from "./HistoriqueFormDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ContactPratiqueTab } from "./pratique/ContactPratiqueTab";
import { ContactLocationTab } from "./location/ContactLocationTab";
import { ExamensTab } from "./examens/ExamensTab";
import { CallLogDialog } from "./CallLogDialog";

const statusConfig = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info border-info/20" },
  Client: { label: "Client", class: "bg-success/10 text-success border-success/20" },
  Bravo: { label: "Bravo", class: "bg-warning/10 text-warning border-warning/20" },
};

const formationLabels: Record<string, string> = {
  TAXI: "Formation Taxi",
  VTC: "Formation VTC",
  VMDTR: "Formation VMDTR",
  "ACC VTC": "Accompagnement VTC",
  "ACC VTC 75": "Accompagnement VTC 75",
  "Formation continue Taxi": "Formation continue Taxi",
  "Formation continue VTC": "Formation continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};

interface ContactDetailSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}

function useContactInscriptions(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-inscriptions", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("session_inscriptions")
        .select(`
          *,
          sessions (
            id,
            nom,
            date_debut,
            date_fin,
            formation_type,
            lieu
          )
        `)
        .eq("contact_id", contactId)
        .order("date_inscription", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!contactId,
  });
}

const statutConfig: Record<FactureStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  emise: { label: "Émise", class: "bg-info/10 text-info" },
  payee: { label: "Payée", class: "bg-success text-success-foreground" },
  partiel: { label: "Partiel", class: "bg-warning text-warning-foreground" },
  impayee: { label: "Impayée", class: "bg-destructive text-destructive-foreground" },
  annulee: { label: "Annulée", class: "bg-muted text-muted-foreground" },
};

const financementLabels: Record<FinancementType, string> = {
  personnel: "Personnel",
  entreprise: "Entreprise",
  cpf: "CPF",
  opco: "OPCO",
};

const historiqueTypeConfig: Record<HistoriqueType, { label: string; icon: React.ElementType; class: string }> = {
  appel: { label: "Appel", icon: Phone, class: "bg-success/10 text-success" },
  email: { label: "Email", icon: Mail, class: "bg-info/10 text-info" },
  note: { label: "Note", icon: FileText, class: "bg-muted text-muted-foreground" },
  sms: { label: "SMS", icon: MessageSquare, class: "bg-primary/10 text-primary" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, class: "bg-success/10 text-success" },
  reunion: { label: "Réunion", icon: Users, class: "bg-warning/10 text-warning" },
};

export function ContactDetailSheet({ contactId, open, onOpenChange, onEdit }: ContactDetailSheetProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [historiqueDialogOpen, setHistoriqueDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const { data: contact, isLoading } = useContact(contactId);
  const { data: inscriptions = [], isLoading: inscriptionsLoading } = useContactInscriptions(contactId);
  const { data: documents = [], isLoading: documentsLoading } = useContactDocuments(contactId);
  const { data: factures = [], isLoading: facturesLoading } = useContactFactures(contactId);
  const { data: historique = [], isLoading: historiqueLoading } = useContactHistorique(contactId);
  const deleteContact = useDeleteContact();
  const deleteDocument = useDeleteDocument();
  const deleteHistorique = useDeleteHistorique();
  const updateHistoriqueAlert = useUpdateHistoriqueAlert();

  const handleDelete = async () => {
    if (!contact) return;
    try {
      await deleteContact.mutateAsync(contact.id);
      toast.success("Contact archivé avec succès");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'archivage");
    }
  };

  const initials = contact
    ? `${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase()
    : "?";

  const status = contact?.statut ?? "En attente de validation";

  const fullAddress = [contact?.rue, contact?.code_postal, contact?.ville]
    .filter(Boolean)
    .join(", ");

  const birthInfo = [
    contact?.date_naissance ? format(new Date(contact.date_naissance), "dd MMMM yyyy", { locale: fr }) : null,
    contact?.ville_naissance,
    contact?.pays_naissance,
  ]
    .filter(Boolean)
    .join(", ");

  const permisInfo = contact?.numero_permis
    ? `${contact.numero_permis}${contact.prefecture_permis ? ` (${contact.prefecture_permis})` : ""}${
        contact.date_delivrance_permis
          ? ` - Délivré le ${format(new Date(contact.date_delivrance_permis), "dd/MM/yyyy", { locale: fr })}`
          : ""
      }`
    : null;

  const carteProInfo = contact?.numero_carte_professionnelle
    ? `${contact.numero_carte_professionnelle}${contact.prefecture_carte ? ` (${contact.prefecture_carte})` : ""}${
        contact.date_expiration_carte
          ? ` - Expire le ${format(new Date(contact.date_expiration_carte), "dd/MM/yyyy", { locale: fr })}`
          : ""
      }`
    : null;

  const inscriptionStatusConfig: Record<string, { label: string; class: string }> = {
    inscrit: { label: "Inscrit", class: "bg-success/10 text-success border-success/20" },
    en_attente: { label: "En attente", class: "bg-warning/10 text-warning border-warning/20" },
    annule: { label: "Annulé", class: "bg-destructive/10 text-destructive border-destructive/20" },
    complete: { label: "Complété", class: "bg-info/10 text-info border-info/20" },
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : contact ? (
          <>
            <SheetHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <SheetTitle className="text-xl">
                      {contact.civilite ? `${contact.civilite} ` : ""}
                      {contact.prenom} {contact.nom}
                    </SheetTitle>
                    <Badge
                      variant="outline"
                      className={cn("mt-1", statusConfig[status]?.class ?? "bg-muted")}
                    >
                      {statusConfig[status]?.label ?? status}
                    </Badge>
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Actions rapides */}
            <div className="flex gap-2 mb-4">
              {contact.telephone && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      window.open(`tel:${contact.telephone}`, "_blank");
                      setCallLogOpen(true);
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Appeler
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://wa.me/${contact.telephone?.replace(/\s/g, "")}`,
                        "_blank"
                      )
                    }
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                </>
              )}
              {contact.email && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`mailto:${contact.email}`, "_blank")}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={() => setGenerateDialogOpen(true)}
              >
                <FileText className="h-4 w-4 mr-2" />
                Générer doc
              </Button>
            </div>

            {/* Onglets */}
            <Tabs defaultValue="infos" className="w-full">
              <TabsList className="grid w-full grid-cols-8 mb-4">
                <TabsTrigger value="infos" className="text-xs px-1">
                  <User className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Infos</span>
                </TabsTrigger>
                <TabsTrigger value="sessions" className="text-xs px-1">
                  <ClipboardList className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Sessions</span>
                </TabsTrigger>
                <TabsTrigger value="examens" className="text-xs px-1">
                  <Award className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Examens</span>
                </TabsTrigger>
                <TabsTrigger value="pratique" className="text-xs px-1">
                  <Car className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Pratique</span>
                </TabsTrigger>
                <TabsTrigger value="location" className="text-xs px-1">
                  <FileSignature className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Location</span>
                </TabsTrigger>
                <TabsTrigger value="factures" className="text-xs px-1">
                  <Receipt className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Factures</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="text-xs px-1">
                  <FolderOpen className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Docs</span>
                </TabsTrigger>
                <TabsTrigger value="historique" className="text-xs px-1">
                  <History className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Hist.</span>
                </TabsTrigger>
              </TabsList>

              {/* Onglet Infos */}
              <TabsContent value="infos" className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Contact
                  </h3>
                  <InfoRow icon={Mail} label="Email" value={contact.email} />
                  <InfoRow icon={Phone} label="Téléphone" value={contact.telephone} />
                  <InfoRow icon={MapPin} label="Adresse" value={fullAddress} />
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Informations personnelles
                  </h3>
                  <InfoRow icon={Calendar} label="Naissance" value={birthInfo} />
                  <InfoRow icon={User} label="ID personnalisé" value={contact.custom_id} />
                </div>

                {permisInfo && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Permis de conduire
                    </h3>
                    <InfoRow icon={Car} label="Permis" value={permisInfo} />
                  </div>
                )}

                {carteProInfo && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Carte professionnelle
                    </h3>
                    <InfoRow icon={CreditCard} label="Carte" value={carteProInfo} />
                  </div>
                )}

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Formation
                  </h3>
                  <InfoRow
                    icon={GraduationCap}
                    label="Type de formation"
                    value={contact.formation ? formationLabels[contact.formation] || contact.formation : null}
                  />
                  <InfoRow icon={FileText} label="Source" value={contact.source} />
                  {contact.commentaires && (
                    <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Commentaires</p>
                      <p className="text-sm">{contact.commentaires}</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Onglet Sessions */}
              <TabsContent value="sessions" className="space-y-3">
                {inscriptionsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : inscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune inscription</p>
                  </div>
                ) : (
                  inscriptions.map((inscription: any) => (
                    <div
                      key={inscription.id}
                      className="p-3 border rounded-lg space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-sm">
                            {inscription.sessions?.nom || "Session inconnue"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {inscription.sessions?.formation_type}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            inscriptionStatusConfig[inscription.statut]?.class ?? "bg-muted"
                          )}
                        >
                          {inscriptionStatusConfig[inscription.statut]?.label ?? inscription.statut}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {inscription.sessions?.date_debut
                            ? format(new Date(inscription.sessions.date_debut), "dd/MM/yyyy", { locale: fr })
                            : "N/A"}
                        </span>
                        {inscription.sessions?.lieu && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {inscription.sessions.lieu}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Onglet Examens */}
              <TabsContent value="examens">
                <ExamensTab contactId={contact.id} formationType={contact.formation || undefined} />
              </TabsContent>

              {/* Onglet Pratique */}
              <TabsContent value="pratique">
                <ContactPratiqueTab contactId={contact.id} />
              </TabsContent>

              {/* Onglet Location */}
              <TabsContent value="location">
                <ContactLocationTab contactId={contact.id} />
              </TabsContent>

              {/* Onglet Factures */}
              <TabsContent value="factures" className="space-y-3">
                {facturesLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : factures.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune facture</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Total facturé</p>
                        <p className="text-lg font-bold">
                          {factures.reduce((sum, f) => sum + Number(f.montant_total), 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                        </p>
                      </div>
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">Encaissé</p>
                        <p className="text-lg font-bold text-success">
                          {factures.reduce((sum, f) => sum + f.total_paye, 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                        </p>
                      </div>
                    </div>

                    {/* Factures list */}
                    {factures.map((facture) => {
                      const paidPercentage = (facture.total_paye / Number(facture.montant_total)) * 100;
                      const montantRestant = Number(facture.montant_total) - facture.total_paye;

                      return (
                        <div key={facture.id} className="p-3 border rounded-lg space-y-2">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-mono text-sm font-medium">{facture.numero_facture}</p>
                              <p className="text-xs text-muted-foreground">
                                {financementLabels[facture.type_financement]}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn("text-xs", statutConfig[facture.statut]?.class)}
                            >
                              {statutConfig[facture.statut]?.label}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Payé</span>
                              <span className="font-medium">
                                {facture.total_paye.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€ / {Number(facture.montant_total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  paidPercentage >= 100 ? "bg-success" : paidPercentage > 0 ? "bg-warning" : "bg-destructive"
                                )}
                                style={{ width: `${Math.min(paidPercentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {montantRestant > 0 && (
                            <p className="text-xs text-destructive">
                              Reste : {montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                            </p>
                          )}

                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {facture.date_emission && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(facture.date_emission), "dd/MM/yyyy")}
                              </span>
                            )}
                            {facture.date_echeance && (
                              <span className="flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Éch. {format(new Date(facture.date_echeance), "dd/MM/yyyy")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}
              </TabsContent>

              {/* Onglet Documents */}
              <TabsContent value="documents" className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {documentsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun document</p>
                    <p className="text-xs mt-1">Ajoutez CNI, permis, attestations...</p>
                  </div>
                ) : (
                  documents.map((doc) => {
                    const typeLabel = documentTypes.find((t) => t.value === doc.type_document)?.label || doc.type_document;
                    const isExpiringSoon = doc.date_expiration && differenceInDays(new Date(doc.date_expiration), new Date()) <= 60;
                    const isExpired = doc.date_expiration && new Date(doc.date_expiration) < new Date();

                    return (
                      <div key={doc.id} className="p-3 border rounded-lg space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <File className="h-4 w-4 text-muted-foreground mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">{doc.nom}</p>
                              <p className="text-xs text-muted-foreground">{typeLabel}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => downloadDocument(doc.file_path, doc.nom)}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Supprimer ce document ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() =>
                                      deleteDocument.mutate({
                                        id: doc.id,
                                        filePath: doc.file_path,
                                        contactId: doc.contact_id,
                                      })
                                    }
                                  >
                                    Supprimer
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                        {doc.date_expiration && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs",
                            isExpired ? "text-destructive" : isExpiringSoon ? "text-warning" : "text-muted-foreground"
                          )}>
                            {(isExpired || isExpiringSoon) && <AlertCircle className="h-3 w-3" />}
                            <span>
                              {isExpired ? "Expiré le " : "Expire le "}
                              {format(new Date(doc.date_expiration), "dd/MM/yyyy", { locale: fr })}
                            </span>
                          </div>
                        )}
                        {doc.file_size && (
                          <p className="text-xs text-muted-foreground">
                            {(doc.file_size / 1024).toFixed(1)} Ko
                          </p>
                        )}
                      </div>
                    );
                  })
                )}

                {contactId && (
                  <DocumentUploadDialog
                    contactId={contactId}
                    open={uploadDialogOpen}
                    onOpenChange={setUploadDialogOpen}
                  />
                )}
              </TabsContent>

              {/* Onglet Historique */}
              <TabsContent value="historique" className="space-y-3">
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setHistoriqueDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Ajouter
                  </Button>
                </div>

                {historiqueLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : historique.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucun échange enregistré</p>
                    <p className="text-xs mt-1">Ajoutez des appels, emails, notes...</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-3 pr-3">
                      {historique.map((item) => {
                        const config = historiqueTypeConfig[item.type];
                        const Icon = config.icon;
                        
                        return (
                          <div key={item.id} className="p-3 border rounded-lg space-y-2 group">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-2">
                                <div className={cn("p-1.5 rounded-md", config.class)}>
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className="font-medium text-sm">{item.titre}</p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>{config.label}</span>
                                    {item.duree_minutes && (
                                      <>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {item.duree_minutes} min
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(item.date_echange), { addSuffix: true, locale: fr })}
                                </span>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Supprimer cet échange ?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Cette action est irréversible.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteHistorique.mutate({ id: item.id, contactId: item.contact_id })}
                                      >
                                        Supprimer
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                            {item.contenu && (
                              <p className="text-sm text-muted-foreground pl-8">{item.contenu}</p>
                            )}
                            
                            {/* Alerte/Rappel Section */}
                            {item.alerte_active && item.date_rappel && (
                              <div className={cn(
                                "flex items-center gap-2 text-xs p-2 rounded-md ml-8",
                                new Date(item.date_rappel) < new Date() 
                                  ? "bg-destructive/10 text-destructive" 
                                  : "bg-warning/10 text-warning"
                              )}>
                                <Bell className="h-3.5 w-3.5" />
                                <span className="font-medium">
                                  Rappel : {format(new Date(item.date_rappel), "dd MMM yyyy à HH:mm", { locale: fr })}
                                </span>
                                {item.rappel_description && (
                                  <>
                                    <span>•</span>
                                    <span>{item.rappel_description}</span>
                                  </>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 ml-auto"
                                  onClick={() => updateHistoriqueAlert.mutate({
                                    id: item.id,
                                    contactId: item.contact_id,
                                    alerte_active: false,
                                    date_rappel: null,
                                    rappel_description: null,
                                  })}
                                >
                                  <BellOff className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground pl-8">
                              {format(new Date(item.date_echange), "dd MMM yyyy à HH:mm", { locale: fr })}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}

                {/* System dates */}
                <div className="pt-4 border-t space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Informations système</p>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-success" />
                    <span className="text-muted-foreground">Créé le</span>
                    <span className="font-medium">
                      {format(new Date(contact.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="h-2 w-2 rounded-full bg-info" />
                    <span className="text-muted-foreground">Modifié le</span>
                    <span className="font-medium">
                      {format(new Date(contact.updated_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
                    </span>
                  </div>
                </div>

                {contactId && (
                  <HistoriqueFormDialog
                    contactId={contactId}
                    open={historiqueDialogOpen}
                    onOpenChange={setHistoriqueDialogOpen}
                  />
                )}
              </TabsContent>
            </Tabs>

            {/* Actions */}
            <div className="flex gap-2 pt-4 mt-4 border-t">
              <Button className="flex-1" onClick={() => onEdit(contact)}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Archiver ce contact ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Le contact sera archivé et n'apparaîtra plus dans la liste. Cette action peut
                      être annulée ultérieurement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Archiver</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">Contact non trouvé</div>
        )}

        {/* Generate Document Dialog */}
        {contact && (
          <GenerateDocumentDialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            contact={contact}
          />
        )}
        
        {/* Call Log Dialog */}
        {contact && contact.telephone && (
          <CallLogDialog
            open={callLogOpen}
            onOpenChange={setCallLogOpen}
            contactId={contact.id}
            contactName={`${contact.prenom} ${contact.nom}`}
            phoneNumber={contact.telephone}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}