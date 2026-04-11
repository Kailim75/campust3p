import { useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CheckCircle2, Circle, AlertTriangle, ArrowRight, Mail, Send,
  Clock, Bot, FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format, parseISO, isToday, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { CMA_REQUIRED_DOCS, CMA_DOC_LABELS } from "@/lib/cma-constants";
import { createAutoNote, deleteAutoNote } from "@/lib/aujourdhui-actions";
import { toast } from "sonner";

interface ResumeTabProps {
  contactId: string;
  formation: string | null;
  onNavigateTab: (tab: string) => void;
}

type PriorityVariant = "destructive" | "warning" | "default";

interface PriorityAction {
  label: string;
  description: string;
  tab: string;
  variant: PriorityVariant;
  actionCategory?: Parameters<typeof createAutoNote>[1];
  actionExtra?: string;
}

type ContactDocumentType = Pick<Tables<"contact_documents">, "type_document">;
type FactureSummary = Pick<Tables<"factures">, "id" | "montant_total" | "statut">;
type PaiementSummary = Pick<Tables<"paiements">, "facture_id" | "montant">;
type HistoriqueSummary = Pick<Tables<"contact_historique">, "id" | "titre" | "contenu" | "date_echange" | "date_rappel" | "rappel_description" | "alerte_active">;

interface ResumeInscription {
  id: string;
  session_id: string;
  sessions: {
    nom: string | null;
    date_debut: string | null;
  } | null;
}

export function ResumeTab({ contactId, formation, onNavigateTab }: ResumeTabProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["apprenant-resume", contactId],
    queryFn: async () => {
      const [docsRes, facturesRes, paiementsRes, inscRes, rappelsRes, notesRes] = await Promise.all([
        supabase.from("contact_documents").select("type_document").eq("contact_id", contactId),
        supabase.from("factures").select("id, montant_total, statut").eq("contact_id", contactId),
        supabase.from("paiements").select("facture_id, montant"),
        supabase.from("session_inscriptions").select("id, session_id, sessions(nom, date_debut)").eq("contact_id", contactId).limit(1),
        supabase.from("contact_historique").select("date_rappel, rappel_description, alerte_active")
          .eq("contact_id", contactId).eq("alerte_active", true).not("date_rappel", "is", null)
          .order("date_rappel", { ascending: true }).limit(1),
        supabase.from("contact_historique").select("id, titre, contenu, date_echange")
          .eq("contact_id", contactId).like("titre", "[AUTO]%")
          .order("date_echange", { ascending: false }).limit(10),
      ]);

      const docTypes = new Set(((docsRes.data || []) as ContactDocumentType[]).map((d) => d.type_document));
      const cmaReceived = CMA_REQUIRED_DOCS.filter(d => docTypes.has(d)).length;
      const missingCMA = CMA_REQUIRED_DOCS.filter(d => !docTypes.has(d));

      const factures = (facturesRes.data || []) as FactureSummary[];
      const paiementsList = (paiementsRes.data || []) as PaiementSummary[];
      const totalFacture = factures.reduce((s, f) => s + Number(f.montant_total || 0), 0);
      const totalPaye = paiementsList.reduce((s, p) => s + Number(p.montant || 0), 0);
      const restant = totalFacture - totalPaye;

      const inscription = (inscRes.data?.[0] as ResumeInscription | undefined) || null;
      const nextRappel = (rappelsRes.data?.[0] as HistoriqueSummary | undefined) || null;

      const autoNotes = (notesRes.data || []) as HistoriqueSummary[];
      const todayNotes = autoNotes.filter(n => isToday(new Date(n.date_echange)));

      // Anti-double-relance
      const alreadyRelancedCMA = todayNotes.some(n => n.titre.includes("CMA"));
      const alreadyRelancedPaiement = todayNotes.some(n => n.titre.includes("relance paiement"));

      // Last contact (latest note of any kind)
      const lastContact = autoNotes[0] || null;

      return {
        missingCMA, cmaReceived, totalFacture, totalPaye, restant,
        inscription, nextRappel, hasFacture: factures.length > 0,
        todayNotes, alreadyRelancedCMA, alreadyRelancedPaiement,
        lastContact,
      };
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["apprenant-resume", contactId] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-cockpit", contactId] });
    queryClient.invalidateQueries({ queryKey: ["contact-historique", contactId] });
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
  }, [queryClient, contactId]);

  const handleAction = useCallback(async (category: Parameters<typeof createAutoNote>[1], extra?: string) => {
    const result = await createAutoNote(contactId, category, extra);
    if (result) {
      toast.success("Action enregistrée", {
        action: { label: "Annuler", onClick: async () => { await deleteAutoNote(result.id); invalidate(); toast.info("Annulé"); } },
        duration: 8000,
      });
      invalidate();
    }
  }, [contactId, invalidate]);

  if (isLoading) return <Skeleton className="h-[300px] rounded-xl" />;

  const {
    missingCMA = [], cmaReceived = 0, restant = 0, inscription, nextRappel,
    hasFacture, todayNotes = [], alreadyRelancedCMA, alreadyRelancedPaiement,
    lastContact,
  } = data || {};
  const sessionLabel = inscription?.sessions?.nom || "Non assigné";
  const sessionDateLabel = inscription?.sessions?.date_debut
    ? format(parseISO(inscription.sessions.date_debut), "dd/MM/yyyy", { locale: fr })
    : null;
  const upcomingSessionInDays = inscription?.sessions?.date_debut
    ? differenceInDays(parseISO(inscription.sessions.date_debut), new Date())
    : null;
  const nextRappelLabel = nextRappel?.date_rappel
    ? format(parseISO(nextRappel.date_rappel), "dd/MM/yyyy", { locale: fr })
    : "Aucun";
  const lastContactLabel = lastContact
    ? format(new Date(lastContact.date_echange), "dd/MM à HH:mm", { locale: fr })
    : "Jamais";
  const shortSummaryItems = [
    `${cmaReceived}/5 pièces CMA`,
    hasFacture ? (restant > 0 ? `${restant.toLocaleString("fr-FR")}€ restant` : "Facture soldée") : "Pas de facture",
    inscription ? sessionLabel : "Session à planifier",
  ];

  // ─── A) Single Priority Action ───
  let priorityAction: PriorityAction | null = null;

  if (missingCMA.length > 0) {
    const missingLabels = missingCMA.map(d => CMA_DOC_LABELS[d] || d).join(", ");
    priorityAction = {
      label: `Demander docs manquants (${missingCMA.length})`,
      description: `CMA ${cmaReceived}/5 — Manquants : ${missingLabels}`,
      tab: "cma",
      variant: "destructive",
      actionCategory: "cma_relance_docs",
      actionExtra: `Docs: ${missingLabels}`,
    };
  } else if (restant > 0) {
    priorityAction = {
      label: `Relancer paiement : ${restant.toLocaleString("fr-FR")}€`,
      description: "Montant restant dû sur facture",
      tab: "paiements",
      variant: "warning",
      actionCategory: "apprenant_relance_paiement",
      actionExtra: `${restant.toLocaleString("fr-FR")}€ restant`,
    };
  } else if (!inscription) {
    priorityAction = {
      label: "Assigner à une session de formation",
      description: "Aucune session assignée",
      tab: "formation",
      variant: "default",
    };
  }

  const isActionDisabled = priorityAction?.actionCategory
    ? (priorityAction.actionCategory.includes("cma") ? alreadyRelancedCMA : alreadyRelancedPaiement)
    : false;

  // ─── B) Checklist courte ───
  const checklist = [
    {
      label: "CMA",
      done: missingCMA.length === 0,
      detail: missingCMA.length > 0 ? `${cmaReceived}/5 — ${missingCMA.length} manquant(s)` : "5/5 complet",
      tab: "cma",
    },
    {
      label: "Paiement",
      done: hasFacture && restant <= 0,
      detail: hasFacture ? (restant > 0 ? `${restant.toLocaleString("fr-FR")}€ restant` : "Soldé") : "Pas de facture",
      tab: "paiements",
    },
    {
      label: "Session",
      done: !!inscription,
      detail: inscription ? sessionLabel : "Non assigné",
      tab: "formation",
    },
    {
      label: "Dernier contact",
      done: !!lastContact,
      detail: lastContact ? format(new Date(lastContact.date_echange), "dd/MM à HH:mm", { locale: fr }) : "Jamais",
      tab: "notes",
    },
    {
      label: "Prochain rappel",
      done: !!nextRappel,
      detail: nextRappel ? format(parseISO(nextRappel.date_rappel!), "dd/MM/yyyy", { locale: fr }) : "Aucun",
      tab: "rappels",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Vue d’ensemble du dossier</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Les signaux clés pour savoir en quelques secondes où en est l’apprenant.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {shortSummaryItems.map((item) => (
              <Badge key={item} variant="outline" className="bg-background text-xs">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dossier CMA</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{cmaReceived}/5</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {missingCMA.length > 0
              ? `${missingCMA.length} document${missingCMA.length > 1 ? "s" : ""} à récupérer`
              : "Dossier documentaire complet"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Finance</p>
          <p className={cn("mt-2 text-2xl font-semibold", restant > 0 ? "text-warning" : "text-foreground")}>
            {restant.toLocaleString("fr-FR")}€
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasFacture ? (restant > 0 ? "Reste à encaisser" : "Dossier soldé") : "Aucune facture émise"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Session</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{sessionLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {sessionDateLabel
              ? upcomingSessionInDays !== null && upcomingSessionInDays >= 0
                ? `${sessionDateLabel} · J-${upcomingSessionInDays}`
                : sessionDateLabel
              : "Pas encore planifiée"}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Suivi</p>
          <p className="mt-2 text-sm font-semibold text-foreground">{lastContactLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prochain rappel : {nextRappelLabel}
          </p>
        </Card>
      </div>

      {/* A) Priority action — single prominent card */}
      {priorityAction && (
        <Card className={cn(
          "p-4 border-l-4",
          priorityAction.variant === "destructive" ? "border-l-destructive bg-destructive/5" :
          priorityAction.variant === "warning" ? "border-l-warning bg-warning/5" : "border-l-primary bg-primary/5"
        )}>
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className={cn("h-4 w-4 shrink-0",
                priorityAction.variant === "destructive" ? "text-destructive" :
                priorityAction.variant === "warning" ? "text-warning" : "text-primary"
              )} />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Action prioritaire</p>
                <p className="text-sm font-semibold text-foreground">{priorityAction.label}</p>
                <p className="text-xs text-muted-foreground">{priorityAction.description}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {priorityAction.actionCategory && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          size="sm"
                          className="text-xs"
                          disabled={!!isActionDisabled}
                          onClick={() => handleAction(priorityAction!.actionCategory!, priorityAction!.actionExtra)}
                        >
                          <Mail className="h-3 w-3 mr-1" /> Exécuter
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isActionDisabled && (
                      <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button size="sm" variant="outline" className="text-xs" onClick={() => onNavigateTab(priorityAction!.tab)}>
                Voir détail <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!priorityAction && (
        <Card className="p-4 border-l-4 border-l-success bg-success/5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <div>
              <p className="text-sm font-semibold text-foreground">RAS — Suivi normal</p>
              <p className="text-xs text-muted-foreground">Aucune action urgente requise</p>
            </div>
          </div>
        </Card>
      )}

      {/* B) Checklist courte */}
      <Card className="p-4 space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Checklist dossier</p>
        {checklist.map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigateTab(item.tab)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors text-left"
          >
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</p>
            </div>
            <span className="text-[11px] text-muted-foreground shrink-0">{item.detail}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          </button>
        ))}
      </Card>

      {/* C) Today's AUTO history (compact) */}
      <Card className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Historique du jour</p>
          <Button size="sm" variant="ghost" className="text-xs h-6 px-2" onClick={() => onNavigateTab("notes")}>
            Voir tout
          </Button>
        </div>
        {todayNotes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Aucune action aujourd'hui</p>
        ) : (
          todayNotes.slice(0, 3).map((note) => (
            <div key={note.id} className="flex items-center gap-2 py-1.5">
              <Bot className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">
                {note.titre.replace("[AUTO] ", "")}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {format(new Date(note.date_echange), "HH:mm")}
              </span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
