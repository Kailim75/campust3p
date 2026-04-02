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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ProspectDetailSheet } from "@/components/prospects/ProspectDetailSheet";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { ActionJournal } from "./ActionJournal";
import {
  FileCheck, AlertTriangle, Phone, Mail, Calendar, Clock,
  CheckCircle2, ExternalLink, CreditCard, FolderOpen, Check, Bot,
  Filter, CalendarCheck, RotateCcw, ListChecks, Shield,
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/phone-utils";
import { format, isPast, isToday, differenceInDays, parseISO, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  createAutoNote, deleteAutoNote, fetchTodayAutoNotes, fetchRecentAutoNotes,
  isHandledToday, isProspectRdv, type ActionCategory,
} from "@/lib/aujourdhui-actions";
import { CMA_REQUIRED_DOCS, CMA_DOC_LABELS } from "@/lib/cma-constants";
import { computeContactUrgency, computeProspectUrgency, type UrgencyInfo } from "@/lib/urgency-utils";
import type { Prospect } from "@/hooks/useProspects";

// Keywords used to detect if an action category was already done today
const CMA_KEYWORDS = ["CMA:", "relance docs", "Marqué comme traité"];
const RDV_KEYWORDS = ["RDV", "Confirmation", "Marqué comme traité"];
const RELANCE_KEYWORDS = ["Relance prospect", "Marqué comme traité"];
const CRITIQUE_KEYWORDS = ["demande docs", "relance paiement", "Marqué comme traité"];
const CARTE_PRO_KEYWORDS = ["Carte Pro"];

type CmaFilter = "all" | "docs_manquants" | "rejete" | "en_cours";

// ─── Urgency Dot component with reasons ───
function UrgencyDot({ urgency }: { urgency: UrgencyInfo }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", urgency.dotClassName)} />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[220px]">
          <p className="font-semibold text-xs">Urgence : {urgency.label}</p>
          {urgency.reasons.length > 0 && (
            <ul className="text-[10px] mt-0.5 space-y-0.5 text-muted-foreground">
              {urgency.reasons.map((r, i) => <li key={i}>• {r}</li>)}
            </ul>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Last action mini-timeline (today + fallback to recent) ───
function LastActionLine({
  todayNotes, recentNotes, contactId,
}: {
  todayNotes: Array<{ contact_id: string; titre: string; created_at: string }>;
  recentNotes: Array<{ contact_id: string; titre: string; created_at: string }>;
  contactId: string;
}) {
  const todayNote = todayNotes.find(n => n.contact_id === contactId);
  if (todayNote) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Bot className="h-3 w-3 text-muted-foreground shrink-0" />
        <span className="text-[10px] text-muted-foreground truncate">
          {todayNote.titre.replace("[AUTO] ", "")} — {format(parseISO(todayNote.created_at), "HH:mm")}
        </span>
      </div>
    );
  }
  const recentNote = recentNotes.find(n => n.contact_id === contactId);
  if (recentNote) {
    const noteDate = parseISO(recentNote.created_at);
    const days = differenceInDays(new Date(), noteDate);
    const dateLabel = days === 1 ? "hier" : days < 7 ? `il y a ${days}j` : format(noteDate, "dd/MM");
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Bot className="h-3 w-3 text-muted-foreground/50 shrink-0" />
        <span className="text-[10px] text-muted-foreground/70 truncate">
          {recentNote.titre.replace("[AUTO] ", "")} — {dateLabel}
        </span>
      </div>
    );
  }
  return null;
}

function useAujourdhuiData() {
  return useQuery({
    queryKey: ["aujourdhui-inbox"],
    queryFn: async () => {
      const todayStr = new Date().toISOString().split("T")[0];
      const in14Days = addDays(new Date(), 14).toISOString().split("T")[0];

      const [
        contactsRes, docsRes, facturesRes, paiementsRes,
        prospectsRes, sessionsRes, inscriptionsRes, rappelsRes, todayNotes,
        examensPratiqueRes, examensTheorieRes,
      ] = await Promise.all([
        supabase.from("contacts").select("id, nom, prenom, formation, statut, statut_apprenant, statut_cma, email, telephone, updated_at").eq("archived", false),
        supabase.from("contact_documents").select("contact_id, type_document"),
        supabase.from("factures").select("id, contact_id, montant_total, statut, date_echeance"),
        supabase.from("paiements").select("facture_id, montant"),
        supabase.from("prospects").select("*").eq("is_active", true).not("statut", "in", '("converti","perdu")'),
        supabase.from("sessions").select("id, nom, date_debut, date_fin, statut, formateur_id, objectifs, prerequis, lieu, duree_heures").eq("archived", false).neq("statut", "annulee"),
        supabase.from("session_inscriptions").select("contact_id, session_id"),
        supabase.from("contact_historique").select("contact_id, date_rappel, alerte_active, rappel_description").eq("alerte_active", true).not("date_rappel", "is", null),
        fetchTodayAutoNotes(),
        supabase.from("examens_pratique").select("contact_id, resultat"),
        supabase.from("examens_t3p").select("contact_id, resultat"),
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
      const contactHasLatePayment = new Set<string>();
      factures.forEach((f: any) => {
        if (f.statut !== "payee" && f.statut !== "annulee") {
          contactHasOpenFacture.add(f.contact_id);
          if (f.date_echeance && f.date_echeance < todayStr) {
            contactHasLatePayment.add(f.contact_id);
          }
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
      // Exclude terminated contacts (diplome/abandon/archive)
      const terminatedStatuses = ['diplome', 'abandon', 'archive'];
      const cmaItems = contacts
        .filter(c => c.statut !== "Abandonné" && c.statut !== "En attente de validation" && !terminatedStatuses.includes((c as any).statut_apprenant || ''))
        .map(c => {
          const contactDocs = docsMap.get(c.id) || new Set();
          const missingDocs = CMA_REQUIRED_DOCS.filter(d => !contactDocs.has(d));
          const statStr = String(c.statut || "").toLowerCase();
          const cmaCategory: CmaFilter =
            statStr.includes("rejet") || statStr.includes("complex") ? "rejete" :
            statStr.includes("en cours") || statStr.includes("document") || statStr.includes("en formation") ? "en_cours" :
            "docs_manquants";
          const lastCmaNote = todayNotes
            .filter(n => n.contact_id === c.id && n.titre.includes("CMA"))
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;

          const urgency = computeContactUrgency({
            missingCMACount: missingDocs.length,
            hasLatePayment: contactHasLatePayment.has(c.id),
            hasSessionSoon: activeSessionContactIds.has(c.id),
            cmaRejected: cmaCategory === "rejete",
          });

          return { ...c, missingDocs, docCount: contactDocs.size, _isActive: isContactActive(c), cmaCategory, lastCmaNote, urgency };
        })
        .filter(c => c.missingDocs.length > 0)
        .sort((a, b) => {
          // Sort by urgency first (elevee > moyenne > faible), then by missing docs count
          const urgencyOrder = { elevee: 0, moyenne: 1, faible: 2 };
          const ua = urgencyOrder[a.urgency.level];
          const ub = urgencyOrder[b.urgency.level];
          if (ua !== ub) return ua - ub;
          return b.missingDocs.length - a.missingDocs.length;
        });

      // ─── Bloc B: RDV du jour ───
      const allTodayProspects = prospects
        .filter(p => p.date_prochaine_relance && isToday(parseISO(p.date_prochaine_relance)));
      const rdvToday = allTodayProspects.filter(p => isProspectRdv(p)).slice(0, 10);

      // ─── Bloc C: Relances ───
      // Primary: use next_action_at (new relance engine)
      // Fallback: date_prochaine_relance (legacy)
      const relances = prospects
        .filter(p => {
          const actionDate = (p as any).next_action_at || p.date_prochaine_relance;
          if (actionDate && isToday(parseISO(actionDate)) && !isProspectRdv(p)) return true;
          if (actionDate && isPast(parseISO(actionDate)) && !isToday(parseISO(actionDate))) return true;
          if (p.statut === "relance" && !actionDate) return true;
          return false;
        })
        .sort((a, b) => {
          const da = ((a as any).next_action_at || a.date_prochaine_relance) ? new Date(((a as any).next_action_at || a.date_prochaine_relance)!).getTime() : Infinity;
          const db = ((b as any).next_action_at || b.date_prochaine_relance) ? new Date(((b as any).next_action_at || b.date_prochaine_relance)!).getTime() : Infinity;
          return da - db;
        })
        .slice(0, 10);

      // ─── Bloc D: Critiques (deduplicated — exclude contacts already in CMA) ───
      const cmaContactIds = new Set(cmaItems.map(c => c.id));
      const critiques = contacts
        .filter(c => c.statut !== "Abandonné" && c.statut !== "En attente de validation" && !terminatedStatuses.includes((c as any).statut_apprenant || ''))
        .filter(c => !cmaContactIds.has(c.id))
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

          const urgency = computeContactUrgency({
            missingCMACount: missingCMA.length,
            hasLatePayment,
            hasSessionSoon: isInscribed,
          });

          return { ...c, reasons, missingCMA, hasLatePayment, _isActive: isContactActive(c), urgency };
        })
        .filter(c => c.reasons.length > 0)
        .sort((a, b) => {
          const urgencyOrder = { elevee: 0, moyenne: 1, faible: 2 };
          const ua = urgencyOrder[a.urgency.level];
          const ub = urgencyOrder[b.urgency.level];
          if (ua !== ub) return ua - ub;
          return b.reasons.length - a.reasons.length;
        });

      // Journal entries from today's auto notes
      const journalEntries = todayNotes.map(n => ({
        ...n,
        contactName: contactNameMap.get(n.contact_id) || "Contact",
      }));

      // ─── Bloc E: Carte Pro (pratique réussie sans note carte_pro) ───
      const allPratiqueResults = (examensPratiqueRes.data || []) as Array<{ contact_id: string; resultat: string }>;
      const allTheorieResults = (examensTheorieRes.data || []) as Array<{ contact_id: string; resultat: string }>;
      const pratiqueAdmisIds = new Set(
        allPratiqueResults.filter((e) => e.resultat === "admis").map((e) => e.contact_id)
      );
      // Get all [AUTO] notes containing "Carte Pro" for these contacts
      const carteProNotesRes = pratiqueAdmisIds.size > 0
        ? await supabase
            .from("contact_historique")
            .select("contact_id")
            .in("contact_id", Array.from(pratiqueAdmisIds))
            .like("titre", "%Carte Pro%")
        : { data: [] };
      const carteProSentIds = new Set(
        (carteProNotesRes.data || []).map((n: any) => n.contact_id)
      );
      const carteProItems = contacts
        .filter((c: any) => pratiqueAdmisIds.has(c.id) && !carteProSentIds.has(c.id) && !terminatedStatuses.includes(c.statut_apprenant || ''))
        .map((c: any) => ({ ...c }));

      // ─── Bloc G: À reprogrammer (théorie/pratique échouée sans reprogrammation) ───
      const theorieEchoueIds = new Set(
        allTheorieResults.filter((e) => e.resultat === "ajourne").map((e) => e.contact_id)
      );
      const pratiqueEchoueIds = new Set(
        allPratiqueResults.filter((e) => e.resultat === "ajourne").map((e) => e.contact_id)
      );
      // Check for reprogrammation notes
      const echoueContactIds = [...new Set([...theorieEchoueIds, ...pratiqueEchoueIds])];
      const reprogNotesRes = echoueContactIds.length > 0
        ? await supabase
            .from("contact_historique")
            .select("contact_id, titre")
            .in("contact_id", echoueContactIds)
            .like("titre", "%[AUTO]%rogramm%")
        : { data: [] };
      const reprogrammedIds = new Set(
        (reprogNotesRes.data || []).map((n: any) => n.contact_id)
      );
      const reprogramItems = contacts
        .filter((c: any) => !terminatedStatuses.includes(c.statut_apprenant || '') && !reprogrammedIds.has(c.id))
        .flatMap((c: any) => {
          const items: Array<{ id: string; contactId: string; prenom: string; nom: string; email: string | null; formation: string | null; type: string; label: string }> = [];
          if (theorieEchoueIds.has(c.id)) {
            items.push({ id: `reprog-t-${c.id}`, contactId: c.id, prenom: c.prenom, nom: c.nom, email: c.email, formation: c.formation, type: "theorie", label: "À reprogrammer (Théorie)" });
          }
          if (pratiqueEchoueIds.has(c.id)) {
            items.push({ id: `reprog-p-${c.id}`, contactId: c.id, prenom: c.prenom, nom: c.nom, email: c.email, formation: c.formation, type: "pratique", label: "À reprogrammer (Pratique)" });
          }
          return items;
        });

      // ─── Bloc F: Qualiopi à régulariser (sessions with missing qualiopi items) ───
      const sessions = sessionsRes.data || [];
      const qualiopiSessions = sessions
        .filter((s: any) => s.statut !== "annulee" && s.statut !== "terminee")
        .map((s: any) => {
          const issues: string[] = [];
          if (!s.formateur_id) issues.push("Formateur non assigné");
          if (!s.objectifs || !s.objectifs.trim()) issues.push("Objectifs manquants");
          if (!s.lieu && !s.adresse_ville) issues.push("Lieu non renseigné");
          if (!s.duree_heures || s.duree_heures <= 0) issues.push("Durée non renseignée");
          const sessionInscrits = inscriptions.filter((i: any) => i.session_id === s.id).length;
          return { ...s, issues, inscriptionCount: sessionInscrits };
        })
        .filter((s: any) => s.issues.length > 0)
        .sort((a: any, b: any) => b.issues.length - a.issues.length)
        .slice(0, 5);

      // Fetch recent (past) auto notes for contacts/prospects that have no today notes
      const allContactIds = [
        ...cmaItems.map(c => c.id),
        ...rdvToday.map(p => p.id),
        ...relances.map(p => p.id),
        ...critiques.map(c => c.id),
        ...carteProItems.map((c: any) => c.id),
        ...reprogramItems.map((r: any) => r.contactId),
      ];
      const contactsWithoutTodayNote = allContactIds.filter(
        id => !todayNotes.some(n => n.contact_id === id)
      );
      const recentNotes = await fetchRecentAutoNotes(contactsWithoutTodayNote);

      return {
        cmaItems,
        rdvToday,
        relances,
        critiques,
        carteProItems,
        reprogramItems,
        qualiopiSessions,
        todayNotes,
        recentNotes,
        journalEntries,
        totalActions: cmaItems.length + rdvToday.length + relances.length + critiques.length + carteProItems.length + reprogramItems.length + qualiopiSessions.length,
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
  const { composerProps, openComposer } = useEmailComposer();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [prospectDetailOpen, setProspectDetailOpen] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showHandled, setShowHandled] = useState(false);
  const [cmaFilter, setCmaFilter] = useState<CmaFilter>("all");
  const [cmaExpanded, setCmaExpanded] = useState(false);
  const CMA_INITIAL_LIMIT = 5;

  // ─── Bulk selection state ───
  const [bulkCmaSelected, setBulkCmaSelected] = useState<Set<string>>(new Set());
  const [bulkRelanceSelected, setBulkRelanceSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  // bulkEmailMode removed — handled inside EmailComposerModal

  const toggleBulkCma = (id: string) => {
    setBulkCmaSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleBulkRelance = (id: string) => {
    setBulkRelanceSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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

  // ─── Bulk action handlers (now open EmailComposerModal) ───
  const handleBulkCmaRelance = useCallback((items: any[]) => {
    const selected = items.filter(i => bulkCmaSelected.has(i.id) && i.email);
    if (selected.length === 0) { toast.error("Aucun apprenant sélectionné avec email"); return; }
    openComposer({
      recipients: selected.map(s => {
        const missingLabels = (s.missingDocs || []).map((d: string) => CMA_DOC_LABELS[d] || d);
        const customBody = `Bonjour ${s.prenom},\n\nPour compléter votre dossier CMA, il nous manque les documents suivants :\n\n${missingLabels.map((l: string) => `- ${l}`).join('\n')}\n\nMerci de nous les transmettre dans les meilleurs délais.\n\nCordialement,\nT3P Campus`;
        return { id: s.id, email: s.email, prenom: s.prenom, nom: s.nom, customBody };
      }),
      defaultSubject: "Documents CMA manquants",
      defaultBody: "Bonjour,\n\nIl manque des documents pour compléter votre dossier CMA.\nMerci de nous les transmettre rapidement.\n\nCordialement,\nT3P Campus",
      autoNoteCategory: "cma_relance_docs",
      autoNoteExtra: "Docs manquants (bulk)",
      onSuccess: () => { setBulkCmaSelected(new Set()); invalidate(); },
    });
  }, [bulkCmaSelected, invalidate, openComposer]);

  const handleBulkRelance = useCallback((items: any[]) => {
    const selected = items.filter(i => bulkRelanceSelected.has(i.id) && i.email);
    if (selected.length === 0) { toast.error("Aucun prospect sélectionné avec email"); return; }
    openComposer({
      recipients: selected.map(s => ({ id: s.id, email: s.email, prenom: s.prenom, nom: s.nom })),
      defaultSubject: "Votre projet de formation",
      defaultBody: "Bonjour,\n\nNous revenons vers vous concernant votre projet de formation.\n\nCordialement,\nT3P Campus",
      autoNoteCategory: "prospect_relance",
      autoNoteExtra: "Formation (bulk)",
      onSuccess: () => { setBulkRelanceSelected(new Set()); invalidate(); },
    });
  }, [bulkRelanceSelected, invalidate, openComposer]);

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
    critiques: rawCritiques = [], carteProItems: rawCartePro = [],
    reprogramItems: rawReprogram = [],
    qualiopiSessions = [],
    todayNotes = [], recentNotes = [], journalEntries = [],
  } = data || {};

  // Active filter for CMA/critiques
  const activeCma = includeInactive ? rawCma : rawCma.filter(c => c._isActive);
  const activeCritiques = includeInactive ? rawCritiques : rawCritiques.filter(c => c._isActive);
  const hiddenCount = (rawCma.length - rawCma.filter(c => c._isActive).length) + (rawCritiques.length - rawCritiques.filter(c => c._isActive).length);

  // Anti-double-relance: filter handled items
  const filteredCma = (showHandled ? activeCma : activeCma.filter(c => !isHandledToday(c.id, todayNotes, CMA_KEYWORDS)));
  // Apply CMA sub-filter
  const allCmaFiltered = cmaFilter === "all" ? filteredCma : filteredCma.filter(c => c.cmaCategory === cmaFilter);
  const cmaItems = cmaExpanded ? allCmaFiltered : allCmaFiltered.slice(0, CMA_INITIAL_LIMIT);
  const cmaHiddenCount = allCmaFiltered.length - cmaItems.length;
  // CMA sub-filter counts
  const cmaCountAll = filteredCma.length;
  const cmaCountDocs = filteredCma.filter(c => c.cmaCategory === "docs_manquants").length;
  const cmaCountRejete = filteredCma.filter(c => c.cmaCategory === "rejete").length;
  const cmaCountEnCours = filteredCma.filter(c => c.cmaCategory === "en_cours").length;

  const rdvToday = (showHandled ? rawRdv : rawRdv.filter(p => !isHandledToday(p.id, todayNotes, RDV_KEYWORDS))).slice(0, 10);
  const relances = (showHandled ? rawRelances : rawRelances.filter(p => !isHandledToday(p.id, todayNotes, RELANCE_KEYWORDS))).slice(0, 10);
  const critiques = (showHandled ? activeCritiques : activeCritiques.filter(c => !isHandledToday(c.id, todayNotes, CRITIQUE_KEYWORDS))).slice(0, 10);
  const cartePro = (showHandled ? rawCartePro : rawCartePro.filter((c: any) => !isHandledToday(c.id, todayNotes, CARTE_PRO_KEYWORDS))).slice(0, 10);

  const handledCmaCount = activeCma.length - (showHandled ? 0 : activeCma.filter(c => !isHandledToday(c.id, todayNotes, CMA_KEYWORDS)).length);
  const handledRdvCount = rawRdv.length - (showHandled ? 0 : rawRdv.filter(p => !isHandledToday(p.id, todayNotes, RDV_KEYWORDS)).length);
  const handledRelanceCount = rawRelances.length - (showHandled ? 0 : rawRelances.filter(p => !isHandledToday(p.id, todayNotes, RELANCE_KEYWORDS)).length);
  const handledCritiqueCount = activeCritiques.length - (showHandled ? 0 : activeCritiques.filter(c => !isHandledToday(c.id, todayNotes, CRITIQUE_KEYWORDS)).length);
  const totalHandled = handledCmaCount + handledRdvCount + handledRelanceCount + handledCritiqueCount;

  const reprogramItems = rawReprogram;
  // Use allCmaFiltered (full count) not cmaItems (sliced) for accurate counter
  const totalActions = allCmaFiltered.length + rdvToday.length + relances.length + critiques.length + cartePro.length + reprogramItems.length + qualiopiSessions.length;
  const totalRaw = allCmaFiltered.length + rawRdv.length + rawRelances.length + activeCritiques.length + rawCartePro.length + reprogramItems.length + qualiopiSessions.length;
  const progressPercent = totalRaw > 0 ? Math.round(((totalHandled) / totalRaw) * 100) : 100;

  // ─── Action handlers with EmailComposerModal ───
  const handleCmaRelanceDocs = (item: any) => {
    const missingList = item.missingDocs.map((d: string) => CMA_DOC_LABELS[d] || d).join(", ");
    openComposer({
      recipients: [{ id: item.id, email: item.email, prenom: item.prenom, nom: item.nom }],
      defaultSubject: "Documents CMA manquants",
      defaultBody: `Bonjour ${item.prenom},\n\nIl manque les documents suivants pour compléter votre dossier CMA :\n${item.missingDocs.map((d: string) => `- ${CMA_DOC_LABELS[d] || d}`).join('\n')}\n\nMerci de nous les transmettre rapidement.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "cma_relance_docs",
      autoNoteExtra: `Docs manquants: ${missingList}`,
      onSuccess: invalidate,
    });
  };

  const handleCmaWhatsApp = (item: any) => {
    logAction(item.id, "apprenant_whatsapp");
    openWhatsApp(item.telephone);
  };

  const handleRdvConfirm = (p: any) => {
    openComposer({
      recipients: [{ id: p.id, email: p.email, prenom: p.prenom, nom: p.nom }],
      defaultSubject: "Confirmation de votre rendez-vous",
      defaultBody: `Bonjour ${p.prenom},\n\nNous confirmons votre rendez-vous prévu aujourd'hui.\n\nÀ très bientôt !\nT3P Campus`,
      autoNoteCategory: "prospect_confirmation_rdv",
      autoNoteExtra: `Date: ${p.date_prochaine_relance || "aujourd'hui"}`,
      onSuccess: invalidate,
    });
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
    openComposer({
      recipients: [{ id: p.id, email: p.email, prenom: p.prenom, nom: p.nom }],
      defaultSubject: `Votre projet de formation ${p.formation_souhaitee || ''}`,
      defaultBody: `Bonjour ${p.prenom},\n\nNous revenons vers vous concernant votre projet de formation.\n\nN'hésitez pas à nous contacter pour en discuter.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "prospect_relance",
      autoNoteExtra: `Formation: ${p.formation_souhaitee || ""}`,
      onSuccess: invalidate,
    });
  };

  const handleRelanceWhatsApp = (p: any) => {
    logAction(p.id, "prospect_relance_whatsapp");
    openWhatsApp(p.telephone);
  };

  const handleCritiqueDemanderDocs = (item: any) => {
    const missingList = item.missingCMA.map((d: string) => CMA_DOC_LABELS[d] || d).join(", ");
    openComposer({
      recipients: [{ id: item.id, email: item.email, prenom: item.prenom, nom: item.nom }],
      defaultSubject: "Documents manquants — Urgent",
      defaultBody: `Bonjour ${item.prenom},\n\nIl manque les documents suivants pour votre dossier :\n${item.missingCMA.map((d: string) => `- ${CMA_DOC_LABELS[d] || d}`).join('\n')}\n\nMerci de les transmettre en urgence.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "apprenant_demander_docs",
      autoNoteExtra: `Docs manquants: ${missingList}`,
      onSuccess: invalidate,
    });
  };

  const handleCritiqueRelancePaiement = (item: any) => {
    openComposer({
      recipients: [{ id: item.id, email: item.email, prenom: item.prenom, nom: item.nom }],
      defaultSubject: "Rappel de paiement",
      defaultBody: `Bonjour ${item.prenom},\n\nNous vous rappelons qu'un paiement est en attente pour votre formation.\n\nMerci de régulariser votre situation.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "apprenant_relance_paiement",
      onSuccess: invalidate,
    });
  };

  const handleCarteProEmail = (item: any) => {
    openComposer({
      recipients: [{ id: item.id, email: item.email, prenom: item.prenom, nom: item.nom }],
      defaultSubject: "Démarches Carte Professionnelle — Examen pratique réussi",
      defaultBody: `Bonjour ${item.prenom},\n\nSuite à votre réussite à l'examen pratique, vous pouvez maintenant faire votre demande de carte professionnelle en préfecture.\n\nDocuments nécessaires :\n- Attestation de réussite\n- Pièce d'identité en cours de validité\n- Justificatif de domicile de moins de 3 mois\n- 2 photos d'identité\n- Permis de conduire\n\nDélai moyen : 2 à 4 semaines.\n\nCordialement,\nÉcole T3P Montrouge`,
      autoNoteCategory: "carte_pro_envoyee",
      onSuccess: invalidate,
    });
  };

  const handleCarteProMarkDone = async (item: any) => {
    await logAction(item.id, "carte_pro_envoyee", "Marqué manuellement");
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

      {/* Progress bar + Toggles */}
      <div className="px-8 space-y-3">
        {totalRaw > 0 && (
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {totalHandled}/{totalRaw} traité{totalHandled > 1 ? "s" : ""}
            </span>
          </div>
        )}
        <div className="flex items-center justify-end gap-4">
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
              <div className="flex items-center gap-2">
                {bulkCmaSelected.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-[10px] gap-1"
                      disabled={bulkProcessing}
                      onClick={() => handleBulkCmaRelance(cmaItems)}
                    >
                      <ListChecks className="h-3 w-3" />
                      Relancer {bulkCmaSelected.size}
                    </Button>
                    {bulkCmaSelected.size > 10 && (
                      <span className="text-[9px] text-warning font-medium">⚠️ {bulkCmaSelected.size} dest.</span>
                    )}
                  </div>
                )}
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{cmaCountAll}</Badge>
              </div>
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
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={bulkCmaSelected.has(item.id)}
                          onCheckedChange={() => toggleBulkCma(item.id)}
                          className="h-3.5 w-3.5"
                        />
                        <UrgencyDot urgency={item.urgency} />
                        <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                          {item.prenom} {item.nom}
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                        <Badge variant="outline" className="text-[9px] bg-muted text-muted-foreground">
                          {item.docCount}/{CMA_REQUIRED_DOCS.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2 pl-8">
                      {item.missingDocs.map((d: string) => (
                        <Badge key={d} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                          ✗ {CMA_DOC_LABELS[d] || d}
                        </Badge>
                      ))}
                    </div>
                    {/* Last action timeline */}
                    <div className="pl-8">
                      {item.lastCmaNote ? (
                        <div className="flex items-center gap-1.5 mb-2">
                          <Bot className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">
                            Dernière relance : {format(parseISO(item.lastCmaNote.created_at), "HH:mm", { locale: fr })}
                          </span>
                        </div>
                      ) : (
                        <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.id} />
                      )}
                    </div>
                    <div className="flex gap-1.5 pl-8">
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
            {cmaHiddenCount > 0 && (
              <div className="px-5 py-3 border-t bg-muted/10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCmaExpanded(true)}
                >
                  Afficher {cmaHiddenCount} autre{cmaHiddenCount > 1 ? 's' : ''} dossier{cmaHiddenCount > 1 ? 's' : ''}
                </Button>
              </div>
            )}
            {cmaExpanded && allCmaFiltered.length > CMA_INITIAL_LIMIT && (
              <div className="px-5 py-2 border-t bg-muted/10">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCmaExpanded(false)}
                >
                  Réduire
                </Button>
              </div>
            )}
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
                    <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={p.id} />
                    <div className="flex gap-1.5 mt-1">
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
              <div className="flex items-center gap-2">
                {bulkRelanceSelected.size > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-[10px] gap-1"
                      disabled={bulkProcessing}
                      onClick={() => handleBulkRelance(relances)}
                    >
                      <ListChecks className="h-3 w-3" />
                      Relancer {bulkRelanceSelected.size}
                    </Button>
                    {bulkRelanceSelected.size > 10 && (
                      <span className="text-[9px] text-warning font-medium">⚠️ {bulkRelanceSelected.size} dest.</span>
                    )}
                  </div>
                )}
                <Badge variant="outline" className="text-xs bg-accent/10 text-accent">{relances.length}</Badge>
              </div>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {relances.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/50" />
                  Toutes les relances sont à jour
                </div>
              ) : relances.map((p) => {
                const actionDate = (p as any).next_action_at || p.date_prochaine_relance;
                const daysLate = actionDate && isPast(parseISO(actionDate))
                  ? Math.abs(differenceInDays(parseISO(actionDate), new Date()))
                  : 0;
                const urgency = computeProspectUrgency({ daysLate });
                return (
                  <div key={p.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={bulkRelanceSelected.has(p.id)}
                          onCheckedChange={() => toggleBulkRelance(p.id)}
                          className="h-3.5 w-3.5"
                        />
                        <UrgencyDot urgency={urgency} />
                        <button onClick={() => openProspect(p)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                          {p.prenom} {p.nom}
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </button>
                      </div>
                      {actionDate && (
                        <Badge variant="outline" className={cn(
                          "text-[10px]",
                          isPast(parseISO(actionDate)) ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                        )}>
                          {isPast(parseISO(actionDate))
                            ? `${daysLate}j retard`
                            : format(parseISO(actionDate), "dd/MM", { locale: fr })
                          }
                        </Badge>
                      )}
                    </div>
                    {p.formation_souhaitee && <p className="text-xs text-muted-foreground mb-1 pl-8">{p.formation_souhaitee}</p>}
                    <div className="pl-8">
                      <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={p.id} />
                    </div>
                    <div className="flex gap-1.5 mt-1 pl-8">
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
                );
              })}
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
                    <div className="flex items-center gap-2">
                      <UrgencyDot urgency={item.urgency} />
                      <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                        {item.prenom} {item.nom}
                        <ExternalLink className="h-3 w-3 opacity-40" />
                      </button>
                    </div>
                    {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.reasons.map((r: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                        {r}
                      </Badge>
                    ))}
                  </div>
                  <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.id} />
                  <div className="flex gap-1.5 mt-1">
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

        {/* ─── BLOC G: À reprogrammer ─── */}
        {reprogramItems.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <RotateCcw className="h-4 w-4 text-destructive" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">À reprogrammer</h3>
                  <p className="text-[11px] text-muted-foreground">{reprogramItems.length} examen{reprogramItems.length > 1 ? "s" : ""} échoué{reprogramItems.length > 1 ? "s" : ""}</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">{reprogramItems.length}</Badge>
            </div>
            <div className="divide-y max-h-60 overflow-y-auto">
              {reprogramItems.map((item: any) => (
                <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", item.type === "pratique" ? "bg-destructive" : "bg-warning")} />
                      <button onClick={() => openContact(item.contactId)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                        {item.prenom} {item.nom}
                        <ExternalLink className="h-3 w-3 opacity-40" />
                      </button>
                    </div>
                    <Badge variant="outline" className={cn("text-[9px]", item.type === "pratique" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning")}>
                      {item.label}
                    </Badge>
                  </div>
                  {item.formation && <p className="text-[10px] text-muted-foreground mb-1">{item.formation}</p>}
                  <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.contactId} />
                  <div className="flex gap-1.5 mt-1">
                    <MarkDoneBtn contactId={item.contactId} bloc="Reprogrammation" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ─── BLOC E: Carte Pro à envoyer ─── */}
        {cartePro.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Carte Pro à envoyer</h3>
                  <p className="text-[11px] text-muted-foreground">{cartePro.length} apprenant{cartePro.length > 1 ? "s" : ""} — pratique réussie</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{cartePro.length}</Badge>
            </div>
            <div className="divide-y max-h-80 overflow-y-auto">
              {cartePro.map((item: any) => {
                const carteProDoneToday = isHandledToday(item.id, todayNotes, CARTE_PRO_KEYWORDS);
                return (
                  <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openContact(item.id)} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1">
                          {item.prenom} {item.nom}
                          <ExternalLink className="h-3 w-3 opacity-40" />
                        </button>
                      </div>
                      {item.formation && <Badge variant="outline" className="text-[10px]">{item.formation}</Badge>}
                    </div>
                    <LastActionLine todayNotes={todayNotes} recentNotes={recentNotes} contactId={item.id} />
                    <div className="flex gap-1.5 mt-1">
                      {item.email && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm" variant="outline" className="h-7 text-[10px] border-warning text-warning hover:bg-warning/10"
                                  disabled={carteProDoneToday}
                                  onClick={() => handleCarteProEmail(item)}
                                >
                                  <Mail className="h-3 w-3 mr-1" /> Envoyer démarches
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {carteProDoneToday && <TooltipContent><p>Déjà envoyé aujourd'hui</p></TooltipContent>}
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                size="sm" variant="ghost" className="h-7 text-[10px] text-muted-foreground"
                                disabled={carteProDoneToday}
                                onClick={() => handleCarteProMarkDone(item)}
                              >
                                <Check className="h-3 w-3 mr-1" /> Marquer envoyé
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {carteProDoneToday && <TooltipContent><p>Déjà fait aujourd'hui</p></TooltipContent>}
                        </Tooltip>
                      </TooltipProvider>
                      <MarkDoneBtn contactId={item.id} bloc="Carte Pro" />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ─── BLOC F: Qualiopi à régulariser ─── */}
        {qualiopiSessions.length > 0 && (
          <Card className="p-0 overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Qualiopi à régulariser</h3>
                  <p className="text-[11px] text-muted-foreground">{qualiopiSessions.length} session{qualiopiSessions.length > 1 ? "s" : ""} avec critères manquants</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{qualiopiSessions.length}</Badge>
            </div>
            <div className="divide-y max-h-60 overflow-y-auto">
              {qualiopiSessions.map((s: any) => (
                <div key={s.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{s.nom}</span>
                    <Badge variant="outline" className="text-[9px] bg-warning/10 text-warning">
                      {s.issues.length} critère{s.issues.length > 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {s.issues.map((issue: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-[9px] bg-destructive/10 text-destructive border-destructive/20">
                        {issue}
                      </Badge>
                    ))}
                  </div>
                  {onNavigate && (
                    <Button
                      size="sm" variant="outline"
                      className="h-6 text-[10px] gap-1"
                      onClick={() => onNavigate(`session-qualiopi-${s.id}`)}
                    >
                      <Shield className="h-3 w-3" /> Ouvrir Qualiopi
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        <ActionJournal
          entries={journalEntries}
          onOpenContact={openContact}
        />
      </div>

      {/* Detail sheets */}
      <ApprenantDetailSheet contactId={selectedContactId} open={contactDetailOpen} onOpenChange={setContactDetailOpen} />
      <ProspectDetailSheet prospect={selectedProspect} open={prospectDetailOpen} onOpenChange={setProspectDetailOpen} />
      <EmailComposerModal {...composerProps} />
    </div>
  );
}
