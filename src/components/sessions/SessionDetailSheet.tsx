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
  FileSignature,
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
  CreditCard,
  Archive,
  ArchiveRestore,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, useSessionInscriptions, useAddInscription, useRemoveInscription, type Session } from "@/hooks/useSessions";
import { useContacts, type Contact } from "@/hooks/useContacts";
import { useFormateur } from "@/hooks/useFormateurs";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";
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
import { useGenerateBatchChevalets } from "@/hooks/useChevalets";
import { useBatchPedagogicalDocuments } from "@/hooks/useBatchPedagogicalDocuments";
import { CloseSessionDialog } from "./CloseSessionDialog";
import { useArchiveSession, useUnarchiveSession, useCanArchiveSession } from "@/hooks/useSessionArchive";
import SessionInscritsTable from "./SessionInscritsTable";
import { SessionFinancialSummary } from "./SessionFinancialSummary";
import { useSheetSize } from "@/hooks/useSheetSize";
import { SheetSizeSelector } from "@/components/ui/sheet-size-selector";
import { SessionQualiopiTab } from "./SessionQualiopiTab";
import { SessionQualiopiBadge } from "./SessionQualiopiBadge";
import { useSessionQualiopi } from "@/hooks/useSessionQualiopi";
import { SessionQuickActions } from "./SessionQuickActions";
import { SessionParcoursTab } from "./SessionParcoursTab";
import { SessionDocumentsSendModal } from "./SessionDocumentsSendModal";
import { PackAuditModal } from "./PackAuditModal";
import { SessionClosureWizard } from "./SessionClosureWizard";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import type { CompanyInfo, AgrementsAutre } from "@/lib/pdf-generator";
import { SessionDocumentsTab } from "@/components/template-studio-v2/SessionDocumentsTab";

const statusConfig = {
  a_venir: { label: "À venir", class: "bg-info/10 text-info border-info/20" },
  en_cours: { label: "En cours", class: "bg-warning/10 text-warning border-warning/20" },
  terminee: { label: "Terminée", class: "bg-muted text-muted-foreground border-muted" },
  annulee: { label: "Annulée", class: "bg-destructive/10 text-destructive border-destructive/20" },
  complet: { label: "Complet", class: "bg-success/10 text-success border-success/20" },
};


interface SessionDetailSheetProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (session: Session) => void;
}

