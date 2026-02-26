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

  if (isLoading || !contact) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-xl" />
      </div>
    );
  }

  const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
  const avatarColor = contact.formation
    ? FORMATION_COLORS[contact.formation] || "bg-primary"
    : "bg-primary";
  const statutBadge = contact.statut
    ? STATUT_BADGES[contact.statut] || { label: contact.statut, className: "bg-muted" }
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* ─── HEADER ─── */}
      <div className="p-5 border-b bg-muted/30 space-y-4">
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

        {/* Contact info + quick actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {contact.telephone && (
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={`tel:${contact.telephone}`}>
                <Phone className="h-3.5 w-3.5 mr-1" />
                {contact.telephone}
              </a>
            </Button>
          )}
          {contact.email && (
            <Button variant="outline" size="sm" asChild className="text-xs">
              <a href={`mailto:${contact.email}`}>
                <Mail className="h-3.5 w-3.5 mr-1" />
                {contact.email}
              </a>
            </Button>
          )}
        </div>

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
            <Button size="sm" variant="outline" className="text-xs text-green-600 border-green-200 hover:bg-green-50" onClick={() => openWhatsApp(contact.telephone)}>
              <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab("notes")}>
            <StickyNote className="h-3 w-3 mr-1" /> Note
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => setActiveTab("dossier")}>
            <Zap className="h-3 w-3 mr-1" /> Statut
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
    </div>
  );
}
