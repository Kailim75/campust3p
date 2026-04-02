import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Phone, Mail, ExternalLink, CheckCircle2, AlertTriangle, Clock,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Contact } from "@/hooks/useContacts";
import { StatutApprenantDropdown } from "./StatutApprenantDropdown";
import type { StatutApprenant } from "@/lib/apprenant-active";

const FORMATION_COLORS: Record<string, string> = {
  TAXI: "bg-primary",
  VTC: "bg-accent",
  VMDTR: "bg-info",
};

const STATUT_BADGES: Record<string, { label: string; className: string }> = {
  "En attente de validation": { label: "Nouveau lead", className: "bg-muted text-muted-foreground" },
  "En formation théorique": { label: "En formation", className: "bg-primary/15 text-primary" },
  "Examen T3P programmé": { label: "Examen T3P", className: "bg-accent/15 text-accent" },
  "T3P obtenu": { label: "T3P Obtenu", className: "bg-success/15 text-success" },
  "En formation pratique": { label: "Formation pratique", className: "bg-info/15 text-info" },
  Client: { label: "Diplômé", className: "bg-success/15 text-success" },
  Bravo: { label: "Diplômé", className: "bg-success/15 text-success" },
  Abandonné: { label: "Abandonné", className: "bg-destructive/15 text-destructive" },
};

interface ApprenantQuickViewProps {
  contact: Contact | null;
  isLoading: boolean;
  onClose?: () => void;
}

