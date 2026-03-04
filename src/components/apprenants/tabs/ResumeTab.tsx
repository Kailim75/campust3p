import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Circle, AlertTriangle, Calendar, CreditCard,
  FolderOpen, Clock, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

const CMA_REQUIRED_DOCS = ["cni", "photo", "attestation_domicile", "permis_b"];
const DOC_LABELS: Record<string, string> = {
  cni: "Pièce d'identité",
  photo: "Photo d'identité",
  attestation_domicile: "Justificatif domicile",
  permis_b: "Permis",
};

interface ResumeTabProps {
  contactId: string;
  formation: string | null;
  onNavigateTab: (tab: string) => void;
}

export function ResumeTab({ contactId, formation, onNavigateTab }: ResumeTabProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["apprenant-resume", contactId],
    queryFn: async () => {
      const [docsRes, facturesRes, paiementsRes, inscRes, rappelsRes] = await Promise.all([
        supabase.from("contact_documents").select("type_document").eq("contact_id", contactId),
        supabase.from("factures").select("id, montant_total, statut").eq("contact_id", contactId),
        supabase.from("paiements").select("facture_id, montant"),
        supabase.from("session_inscriptions").select("id, session_id, sessions(nom, date_debut)").eq("contact_id", contactId).limit(1),
        supabase.from("contact_historique").select("date_rappel, rappel_description, alerte_active")
          .eq("contact_id", contactId).eq("alerte_active", true).not("date_rappel", "is", null)
          .order("date_rappel", { ascending: true }).limit(1),
      ]);

      const docTypes = new Set((docsRes.data || []).map((d: any) => d.type_document));
      const missingCMA = CMA_REQUIRED_DOCS.filter(d => !docTypes.has(d));

      const factures = facturesRes.data || [];
      const paiementsList = paiementsRes.data || [];
      const totalFacture = factures.reduce((s, f) => s + Number(f.montant_total || 0), 0);
      const totalPaye = paiementsList.reduce((s, p) => s + Number((p as any).montant || 0), 0);
      const restant = totalFacture - totalPaye;

      const inscription = inscRes.data?.[0] || null;
      const nextRappel = rappelsRes.data?.[0] || null;

      return { missingCMA, totalFacture, totalPaye, restant, inscription, nextRappel, hasFacture: factures.length > 0 };
    },
  });

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  const { missingCMA = [], restant = 0, inscription, nextRappel, hasFacture } = data || {};

  // Determine single priority action
  let priorityAction: { label: string; tab: string; variant: "destructive" | "warning" | "default" } | null = null;
  if (missingCMA.length > 0) {
    priorityAction = { label: `Compléter le dossier CMA (${missingCMA.length} doc${missingCMA.length > 1 ? "s" : ""} manquant${missingCMA.length > 1 ? "s" : ""})`, tab: "cma", variant: "destructive" };
  } else if (restant > 0) {
    priorityAction = { label: `Paiement en attente : ${restant.toLocaleString("fr-FR")}€`, tab: "paiements", variant: "warning" };
  } else if (!inscription) {
    priorityAction = { label: "Assigner à une session de formation", tab: "formation", variant: "default" };
  }

  const checklist = [
    { label: "Documents CMA complets", done: missingCMA.length === 0, detail: missingCMA.length > 0 ? `${missingCMA.length} manquant(s)` : "Tous reçus", tab: "cma" },
    { label: "Session assignée", done: !!inscription, detail: inscription ? (inscription as any).sessions?.nom || "Oui" : "Non assigné", tab: "formation" },
    { label: "Paiement soldé", done: hasFacture && restant <= 0, detail: hasFacture ? (restant > 0 ? `${restant.toLocaleString("fr-FR")}€ restant` : "Soldé") : "Pas de facture", tab: "paiements" },
  ];

  return (
    <div className="space-y-5">
      {/* Priority action */}
      {priorityAction && (
        <Card className={cn(
          "p-4 border-l-4",
          priorityAction.variant === "destructive" ? "border-l-destructive bg-destructive/5" :
          priorityAction.variant === "warning" ? "border-l-warning bg-warning/5" : "border-l-primary bg-primary/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className={cn("h-4 w-4", 
                priorityAction.variant === "destructive" ? "text-destructive" :
                priorityAction.variant === "warning" ? "text-warning" : "text-primary"
              )} />
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Prochaine action</p>
                <p className="text-sm font-medium text-foreground">{priorityAction.label}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onNavigateTab(priorityAction!.tab)}>
              Traiter <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Checklist */}
      <Card className="p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground">Checklist dossier</p>
        {checklist.map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigateTab(item.tab)}
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors text-left"
          >
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          </button>
        ))}
      </Card>

      {/* Next rappel */}
      {nextRappel && (
        <Card className="p-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-warning" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Prochain rappel</p>
              <p className="text-sm font-medium text-foreground">
                {format(parseISO(nextRappel.date_rappel!), "EEEE d MMMM yyyy", { locale: fr })}
              </p>
              {nextRappel.rappel_description && (
                <p className="text-xs text-muted-foreground mt-0.5">{nextRappel.rappel_description}</p>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
