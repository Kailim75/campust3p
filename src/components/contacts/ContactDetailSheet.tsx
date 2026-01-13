import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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

export function ContactDetailSheet({ contactId, open, onOpenChange, onEdit }: ContactDetailSheetProps) {
  const { data: contact, isLoading } = useContact(contactId);
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
            <div className="flex gap-2 mb-6">
              {contact.telephone && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`tel:${contact.telephone}`, "_blank")}
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
            </div>

            <Separator />

            {/* Informations de contact */}
            <div className="py-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Contact
              </h3>
              <InfoRow icon={Mail} label="Email" value={contact.email} />
              <InfoRow icon={Phone} label="Téléphone" value={contact.telephone} />
              <InfoRow icon={MapPin} label="Adresse" value={fullAddress} />
            </div>

            <Separator />

            {/* Informations personnelles */}
            <div className="py-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Informations personnelles
              </h3>
              <InfoRow icon={Calendar} label="Naissance" value={birthInfo} />
              <InfoRow icon={User} label="ID personnalisé" value={contact.custom_id} />
            </div>

            <Separator />

            {/* Formation */}
            <div className="py-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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

            <Separator />

            {/* Métadonnées */}
            <div className="py-4 text-sm text-muted-foreground">
              <p>
                Créé le{" "}
                {format(new Date(contact.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </p>
              <p>
                Modifié le{" "}
                {format(new Date(contact.updated_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
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
      </SheetContent>
    </Sheet>
  );
}
