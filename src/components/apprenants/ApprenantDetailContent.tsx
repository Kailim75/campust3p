import { useState, useMemo, useCallback } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Phone, Mail, StickyNote, FolderOpen, GraduationCap, Award,
  CreditCard, MessageCircle, FileText, Bell, LayoutDashboard, FileCheck,
  CheckCircle2, AlertTriangle, Clock, Send, Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { SiWhatsapp } from "react-icons/si";
import { ResumeTab } from "./tabs/ResumeTab";
import { DossierTab } from "./tabs/DossierTab";
import { FormationTab } from "./tabs/FormationTab";
import { CMATab } from "./tabs/CMATab";
import { ExamensTab } from "./tabs/ExamensTab";
import { PaiementsTab } from "./tabs/PaiementsTab";
import { CommunicationsTab } from "./tabs/CommunicationsTab";
import { NotesTab } from "./tabs/NotesTab";
import { RappelsTab } from "./tabs/RappelsTab";
import { WorkflowStepper, type StepStatus } from "@/components/workflow/WorkflowStepper";
import { WorkflowDynamicCTA, type WorkflowStep } from "@/components/workflow/WorkflowDynamicCTA";
import { SessionAssignDialog } from "@/components/workflow/SessionAssignDialog";
import { PostAssignmentDialog } from "@/components/workflow/PostAssignmentDialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isToday } from "date-fns";
import { fr } from "date-fns/locale";
import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";
import { createAutoNote, deleteAutoNote } from "@/lib/aujourdhui-actions";
import type { Contact } from "@/hooks/useContacts";

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
}

