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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  MapPin,
  Users,
  Euro,
  Edit,
  UserPlus,
  Trash2,
  ClipboardList,
  Info,
  FileDown,
  FileText,
  Hash,
  Clock,
  GraduationCap,
  User,
  Award,
  Send,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, useSessionInscriptions, useAddInscription, useRemoveInscription, type Session } from "@/hooks/useSessions";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { useFormateur } from "@/hooks/useFormateurs";
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
import { EmargementSheet } from "./EmargementSheet";
import { useDocumentGenerator, type DocumentType } from "@/hooks/useDocumentGenerator";
import { CloseSessionDialog } from "./CloseSessionDialog";

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
  const { data: formateur } = useFormateur(session?.formateur_id ?? null);
  const addInscription = useAddInscription();
  const removeInscription = useRemoveInscription();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const { generateDocument, generateBulkDocuments } = useDocumentGenerator();

  const inscribedContactIds = new Set(inscriptions?.map((i) => i.contact_id) ?? []);
  const availableContacts = contacts?.filter((c) => !inscribedContactIds.has(c.id)) ?? [];
  const inscriptionCount = inscriptions?.length ?? 0;
  const placesRestantes = session ? session.places_totales - inscriptionCount : 0;

  const sessionInfo = session ? {
    nom: session.nom,
    formation_type: session.formation_type,
    date_debut: session.date_debut,
    date_fin: session.date_fin,
    lieu: session.lieu || undefined,
    duree_heures: 35, // Default training hours
    prix: session.prix ? Number(session.prix) : undefined,
  } : null;

  const handleGenerateDocument = (type: DocumentType, contact: Contact) => {
    if (!sessionInfo) return;
    
    const contactInfo = {
      civilite: contact.civilite || undefined,
      nom: contact.nom,
      prenom: contact.prenom,
      email: contact.email || undefined,
      telephone: contact.telephone || undefined,
      rue: contact.rue || undefined,
      code_postal: contact.code_postal || undefined,
      ville: contact.ville || undefined,
      date_naissance: contact.date_naissance || undefined,
      ville_naissance: contact.ville_naissance || undefined,
    };
    
    generateDocument(type, contactInfo, sessionInfo);
  };

  const handleGenerateBulkDocuments = (type: DocumentType) => {
    if (!sessionInfo || !inscriptions?.length) {
      toast.error("Aucun stagiaire inscrit");
      return;
    }
    
    const contactsInfo = inscriptions.map((inscription) => {
      const contact = inscription.contacts as unknown as Contact;
      return {
        civilite: contact.civilite || undefined,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email || undefined,
        telephone: contact.telephone || undefined,
        rue: contact.rue || undefined,
        code_postal: contact.code_postal || undefined,
        ville: contact.ville || undefined,
        date_naissance: contact.date_naissance || undefined,
        ville_naissance: contact.ville_naissance || undefined,
      };
    });
    
    generateBulkDocuments(type, contactsInfo, sessionInfo);
  };

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
                  <div className="space-y-2">
                    {/* Session Number Badge */}
                    {session.numero_session && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                        <Hash className="h-3 w-3 mr-1" />
                        {session.numero_session}
                      </Badge>
                    )}
                    <SheetTitle className="text-xl">{session.nom}</SheetTitle>
                    <div className="flex flex-wrap items-center gap-2">
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
                    
                    {/* Formateur Badge */}
                    {formateur && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-accent/50 border border-accent">
                        <Avatar className="h-7 w-7 border-2 border-primary/20">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                            {`${formateur.prenom?.[0] ?? ""}${formateur.nom?.[0] ?? ""}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Formateur</span>
                          <span className="text-sm font-medium">{formateur.prenom} {formateur.nom}</span>
                        </div>
                        <GraduationCap className="h-4 w-4 text-primary ml-auto" />
                      </div>
                    )}
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="info" className="mt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info" className="gap-1">
                    <Info className="h-4 w-4" />
                    Infos
                  </TabsTrigger>
                  <TabsTrigger value="inscriptions" className="gap-1">
                    <Users className="h-4 w-4" />
                    Inscrits ({inscriptionCount})
                  </TabsTrigger>
                  <TabsTrigger value="emargement" className="gap-1">
                    <ClipboardList className="h-4 w-4" />
                    Émargement
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Infos */}
                <TabsContent value="info" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(session.date_debut), "dd MMMM yyyy", { locale: fr })}
                        {" - "}
                        {format(new Date(session.date_fin), "dd MMMM yyyy", { locale: fr })}
                      </span>
                    </div>
                    
                    {/* Horaires */}
                    {(session.heure_debut || session.heure_fin) && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {session.heure_debut?.slice(0, 5) || "--:--"} - {session.heure_fin?.slice(0, 5) || "--:--"}
                          {session.duree_heures && ` (${session.duree_heures}h)`}
                        </span>
                      </div>
                    )}
                    
                    {/* Adresse structurée */}
                    {(session.adresse_rue || session.adresse_ville || session.lieu) && (
                      <div className="flex items-start gap-3 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5" />
                        <div className="flex flex-col">
                          {session.adresse_rue && <span>{session.adresse_rue}</span>}
                          {(session.adresse_code_postal || session.adresse_ville) && (
                            <span>{[session.adresse_code_postal, session.adresse_ville].filter(Boolean).join(" ")}</span>
                          )}
                          {!session.adresse_rue && !session.adresse_ville && session.lieu && (
                            <span>{session.lieu}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {inscriptionCount} / {session.places_totales} inscrits
                        {placesRestantes > 0 && ` (${placesRestantes} places restantes)`}
                      </span>
                    </div>
                    
                    {/* Prix HT/TTC */}
                    {(session.prix_ht || session.prix) && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        <span>
                          {session.prix_ht 
                            ? `${Number(session.prix_ht).toLocaleString('fr-FR')} € HT`
                            : `${Number(session.prix).toLocaleString('fr-FR')} €`
                          }
                          {session.tva_percent && session.prix_ht && (
                            <span className="text-xs ml-1">
                              (TVA {session.tva_percent}%)
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Objectifs pédagogiques */}
                  {session.objectifs && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Objectifs pédagogiques
                        </h3>
                        <p className="text-sm whitespace-pre-line">{session.objectifs}</p>
                      </div>
                    </>
                  )}

                  {/* Prérequis */}
                  {session.prerequis && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Prérequis
                        </h3>
                        <p className="text-sm whitespace-pre-line">{session.prerequis}</p>
                      </div>
                    </>
                  )}

                  {session.description && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Description
                        </h3>
                        <p className="text-sm">{session.description}</p>
                      </div>
                    </>
                  )}

                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Documents
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <FileDown className="h-4 w-4 mr-2" />
                          Générer les documents
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("convocation")}>
                          <Send className="h-4 w-4 mr-2" />
                          Toutes les convocations
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("convention")}>
                          <FileText className="h-4 w-4 mr-2" />
                          Toutes les conventions
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("attestation")}>
                          <Award className="h-4 w-4 mr-2" />
                          Toutes les attestations
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <Separator />
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={() => onEdit(session)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    {session.statut !== "terminee" && session.statut !== "annulee" && (
                      <Button 
                        variant="outline" 
                        className="flex-1 border-success text-success hover:bg-success/10"
                        onClick={() => setCloseDialogOpen(true)}
                        disabled={inscriptionCount === 0}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Clôturer
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* Tab: Inscriptions */}
                <TabsContent value="inscriptions" className="pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Stagiaires inscrits
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
                </TabsContent>

                {/* Tab: Émargement */}
                <TabsContent value="emargement" className="pt-4">
                  <EmargementSheet session={session} />
                </TabsContent>
              </Tabs>
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

      {/* Close Session Dialog */}
      {session && (
        <CloseSessionDialog
          session={session}
          inscriptions={inscriptions || []}
          open={closeDialogOpen}
          onOpenChange={setCloseDialogOpen}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </>
  );
}
