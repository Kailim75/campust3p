import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  Mail,
  StickyNote,
  Zap,
  FolderOpen,
  GraduationCap,
  Award,
  CreditCard,
  MessageCircle,
  FileText,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { SiWhatsapp } from "react-icons/si";
import { DossierTab } from "./tabs/DossierTab";
import { FormationTab } from "./tabs/FormationTab";
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
  const [activeTab, setActiveTab] = useState("dossier");
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [postAssignment, setPostAssignment] = useState<{ sessionId: string; sessionName: string } | null>(null);

  // Fetch workflow data for stepper
  const { data: workflowData } = useQuery({
    queryKey: ["apprenant-workflow", contact?.id],
    queryFn: async () => {
      if (!contact) return null;
      const [inscRes, docRes, factRes] = await Promise.all([
        supabase.from("session_inscriptions").select("id").eq("contact_id", contact.id).limit(1),
        supabase.from("contact_documents").select("id").eq("contact_id", contact.id).limit(1),
        supabase.from("factures").select("id, statut").eq("contact_id", contact.id),
      ]);
      const inscriptions = inscRes.data || [];
      const documents = docRes.data || [];
      const factures = factRes.data || [];
      const hasPaid = factures.some((f: any) => f.statut === "payee" || f.statut === "partiel");
      return { hasInscription: inscriptions.length > 0, hasDocuments: documents.length > 0, hasFacture: factures.length > 0, hasPaid };
    },
    enabled: !!contact?.id,
    staleTime: 30_000,
  });

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
  const avatarColor = contact.formation
    ? FORMATION_COLORS[contact.formation] || "bg-primary"
    : "bg-primary";
  const statutBadge = contact.statut
    ? STATUT_BADGES[contact.statut] || { label: contact.statut, className: "bg-muted" }
    : null;

  // ─── Workflow logic ───
  const isProspect = contact.statut === "En attente de validation" || !contact.statut;
  const hasDocuments = workflowData?.hasDocuments ?? false;
  const hasInscription = workflowData?.hasInscription ?? false;
  const hasFacture = workflowData?.hasFacture ?? false;
  const hasPaid = workflowData?.hasPaid ?? false;

  // Compute step statuses
  function getStepStatus(stepIndex: number): StepStatus {
    const completions = [!isProspect, isProfileComplete && hasDocuments, hasInscription, hasFacture, hasPaid];
    if (completions[stepIndex]) return "complete";
    // Find first incomplete step
    const firstIncomplete = completions.findIndex((c) => !c);
    if (stepIndex === firstIncomplete) {
      // Check for blocked state (profile incomplete = blocked on dossier)
      if (stepIndex === 1 && !isProfileComplete) return "blocked";
      return "active";
    }
    return "pending";
  }

  const steps = [
    { label: "Prospect", status: getStepStatus(0), tooltip: isProspect ? "En attente de conversion" : "Converti en stagiaire" },
    { label: "Dossier", status: getStepStatus(1), tooltip: getStepStatus(1) === "blocked" ? "Profil incomplet : email, téléphone ou date de naissance manquant" : hasDocuments ? "Dossier complet" : "Documents à ajouter" },
    { label: "Session", status: getStepStatus(2), tooltip: hasInscription ? "Inscrit à une session" : "Pas encore inscrit" },
    { label: "Facturé", status: getStepStatus(3), tooltip: hasFacture ? "Facture générée" : "Pas de facture" },
    { label: "Payé", status: getStepStatus(4), tooltip: hasPaid ? "Paiement reçu" : "En attente de paiement" },
  ];

  // Determine dynamic CTA step
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
      case "complete-profile":
        setActiveTab("dossier");
        break;
      case "assign-session":
        setShowAssignDialog(true);
        break;
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

  return (
    <div className="flex flex-col h-full">
      {/* ─── HEADER ─── */}
      <div className="p-5 border-b bg-muted/30 space-y-3">
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
            </div>
          </div>
        </div>

        {/* Workflow Stepper */}
        {workflowData && (
          <div className="bg-card rounded-xl border p-3 space-y-3">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              🎯 Progression du dossier
            </p>
            <WorkflowStepper steps={steps} />
            <WorkflowDynamicCTA currentStep={currentCTAStep} onAction={handleCTAAction} />
          </div>
        )}

        {/* Quick contact actions */}
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
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab("notes")}>
            <StickyNote className="h-3 w-3 mr-1" /> Note
          </Button>
        </div>
      </div>

      {/* ─── TABS ─── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-5 mt-3 mb-0 justify-start bg-transparent gap-1 p-0 h-auto flex-wrap">
          {[
            { value: "dossier", icon: FolderOpen, label: "Dossier" },
            { value: "formation", icon: GraduationCap, label: "Formation" },
            { value: "examens", icon: Award, label: "Examens" },
            { value: "paiements", icon: CreditCard, label: "Paiements" },
            { value: "communications", icon: MessageCircle, label: "Communications" },
            { value: "notes", icon: FileText, label: "Notes" },
            { value: "rappels", icon: Bell, label: "Rappels" },
          ].map((tab) => (
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
          <TabsContent value="dossier" className="mt-0">
            <DossierTab contactId={contact.id} formation={contact.formation} />
          </TabsContent>
          <TabsContent value="formation" className="mt-0">
            <FormationTab contactId={contact.id} contactPrenom={contact.prenom} contactEmail={contact.email || undefined} />
          </TabsContent>
          <TabsContent value="examens" className="mt-0">
            <ExamensTab contactId={contact.id} formation={contact.formation} />
          </TabsContent>
          <TabsContent value="paiements" className="mt-0">
            <PaiementsTab contactId={contact.id} />
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
        </div>
      </Tabs>

      {/* Workflow Dialogs */}
      <SessionAssignDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        contactId={contact.id}
        contactName={contactName}
        contactFormation={contact.formation}
        onSuccess={(sessionId, sessionName) => {
          setPostAssignment({ sessionId, sessionName });
        }}
      />

      <PostAssignmentDialog
        open={!!postAssignment}
        onOpenChange={(open) => !open && setPostAssignment(null)}
        contactName={contactName}
        sessionName={postAssignment?.sessionName || ""}
        onGenerateFacture={() => {
          setPostAssignment(null);
          setActiveTab("paiements");
        }}
        onAddDocuments={() => {
          setPostAssignment(null);
          setActiveTab("dossier");
        }}
        onReturnDashboard={() => {
          setPostAssignment(null);
        }}
      />
    </div>
  );
}
