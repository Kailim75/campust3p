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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  Mail,
  MessageCircle,
  Calendar,
  GraduationCap,
  FileText,
  CreditCard,
  ExternalLink,
  Edit,
  Trash2,
  Star,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useContact } from "@/hooks/useContact";
import { useDeleteContact, type Contact } from "@/hooks/useContacts";
import { format } from "date-fns";
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
import { ContactProgressBar } from "./ContactProgressBar";
import { useContactDocuments } from "@/hooks/useContactDocuments";
import { useContactFactures } from "@/hooks/useFactures";
import { GenerateDocumentDialog } from "./GenerateDocumentDialog";
import { SendEnqueteDialog } from "./SendEnqueteDialog";
import { CallLogDialog } from "./CallLogDialog";

// Status mapping with French labels
const statusConfig: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info border-info/20", icon: Clock },
  "Client": { label: "En formation", class: "bg-success/10 text-success border-success/20", icon: GraduationCap },
  "Bravo": { label: "Diplômé", class: "bg-warning/10 text-warning border-warning/20", icon: Star },
  "Abandonné": { label: "Abandonné", class: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
};

const formationLabels: Record<string, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "FC Taxi",
  "Formation continue VTC": "FC VTC",
  "Mobilité Taxi": "Mobilité",
};

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

interface ContactQuickViewProps {
  contactId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (contact: Contact) => void;
  onOpenFullView: (contactId: string) => void;
}

export function ContactQuickView({ 
  contactId, 
  open, 
  onOpenChange, 
  onEdit,
  onOpenFullView 
}: ContactQuickViewProps) {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [enqueteDialogOpen, setEnqueteDialogOpen] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState(false);

  const { data: contact, isLoading } = useContact(contactId);
  const { data: inscriptions = [] } = useContactInscriptions(contactId);
  const { data: documents = [] } = useContactDocuments(contactId);
  const { data: factures = [] } = useContactFactures(contactId);
  const deleteContact = useDeleteContact();

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

  if (!contactId) return null;

  const initials = contact
    ? `${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase()
    : "?";

  const status = contact?.statut ?? "En attente de validation";
  const statusInfo = statusConfig[status] ?? statusConfig["En attente de validation"];
  const StatusIcon = statusInfo.icon;

  // Calculate quick stats
  const nextSession = inscriptions.find(i => 
    i.sessions?.date_debut && new Date(i.sessions.date_debut) > new Date()
  );
  const totalFacture = factures.reduce((sum, f) => sum + Number(f.montant_total), 0);
  const totalPaye = factures.reduce((sum, f) => sum + f.total_paye, 0);
  const docsCount = documents.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        {isLoading ? (
          <div className="space-y-6 pt-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : contact ? (
          <ScrollArea className="h-[calc(100vh-2rem)]">
            <div className="pr-4">
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <SheetTitle className="text-lg">
                        {contact.prenom} {contact.nom}
                      </SheetTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", statusInfo.class)}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                        {contact.formation && (
                          <Badge variant="secondary" className="text-xs">
                            {formationLabels[contact.formation] || contact.formation}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Quick Actions */}
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
                      <Phone className="h-4 w-4 mr-1" />
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
                      <MessageCircle className="h-4 w-4 mr-1" />
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
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </Button>
                )}
              </div>

              {/* Progress Bar */}
              <Card className="mb-4">
                <CardContent className="pt-4">
                  <ContactProgressBar 
                    contact={contact}
                    inscriptions={inscriptions}
                    documents={documents}
                    factures={factures}
                  />
                </CardContent>
              </Card>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Next Session */}
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Prochaine session</span>
                    </div>
                    {nextSession ? (
                      <div>
                        <p className="text-sm font-medium truncate">{nextSession.sessions?.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(nextSession.sessions!.date_debut), "dd/MM/yyyy", { locale: fr })}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Aucune</p>
                    )}
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Documents</span>
                    </div>
                    <p className="text-sm font-medium">{docsCount} fichier{docsCount > 1 ? "s" : ""}</p>
                  </CardContent>
                </Card>

                {/* Billing */}
                <Card className="bg-muted/30 col-span-2">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Facturation</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {totalPaye.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}€
                          <span className="text-muted-foreground font-normal"> / {totalFacture.toLocaleString("fr-FR", { minimumFractionDigits: 0 })}€</span>
                        </p>
                      </div>
                      {totalFacture > 0 && (
                        <Badge 
                          variant={totalPaye >= totalFacture ? "default" : "outline"}
                          className={cn(
                            "text-xs",
                            totalPaye >= totalFacture 
                              ? "bg-success text-success-foreground" 
                              : totalPaye > 0 
                                ? "bg-warning/10 text-warning" 
                                : "bg-destructive/10 text-destructive"
                          )}
                        >
                          {totalPaye >= totalFacture ? "Soldé" : totalPaye > 0 ? "Partiel" : "Impayé"}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Contact Info Summary */}
              <Card className="mb-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Coordonnées</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.telephone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{contact.telephone}</span>
                    </div>
                  )}
                  {contact.ville && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{contact.code_postal} {contact.ville}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="space-y-2">
                <Button 
                  className="w-full" 
                  onClick={() => {
                    onOpenChange(false);
                    onOpenFullView(contact.id);
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le dossier complet
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setGenerateDialogOpen(true)}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Générer doc
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEnqueteDialogOpen(true)}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Enquête
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onEdit(contact)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archiver ce contact ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Le contact sera archivé et ne sera plus visible dans la liste.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Archiver</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Contact non trouvé
          </div>
        )}

        {/* Dialogs */}
        {contact && (
          <>
            <GenerateDocumentDialog
              contact={contact}
              open={generateDialogOpen}
              onOpenChange={setGenerateDialogOpen}
            />
            <SendEnqueteDialog
              contact={{
                id: contact.id,
                nom: contact.nom,
                prenom: contact.prenom,
                email: contact.email,
              }}
              open={enqueteDialogOpen}
              onOpenChange={setEnqueteDialogOpen}
            />
            <CallLogDialog
              contactId={contact.id}
              contactName={`${contact.prenom} ${contact.nom}`}
              phoneNumber={contact.telephone || ""}
              open={callLogOpen}
              onOpenChange={setCallLogOpen}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
