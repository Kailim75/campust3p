import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Calendar,
  MapPin,
  Users,
  Euro,
  Edit,
  UserPlus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, useSessionInscriptions, useAddInscription, useRemoveInscription, type Session } from "@/hooks/useSessions";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

const statusConfig = {
  a_venir: { label: "À venir", class: "bg-info/10 text-info border-info/20" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning border-warning/20" },
  terminee: { label: "Terminée", class: "bg-muted text-muted-foreground border-muted" },
  annulee: { label: "Annulée", class: "bg-destructive/10 text-destructive border-destructive/20" },
  complet: { label: "Complet", class: "bg-success/10 text-success border-success/20" },
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

interface SessionDetailSheetProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (session: Session) => void;
}

export function SessionDetailSheet({ sessionId, open, onOpenChange, onEdit }: SessionDetailSheetProps) {
  const { data: session, isLoading } = useSession(sessionId);
  const { data: inscriptions, isLoading: inscriptionsLoading } = useSessionInscriptions(sessionId);
  const { data: contacts } = useContacts();
  const addInscription = useAddInscription();
  const removeInscription = useRemoveInscription();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const inscribedContactIds = new Set(inscriptions?.map((i) => i.contact_id) ?? []);
  const availableContacts = contacts?.filter((c) => !inscribedContactIds.has(c.id)) ?? [];
  const inscriptionCount = inscriptions?.length ?? 0;
  const placesRestantes = session ? session.places_totales - inscriptionCount : 0;

  const handleAddInscription = async (contact: Contact) => {
    if (!sessionId) return;
    try {
      await addInscription.mutateAsync({ sessionId, contactId: contact.id });
      toast.success(`${contact.prenom} ${contact.nom} inscrit avec succès`);
      setAddDialogOpen(false);
    } catch {
      toast.error("Erreur lors de l'inscription");
    }
  };

  const handleRemoveInscription = async (contactId: string) => {
    if (!sessionId) return;
    try {
      await removeInscription.mutateAsync({ sessionId, contactId });
      toast.success("Inscription annulée");
    } catch {
      toast.error("Erreur lors de l'annulation");
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {isLoading ? (
            <div className="space-y-6 pt-6">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : session ? (
            <>
              <SheetHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <SheetTitle className="text-xl">{session.nom}</SheetTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {formationLabels[session.formation_type] || session.formation_type}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusConfig[session.statut]?.class)}
                      >
                        {statusConfig[session.statut]?.label || session.statut}
                      </Badge>
                    </div>
                  </div>
                </div>
              </SheetHeader>

              {/* Informations */}
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })}
                    {" - "}
                    {format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}
                  </span>
                </div>
                {session.lieu && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{session.lieu}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>
                    {inscriptionCount} / {session.places_totales} inscrits
                    {placesRestantes > 0 && ` (${placesRestantes} places restantes)`}
                  </span>
                </div>
                {session.prix && (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Euro className="h-4 w-4" />
                    <span>{Number(session.prix).toLocaleString('fr-FR')} €</span>
                  </div>
                )}
              </div>

              {session.description && (
                <>
                  <Separator />
                  <div className="py-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Description
                    </h3>
                    <p className="text-sm">{session.description}</p>
                  </div>
                </>
              )}

              <Separator />

              {/* Inscriptions */}
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Stagiaires inscrits ({inscriptionCount})
                  </h3>
                  <Button size="sm" variant="outline" onClick={() => setAddDialogOpen(true)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Inscrire
                  </Button>
                </div>

                {inscriptionsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : inscriptions && inscriptions.length > 0 ? (
                  <div className="space-y-2">
                    {inscriptions.map((inscription) => {
                      const contact = inscription.contacts as unknown as Contact;
                      if (!contact) return null;
                      const initials = `${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase();
                      
                      return (
                        <div
                          key={inscription.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {contact.prenom} {contact.nom}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {contact.email || contact.telephone || "Pas de contact"}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveInscription(contact.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun stagiaire inscrit
                  </p>
                )}
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button className="flex-1" onClick={() => onEdit(session)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Session non trouvée</div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add Inscription Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Inscrire un stagiaire</DialogTitle>
          </DialogHeader>
          <Command className="rounded-lg border">
            <CommandInput placeholder="Rechercher un contact..." />
            <CommandList className="max-h-64">
              <CommandEmpty>Aucun contact trouvé</CommandEmpty>
              <CommandGroup>
                {availableContacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    onSelect={() => handleAddInscription(contact)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {`${contact.prenom?.[0] ?? ""}${contact.nom?.[0] ?? ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {contact.prenom} {contact.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.email || contact.telephone || "Pas de contact"}
                        </p>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
