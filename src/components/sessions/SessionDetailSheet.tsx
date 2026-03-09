import { useState } from "react";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Users,
  Euro,
  ClipboardList,
  Info,
  FileText,
  Clock,
  GraduationCap,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, useSessionInscriptions, useAddInscription, type Session } from "@/hooks/useSessions";
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
import { useGenerateBatchChevalets } from "@/hooks/useChevalets";
import { useBatchPedagogicalDocuments } from "@/hooks/useBatchPedagogicalDocuments";
import { CloseSessionDialog } from "./CloseSessionDialog";
import { useArchiveSession, useUnarchiveSession, useCanArchiveSession } from "@/hooks/useSessionArchive";
import SessionInscritsTable from "./SessionInscritsTable";
import { useSheetSize } from "@/hooks/useSheetSize";
import { SessionQualiopiTab } from "./SessionQualiopiTab";
import { useSessionQualiopi } from "@/hooks/useSessionQualiopi";
import { SessionQuickActions } from "./SessionQuickActions";
import { SessionParcoursTab } from "./SessionParcoursTab";
import { SessionDocumentsSendModal } from "./SessionDocumentsSendModal";
import { PackAuditModal } from "./PackAuditModal";
import { SessionClosureWizard } from "./SessionClosureWizard";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import type { CompanyInfo } from "@/lib/pdf-generator";
import { SessionDocumentsTab } from "@/components/template-studio-v2/SessionDocumentsTab";

// Extracted sub-components
import { SessionDetailHeader } from "./SessionDetailHeader";
import { SessionKPICockpit } from "./SessionKPICockpit";
import { SessionFinancesTabContent } from "./SessionFinancesTabContent";

// Typed inscription helpers
import type { InscriptionWithContact, InscriptionContact } from "@/types/session-inscription";
import { extractRecipientsFromInscriptions } from "@/types/session-inscription";

interface SessionDetailSheetProps {
  sessionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (session: Session) => void;
}