export function ApprenantQuickView({ contact, isLoading, onClose }: ApprenantQuickViewProps) {
  const navigate = useNavigate();

  // Lightweight cockpit query — just essentials
  const { data: summary } = useQuery({
    queryKey: ["apprenant-quickview", contact?.id],
    queryFn: async () => {
      if (!contact) return null;
      const [inscRes, docRes, factRes, paiRes] = await Promise.all([
        supabase.from("session_inscriptions").select("id, sessions(nom, date_debut)").eq("contact_id", contact.id).eq("statut", "inscrit").is("deleted_at", null).limit(1),
        supabase.from("contact_documents").select("type_document").eq("contact_id", contact.id).is("deleted_at", null),
        supabase.from("factures").select("id, montant_total, statut").eq("contact_id", contact.id).is("deleted_at", null).neq("statut", "annulee"),
        supabase.from("paiements").select("montant, factures!inner(contact_id)").is("deleted_at", null).eq("factures.contact_id", contact.id),
      ]);

      const session = (inscRes.data as any)?.[0]?.sessions as { nom?: string; date_debut?: string } | null;
      const docTypes = new Set((docRes.data || []).map(d => d.type_document));
      const requiredDocs = ["piece_identite", "justificatif_domicile", "photo_identite", "permis_conduire"];
      const missingDocs = requiredDocs.filter(t => !docTypes.has(t)).length;

      const factures = factRes.data || [];
      const totalFacture = factures.reduce((s, f) => s + Number(f.montant_total || 0), 0);
      const totalPaye = (paiRes.data as any[] || []).reduce((s: number, p: any) => s + Number(p.montant || 0), 0);

      const isProspect = contact.statut === "En attente de validation" || !contact.statut;
      const isProfileComplete = !!(contact.email && contact.telephone && contact.date_naissance);
      const hasInscription = (inscRes.data?.length ?? 0) > 0;
      const hasFacture = factures.length > 0;
      const hasPaid = factures.some(f => f.statut === "payee" || f.statut === "partiel");

      const steps = [!isProspect, isProfileComplete && missingDocs === 0, hasInscription, hasFacture, hasPaid];
      const progress = Math.round((steps.filter(Boolean).length / steps.length) * 100);

      // Next step label
      let nextStep = "Finalisé";
      if (isProspect) nextStep = "Convertir en stagiaire";
      else if (!isProfileComplete || missingDocs > 0) nextStep = `Compléter le dossier (${missingDocs} doc manquant${missingDocs > 1 ? "s" : ""})`;
      else if (!hasInscription) nextStep = "Inscrire à une session";
      else if (!hasFacture) nextStep = "Générer la facture";
      else if (!hasPaid) nextStep = "Enregistrer un paiement";

      return {
        sessionName: session?.nom ?? null,
        sessionDate: session?.date_debut ?? null,
        missingDocs,
        totalFacture,
        totalPaye,
        progress,
        nextStep,
        isFinalized: progress === 100,
      };
    },
    enabled: !!contact?.id,
    staleTime: 15_000,
  });

  if (isLoading || !contact) {
    return (
      <div className="p-5 space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const initials = `${contact.prenom.charAt(0)}${contact.nom.charAt(0)}`.toUpperCase();
  const avatarColor = contact.formation ? FORMATION_COLORS[contact.formation] || "bg-primary" : "bg-primary";
  const statutBadge = contact.statut ? STATUT_BADGES[contact.statut] : null;

  const paymentLabel = (() => {
    if (!summary || summary.totalFacture <= 0) return { text: "Non facturé", className: "text-muted-foreground" };
    if (summary.totalPaye >= summary.totalFacture) return { text: "Soldé", className: "text-success font-medium" };
    if (summary.totalPaye > 0) return { text: `Partiel · ${summary.totalFacture - summary.totalPaye}€ restant`, className: "text-warning font-medium" };
    return { text: `Impayé · ${summary.totalFacture}€`, className: "text-destructive font-medium" };
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Identity */}
      <div className="p-5 border-b space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className={cn("text-lg font-bold text-primary-foreground", avatarColor)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">
              {contact.prenom} {contact.nom}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <StatutApprenantDropdown
                contactId={contact.id}
                contactName={`${contact.prenom} ${contact.nom}`}
                currentStatus={contact.statut_apprenant as StatutApprenant ?? "actif"}
              />
              {statutBadge && (
                <Badge variant="outline" className={cn("text-xs", statutBadge.className)}>
                  {statutBadge.label}
                </Badge>
              )}
              {contact.formation && (
                <Badge variant="outline" className="text-xs">
                  {contact.formation}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Contact buttons */}
        <div className="flex items-center gap-2">
          {contact.telephone && (
            <Button size="sm" variant="outline" className="text-xs flex-1"
              onClick={() => window.open(`tel:${contact.telephone}`, "_blank")}>
              <Phone className="h-3 w-3 mr-1" /> Appeler
            </Button>
          )}
          {contact.email && (
            <Button size="sm" variant="outline" className="text-xs flex-1"
              onClick={() => window.open(`mailto:${contact.email}`)}>
              <Mail className="h-3 w-3 mr-1" /> Email
            </Button>
          )}
          {contact.telephone && (
            <Button size="sm" variant="outline" className="text-xs text-success border-success/20 hover:bg-success/5"
              onClick={() => openWhatsApp(contact.telephone)}>
              <SiWhatsapp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="p-5 space-y-4 flex-1">
        {/* Pipeline progress */}
        {summary && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Progression dossier</span>
              <span className="text-sm font-bold">{summary.progress}%</span>
            </div>
            <Progress value={summary.progress} className="h-2" />
            {!summary.isFinalized && (
              <div className="flex items-center gap-1.5 mt-1">
                <AlertTriangle className="h-3 w-3 text-warning shrink-0" />
                <span className="text-xs text-muted-foreground">{summary.nextStep}</span>
              </div>
            )}
            {summary.isFinalized && (
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                <span className="text-xs text-success font-medium">Dossier complet</span>
              </div>
            )}
          </div>
        )}

        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Session</p>
            <p className="text-sm font-medium text-foreground mt-0.5 truncate">
              {summary?.sessionName || "—"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Paiement</p>
            <p className={cn("text-sm mt-0.5", paymentLabel.className)}>
              {paymentLabel.text}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Documents</p>
            <p className={cn("text-sm font-medium mt-0.5", summary?.missingDocs ? "text-warning" : "text-success")}>
              {summary?.missingDocs ? `${summary.missingDocs} manquant${summary.missingDocs > 1 ? "s" : ""}` : "Complet"}
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Facturation</p>
            <p className="text-sm font-mono text-foreground mt-0.5">
              {summary && summary.totalFacture > 0 ? `${summary.totalPaye}€ / ${summary.totalFacture}€` : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Footer: CTA */}
      <div className="p-5 border-t space-y-2">
        <Button
          className="w-full gap-2"
          onClick={() => {
            onClose?.();
            navigate(`/contacts/${contact.id}`);
          }}
        >
          <ExternalLink className="h-4 w-4" />
          Voir la fiche complète
        </Button>
      </div>
    </div>
  );
}