export function ApprenantDetailContent({ contact, isLoading }: ApprenantDetailContentProps) {
  const [activeTab, setActiveTab] = useState("resume");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [postAssignment, setPostAssignment] = useState<{ sessionId: string; sessionName: string } | null>(null);
  const queryClient = useQueryClient();

  // Fetch cockpit data (workflow + CMA + paiements + rappels + auto notes)
  const { data: cockpitData } = useQuery({
    queryKey: ["apprenant-cockpit", contact?.id],
    queryFn: async () => {
      if (!contact) return null;
      const [inscRes, docRes, factRes, paiRes, rappRes, notesRes] = await Promise.all([
        supabase.from("session_inscriptions").select("id, sessions(nom, date_debut)").eq("contact_id", contact.id).limit(1),
        supabase.from("contact_documents").select("type_document").eq("contact_id", contact.id),
        supabase.from("factures").select("id, statut, montant_total").eq("contact_id", contact.id),
        supabase.from("paiements").select("montant"),
        supabase.from("contact_historique").select("date_rappel, rappel_description, alerte_active")
          .eq("contact_id", contact.id).eq("alerte_active", true).not("date_rappel", "is", null)
          .order("date_rappel", { ascending: true }).limit(1),
        supabase.from("contact_historique").select("id, titre, contenu, date_echange")
          .eq("contact_id", contact.id).like("titre", "[AUTO]%")
          .order("date_echange", { ascending: false }).limit(10),
      ]);

      const inscriptions = inscRes.data || [];
      const docTypes = new Set((docRes.data || []).map((d: any) => d.type_document));
      const factures = factRes.data || [];
      const paiements = paiRes.data || [];
      const hasInscription = inscriptions.length > 0;
      const hasDocuments = docTypes.size > 0;
      const hasFacture = factures.length > 0;
      const hasPaid = factures.some((f: any) => f.statut === "payee" || f.statut === "partiel");

      const cmaReceived = CMA_REQUIRED_DOCS.filter(d => docTypes.has(d)).length;
      const cmaTotal = CMA_REQUIRED_DOCS.length;
      const cmaMissing = cmaTotal - cmaReceived;

      const totalFacture = factures.reduce((s: number, f: any) => s + Number(f.montant_total || 0), 0);
      const totalPaye = paiements.reduce((s: number, p: any) => s + Number(p.montant || 0), 0);
      const restantDu = totalFacture - totalPaye;

      const nextRappel = rappRes.data?.[0] || null;
      const nextSession = inscriptions[0] ? (inscriptions[0] as any).sessions : null;

      const autoNotes = (notesRes.data || []) as Array<{ id: string; titre: string; contenu: string | null; date_echange: string }>;
      const todayAutoNotes = autoNotes.filter(n => isToday(new Date(n.date_echange)));
      const lastAutoNote = autoNotes[0] || null;

      // Anti double relance flags
      const alreadyRelancedCMA = todayAutoNotes.some(n => n.titre.includes("CMA"));
      const alreadyRelancedDocs = todayAutoNotes.some(n => n.titre.includes("demande docs") || n.titre.includes("relance docs"));
      const alreadyRelancedPaiement = todayAutoNotes.some(n => n.titre.includes("relance paiement"));
      const alreadyMarkedDone = todayAutoNotes.some(n => n.titre.includes("Marqué"));

      return {
        hasInscription, hasDocuments, hasFacture, hasPaid,
        cmaReceived, cmaTotal, cmaMissing,
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

  // ─── Cockpit indicators ───
  const cmaReceived = cockpitData?.cmaReceived ?? 0;
  const cmaTotal = cockpitData?.cmaTotal ?? 5;
  const cmaMissing = cockpitData?.cmaMissing ?? 0;
  const cmaPct = Math.round((cmaReceived / cmaTotal) * 100);
  const restantDu = cockpitData?.restantDu ?? 0;
  const nextRappel = cockpitData?.nextRappel;
  const nextSession = cockpitData?.nextSession;
  const lastAutoNote = cockpitData?.lastAutoNote;
  const hasActionRequired = cmaMissing > 0 || restantDu > 0 || !hasInscription;

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
    { value: "cma", icon: FileCheck, label: "CMA" },
    { value: "documents", icon: FileText, label: "Documents" },
    { value: "paiements", icon: CreditCard, label: "Paiements" },
    { value: "formation", icon: GraduationCap, label: "Formation" },
    { value: "communications", icon: MessageCircle, label: "Suivi" },
    { value: "notes", icon: StickyNote, label: "Notes" },
    { value: "rappels", icon: Bell, label: "Rappels" },
    { value: "examens", icon: Award, label: "Examens" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* ─── COCKPIT HEADER ─── */}
      <div className="p-5 border-b bg-muted/30 space-y-3">
        {/* Identity row */}
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className={cn("text-lg font-bold text-primary-foreground", avatarColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 space-y-1">
            <h2 className="text-xl font-display font-bold text-foreground truncate">
              {contact.prenom} {contact.nom}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {statutBadge && (
                <Badge variant="outline" className={cn("text-xs", statutBadge.className)}>
                  {statutBadge.label}
                </Badge>
              )}
              {contact.formation && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {contact.formation}
                </Badge>
              )}
              {/* Dossier status badge */}
              <Badge variant="outline" className={cn("text-xs",
                hasActionRequired
                  ? "bg-warning/10 text-warning border-warning/20"
                  : "bg-success/10 text-success border-success/20"
              )}>
                {hasActionRequired ? (
                  <><AlertTriangle className="h-3 w-3 mr-1" />Action requise</>
                ) : (
                  <><CheckCircle2 className="h-3 w-3 mr-1" />OK</>
                )}
              </Badge>
            </div>
          </div>
        </div>

        {/* Cockpit indicators row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Dossier progress */}
          <div className="bg-card border rounded-lg p-2.5 space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Progression</p>
            <div className="flex items-center gap-2">
              <Progress value={dossierProgress} className="h-1.5 flex-1" />
              <span className="text-xs font-bold text-foreground">{dossierProgress}%</span>
            </div>
          </div>

          {/* CMA */}
          <button onClick={() => setActiveTab("cma")} className="bg-card border rounded-lg p-2.5 text-left hover:bg-muted/30 transition-colors">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">CMA</p>
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

          {/* Next deadline */}
          <div className="bg-card border rounded-lg p-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Prochaine échéance</p>
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
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Dernière action</p>
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
        <div className="flex items-center gap-2 flex-wrap">
          {contact.telephone && (
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <a href={`tel:${contact.telephone}`}>
                <Phone className="h-3 w-3 mr-1" /> Appeler
              </a>
            </Button>
          )}
          {contact.email && (
            <Button size="sm" variant="outline" className="text-xs" asChild>
              <a href={`mailto:${contact.email}`}>
                <Mail className="h-3 w-3 mr-1" /> Email
              </a>
            </Button>
          )}
          {contact.telephone && (
            <Button size="sm" variant="outline" className="text-xs text-success border-success/20 hover:bg-success/5" onClick={() => openWhatsApp(contact.telephone)}>
              <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
            </Button>
          )}

          {/* Relance CMA (anti-double) */}
          {cmaMissing > 0 && contact.email && (
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
        </div>
      </div>

      {/* ─── TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-5 mt-3 mb-0 justify-start bg-transparent gap-1 p-0 h-auto flex-wrap">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="flex-1 overflow-auto p-5">
          <TabsContent value="resume" className="mt-0">
            <ResumeTab contactId={contact.id} formation={contact.formation} onNavigateTab={setActiveTab} />
          </TabsContent>
          <TabsContent value="dossier" className="mt-0">
            <DossierTab contactId={contact.id} formation={contact.formation} />
          </TabsContent>
          <TabsContent value="cma" className="mt-0">
            <CMATab contactId={contact.id} contactPrenom={contact.prenom} contactEmail={contact.email} formation={contact.formation} />
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <CommunicationsTab contactId={contact.id} contactPrenom={contact.prenom} contactNom={contact.nom} contactEmail={contact.email} contactFormation={contact.formation} />
          </TabsContent>
          <TabsContent value="paiements" className="mt-0">
            <PaiementsTab contactId={contact.id} />
          </TabsContent>
          <TabsContent value="formation" className="mt-0">
            <FormationTab contactId={contact.id} contactPrenom={contact.prenom} contactEmail={contact.email || undefined} />
          </TabsContent>
          <TabsContent value="communications" className="mt-0">
            <CommunicationsTab contactId={contact.id} contactPrenom={contact.prenom} contactNom={contact.nom} contactEmail={contact.email} contactFormation={contact.formation} />
          </TabsContent>
          <TabsContent value="notes" className="mt-0">
            <NotesTab contactId={contact.id} />
          </TabsContent>
          <TabsContent value="rappels" className="mt-0">
            <RappelsTab contactId={contact.id} />
          </TabsContent>
          <TabsContent value="examens" className="mt-0">
            <ExamensTab contactId={contact.id} formation={contact.formation} />
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
    </div>
  );
}