export function SessionDetailSheet({ sessionId, open, onOpenChange, onEdit }: SessionDetailSheetProps) {
  const { size, setSize, sizeClass } = useSheetSize("session");
  const { data: session, isLoading } = useSession(sessionId);
  const { data: inscriptions, isLoading: inscriptionsLoading } = useSessionInscriptions(sessionId);
  const { data: contacts } = useContacts();
  const { data: formateur } = useFormateur(session?.formateur_id ?? null);
  const addInscription = useAddInscription();
  const removeInscription = useRemoveInscription();
  const { composerProps, openComposer } = useEmailComposer();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [docSendModalOpen, setDocSendModalOpen] = useState(false);
  const [packAuditOpen, setPackAuditOpen] = useState(false);
  const [closureWizardOpen, setClosureWizardOpen] = useState(false);
  const { generateDocument, generateBulkDocuments } = useDocumentGenerator();
  const generateBatchChevalets = useGenerateBatchChevalets();
  const batchPedagogicalDocs = useBatchPedagogicalDocuments();
  const archiveSession = useArchiveSession();
  const unarchiveSession = useUnarchiveSession();
  const canArchive = useCanArchiveSession(session?.date_fin);
  const { data: qualiopiScore } = useSessionQualiopi(sessionId);
  const { centreFormation } = useCentreFormation();

  // Build CompanyInfo for document generation
  const companyInfo: CompanyInfo | undefined = centreFormation ? {
    name: centreFormation.nom_commercial || centreFormation.nom_legal,
    address: centreFormation.adresse_complete,
    phone: centreFormation.telephone,
    email: centreFormation.email,
    siret: centreFormation.siret,
    nda: centreFormation.nda,
    logo_url: centreFormation.logo_url || undefined,
    signature_cachet_url: centreFormation.signature_cachet_url || undefined,
    qualiopi_numero: centreFormation.qualiopi_numero || undefined,
    qualiopi_date_obtention: centreFormation.qualiopi_date_obtention || undefined,
    qualiopi_date_expiration: centreFormation.qualiopi_date_expiration || undefined,
    agrement_prefecture: centreFormation.agrement_prefecture || undefined,
    agrement_prefecture_date: centreFormation.agrement_prefecture_date || undefined,
    code_rncp: centreFormation.code_rncp || undefined,
    code_rs: centreFormation.code_rs || undefined,
  } : undefined;

  const inscribedContactIds = new Set(inscriptions?.map((i) => i.contact_id) ?? []);
  const availableContacts = contacts?.filter((c) => !inscribedContactIds.has(c.id)) ?? [];
  const inscriptionCount = inscriptions?.length ?? 0;
  const placesRestantes = session ? session.places_totales - inscriptionCount : 0;

  const sessionInfo = session ? {
    id: session.id, // Nécessaire pour générer le numéro de certificat
    nom: session.nom,
    formation_type: session.formation_type,
    date_debut: session.date_debut,
    date_fin: session.date_fin,
    lieu: session.lieu || undefined,
    heure_debut: session.heure_debut || undefined,
    heure_fin: session.heure_fin || undefined,
    heure_debut_matin: session.heure_debut_matin || undefined,
    heure_fin_matin: session.heure_fin_matin || undefined,
    heure_debut_aprem: session.heure_debut_aprem || undefined,
    heure_fin_aprem: session.heure_fin_aprem || undefined,
    duree_heures: session.duree_heures || 35,
    prix: session.prix ? Number(session.prix) : undefined,
  } : null;

  const handleGenerateDocument = (type: DocumentType, contact: Contact) => {
    if (!sessionInfo) return;
    
    const contactInfo = {
      id: contact.id, // Nécessaire pour générer le numéro de certificat
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
      pays_naissance: contact.pays_naissance || undefined,
      numero_carte_professionnelle: contact.numero_carte_professionnelle || undefined,
      prefecture_carte: contact.prefecture_carte || undefined,
      date_expiration_carte: contact.date_expiration_carte || undefined,
      numero_permis: contact.numero_permis || undefined,
      prefecture_permis: contact.prefecture_permis || undefined,
      date_delivrance_permis: contact.date_delivrance_permis || undefined,
      formation: contact.formation || undefined,
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

  const handleGenerateBatchChevalets = () => {
    if (!inscriptions?.length || !session) {
      toast.error("Aucun stagiaire inscrit");
      return;
    }

    const contactsData = inscriptions.map((inscription) => {
      const contact = inscription.contacts as unknown as Contact;
      return {
        id: contact.id,
        prenom: contact.prenom,
        formation: session.formation_type,
      };
    });

    generateBatchChevalets.mutate(contactsData);
  };

  const handleGenerateBatchPedagogicalDocs = (docType: "entree_sortie" | "test_positionnement") => {
    if (!inscriptions?.length || !session) {
      toast.error("Aucun stagiaire inscrit");
      return;
    }

    const contactsData = inscriptions.map((inscription) => {
      const contact = inscription.contacts as unknown as Contact;
      return {
        id: contact.id,
        nom: contact.nom,
        prenom: contact.prenom,
        email: contact.email,
        telephone: contact.telephone,
        date_naissance: contact.date_naissance,
        ville_naissance: contact.ville_naissance,
      };
    });

    batchPedagogicalDocs.mutate({
      contacts: contactsData,
      session: {
        id: session.id,
        nom: session.nom,
        formation_type: session.formation_type,
        date_debut: session.date_debut,
        date_fin: session.date_fin,
        lieu: session.lieu,
      },
      documentType: docType,
    });
  };

  const handleAddInscription = async (contact: Contact) => {
    if (!sessionId || !session) return;
    try {
      const result = await addInscription.mutateAsync({ 
        sessionId, 
        contactId: contact.id,
        sessionPrix: session.prix ? Number(session.prix) : 0,
        sessionNom: session.nom,
        autoCreateFacture: true,
      });
      
      if (result.factureCreated) {
        toast.success(`${contact.prenom} ${contact.nom} inscrit avec facture générée`);
      } else {
        toast.success(`${contact.prenom} ${contact.nom} inscrit avec succès`);
      }
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
        <SheetContent className={cn(sizeClass, "overflow-y-auto")}>
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
                    {session.numero_session && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">
                        <Hash className="h-3 w-3 mr-1" />
                        {session.numero_session}
                      </Badge>
                    )}
                    <SheetTitle className="text-xl">{session.nom}</SheetTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", getFormationColor(session.formation_type).badge)}>
                        {getFormationLabel(session.formation_type)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusConfig[session.statut]?.class)}
                      >
                        {statusConfig[session.statut]?.label || session.statut}
                      </Badge>
                      {qualiopiScore && (
                        <SessionQualiopiBadge qualiopi={qualiopiScore} />
                      )}
                      {session.archived && (
                        <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-muted">
                          <Archive className="h-3 w-3 mr-1" />
                          Archivée
                        </Badge>
                      )}
                    </div>
                    
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
                  <div className="flex items-center gap-2">
                    {!session.archived && (
                      <Button size="sm" onClick={() => onEdit(session)}>
                        <Edit className="h-3.5 w-3.5 mr-1.5" />
                        Modifier
                      </Button>
                    )}
                    <SheetSizeSelector size={size} onSizeChange={setSize} />
                  </div>
                </div>

                {/* ─── KPI Cockpit ─── */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="bg-card border rounded-lg p-2.5 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">Inscrits / Places</p>
                    <p className={cn("text-sm font-bold", placesRestantes <= 0 ? "text-success" : "text-foreground")}>
                      {inscriptionCount} / {session.places_totales}
                    </p>
                  </div>
                  <div className="bg-card border rounded-lg p-2.5 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">Prix session</p>
                    <p className="text-sm font-bold text-foreground">
                      {session.prix ? `${Number(session.prix).toLocaleString('fr-FR')} €` : '—'}
                    </p>
                  </div>
                  <div className="bg-card border rounded-lg p-2.5 text-center">
                    <p className="text-[10px] font-medium text-muted-foreground">Qualiopi</p>
                    <p className="text-sm font-bold text-foreground">
                      {qualiopiScore ? `${qualiopiScore.score}%` : '—'}
                    </p>
                  </div>
                </div>

                {/* Quick Actions Bar */}
                <SessionQuickActions
                  inscriptionCount={inscriptionCount}
                  archived={session.archived}
                  isTerminee={session.statut === "terminee"}
                  onSendDocuments={() => setDocSendModalOpen(true)}
                  onSendEmail={() => {
                    const recipients = inscriptions
                      ?.filter((i) => {
                        const c = i.contacts as any;
                        return c?.email;
                      })
                      .map((i) => {
                        const c = i.contacts as any;
                        return {
                          id: i.contact_id,
                          email: c.email,
                          prenom: c.prenom || "",
                          nom: c.nom || "",
                        };
                      }) || [];
                    if (recipients.length === 0) {
                      toast.error("Aucun inscrit avec email");
                      return;
                    }
                    openComposer({
                      recipients,
                      defaultSubject: `${session.nom} — Information`,
                      defaultBody: `Bonjour,\n\nNous vous contactons au sujet de la session "${session.nom}".\n\nBien cordialement,\nL'équipe pédagogique`,
                      autoNoteCategory: "session_email",
                    });
                  }}
                  onManageExams={() => setActiveTab("parcours")}
                  onExport={() => {
                    if (!inscriptions?.length) return;
                    const rows = inscriptions.map((i) => {
                      const c = i.contacts as any;
                      return [c?.prenom, c?.nom, c?.email, c?.telephone, i.statut].join(",");
                    });
                    const csv = ["Prénom,Nom,Email,Téléphone,Statut", ...rows].join("\n");
                    const blob = new Blob([csv], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `inscrits_${session.nom.replace(/\s/g, "_")}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success("Liste exportée");
                  }}
                  onPackAudit={() => setPackAuditOpen(true)}
                  onCloseSession={() => setClosureWizardOpen(true)}
                />
              </SheetHeader>

               <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="info" className="gap-1 text-xs px-1">
                    <Info className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Infos</span>
                  </TabsTrigger>
                  <TabsTrigger value="inscriptions" className="gap-1 text-xs px-1">
                    <Users className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Inscrits</span> ({inscriptionCount})
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="gap-1 text-xs px-1">
                    <FileText className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Docs</span>
                  </TabsTrigger>
                  <TabsTrigger value="parcours" className="gap-1 text-xs px-1">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Parcours</span>
                  </TabsTrigger>
                  <TabsTrigger value="finances" className="gap-1 text-xs px-1">
                    <Euro className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Finances</span>
                  </TabsTrigger>
                  <TabsTrigger value="qualiopi" className="gap-1 text-xs px-1">
                    <Shield className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Qualiopi</span>
                  </TabsTrigger>
                  <TabsTrigger value="emargement" className="gap-1 text-xs px-1">
                    <ClipboardList className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Émarg.</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Infos — clean, structural only */}
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
                    
                    {(session.heure_debut || session.heure_fin) && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          {session.heure_debut?.slice(0, 5) || "--:--"} - {session.heure_fin?.slice(0, 5) || "--:--"}
                          {session.duree_heures && ` (${session.duree_heures}h)`}
                        </span>
                      </div>
                    )}
                    
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
                    
                    {(session.prix_ht || session.prix) && (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        <span>
                          {(session.prix_ht || session.prix) 
                            ? `${Number(session.prix_ht || session.prix).toLocaleString('fr-FR')} €`
                            : '—'
                          }
                        </span>
                      </div>
                    )}
                  </div>

                  {session.objectifs && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Objectifs pédagogiques</h3>
                        <p className="text-sm whitespace-pre-line">{session.objectifs}</p>
                      </div>
                    </>
                  )}

                  {session.prerequis && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Prérequis</h3>
                        <p className="text-sm whitespace-pre-line">{session.prerequis}</p>
                      </div>
                    </>
                  )}

                  {session.description && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                        <p className="text-sm">{session.description}</p>
                      </div>
                    </>
                  )}

                  {/* Actions: Archive / Clôture */}
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      {session.statut !== "terminee" && session.statut !== "annulee" && !session.archived && (
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
                    <div className="flex gap-2">
                      {session.archived ? (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => unarchiveSession.mutate(session.id)}
                          disabled={unarchiveSession.isPending}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          Désarchiver
                        </Button>
                      ) : canArchive ? (
                        <Button 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => archiveSession.mutate(session.id)}
                          disabled={archiveSession.isPending}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archiver
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </TabsContent>

                {/* Tab: Finances */}
                <TabsContent value="finances" className="space-y-4 pt-4">
                  <SessionFinancialSummary sessionId={session.id} />
                  
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2">Générer les documents financiers</h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <FileDown className="h-4 w-4 mr-2" />
                          Générer les documents
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("convocation")}>
                          <Send className="h-4 w-4 mr-2" />
                          Toutes les convocations
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("convention")}>
                          <FileText className="h-4 w-4 mr-2" />
                          Toutes les conventions (tiers payeur)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("contrat")}>
                          <FileSignature className="h-4 w-4 mr-2" />
                          Tous les contrats (paiement direct)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleGenerateBulkDocuments("attestation")}>
                          <Award className="h-4 w-4 mr-2" />
                          Toutes les attestations
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={handleGenerateBatchChevalets}
                          disabled={generateBatchChevalets.isPending}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          Tous les chevalets
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateBatchPedagogicalDocs("entree_sortie")}
                          disabled={batchPedagogicalDocs.isPending}
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Fiches entrée/sortie
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleGenerateBatchPedagogicalDocs("test_positionnement")}
                          disabled={batchPedagogicalDocs.isPending}
                        >
                          <ClipboardList className="h-4 w-4 mr-2" />
                          Tests de positionnement
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TabsContent>

                {/* Tab: Inscriptions */}
                <TabsContent value="inscriptions" className="pt-4">
                  <SessionInscritsTable sessionId={session.id} />
                </TabsContent>

                {/* Tab: Documents V2 */}
                <TabsContent value="documents" className="pt-4">
                  <SessionDocumentsTab sessionId={session.id} sessionTrack={(session as any).track} />
                </TabsContent>

                {/* Tab: Parcours / Examens */}
                <TabsContent value="parcours" className="pt-4">
                  <SessionParcoursTab sessionId={session.id} />
                </TabsContent>

                {/* Tab: Qualiopi */}
                <TabsContent value="qualiopi" className="pt-4">
                  <SessionQualiopiTab
                    sessionId={session.id}
                    hasCatalogueFormation={!!session.catalogue_formation_id}
                    isTerminee={session.statut === "terminee"}
                    inscriptionCount={inscriptionCount}
                    onAssignFormateur={() => onEdit(session)}
                    onSendDocuments={(scope) => {
                      setDocSendModalOpen(true);
                    }}
                    onSendEmail={(template) => {
                      const recipients = inscriptions
                        ?.filter((i) => { const c = i.contacts as any; return c?.email; })
                        .map((i) => { const c = i.contacts as any; return { id: i.contact_id, email: c.email, prenom: c.prenom || "", nom: c.nom || "" }; }) || [];
                      if (recipients.length === 0) { toast.error("Aucun inscrit avec email"); return; }
                      openComposer({
                        recipients,
                        defaultSubject: template === "satisfaction"
                          ? `${session.nom} — Enquête de satisfaction`
                          : `${session.nom} — Information`,
                        defaultBody: template === "satisfaction"
                          ? `Bonjour,\n\nVotre session "${session.nom}" est terminée. Nous vous invitons à compléter l'enquête de satisfaction.\n\nCordialement,\nÉcole T3P Montrouge`
                          : `Bonjour,\n\nNous vous contactons au sujet de la session "${session.nom}".\n\nCordialement,\nÉcole T3P Montrouge`,
                        autoNoteCategory: "session_email",
                      });
                    }}
                    onEditSession={() => onEdit(session)}
                    onOpenEmargement={() => setActiveTab("emargement")}
                    onImportFromCatalogue={(field) => {
                      toast.info(`Importation des ${field} depuis le catalogue — Modifiez la session`);
                      onEdit(session);
                    }}
                  />
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

      {/* Document Send Modal */}
      {session && sessionInfo && (
        <SessionDocumentsSendModal
          open={docSendModalOpen}
          onOpenChange={setDocSendModalOpen}
          inscrits={(inscriptions || []).map((i) => ({
            contact_id: i.contact_id,
            contact: i.contacts as any,
          }))}
          sessionInfo={sessionInfo}
          sessionName={session.nom}
          company={companyInfo}
          openComposer={openComposer}
        />
      )}

      <EmailComposerModal {...composerProps} />

      {sessionId && (
        <PackAuditModal
          open={packAuditOpen}
          onOpenChange={setPackAuditOpen}
          sessionId={sessionId}
        />
      )}

      {session && (
        <SessionClosureWizard
          open={closureWizardOpen}
          onOpenChange={setClosureWizardOpen}
          sessionId={session.id}
          onSendDocuments={(scope) => {
            setClosureWizardOpen(false);
            setDocSendModalOpen(true);
          }}
          onSendEmail={(template) => {
            const recipients = inscriptions
              ?.filter((i) => { const c = i.contacts as any; return c?.email; })
              .map((i) => { const c = i.contacts as any; return { id: i.contact_id, email: c.email, prenom: c.prenom || "", nom: c.nom || "" }; }) || [];
            if (recipients.length === 0) { toast.error("Aucun inscrit avec email"); return; }
            setClosureWizardOpen(false);
            openComposer({
              recipients,
              defaultSubject: `${session.nom} — Enquête de satisfaction`,
              defaultBody: `Bonjour,\n\nVotre session "${session.nom}" est terminée. Nous vous invitons à remplir l'enquête de satisfaction.\n\nCordialement,\nÉcole T3P Montrouge`,
              autoNoteCategory: "session_email",
            });
          }}
          onOpenPackAudit={() => {
            setClosureWizardOpen(false);
            setPackAuditOpen(true);
          }}
        />
      )}
    </>
  );
}
