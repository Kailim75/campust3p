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
  Edit,
  Trash2,
  User,
  GraduationCap,
  FileText,
  History,
  Star,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContact } from "@/hooks/useContact";
import { useDeleteContact, type Contact } from "@/hooks/useContacts";
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
import { useContactFactures } from "@/hooks/useFactures";
import { useContactHistorique, useDeleteHistorique, useUpdateHistoriqueAlert } from "@/hooks/useContactHistorique";
import { HistoriqueFormDialog } from "./HistoriqueFormDialog";
import { CallLogDialog } from "./CallLogDialog";
import { SendEnqueteDialog } from "./SendEnqueteDialog";
import { ContactProgressBar } from "./ContactProgressBar";
import { useSheetSize } from "@/hooks/useSheetSize";
import { SheetSizeSelector } from "@/components/ui/sheet-size-selector";
import { openWhatsApp } from "@/lib/phone-utils";

// Import new grouped tabs
import { ContactProfilTab } from "./detail/ContactProfilTab";
import { ContactFormationTab } from "./detail/ContactFormationTab";
import { ContactAdminTab } from "./detail/ContactAdminTab";
import { ContactHistoriqueTab } from "./detail/ContactHistoriqueTab";

const statusConfig = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info border-info/20" },
  Client: { label: "En formation", class: "bg-success/10 text-success border-success/20" },
  Bravo: { label: "Diplômé", class: "bg-warning/10 text-warning border-warning/20" },
  "Abandonné": { label: "Abandonné", class: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface ContactDetailSheetProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
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

export function ContactDetailSheet({ contactId, open, onOpenChange, onEdit }: ContactDetailSheetProps) {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [historiqueDialogOpen, setHistoriqueDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const [enqueteDialogOpen, setEnqueteDialogOpen] = useState(false);
  const { size, setSize, sizeClass } = useSheetSize("contact");
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
      toast.success("Contact archivé", {
        description: `${contact.prenom} ${contact.nom} a été archivé avec succès.`,
      });
      onOpenChange(false);
    } catch {
      toast.error("Erreur", {
        description: "Impossible d'archiver le contact. Veuillez réessayer.",
      });
    }
  };

  const initials = contact
    ? `${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase()
    : "?";

  const status = contact?.statut ?? "En attente de validation";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn(sizeClass, "overflow-y-auto")}>
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
                <SheetSizeSelector size={size} onSizeChange={setSize} />
              </div>
            </SheetHeader>

            {/* Actions rapides */}
            <div className="flex flex-wrap gap-2 mb-4">
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
                    onClick={() => openWhatsApp(contact.telephone)}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEnqueteDialogOpen(true)}
              >
                <Star className="h-4 w-4 mr-2" />
                Enquête
              </Button>
            </div>

            {/* Progress Bar - Parcours stagiaire */}
            <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30">
              <ContactProgressBar 
                contact={contact}
                inscriptions={inscriptions}
                documents={documents}
                factures={factures}
              />
            </div>

            {/* NEW: 4 Onglets simplifiés */}
            <Tabs defaultValue="profil" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="profil" className="text-xs sm:text-sm px-2">
                  <User className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
                <TabsTrigger value="formation" className="text-xs sm:text-sm px-2">
                  <GraduationCap className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Formation</span>
                </TabsTrigger>
                <TabsTrigger value="admin" className="text-xs sm:text-sm px-2">
                  <Briefcase className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
                <TabsTrigger value="suivi" className="text-xs sm:text-sm px-2">
                  <History className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Suivi</span>
                </TabsTrigger>
              </TabsList>

              {/* Onglet Profil */}
              <TabsContent value="profil">
                <ContactProfilTab contact={contact} contactId={contact.id} />
              </TabsContent>

              {/* Onglet Formation */}
              <TabsContent value="formation">
                <ContactFormationTab
                  contactId={contact.id}
                  contactPrenom={contact.prenom}
                  contactFormation={contact.formation}
                  inscriptions={inscriptions}
                  inscriptionsLoading={inscriptionsLoading}
                />
              </TabsContent>

              {/* Onglet Admin */}
              <TabsContent value="admin">
                <ContactAdminTab
                  contactId={contact.id}
                  contact={{
                    nom: contact.nom,
                    prenom: contact.prenom,
                    formation: contact.formation,
                  }}
                  documents={documents}
                  documentsLoading={documentsLoading}
                  documentTypes={[...documentTypes]}
                  factures={factures}
                  facturesLoading={facturesLoading}
                  onUploadDocument={() => setUploadDialogOpen(true)}
                  onDownloadDocument={downloadDocument}
                  onDeleteDocument={(params) => deleteDocument.mutate(params)}
                />
              </TabsContent>

              {/* Onglet Suivi */}
              <TabsContent value="suivi">
                <ContactHistoriqueTab
                  historique={historique}
                  isLoading={historiqueLoading}
                  contactCreatedAt={contact.created_at}
                  contactUpdatedAt={contact.updated_at}
                  onAdd={() => setHistoriqueDialogOpen(true)}
                  onDelete={(params) => deleteHistorique.mutate(params)}
                  onUpdateAlert={(params) => updateHistoriqueAlert.mutate(params)}
                />
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

        {/* Dialogs */}
        {contactId && (
          <DocumentUploadDialog
            contactId={contactId}
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
          />
        )}

        {contactId && (
          <HistoriqueFormDialog
            contactId={contactId}
            open={historiqueDialogOpen}
            onOpenChange={setHistoriqueDialogOpen}
          />
        )}

        {contact && (
          <GenerateDocumentDialog
            open={generateDialogOpen}
            onOpenChange={setGenerateDialogOpen}
            contact={contact}
          />
        )}
        
        {contact && contact.telephone && (
          <CallLogDialog
            open={callLogOpen}
            onOpenChange={setCallLogOpen}
            contactId={contact.id}
            contactName={`${contact.prenom} ${contact.nom}`}
            phoneNumber={contact.telephone}
          />
        )}

        {contact && (
          <SendEnqueteDialog
            open={enqueteDialogOpen}
            onOpenChange={setEnqueteDialogOpen}
            contact={{
              id: contact.id,
              nom: contact.nom,
              prenom: contact.prenom,
              email: contact.email,
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
