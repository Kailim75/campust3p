import { useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Phone, Mail, FolderOpen, GraduationCap,
  MessageCircle, FileText, LayoutDashboard, FileCheck, IdCard,
  CheckCircle2, AlertTriangle, Clock, Send, Bot, CreditCard,
  Edit, Trash2, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { SiWhatsapp } from "react-icons/si";
import { ResumeTab } from "./tabs/ResumeTab";
import { DossierTab } from "./tabs/DossierTab";
import { CMATab } from "./tabs/CMATab";
import { CarteProTab } from "./tabs/CarteProTab";
import { PaiementsTab } from "./tabs/PaiementsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { SuiviTab } from "./tabs/SuiviTab";
import { FormationExamensTab } from "./tabs/FormationExamensTab";
import { WorkflowStepper, type StepStatus } from "@/components/workflow/WorkflowStepper";
import { WorkflowDynamicCTA, type WorkflowStep } from "@/components/workflow/WorkflowDynamicCTA";
import { SessionAssignDialog } from "@/components/workflow/SessionAssignDialog";
import { PostAssignmentDialog } from "@/components/workflow/PostAssignmentDialog";
import { GenerateDocumentDialog } from "@/components/contacts/GenerateDocumentDialog";
import { SendEnqueteDialog } from "@/components/contacts/SendEnqueteDialog";
import { CallLogDialog } from "@/components/contacts/CallLogDialog";
import { SheetSizeSelector } from "@/components/ui/sheet-size-selector";
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
import { useDeleteContact } from "@/hooks/useContacts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { computeTrackCompletion } from "@/lib/track-requirements";
import { createAutoNote, deleteAutoNote } from "@/lib/aujourdhui-actions";
import { computeContactUrgency } from "@/lib/urgency-utils";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import type { Contact } from "@/hooks/useContacts";
import { StatutApprenantDropdown } from "./StatutApprenantDropdown";
import type { StatutApprenant } from "@/lib/apprenant-active";
import { useActiveEnrollment } from "@/hooks/useActiveEnrollment";
import { getTrackFromFormationType, TRACK_BADGES, type FormationTrack } from "@/lib/formation-track";
import type { SheetSize } from "@/hooks/useSheetSize";

// ... keep existing code (FORMATION_COLORS, STATUT_BADGES)

const FORMATION_COLORS: Record<string, string> = {
  TAXI: "bg-primary",
  VTC: "bg-accent",
  VMDTR: "bg-info",
  "ACC VTC": "bg-accent",
  "Formation continue Taxi": "bg-success",
  "Formation continue VTC": "bg-success",
};

const STATUT_BADGES: Record<string, { label: string; className: string }> = {
  "En attente de validation": { label: "Nouveau lead", className: "bg-muted text-muted-foreground" },
  "En formation théorique": { label: "En formation", className: "bg-primary/15 text-primary" },
  "Examen T3P programmé": { label: "Examen T3P", className: "bg-accent/15 text-accent" },
  "T3P obtenu": { label: "T3P Obtenu", className: "bg-success/15 text-success" },
  "En formation pratique": { label: "Formation pratique", className: "bg-info/15 text-info" },
  "Client": { label: "Diplômé", className: "bg-success/15 text-success" },
  "Bravo": { label: "Diplômé", className: "bg-success/15 text-success" },
  "Abandonné": { label: "Abandonné", className: "bg-destructive/15 text-destructive" },
};

interface ApprenantDetailContentProps {
  contact: Contact | null;
  isLoading: boolean;
  onEdit?: (contact: Contact) => void;
  onClose?: () => void;
  sheetSize?: SheetSize;
  onSheetSizeChange?: (size: SheetSize) => void;
}

export function ApprenantDetailContent({ contact, isLoading, onEdit, onClose, sheetSize, onSheetSizeChange }: ApprenantDetailContentProps) {
  const [activeTab, setActiveTabRaw] = useState("resume");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [postAssignment, setPostAssignment] = useState<{ sessionId: string; sessionName: string } | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [enqueteDialogOpen, setEnqueteDialogOpen] = useState(false);
  const [callLogOpen, setCallLogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { composerProps, openComposer } = useEmailComposer();
  const deleteContact = useDeleteContact();
  const { data: activeEnrollment } = useActiveEnrollment(contact?.id);

  // Determine track: from active enrollment, fallback to contact.formation
  const contactTrack: FormationTrack = activeEnrollment?.track
    ?? getTrackFromFormationType(contact?.formation);
  const trackBadge = TRACK_BADGES[contactTrack];
  const isInitial = contactTrack === "initial";

  // Tab guard: prevent accessing track-incompatible tabs
  const setActiveTab = useCallback((tab: string) => {
    if (tab === "cma" && !isInitial) {
      toast.info("Non applicable à ce parcours (Formation Continue)");
      return;
    }
    if (tab === "carte-pro" && isInitial) {
      toast.info("Non applicable à ce parcours (Parcours Initial)");
      return;
    }
    setActiveTabRaw(tab);
  }, [isInitial]);

  // Fetch cockpit data (workflow + CMA + paiements + rappels + auto notes)
  const { data: cockpitData } = useQuery({
    queryKey: ["apprenant-cockpit", contact?.id, contactTrack],
    queryFn: async () => {
      if (!contact) return null;
      const [inscRes, docRes, factRes, rappRes, notesRes, carteProRes] = await Promise.all([
        supabase.from("session_inscriptions").select("id, sessions(nom, date_debut)").eq("contact_id", contact.id).limit(1),
        supabase.from("contact_documents").select("type_document").eq("contact_id", contact.id),
        supabase.from("factures").select("id, statut, montant_total").eq("contact_id", contact.id).is("deleted_at", null),
        supabase.from("contact_historique").select("date_rappel, rappel_description, alerte_active")
          .eq("contact_id", contact.id).eq("alerte_active", true).not("date_rappel", "is", null)
          .order("date_rappel", { ascending: true }).limit(1),
        supabase.from("contact_historique").select("id, titre, contenu, date_echange")
          .eq("contact_id", contact.id).like("titre", "[AUTO]%")
          .order("date_echange", { ascending: false }).limit(10),
        supabase.from("cartes_professionnelles").select("numero_carte, prefecture, date_obtention, date_expiration")
          .eq("contact_id", contact.id).order("created_at", { ascending: false }).limit(1),
      ]);

      const inscriptions = inscRes.data || [];
      const docTypes = new Set((docRes.data || []).map((d) => d.type_document));
      const factures = factRes.data || [];
      const factureIds = factures.map((f) => f.id);

      // Fetch paiements only for this contact's factures
      let paiements: { montant: number }[] = [];
      if (factureIds.length > 0) {
        const { data } = await supabase
          .from("paiements")
          .select("montant")
          .in("facture_id", factureIds)
          .is("deleted_at", null);
        paiements = (data || []) as { montant: number }[];
      }

      const hasInscription = inscriptions.length > 0;
      const hasDocuments = docTypes.size > 0;
      const hasFacture = factures.length > 0;
      const hasPaid = factures.some((f) => f.statut === "payee" || f.statut === "partiel");

      // Track-aware completion
      const trackCompletion = computeTrackCompletion(contactTrack, {
        uploadedDocTypes: docTypes,
        carteProData: carteProRes.data?.[0] || null,
      });

      const totalFacture = factures.reduce((s, f) => s + Number(f.montant_total || 0), 0);
      const totalPaye = paiements.reduce((s, p) => s + Number(p.montant || 0), 0);
      const restantDu = totalFacture - totalPaye;

      const nextRappel = rappRes.data?.[0] || null;
      const nextSession = inscriptions[0] ? (inscriptions[0] as Record<string, unknown>).sessions as { nom?: string; date_debut?: string } | null : null;

      const autoNotes = (notesRes.data || []) as Array<{ id: string; titre: string; contenu: string | null; date_echange: string }>;
      const todayAutoNotes = autoNotes.filter(n => isToday(new Date(n.date_echange)));
      const lastAutoNote = autoNotes[0] || null;

      const alreadyRelancedCMA = todayAutoNotes.some(n => n.titre.includes("CMA"));
      const alreadyRelancedDocs = todayAutoNotes.some(n => n.titre.includes("demande docs") || n.titre.includes("relance docs"));
      const alreadyRelancedPaiement = todayAutoNotes.some(n => n.titre.includes("relance paiement"));
      const alreadyMarkedDone = todayAutoNotes.some(n => n.titre.includes("Marqué"));

      return {
        hasInscription, hasDocuments, hasFacture, hasPaid,
        trackCompletion,
        restantDu,
        nextRappel, nextSession,
        lastAutoNote, todayAutoNotes,
        alreadyRelancedCMA, alreadyRelancedDocs, alreadyRelancedPaiement, alreadyMarkedDone,
      };
    },
    enabled: !!contact?.id,
    staleTime: 15_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["apprenant-cockpit", contact?.id] });
    queryClient.invalidateQueries({ queryKey: ["contact-historique", contact?.id] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-resume", contact?.id] });
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
  }, [queryClient, contact?.id]);

  const handleHeaderAction = useCallback(async (category: Parameters<typeof createAutoNote>[1], extra?: string) => {
    if (!contact) return;
    const result = await createAutoNote(contact.id, category, extra);
    if (result) {
      toast.success("Action enregistrée", {
        action: { label: "Annuler", onClick: async () => { await deleteAutoNote(result.id); invalidate(); toast.info("Annulé"); } },
        duration: 8000,
      });
      invalidate();
    }
  }, [contact, invalidate]);

  if (isLoading || !contact) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const contactName = `${contact.prenom} ${contact.nom}`;
  const isProfileComplete = !!(contact.email && contact.telephone && contact.date_naissance);
  const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
  const avatarColor = contact.formation ? FORMATION_COLORS[contact.formation] || "bg-primary" : "bg-primary";
  const statutBadge = contact.statut ? STATUT_BADGES[contact.statut] || { label: contact.statut, className: "bg-muted" } : null;

  // ─── Workflow logic ───
  const isProspect = contact.statut === "En attente de validation" || !contact.statut;
  const hasDocuments = cockpitData?.hasDocuments ?? false;
  const hasInscription = cockpitData?.hasInscription ?? false;
  const hasFacture = cockpitData?.hasFacture ?? false;
  const hasPaid = cockpitData?.hasPaid ?? false;

  function getStepStatus(stepIndex: number): StepStatus {
    const completions = [!isProspect, isProfileComplete && hasDocuments, hasInscription, hasFacture, hasPaid];
    if (completions[stepIndex]) return "complete";
    const firstIncomplete = completions.findIndex((c) => !c);
    if (stepIndex === firstIncomplete) {
      if (stepIndex === 1 && !isProfileComplete) return "blocked";
      return "active";
    }
    return "pending";
  }

  const steps = [
    { label: "Prospect", status: getStepStatus(0), tooltip: isProspect ? "En attente de conversion" : "Converti en stagiaire" },
    { label: "Dossier", status: getStepStatus(1), tooltip: getStepStatus(1) === "blocked" ? "Profil incomplet" : hasDocuments ? "Dossier complet" : "Documents à ajouter" },
    { label: "Session", status: getStepStatus(2), tooltip: hasInscription ? "Inscrit à une session" : "Pas encore inscrit" },
    { label: "Facturé", status: getStepStatus(3), tooltip: hasFacture ? "Facture générée" : "Pas de facture" },
    { label: "Payé", status: getStepStatus(4), tooltip: hasPaid ? "Paiement reçu" : "En attente de paiement" },
  ];

  function getCurrentWorkflowStep(): WorkflowStep {
    if (isProspect) return "convert";
    if (!isProfileComplete || !hasDocuments) return "complete-profile";
    if (!hasInscription) return "assign-session";
    if (!hasFacture) return "generate-invoice";
    if (!hasPaid) return "record-payment";
    return "finalized";
  }

  const currentCTAStep = getCurrentWorkflowStep();

  const handleCTAAction = () => {
    switch (currentCTAStep) {
      case "complete-profile": setActiveTab("dossier"); break;
      case "assign-session": setShowAssignDialog(true); break;
      case "generate-invoice":
        setActiveTab("paiements");
        toast.info("💡 Prochaine étape : Générer la facture", { duration: 3000 });
        break;
      case "record-payment":
        setActiveTab("paiements");
        toast.info("💡 Prochaine étape : Enregistrer le paiement", { duration: 3000 });
        break;
    }
  };

  // ─── Cockpit indicators (track-aware) ───
  const trackComp = cockpitData?.trackCompletion ?? { received: 0, total: 5, missing: [], pct: 0 };
  const cmaReceived = trackComp.received;
  const cmaTotal = trackComp.total;
  const cmaMissing = trackComp.missing.length;
  const cmaPct = trackComp.pct;
  const restantDu = cockpitData?.restantDu ?? 0;
  const nextRappel = cockpitData?.nextRappel;
  const nextSession = cockpitData?.nextSession;
  const lastAutoNote = cockpitData?.lastAutoNote;
  const hasActionRequired = cmaMissing > 0 || restantDu > 0 || !hasInscription;

  // Urgency computation
  const urgency = computeContactUrgency({
    missingCMACount: cmaMissing,
    hasLatePayment: restantDu > 0,
    hasSessionSoon: hasInscription,
  });

  // Compute overall dossier progress
  const progressItems = [
    isProfileComplete,
    cmaReceived >= cmaTotal,
    hasInscription,
    hasFacture,
    hasPaid,
  ];
  const dossierProgress = Math.round((progressItems.filter(Boolean).length / progressItems.length) * 100);

  const tabs = [
    { value: "resume", icon: LayoutDashboard, label: "Résumé" },
    { value: "dossier", icon: FolderOpen, label: "Identité" },
    ...(isInitial
      ? [{ value: "cma", icon: FileCheck, label: "CMA" }]
      : [{ value: "carte-pro", icon: IdCard, label: "Carte Pro" }]
    ),
    { value: "documents", icon: FileText, label: "Documents" },
    { value: "paiements", icon: CreditCard, label: "Paiements" },
    { value: "formation", icon: GraduationCap, label: "Formation" },
    { value: "suivi", icon: MessageCircle, label: "Suivi" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ─── COCKPIT HEADER ─── */}
      <div className="p-3 sm:p-5 border-b bg-muted/30 space-y-2 sm:space-y-3">
        {/* Identity row */}
        <div className="flex items-start gap-3 sm:gap-4">
          <Avatar className="h-10 w-10 sm:h-14 sm:w-14 flex-shrink-0">
            <AvatarFallback className={cn("text-sm sm:text-lg font-bold text-primary-foreground", avatarColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-start justify-between">
              <h2 className="text-base sm:text-xl font-display font-bold text-foreground truncate">
                {contact.prenom} {contact.nom}
              </h2>
              {sheetSize && onSheetSizeChange && (
                <SheetSizeSelector size={sheetSize} onSizeChange={onSheetSizeChange} />
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Statut apprenant officiel */}
              <StatutApprenantDropdown
                contactId={contact.id}
                contactName={contactName}
                currentStatus={contact.statut_apprenant as StatutApprenant ?? "actif"}
              />
              {/* Badge 1: Statut pipeline */}
              {statutBadge && (
                <Badge variant="outline" className={cn("text-xs", statutBadge.className)}>
                  {statutBadge.label}
                </Badge>
              )}
              {/* Badge 2: Track */}
              <Badge variant="outline" className={cn("text-xs", trackBadge.className)}>
                {trackBadge.label} ({trackBadge.sublabel})
              </Badge>
              {/* Badge 3: Urgency (only if action required) */}
              {hasActionRequired && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className={cn("text-[10px] cursor-help", urgency.className)}>
                        <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1", urgency.dotClassName)} />
                        {urgency.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px]">
                      <p className="font-semibold text-xs">Urgence : {urgency.label}</p>
                      {urgency.reasons.length > 0 && (
                        <ul className="text-[10px] mt-0.5 space-y-0.5 text-muted-foreground">
                          {urgency.reasons.map((r: string, i: number) => <li key={i}>• {r}</li>)}
                        </ul>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>

        {/* Cockpit indicators row */}
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2">
          {/* Dossier progress */}
          <div className="bg-card border rounded-lg p-2.5 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground">Progression</p>
            <div className="flex items-center gap-2">
              <Progress value={dossierProgress} className="h-1.5 flex-1" />
              <span className="text-xs font-bold text-foreground">{dossierProgress}%</span>
            </div>
          </div>

          {/* CMA / Carte Pro indicator */}
          {isInitial ? (
            <button onClick={() => setActiveTab("cma")} className="bg-card border rounded-lg p-2.5 text-left hover:bg-muted/30 transition-colors">
              <p className="text-[10px] font-medium text-muted-foreground">CMA</p>
              <div className="flex items-center gap-1.5">
                <span className={cn("text-sm font-bold", cmaMissing > 0 ? "text-warning" : "text-success")}>
                  {cmaReceived}/{cmaTotal}
                </span>
                {cmaMissing > 0 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 bg-warning/10 text-warning border-warning/20">
                    {cmaMissing} manquant{cmaMissing > 1 ? "s" : ""}
                  </Badge>
                )}
                {cmaMissing === 0 && <CheckCircle2 className="h-3 w-3 text-success" />}
              </div>
            </button>
          ) : (
            <button onClick={() => setActiveTab("carte-pro")} className="bg-card border rounded-lg p-2.5 text-left hover:bg-muted/30 transition-colors">
              <p className="text-[10px] font-medium text-muted-foreground">Carte Pro</p>
              <div className="flex items-center gap-1.5">
                <IdCard className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-medium">Formation Continue</span>
              </div>
            </button>
          )}

          {/* Next deadline */}
          <div className="bg-card border rounded-lg p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground">Prochaine échéance</p>
            <p className="text-xs font-medium text-foreground truncate mt-0.5">
              {nextSession?.date_debut
                ? `${nextSession.nom || "Session"} — ${format(new Date(nextSession.date_debut), "dd/MM", { locale: fr })}`
                : nextRappel?.date_rappel
                  ? `Rappel — ${format(new Date(nextRappel.date_rappel), "dd/MM", { locale: fr })}`
                  : <span className="text-muted-foreground">Aucune</span>
              }
            </p>
          </div>

          {/* Last action */}
          <div className="bg-card border rounded-lg p-2.5">
            <p className="text-[10px] font-medium text-muted-foreground">Dernière action</p>
            {lastAutoNote ? (
              <p className="text-xs text-foreground truncate mt-0.5">
                <Bot className="h-3 w-3 inline mr-0.5 text-muted-foreground" />
                {lastAutoNote.titre.replace("[AUTO] ", "")} — {format(new Date(lastAutoNote.date_echange), "dd/MM HH:mm")}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">—</p>
            )}
          </div>
        </div>

        {/* Workflow Stepper */}
        {cockpitData && (
          <div className="bg-card rounded-xl border p-3 space-y-3">
            <WorkflowStepper steps={steps} />
            <WorkflowDynamicCTA currentStep={currentCTAStep} onAction={handleCTAAction} />
          </div>
        )}

        {/* Quick CTA actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {contact.telephone && (
            <Button size="sm" variant="outline" className="text-xs"
              onClick={() => {
                window.open(`tel:${contact.telephone}`, "_blank");
                setCallLogOpen(true);
              }}
            >
              <Phone className="h-3 w-3 mr-1" /> Appeler
            </Button>
          )}
          {contact.email && (
            <Button size="sm" variant="outline" className="text-xs"
              onClick={() => openComposer({
                recipients: [{ id: contact.id, email: contact.email!, prenom: contact.prenom, nom: contact.nom }],
                defaultSubject: "",
                defaultBody: `Bonjour ${contact.prenom},\n\n\n\nCordialement,\nT3P Campus`,
              })}
            >
              <Mail className="h-3 w-3 mr-1" /> Email
            </Button>
          )}
          {contact.telephone && (
            <Button size="sm" variant="outline" className="text-xs text-success border-success/20 hover:bg-success/5" onClick={() => openWhatsApp(contact.telephone)}>
              <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
            </Button>
          )}

          {/* Relance CMA (anti-double) — only for initial track */}
          {isInitial && cmaMissing > 0 && contact.email && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm" variant="outline"
                      className="text-xs text-warning border-warning/20 hover:bg-warning/5"
                      disabled={!!cockpitData?.alreadyRelancedCMA}
                      onClick={() => handleHeaderAction("cma_relance", `${cmaMissing} pièce(s) manquante(s)`)}
                    >
                      <Send className="h-3 w-3 mr-1" /> Relance CMA
                    </Button>
                  </span>
                </TooltipTrigger>
                {cockpitData?.alreadyRelancedCMA && (
                  <TooltipContent><p>Déjà relancé aujourd'hui</p></TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Marquer fait (anti-double) */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    size="sm" variant="outline"
                    className="text-xs"
                    disabled={!!cockpitData?.alreadyMarkedDone}
                    onClick={() => handleHeaderAction("marquer_fait")}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Fait
                  </Button>
                </span>
              </TooltipTrigger>
              {cockpitData?.alreadyMarkedDone && (
                <TooltipContent><p>Déjà marqué aujourd'hui</p></TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>

          {/* Générer document */}
          <Button size="sm" variant="default" className="text-xs"
            onClick={() => setGenerateDialogOpen(true)}
          >
            <FileText className="h-3 w-3 mr-1" /> Générer doc
          </Button>

          {/* Enquête satisfaction */}
          <Button size="sm" variant="outline" className="text-xs"
            onClick={() => setEnqueteDialogOpen(true)}
          >
            <Star className="h-3 w-3 mr-1" /> Enquête
          </Button>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="mx-3 sm:mx-5 mt-2 sm:mt-3 mb-0 overflow-x-auto scrollbar-hide">
          <TabsList className="justify-start bg-transparent gap-0.5 sm:gap-1 p-0 h-auto flex-nowrap w-max">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1 sm:gap-1.5 text-[11px] sm:text-xs px-2 sm:px-3 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg whitespace-nowrap flex-shrink-0"
              >
                <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.length > 6 ? tab.label.slice(0, 5) + '.' : tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-3 sm:p-5">
          <TabsContent value="resume" className="mt-0">
            <ResumeTab contactId={contact.id} formation={contact.formation} onNavigateTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="dossier" className="mt-0">
            <DossierTab contactId={contact.id} formation={contact.formation} />
          </TabsContent>
          {isInitial ? (
            <TabsContent value="cma" className="mt-0">
              <CMATab contactId={contact.id} contactPrenom={contact.prenom} contactEmail={contact.email} formation={contact.formation} />
            </TabsContent>
          ) : (
            <TabsContent value="carte-pro" className="mt-0">
              <CarteProTab contactId={contact.id} contactPrenom={contact.prenom} formation={contact.formation} />
            </TabsContent>
          )}
          <TabsContent value="documents" className="mt-0">
            <DocumentsTab contactId={contact.id} contactPrenom={contact.prenom} contactNom={contact.nom} contactEmail={contact.email} contactFormation={contact.formation} />
          </TabsContent>
          <TabsContent value="paiements" className="mt-0">
            <PaiementsTab contactId={contact.id} />
          </TabsContent>
          <TabsContent value="formation" className="mt-0">
            <FormationExamensTab contactId={contact.id} contactPrenom={contact.prenom} contactEmail={contact.email || undefined} contactFormation={contact.formation} />
          </TabsContent>
          <TabsContent value="suivi" className="mt-0">
            <SuiviTab contactId={contact.id} contactPrenom={contact.prenom} contactNom={contact.nom} contactEmail={contact.email} contactFormation={contact.formation} />
          </TabsContent>
        </div>
      </Tabs>

      {/* Workflow Dialogs */}
      <SessionAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        contactId={contact.id}
        contactName={contactName}
        contactFormation={contact.formation}
        onSuccess={(sessionId, sessionName) => setPostAssignment({ sessionId, sessionName })}
      />
      <PostAssignmentDialog
        open={!!postAssignment}
        onOpenChange={(open) => !open && setPostAssignment(null)}
        contactName={contactName}
        sessionName={postAssignment?.sessionName || ""}
        onGenerateFacture={() => { setPostAssignment(null); setActiveTab("paiements"); }}
        onAddDocuments={() => { setPostAssignment(null); setActiveTab("dossier"); }}
        onReturnDashboard={() => setPostAssignment(null)}
      />
      <EmailComposerModal {...composerProps} />

      {/* ─── Legacy-parity dialogs ─── */}
      <GenerateDocumentDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        contact={contact}
      />

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

      {contact.telephone && (
        <CallLogDialog
          open={callLogOpen}
          onOpenChange={setCallLogOpen}
          contactId={contact.id}
          contactName={contactName}
          phoneNumber={contact.telephone}
        />
      )}

      {/* ─── FOOTER: Modifier / Archiver ─── */}
      {(onEdit || onClose) && (
        <div className="flex gap-2.5 p-3 sm:p-5 border-t border-border/60 bg-card">
          {onEdit && (
            <Button className="flex-1 h-10 font-semibold" onClick={() => onEdit(contact)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" className="h-10 w-10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Archiver cet apprenant ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'apprenant sera archivé et n'apparaîtra plus dans la liste. Cette action peut
                  être annulée ultérieurement.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  try {
                    await deleteContact.mutateAsync(contact.id);
                    toast.success("Contact archivé", {
                      description: `${contact.prenom} ${contact.nom} a été archivé avec succès.`,
                    });
                    onClose?.();
                  } catch {
                    toast.error("Erreur", {
                      description: "Impossible d'archiver le contact. Veuillez réessayer.",
                    });
                  }
                }}>Archiver</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