export function SessionDetailSheet({ sessionId, open, onOpenChange, onEdit }: SessionDetailSheetProps) {
  const { size, setSize, sizeClass } = useSheetSize("session");
  const { data: session, isLoading } = useSession(sessionId);
  const { data: rawInscriptions } = useSessionInscriptions(sessionId);
  const { data: contacts } = useContacts();
  const { data: formateur } = useFormateur(session?.formateur_id ?? null);
  const addInscription = useAddInscription();
  const { composerProps, openComposer } = useEmailComposer();
  
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const [docSendModalOpen, setDocSendModalOpen] = useState(false);
  const [packAuditOpen, setPackAuditOpen] = useState(false);
  const [closureWizardOpen, setClosureWizardOpen] = useState(false);
  const { generateBulkDocuments } = useDocumentGenerator();
  const generateBatchChevalets = useGenerateBatchChevalets();
  const batchPedagogicalDocs = useBatchPedagogicalDocuments();
  const archiveSession = useArchiveSession();
  const unarchiveSession = useUnarchiveSession();
  const canArchive = useCanArchiveSession(session?.date_fin);
  const { data: qualiopiScore } = useSessionQualiopi(sessionId);
  const { centreFormation } = useCentreFormation();

  // Cast raw inscriptions to typed form (Supabase returns untyped relational joins)
  // CAST JUSTIFIED: Supabase's auto-generated types don't model relational joins;
  // InscriptionWithContact mirrors the exact select query in useSessionInscriptions.
  const inscriptions = rawInscriptions as unknown as InscriptionWithContact[] | undefined;

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
    id: session.id,
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

  // ─── Helper: get contact data from inscription ───
  const getInscriptionContact = (i: InscriptionWithContact): InscriptionContact | null => i.contacts;




  const handleGenerateBulkDocuments = (type: DocumentType) => {
    if (!sessionInfo || !inscriptions?.length) {
      toast.error("Aucun stagiaire inscrit");
      return;
    }
    
    const contactsInfo = inscriptions.map((inscription) => {
      const c = getInscriptionContact(inscription);
      return {
        civilite: c?.civilite || undefined,
        nom: c?.nom || "",
        prenom: c?.prenom || "",
        email: c?.email || undefined,
        telephone: c?.telephone || undefined,
        rue: c?.rue || undefined,
        code_postal: c?.code_postal || undefined,
        ville: c?.ville || undefined,
        date_naissance: c?.date_naissance || undefined,
        ville_naissance: c?.ville_naissance || undefined,
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
      const c = getInscriptionContact(inscription);
      return {
        id: c?.id || inscription.contact_id,
        prenom: c?.prenom || "",
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
      const c = getInscriptionContact(inscription);
      return {
        id: c?.id || inscription.contact_id,
        nom: c?.nom || "",
        prenom: c?.prenom || "",
        email: c?.email || null,
        telephone: c?.telephone || null,
        date_naissance: c?.date_naissance || null,
        ville_naissance: c?.ville_naissance || null,
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




  // ─── Reusable recipient extraction (no more duplicated `as any` blocks) ───
  const openEmailForSession = (subject: string, body: string) => {
    const recipients = extractRecipientsFromInscriptions(inscriptions);
    if (recipients.length === 0) {
      toast.error("Aucun inscrit avec email");
      return;
    }
    openComposer({
      recipients,
      defaultSubject: subject,
      defaultBody: body,
      autoNoteCategory: "session_email",
    });
  };

  // ─── CSV Export ───
  const handleExport = () => {
    if (!inscriptions?.length) return;
    const rows = inscriptions.map((i) => {
      const c = getInscriptionContact(i);
      return [c?.prenom, c?.nom, c?.email, c?.telephone, i.statut].join(",");
    });
    const csv = ["Prénom,Nom,Email,Téléphone,Statut", ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inscrits_${session?.nom.replace(/\s/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Liste exportée");
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
              <SessionDetailHeader
                session={session}
                formateur={formateur}
                qualiopiScore={qualiopiScore}
                size={size}
                onSizeChange={setSize}
                onEdit={onEdit}
              />

              {/* ─── KPI Cockpit ─── */}
              <SessionKPICockpit
                inscriptionCount={inscriptionCount}
                placesTotales={session.places_totales}
                prix={session.prix ? Number(session.prix) : null}
                qualiopiScore={qualiopiScore ? qualiopiScore.score : null}
              />

              {/* Quick Actions Bar */}
              <SessionQuickActions
                inscriptionCount={inscriptionCount}
                archived={session.archived}
                isTerminee={session.statut === "terminee"}
                onSendDocuments={() => setDocSendModalOpen(true)}
                onSendEmail={() => {
                  openEmailForSession(
                    `${session.nom} — Information`,
                    `Bonjour,\n\nNous vous contactons au sujet de la session "${session.nom}".\n\nBien cordialement,\nL'équipe pédagogique`
                  );
                }}
                onManageExams={() => setActiveTab("parcours")}
                onExport={handleExport}
                onPackAudit={() => setPackAuditOpen(true)}
                onCloseSession={() => setClosureWizardOpen(true)}
              />

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
                <TabsContent value="finances">
                  <SessionFinancesTabContent
                    sessionId={session.id}
                    onGenerateBulkDocuments={handleGenerateBulkDocuments}
                    onGenerateBatchChevalets={handleGenerateBatchChevalets}
                    onGenerateBatchPedagogicalDocs={handleGenerateBatchPedagogicalDocs}
                    isBatchCheveletsPending={generateBatchChevalets.isPending}
                    isBatchPedagogicalPending={batchPedagogicalDocs.isPending}
                  />
                </TabsContent>

                {/* Tab: Inscriptions */}
                <TabsContent value="inscriptions" className="pt-4">
                  <SessionInscritsTable sessionId={session.id} />
                </TabsContent>

                {/* Tab: Documents V2 */}
                <TabsContent value="documents" className="pt-4">
                  <SessionDocumentsTab sessionId={session.id} sessionTrack={session.track} />
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
                      const subject = template === "satisfaction"
                        ? `${session.nom} — Enquête de satisfaction`
                        : `${session.nom} — Information`;
                      const body = template === "satisfaction"
                        ? `Bonjour,\n\nVotre session "${session.nom}" est terminée. Nous vous invitons à compléter l'enquête de satisfaction.\n\nCordialement,\nÉcole T3P Montrouge`
                        : `Bonjour,\n\nNous vous contactons au sujet de la session "${session.nom}".\n\nCordialement,\nÉcole T3P Montrouge`;
                      openEmailForSession(subject, body);
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
          inscriptions={rawInscriptions || []}
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
            contact: i.contacts as InscriptionContact,
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
            setClosureWizardOpen(false);
            openEmailForSession(
              `${session.nom} — Enquête de satisfaction`,
              `Bonjour,\n\nVotre session "${session.nom}" est terminée. Nous vous invitons à remplir l'enquête de satisfaction.\n\nCordialement,\nÉcole T3P Montrouge`
            );
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
