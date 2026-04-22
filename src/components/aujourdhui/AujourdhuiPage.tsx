import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ApprenantDetailSheet } from "@/components/apprenants/ApprenantDetailSheet";
import { ProspectDetailSheet } from "@/components/prospects/ProspectDetailSheet";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { ActionJournal } from "./ActionJournal";
import { toast } from "sonner";
import {
  createAutoNote, deleteAutoNote, isHandledToday,
  type ActionCategory,
} from "@/lib/aujourdhui-actions";
import { CMA_DOC_LABELS } from "@/lib/cma-constants";
import { openWhatsApp } from "@/lib/phone-utils";
import type { Prospect } from "@/hooks/useProspects";

import { useAujourdhuiData } from "./useAujourdhuiData";
import { CMA_KEYWORDS, RDV_KEYWORDS, RELANCE_KEYWORDS, CRITIQUE_KEYWORDS, CARTE_PRO_KEYWORDS } from "./aujourdhui-types";
import type { CmaFilter } from "./aujourdhui-types";
import { BlocCma } from "./BlocCma";
import { BlocRdv } from "./BlocRdv";
import { BlocRelances } from "./BlocRelances";
import { BlocCritiques } from "./BlocCritiques";
import { BlocCartePro } from "./BlocCartePro";
import { BlocReprogrammer } from "./BlocReprogrammer";
import { BlocQualiopi } from "./BlocQualiopi";

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

  // ─── Bulk action handlers ───
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

  const openContact = (id: string) => { setSelectedContactId(id); setContactDetailOpen(true); };
  const openProspect = (p: Prospect) => { setSelectedProspect(p); setProspectDetailOpen(true); };

  // ─── Action handlers ───
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

  const handleCmaWhatsApp = (item: any) => { logAction(item.id, "apprenant_whatsapp"); openWhatsApp(item.telephone); };

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

  const handleRdvAppel = (p: any) => { logAction(p.id, "prospect_appel"); };
  const handleRdvWhatsApp = (p: any) => { logAction(p.id, "prospect_relance_whatsapp"); openWhatsApp(p.telephone); };

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

  const handleRelanceWhatsApp = (p: any) => { logAction(p.id, "prospect_relance_whatsapp"); openWhatsApp(p.telephone); };

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

  const handleCarteProMarkDone = async (item: any) => { await logAction(item.id, "carte_pro_envoyee", "Marqué manuellement"); };

  const isCmaRelancedToday = (contactId: string) => {
    return (data?.todayNotes || []).some(n => n.contact_id === contactId && (n.titre.includes("CMA") && n.titre.includes("[AUTO]")));
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

  // Active filter
  const activeCma = includeInactive ? rawCma : rawCma.filter(c => c._isActive);
  const activeCritiques = includeInactive ? rawCritiques : rawCritiques.filter(c => c._isActive);
  const hiddenCount = (rawCma.length - rawCma.filter(c => c._isActive).length) + (rawCritiques.length - rawCritiques.filter(c => c._isActive).length);

  // Anti-double-relance
  const filteredCma = (showHandled ? activeCma : activeCma.filter(c => !isHandledToday(c.id, todayNotes, CMA_KEYWORDS)));
  const allCmaFiltered = cmaFilter === "all" ? filteredCma : filteredCma.filter(c => c.cmaCategory === cmaFilter);
  const cmaItems = cmaExpanded ? allCmaFiltered : allCmaFiltered.slice(0, CMA_INITIAL_LIMIT);
  const cmaHiddenCount = allCmaFiltered.length - cmaItems.length;

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
  const totalActions = allCmaFiltered.length + rdvToday.length + relances.length + critiques.length + cartePro.length + reprogramItems.length + qualiopiSessions.length;
  const totalRaw = allCmaFiltered.length + rawRdv.length + rawRelances.length + activeCritiques.length + rawCartePro.length + reprogramItems.length + qualiopiSessions.length;
  const progressPercent = totalRaw > 0 ? Math.round(((totalHandled) / totalRaw) * 100) : 100;

  return (
    <div className="space-y-6">
      <Header title="Aujourd'hui" subtitle={`${totalActions} action${totalActions > 1 ? "s" : ""} à traiter`} />

      <div className="px-8">
        <HintBubble
          id="header-search-cmdk-v1"
          title="Astuce — Recherche universelle"
          variant="tip"
        >
          Tapez <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-background/60 border">⌘ K</kbd> ou cliquez sur la barre de recherche en haut pour atteindre n'importe quel apprenant, session ou facture en 2 secondes.
        </HintBubble>
      </div>

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
          <BlocCma
            allCmaFiltered={allCmaFiltered} cmaItems={cmaItems} cmaHiddenCount={cmaHiddenCount}
            cmaExpanded={cmaExpanded} setCmaExpanded={setCmaExpanded}
            cmaFilter={cmaFilter} setCmaFilter={setCmaFilter}
            cmaCountAll={cmaCountAll} cmaCountDocs={cmaCountDocs} cmaCountRejete={cmaCountRejete} cmaCountEnCours={cmaCountEnCours}
            bulkCmaSelected={bulkCmaSelected} toggleBulkCma={toggleBulkCma}
            bulkProcessing={bulkProcessing} handleBulkCmaRelance={handleBulkCmaRelance}
            handleCmaRelanceDocs={handleCmaRelanceDocs} handleCmaWhatsApp={handleCmaWhatsApp}
            isCmaRelancedToday={isCmaRelancedToday}
            todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
          />

          <BlocRdv
            rdvToday={rdvToday}
            handleRdvConfirm={handleRdvConfirm} handleRdvAppel={handleRdvAppel} handleRdvWhatsApp={handleRdvWhatsApp}
            todayNotes={todayNotes} recentNotes={recentNotes} openProspect={openProspect} markDone={markDone}
            onNavigate={onNavigate}
          />

          <BlocRelances
            relances={relances}
            bulkRelanceSelected={bulkRelanceSelected} toggleBulkRelance={toggleBulkRelance}
            bulkProcessing={bulkProcessing} handleBulkRelance={handleBulkRelance}
            handleRelanceEmail={handleRelanceEmail} handleRelanceWhatsApp={handleRelanceWhatsApp}
            todayNotes={todayNotes} recentNotes={recentNotes} openProspect={openProspect} markDone={markDone}
          />

          <BlocCritiques
            critiques={critiques}
            handleCritiqueDemanderDocs={handleCritiqueDemanderDocs} handleCritiqueRelancePaiement={handleCritiqueRelancePaiement}
            todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
          />
        </div>

        <BlocReprogrammer
          reprogramItems={reprogramItems}
          todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
        />

        <BlocCartePro
          cartePro={cartePro}
          handleCarteProEmail={handleCarteProEmail} handleCarteProMarkDone={handleCarteProMarkDone}
          todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
        />

        <BlocQualiopi qualiopiSessions={qualiopiSessions} onNavigate={onNavigate} />

        <ActionJournal entries={journalEntries} onOpenContact={openContact} />
      </div>

      {/* Detail sheets */}
      <ApprenantDetailSheet contactId={selectedContactId} open={contactDetailOpen} onOpenChange={setContactDetailOpen} />
      <ProspectDetailSheet prospect={selectedProspect} open={prospectDetailOpen} onOpenChange={setProspectDetailOpen} />
      <EmailComposerModal {...composerProps} />
    </div>
  );
}
