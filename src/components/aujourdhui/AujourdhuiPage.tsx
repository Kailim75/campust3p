import { useState, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ProspectDetailSheet } from "@/components/prospects/ProspectDetailSheet";
import { ActionJournal } from "./ActionJournal";
import {
  FileCheck, AlertTriangle, Phone, Mail, Calendar, Clock,
  CheckCircle2, ExternalLink, CreditCard, FolderOpen, Check, Bot,
  Filter, CalendarCheck, RotateCcw,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { format, isPast, isToday, differenceInDays, parseISO, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  createAutoNote, deleteAutoNote, fetchTodayAutoNotes,
  isHandledToday, isProspectRdv, type ActionCategory,
} from "@/lib/aujourdhui-actions";
import { CMA_REQUIRED_DOCS, CMA_DOC_LABELS } from "@/lib/cma-constants";
import type { Prospect } from "@/hooks/useProspects";

// Keywords used to detect if an action category was already done today
const CMA_KEYWORDS = ["CMA:", "relance docs", "Marqué comme traité"];
const RDV_KEYWORDS = ["RDV", "Confirmation", "Marqué comme traité"];
const RELANCE_KEYWORDS = ["Relance prospect", "Marqué comme traité"];
const CRITIQUE_KEYWORDS = ["demande docs", "relance paiement", "Marqué comme traité"];

type CmaFilter = "all" | "docs_manquants" | "rejete" | "en_cours";

function useAujourdhuiData() {
  return useQuery({
    queryKey: ["aujourdhui-inbox"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const in14Days = addDays(new Date(), 14).toISOString().split("T")[0];

      const [
        contactsRes, docsRes, facturesRes, paiementsRes,
        prospectsRes, sessionsRes, inscriptionsRes, rappelsRes, todayNotes,
      ] = await Promise.all([
        supabase.from("contacts").select("id, nom, prenom, formation, statut, email, telephone, updated_at").eq("archived", false),
        supabase.from("contact_documents").select("contact_id, type_document"),
        supabase.from("factures").select("id, contact_id, montant_total, statut, date_echeance"),
        supabase.from("paiements").select("facture_id, montant"),
        supabase.from("prospects").select("*").eq("is_active", true).not("statut", "in", '("converti","perdu")'),
        supabase.from("sessions").select("id, nom, date_debut, date_fin, statut").eq("archived", false).lte("date_debut", in14Days).gte("date_fin", todayStr),
        supabase.from("session_inscriptions").select("contact_id, session_id"),
        supabase.from("contact_historique").select("contact_id, date_rappel, alerte_active, rappel_description").eq("alerte_active", true).not("date_rappel", "is", null),
        fetchTodayAutoNotes(),
      ]);

      const contacts = contactsRes.data || [];
      const docs = docsRes.data || [];
      const factures = facturesRes.data || [];
      const paiements = paiementsRes.data || [];
      const prospects = (prospectsRes.data || []) as Prospect[];
      const inscriptions = inscriptionsRes.data || [];
      const rappels = rappelsRes.data || [];

      // Contact name map for journal
      const contactNameMap = new Map<string, string>();
      contacts.forEach((c: any) => contactNameMap.set(c.id, `${c.prenom} ${c.nom}`));
      prospects.forEach((p: any) => {
        contactNameMap.set(p.id, `${p.prenom} ${p.nom}`);
      });

      // Build docs map
      const docsMap = new Map<string, Set<string>>();
      docs.forEach((d: any) => {
        if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
        docsMap.get(d.contact_id)!.add(d.type_document);
      });

      // Build paiements map
      const paiementsMap = new Map<string, number>();
      paiements.forEach((p: any) => {
        paiementsMap.set(p.facture_id, (paiementsMap.get(p.facture_id) || 0) + Number(p.montant || 0));
      });

      const inscribedContactIds = new Set(inscriptions.map((i: any) => i.contact_id));
      const activeSessionContactIds = new Set(inscriptions.map((i: any) => i.contact_id));

      const contactHasOpenFacture = new Set<string>();
      factures.forEach((f: any) => {
        if (f.statut !== "payee" && f.statut !== "annulee") {
          contactHasOpenFacture.add(f.contact_id);
        }
      });

      const contactHasRappel = new Set(rappels.map((r: any) => r.contact_id));
      const thirtyDaysAgo = addDays(new Date(), -30).toISOString();

      const isContactActive = (c: any) => {
        if (activeSessionContactIds.has(c.id)) return true;
        if (contactHasOpenFacture.has(c.id)) return true;
        if (contactHasRappel.has(c.id)) return true;
        const contactDocs = docsMap.get(c.id) || new Set();
        const missingDocs = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
        if (missingDocs.length > 0 && missingDocs.length < CMA_REQUIRED_DOCS.length) return true;
        if (c.updated_at && c.updated_at >= thirtyDaysAgo) return true;
        return false;
      };

      // ─── Bloc A: CMA ───
      const cmaItems = contacts
        .filter(c => c.statut !== "Abandonné" && c.statut !== "En attente de validation")
        .map(c => {
          const contactDocs = docsMap.get(c.id) || new Set();
          const missingDocs = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
          // Determine CMA sub-category heuristically
          const statStr = String(c.statut || "").toLowerCase();
          const cmaCategory: CmaFilter =
            statStr.includes("rejet") || statStr.includes("complex") ? "rejete" :
            statStr.includes("en cours") || statStr.includes("document") || statStr.includes("en formation") ? "en_cours" :
            "docs_manquants";
          // Find last CMA [AUTO] note from todayNotes
          const lastCmaNote = todayNotes
            .filter(n => n.contact_id === c.id && n.titre.includes("CMA"))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
          return { ...c, missingDocs, docCount: contactDocs.size, _isActive: isContactActive(c), cmaCategory, lastCmaNote };
        })
        .filter(c => c.missingDocs.length > 0)
        .sort((a, b) => b.missingDocs.length - a.missingDocs.length);

      // ─── Bloc B: RDV du jour (only true RDVs) ───
      const allTodayProspects = prospects
        .filter(p => p.date_prochaine_relance && isToday(parseISO(p.date_prochaine_relance)));
      const rdvToday = allTodayProspects.filter(p => isProspectRdv(p)).slice(0, 10);

      // ─── Bloc C: Relances ───
      const relances = prospects
        .filter(p => {
          // Today non-RDV prospects
          if (p.date_prochaine_relance && isToday(parseISO(p.date_prochaine_relance)) && !isProspectRdv(p)) return true;
          // Overdue
          if (p.date_prochaine_relance && isPast(parseISO(p.date_prochaine_relance)) && !isToday(parseISO(p.date_prochaine_relance))) return true;
          // Status relance
          if (p.statut === "relance" && !p.date_prochaine_relance) return true;
          return false;
        })
        .sort((a, b) => {
          const da = a.date_prochaine_relance ? new Date(a.date_prochaine_relance).getTime() : Infinity;
          const db = b.date_prochaine_relance ? new Date(b.date_prochaine_relance).getTime() : Infinity;
          return da - db;
        })
        .slice(0, 10);

      // ─── Bloc D: Critiques ───
      const critiques = contacts
        .filter(c => c.statut !== "Abandonné" && c.statut !== "En attente de validation")
        .map(c => {
          const contactDocs = docsMap.get(c.id) || new Set();
          const missingCMA = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
          const contactFactures = factures.filter((f: any) => f.contact_id === c.id);
          const hasLatePayment = contactFactures.some((f: any) =>
            f.statut === "emise" && f.date_echeance && f.date_echeance < todayStr
          );
          const isInscribed = inscribedContactIds.has(c.id);
          const reasons: string[] = [];
          if (missingCMA.length > 0) reasons.push("Docs CMA manquants");
          if (hasLatePayment) reasons.push("Paiement en retard");
          if (isInscribed && missingCMA.length > 0) reasons.push("Session proche + dossier incomplet");
          return { ...c, reasons, missingCMA, hasLatePayment, _isActive: isContactActive(c) };
        })
        .filter(c => c.reasons.length > 0)
        .sort((a, b) => b.reasons.length - a.reasons.length);

      // Journal entries from today's auto notes
      const journalEntries = todayNotes.map(n => ({
        ...n,
        contactName: contactNameMap.get(n.contact_id) || "Contact",
      }));

      return {
        cmaItems,
        rdvToday,
        relances,
        critiques,
        todayNotes,
        journalEntries,
        totalActions: cmaItems.length + rdvToday.length + relances.length + critiques.length,
      };
    },
    staleTime: 30_000,
  });
}

interface AujourdhuiPageProps {
  onNavigate?: (section: string) => void;
}

export function AujourdhuiPage({ onNavigate }: AujourdhuiPageProps) {
  const { data, isLoading } = useAujourdhuiData();
  const queryClient = useQueryClient();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [prospectDetailOpen, setProspectDetailOpen] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showHandled, setShowHandled] = useState(false);
  const [cmaFilter, setCmaFilter] = useState<CmaFilter>("all");

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["contact-historique"] });
  }, [queryClient]);

  const logAction = useCallback(async (contactId: string, category: ActionCategory, extra?: string) => {
    const result = await createAutoNote(contactId, category, extra);
    if (result) {
      toast.success("Action enregistrée", {
        description: "Note ajoutée à la fiche",
        action: {
          label: "Annuler",
          onClick: async () => {
            const deleted = await deleteAutoNote(result.id);
            if (deleted) {
              toast.info("Action annulée");
              invalidate();
            }
          },
        },
        duration: 10000,
      });
      invalidate();
    }
    return result;
  }, [invalidate]);

  const markDone = useCallback(async (contactId: string, blocLabel: string) => {
    await logAction(contactId, "marquer_fait", `Bloc: ${blocLabel}`);
  }, [logAction]);

  const openContact = (id: string) => {
    setSelectedContactId(id);
    setContactDetailOpen(true);
  };

  const openProspect = (p: Prospect) => {
    setSelectedProspect(p);
    setProspectDetailOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Header title="Aujourd'hui" subtitle="Votre inbox d'actions du jour" />
        <div className="px-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const {
    cmaItems: rawCma = [], rdvToday: rawRdv = [], relances: rawRelances = [],
    critiques: rawCritiques = [], todayNotes = [], journalEntries = [],
  } = data || {};

  // Active filter for CMA/critiques
  const activeCma = includeInactive ? rawCma : rawCma.filter(c => c._isActive);
  const activeCritiques = includeInactive ? rawCritiques : rawCritiques.filter(c => c._isActive);
  const hiddenCount = (rawCma.length - rawCma.filter(c => c._isActive).length) + (rawCritiques.length - rawCritiques.filter(c => c._isActive).length);

  // Anti-double-relance: filter handled items
  const filteredCma = (showHandled ? activeCma : activeCma.filter(c => !isHandledToday(c.id, todayNotes, CMA_KEYWORDS)));
  // Apply CMA sub-filter
  const cmaItems = (cmaFilter === "all" ? filteredCma : filteredCma.filter(c => c.cmaCategory === cmaFilter)).slice(0, 15);
  // CMA sub-filter counts
  const cmaCountAll = filteredCma.length;
  const cmaCountDocs = filteredCma.filter(c => c.cmaCategory === "docs_manquants").length;
  const cmaCountRejete = filteredCma.filter(c => c.cmaCategory === "rejete").length;
  const cmaCountEnCours = filteredCma.filter(c => c.cmaCategory === "en_cours").length;

  const rdvToday = (showHandled ? rawRdv : rawRdv.filter(p => !isHandledToday(p.id, todayNotes, RDV_KEYWORDS))).slice(0, 10);
  const relances = (showHandled ? rawRelances : rawRelances.filter(p => !isHandledToday(p.id, todayNotes, RELANCE_KEYWORDS))).slice(0, 10);
  const critiques = (showHandled ? activeCritiques : activeCritiques.filter(c => !isHandledToday(c.id, todayNotes, CRITIQUE_KEYWORDS))).slice(0, 10);

  const handledCmaCount = activeCma.length - (showHandled ? 0 : activeCma.filter(c => !isHandledToday(c.id, todayNotes, CMA_KEYWORDS)).length);
  const handledRdvCount = rawRdv.length - (showHandled ? 0 : rawRdv.filter(p => !isHandledToday(p.id, todayNotes, RDV_KEYWORDS)).length);
  const handledRelanceCount = rawRelances.length - (showHandled ? 0 : rawRelances.filter(p => !isHandledToday(p.id, todayNotes, RELANCE_KEYWORDS)).length);
  const handledCritiqueCount = activeCritiques.length - (showHandled ? 0 : activeCritiques.filter(c => !isHandledToday(c.id, todayNotes, CRITIQUE_KEYWORDS)).length);
  const totalHandled = handledCmaCount + handledRdvCount + handledRelanceCount + handledCritiqueCount;

  const totalActions = cmaItems.length + rdvToday.length + relances.length + critiques.length;

  // ─── Action handlers with auto-logging ───
  const handleCmaRelanceDocs = (item: any) => {
    const missingList = item.missingDocs.map((d: string) => CMA_DOC_LABELS[d] || d).join(", ");
    logAction(item.id, "cma_relance_docs", `Docs manquants: ${missingList}`);
    window.open(`mailto:${item.email}?subject=Documents CMA manquants&body=Bonjour ${item.prenom},%0A%0AIl manque les documents suivants pour compléter votre dossier CMA :%0A${item.missingDocs.map((d: string) => `- ${CMA_DOC_LABELS[d] || d}`).join('%0A')}%0A%0AMerci de nous les transmettre rapidement.%0A%0ACordialement,%0AT3P Campus`);
  };

  const handleCmaWhatsApp = (item: any) => {
    logAction(item.id, "apprenant_whatsapp");
    openWhatsApp(item.telephone);
  };

  const handleRdvConfirm = (p: any) => {
    logAction(p.id, "prospect_confirmation_rdv", `Date: ${p.date_prochaine_relance || "aujourd'hui"}`);
    window.open(`mailto:${p.email}?subject=Confirmation de votre rendez-vous&body=Bonjour ${p.prenom},%0A%0ANous confirmons votre rendez-vous prévu aujourd'hui.%0A%0AÀ très bientôt !%0AT3P Campus`);
  };

  const handleRdvAppel = (p: any) => {
    logAction(p.id, "prospect_appel");
  };

  const isRdvHandledToday = (contactId: string) =>
    isHandledToday(contactId, todayNotes, ["RDV", "Confirmation"]);

  const handleRdvWhatsApp = (p: any) => {
    logAction(p.id, "prospect_relance_whatsapp");
    openWhatsApp(p.telephone);
  };

  const handleRelanceEmail = (p: any) => {
    logAction(p.id, "prospect_relance", `Formation: ${p.formation_souhaitee || ""}`);
    window.open(`mailto:${p.email}?subject=Votre projet de formation ${p.formation_souhaitee || ''}&body=Bonjour ${p.prenom},%0A%0ANous revenons vers vous concernant votre projet de formation.%0A%0AN'hésitez pas à nous contacter pour en discuter.%0A%0ACordialement,%0AT3P Campus`);
  };

  const handleRelanceWhatsApp = (p: any) => {
    logAction(p.id, "prospect_relance_whatsapp");
    openWhatsApp(p.telephone);
  };

  const handleCritiqueDemanderDocs = (item: any) => {
    const missingList = item.missingCMA.map((d: string) => CMA_DOC_LABELS[d] || d).join(", ");
    logAction(item.id, "apprenant_demander_docs", `Docs manquants: ${missingList}`);
    window.open(`mailto:${item.email}?subject=Documents manquants — Urgent&body=Bonjour ${item.prenom},%0A%0AIl manque les documents suivants pour votre dossier :%0A${item.missingCMA.map((d: string) => `- ${CMA_DOC_LABELS[d] || d}`).join('%0A')}%0A%0AMerci de les transmettre en urgence.%0A%0ACordialement,%0AT3P Campus`);
  };

  const handleCritiqueRelancePaiement = (item: any) => {
    logAction(item.id, "apprenant_relance_paiement");
    window.open(`mailto:${item.email}?subject=Rappel de paiement&body=Bonjour ${item.prenom},%0A%0ANous vous rappelons qu'un paiement est en attente pour votre formation.%0A%0AMerci de régulariser votre situation.%0A%0ACordialement,%0AT3P Campus`);
  };

  // Check if CMA relance already done today for a specific contact
  const isCmaRelancedToday = (contactId: string) => {
    return todayNotes.some(n => n.contact_id === contactId && (n.titre.includes("CMA") && n.titre.includes("[AUTO]")));
  };

  // ─── Mark done button ───
  const MarkDoneBtn = ({ contactId, bloc }: { contactId: string; bloc: string }) => (
    <Button
      size="sm"
      variant="ghost"
      className="h-7 text-[10px] text-muted-foreground hover:text-success"
      onClick={(e) => { e.stopPropagation(); markDone(contactId, bloc); }}
    >
      <Check className="h-3 w-3 mr-1" /> Fait
    </Button>
  );

  const CMA_FILTER_OPTIONS: { value: CmaFilter; label: string; count: number }[] = [
    { value: "all", label: "Tous", count: cmaCountAll },
    { value: "docs_manquants", label: "Docs manquants", count: cmaCountDocs },
    { value: "rejete", label: "Rejeté", count: cmaCountRejete },
    { value: "en_cours", label: "En cours", count: cmaCountEnCours },
  ];

  return (
    <div className="space-y-6">
      <Header title="Aujourd'hui" subtitle={`${totalActions} action${totalActions > 1 ? "s" : ""} à traiter`} />

      {/* Toggles */}
      <div className="px-8 flex items-center justify-end gap-4">
        <div className="flex items-center gap-2">
          <Switch id="show-handled" checked={showHandled} onCheckedChange={setShowHandled} />
          <Label htmlFor="show-handled" className="text-xs text-muted-foreground cursor-pointer">
            Afficher traités
            {totalHandled > 0 && !showHandled && (
              <span className="ml-1 text-muted-foreground/60">({totalHandled})</span>
            )}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="include-inactive" checked={includeInactive} onCheckedChange={setIncludeInactive} />
          <Label htmlFor="include-inactive" className="text-xs text-muted-foreground cursor-pointer">
            Inclure inactifs
            {hiddenCount > 0 && !includeInactive && (
              <span className="ml-1 text-muted-foreground/60">({hiddenCount} masqués)</span>
            )}
          </Label>
        </div>
      </div>

      <div className="px-8 pb-8 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ─── BLOC A: CMA à traiter ─── */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">CMA à traiter</h3>
                  <p className="text-[11px] text-muted-foreground">{cmaCountAll} dossier{cmaCountAll > 1 ? "s" : ""} incomplet{cmaCountAll > 1 ? "s" : ""}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{cmaCountAll}</Badge>
            </div>

            {/* CMA sub-filters */}
            <div className="px-5 py-2 border-b bg-muted/10 flex items-center gap-1 overflow-x-auto">
              <Filter className="h-3 w-3 text-muted-foreground shrink-0 mr-1" />
              {CMA_FILTER_OPTIONS.map(opt => (
                <Button
                  key={opt.value}
                  variant={cmaFilter === opt.value ? "default" : "ghost"}
                  size="sm"
                  className="h-6 text-[10px] px-2 gap-1 shrink-0"
                  onClick={() => setCmaFilter(opt.value)}
                >
                  {opt.label}
                  <span className="opacity-60">({opt.count})</span>
                </Button>
              ))}
            </div>

            <div className="divide-y max-h-80 overflow-y-auto">
              {cmaItems.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                  {cmaFilter === "all" ? "Tous les dossiers CMA sont complets" : "Aucun dossier dans cette catégorie"}
                </div>
              ) : cmaItems.map((item) => {
                const relancedToday = isCmaRelancedToday(item.id);
                return (
                  <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                        {item.prenom} {item.nom}
                        <ExternalLink className="h-3 w-3 opacity-40" />
                      </button>
                      <div className="flex items-center gap-1.5">
                        {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                        <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">
                          {item.docCount}/{CMA_REQUIRED_DOCS.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.missingDocs.map((d: string) => (
                        <Badge key={d} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                          ✗ {CMA_DOC_LABELS[d] || d}
                        </Badge>
                      ))}
                    </div>
                    {/* Last relance indicator */}
                    {item.lastCmaNote && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          Dernière relance : {format(parseISO(item.lastCmaNote.created_at), "HH:mm", { locale: fr })}
                        </span>
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      {item.email && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm" variant="outline" className="h-7 text-[10px]"
                                  disabled={relancedToday}
                                  onClick={() => handleCmaRelanceDocs(item)}
                                >
                                  <Mail className="h-3 w-3 mr-1" /> Relance docs
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {relancedToday && (
                              <TooltipContent><p>Déjà relancé aujourd'hui</p></TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {item.telephone && (
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => handleCmaWhatsApp(item)}>
                          <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
                        </Button>
                      )}
                      <MarkDoneBtn contactId={item.id} bloc="CMA" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ─── BLOC B: RDV du jour ─── */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <CalendarCheck className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">RDV du jour</h3>
                  <p className="text-[11px] text-muted-foreground">{rdvToday.length} rendez-vous prévus</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{rdvToday.length}</Badge>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {rdvToday.length === 0 ? (
                <div className="p-6 text-center space-y-3">
                  <Calendar className="h-8 w-8 mx-auto text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Aucun RDV prévu aujourd'hui</p>
                  <div className="flex justify-center gap-2">
                    {onNavigate && (
                      <>
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => { onNavigate("prospects-agenda"); }}>
                          <CalendarCheck className="h-3 w-3 mr-1" /> Planifier un RDV
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs" onClick={() => onNavigate("prospects")}>
                          <RotateCcw className="h-3 w-3 mr-1" /> Relancer prospects
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ) : rdvToday.map((p) => {
                const handledToday = isRdvHandledToday(p.id);
                return (
                  <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                          {p.prenom} {p.nom}
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </button>
                        <Badge variant="outline" className="text-[9px] bg-warning/15 text-warning border-warning/30">
                          <CalendarCheck className="h-2.5 w-2.5 mr-0.5" /> RDV
                        </Badge>
                      </div>
                      {p.formation_souhaitee && <Badge variant="outline" className="text-[10px]">{p.formation_souhaitee}</Badge>}
                    </div>
                    <div className="flex gap-1.5">
                      {p.email && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={handledToday} onClick={() => handleRdvConfirm(p)}>
                                  <Mail className="h-3 w-3 mr-1" /> Confirmer RDV
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {handledToday && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {p.telephone && (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" asChild>
                            <a href={`tel:${p.telephone}`} onClick={() => handleRdvAppel(p)}><Phone className="h-3 w-3 mr-1" /> Appeler</a>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => handleRdvWhatsApp(p)}>
                            <SiWhatsapp className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                      <MarkDoneBtn contactId={p.id} bloc="RDV" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* ─── BLOC C: Relances à faire ─── */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Relances à faire</h3>
                  <p className="text-[11px] text-muted-foreground">{relances.length} prospect{relances.length > 1 ? "s" : ""} en attente</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-accent/10 text-accent">{relances.length}</Badge>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {relances.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                  Toutes les relances sont à jour
                </div>
              ) : relances.map((p) => (
                <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                      {p.prenom} {p.nom}
                      <ExternalLink className="h-3 w-3 opacity-40" />
                    </button>
                    {p.date_prochaine_relance && (
                      <Badge variant="outline" className={cn(
                        "text-[10px]",
                        isPast(parseISO(p.date_prochaine_relance)) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                      )}>
                        {isPast(parseISO(p.date_prochaine_relance))
                          ? `${Math.abs(differenceInDays(parseISO(p.date_prochaine_relance), new Date()))}j retard`
                          : format(parseISO(p.date_prochaine_relance), "dd/MM", { locale: fr })
                        }
                      </Badge>
                    )}
                  </div>
                  {p.formation_souhaitee && <p className="text-xs text-muted-foreground mb-2">{p.formation_souhaitee}</p>}
                  <div className="flex gap-1.5">
                    {p.email && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleRelanceEmail(p)}>
                        <Mail className="h-3 w-3 mr-1" /> Relancer
                      </Button>
                    )}
                    {p.telephone && (
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-success" onClick={() => handleRelanceWhatsApp(p)}>
                        <SiWhatsapp className="h-3 w-3 mr-1" /> WhatsApp
                      </Button>
                    )}
                    <MarkDoneBtn contactId={p.id} bloc="Relance" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── BLOC D: Apprenants critiques ─── */}
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Apprenants critiques</h3>
                  <p className="text-[11px] text-muted-foreground">{critiques.length} action{critiques.length > 1 ? "s" : ""} requise{critiques.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">{critiques.length}</Badge>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {critiques.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                  Aucun apprenant en situation critique
                </div>
              ) : critiques.map((item) => (
                <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                      {item.prenom} {item.nom}
                      <ExternalLink className="h-3 w-3 opacity-40" />
                    </button>
                    {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.reasons.map((r: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-1.5">
                    {item.missingCMA.length > 0 && item.email && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleCritiqueDemanderDocs(item)}>
                        <FolderOpen className="h-3 w-3 mr-1" /> Demander docs
                      </Button>
                    )}
                    {item.hasLatePayment && item.email && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] text-destructive border-destructive/20" onClick={() => handleCritiqueRelancePaiement(item)}>
                        <CreditCard className="h-3 w-3 mr-1" /> Relance paiement
                      </Button>
                    )}
                    <MarkDoneBtn contactId={item.id} bloc="Critique" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* ─── Journal d'actions ─── */}
        <ActionJournal
          entries={journalEntries}
          onOpenContact={openContact}
        />
      </div>

      {/* Detail sheets */}
      <ApprenantDetailSheet contactId={selectedContactId} open={contactDetailOpen} onOpenChange={setContactDetailOpen} />
      <ProspectDetailSheet prospect={selectedProspect} open={prospectDetailOpen} onOpenChange={setProspectDetailOpen} />
    </div>
  );
}
