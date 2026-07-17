import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
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
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  createAutoNote, deleteAutoNote, isHandledToday,
  type ActionCategory,
} from "@/lib/aujourdhui-actions";
import { CMA_DOC_LABELS } from "@/lib/cma-constants";
import { openWhatsApp } from "@/lib/phone-utils";
import {
  buildCmaDocsWhatsAppMessage,
  buildProspectFollowUpWhatsAppMessage,
  buildRdvConfirmationWhatsAppMessage,
} from "@/lib/whatsapp-messages";
import type { Prospect } from "@/hooks/useProspects";

import { useAujourdhuiData } from "./useAujourdhuiData";
import { CMA_KEYWORDS, RDV_KEYWORDS, RELANCE_KEYWORDS, CRITIQUE_KEYWORDS, CARTE_PRO_KEYWORDS, CRM_QUALITY_KEYWORDS } from "./aujourdhui-types";
import type { CmaFilter, SessionPrepItem } from "./aujourdhui-types";
import { BlocCma } from "./BlocCma";
import { BlocRdv } from "./BlocRdv";
import { BlocRelances } from "./BlocRelances";
import { BlocCritiques } from "./BlocCritiques";
import { BlocCartePro } from "./BlocCartePro";
import { BlocReprogrammer } from "./BlocReprogrammer";
import { BlocResultatsAVerifier } from "./BlocResultatsAVerifier";
import { BlocConvocationsCma } from "./BlocConvocationsCma";
import { BlocBoitesMail } from "./BlocBoitesMail";
import { BlocQualiopi } from "./BlocQualiopi";
import { BlocSessionPreparation } from "./BlocSessionPreparation";
import { BlocQualiteCrm } from "./BlocQualiteCrm";
import { HintBubble } from "@/components/shared/HintBubble";
import { FocusModeBar, type FocusBlocKey } from "./FocusModeBar";

interface AujourdhuiPageProps {
  onNavigate?: (section: string) => void;
  onNavigateWithParams?: (section: string, params: Record<string, string>) => void;
}

function formatDateLabel(value: string | null | undefined, fallback = "aujourd'hui") {
  if (!value) return fallback;
  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return `le ${format(date, "EEEE d MMMM", { locale: fr })}`;
}

function makeHandledKey(contactId: string, blocLabel: string) {
  return `${blocLabel}:${contactId}`;
}

interface BulkDoneLabel {
  singular: string;
  plural: string;
}

export function AujourdhuiPage({ onNavigate, onNavigateWithParams }: AujourdhuiPageProps) {
  const { data, isLoading } = useAujourdhuiData();
  const queryClient = useQueryClient();
  const { composerProps, openComposer } = useEmailComposer();
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [prospectDetailOpen, setProspectDetailOpen] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showHandled, setShowHandled] = useState(false);
  const [focusBloc, setFocusBloc] = useState<FocusBlocKey | null>(null);
  const [cmaFilter, setCmaFilter] = useState<CmaFilter>("all");
  const [cmaExpanded, setCmaExpanded] = useState(false);
  const [locallyHandledKeys, setLocallyHandledKeys] = useState<Set<string>>(new Set());
  const [locallyPostponedKeys, setLocallyPostponedKeys] = useState<Set<string>>(new Set());
  const CMA_INITIAL_LIMIT = 5;

  // ─── Bulk selection state ───
  const [bulkCmaSelected, setBulkCmaSelected] = useState<Set<string>>(new Set());
  const [bulkRelanceSelected, setBulkRelanceSelected] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [consulteBoitePending, setConsulteBoitePending] = useState<Set<string>>(new Set());

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

  const toggleBulkCmaVisible = useCallback((items: Array<{ id: string }>) => {
    const visibleIds = items.map((item) => item.id);
    if (visibleIds.length === 0) return;

    setBulkCmaSelected(prev => {
      const next = new Set(prev);
      const allSelected = visibleIds.every((id) => next.has(id));
      visibleIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }, []);

  const toggleBulkRelanceVisible = useCallback((items: Array<{ id: string }>) => {
    const visibleIds = items.map((item) => item.id);
    if (visibleIds.length === 0) return;

    setBulkRelanceSelected(prev => {
      const next = new Set(prev);
      const allSelected = visibleIds.every((id) => next.has(id));
      visibleIds.forEach((id) => {
        if (allSelected) next.delete(id);
        else next.add(id);
      });
      return next;
    });
  }, []);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
    queryClient.invalidateQueries({ queryKey: ["contact-historique"] });
    // Les données partagées (docs, inscriptions, rappels — cf. shared-queries)
    // doivent refléter immédiatement les actions faites depuis le hub.
    queryClient.invalidateQueries({ queryKey: ["shared"] });
  }, [queryClient]);

  // Horodate la consultation d'une boîte mail interne (réarme le compteur 7 j).
  const handleConsulteBoite = useCallback(async (contactId: string) => {
    setConsulteBoitePending(prev => new Set(prev).add(contactId));
    const { error } = await supabase
      .from("contacts")
      .update({ email_interne_consulte_le: new Date().toISOString() })
      .eq("id", contactId);
    if (error) {
      toast.error("Impossible d'enregistrer la consultation");
    } else {
      toast.success("Boîte marquée comme consultée");
      invalidate();
    }
    setConsulteBoitePending(prev => {
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
  }, [invalidate]);

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
    const handledKey = makeHandledKey(contactId, blocLabel);

    setLocallyHandledKeys(prev => {
      if (prev.has(handledKey)) return prev;
      const next = new Set(prev);
      next.add(handledKey);
      return next;
    });
    setBulkCmaSelected(prev => {
      if (blocLabel !== "CMA" || !prev.has(contactId)) return prev;
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
    setBulkRelanceSelected(prev => {
      if (blocLabel !== "Relance" || !prev.has(contactId)) return prev;
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });

    const result = await createAutoNote(contactId, "marquer_fait", `Bloc: ${blocLabel}`, { bloc: blocLabel });
    if (!result) {
      setLocallyHandledKeys(prev => {
        const next = new Set(prev);
        next.delete(handledKey);
        return next;
      });
      toast.error("Impossible de marquer comme traité");
      return;
    }

    const successLabel =
      blocLabel === "CMA"
        ? "Dossier traité"
        : blocLabel === "Relance"
          ? "Prospect traité"
          : "Action traitée";

    toast.success(successLabel, {
      description: "L'élément est masqué de la liste du jour",
      action: {
        label: "Annuler",
        onClick: async () => {
          const deleted = await deleteAutoNote(result.id);
          if (deleted) {
            setLocallyHandledKeys(prev => {
              const next = new Set(prev);
              next.delete(handledKey);
              return next;
            });
            toast.info("Action annulée");
            invalidate();
          }
        },
      },
      duration: 10000,
    });
    invalidate();
  }, [invalidate]);

  const postponeAction = useCallback(async (contactId: string, blocLabel: string, targetDate: string) => {
    if (targetDate <= format(new Date(), "yyyy-MM-dd")) {
      toast.error("Choisissez une date future pour reporter");
      return;
    }

    const postponedKey = makeHandledKey(contactId, blocLabel);
    const previousProspect = blocLabel === "Relance" ? data?.relances?.find((item: Prospect) => item.id === contactId) : null;

    setLocallyPostponedKeys(prev => {
      if (prev.has(postponedKey)) return prev;
      const next = new Set(prev);
      next.add(postponedKey);
      return next;
    });
    setBulkCmaSelected(prev => {
      if (blocLabel !== "CMA" || !prev.has(contactId)) return prev;
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });
    setBulkRelanceSelected(prev => {
      if (blocLabel !== "Relance" || !prev.has(contactId)) return prev;
      const next = new Set(prev);
      next.delete(contactId);
      return next;
    });

    try {
      if (blocLabel === "Relance") {
        const { error } = await supabase
          .from("prospects")
          .update({
            date_prochaine_relance: targetDate,
            next_action_at: targetDate,
            statut: "relance",
          } as any)
          .eq("id", contactId);

        if (error) throw error;
      }

      const note = await createAutoNote(
        contactId,
        "reporter_action",
        `Bloc: ${blocLabel} · Jusqu'au: ${targetDate}`,
        { bloc: blocLabel, postponed_until: targetDate },
      );
      if (!note) throw new Error("Auto note creation failed");

      const label = blocLabel === "CMA" ? "Dossier reporté" : "Prospect reporté";
      toast.success(label, {
        description: `L'action ressortira le ${format(parseISO(targetDate), "dd/MM/yyyy", { locale: fr })}`,
        action: {
          label: "Annuler",
          onClick: async () => {
            await deleteAutoNote(note.id);
            if (blocLabel === "Relance" && previousProspect) {
              await supabase
                .from("prospects")
                .update({
                  date_prochaine_relance: previousProspect.date_prochaine_relance,
                  next_action_at: previousProspect.next_action_at,
                } as any)
                .eq("id", contactId);
            }
            setLocallyPostponedKeys(prev => {
              const next = new Set(prev);
              next.delete(postponedKey);
              return next;
            });
            toast.info("Report annulé");
            invalidate();
          },
        },
        duration: 10000,
      });
      invalidate();
    } catch (error) {
      setLocallyPostponedKeys(prev => {
        const next = new Set(prev);
        next.delete(postponedKey);
        return next;
      });
      toast.error("Impossible de reporter cette action");
      console.error(error);
    }
  }, [data?.relances, invalidate]);

  // ─── Bulk action handlers ───
  const markSelectedDone = useCallback(async (
    items: Array<{ id: string }>,
    selectedIds: Set<string>,
    blocLabel: string,
    labels: BulkDoneLabel,
    clearSuccessfulSelection: (successfulIds: Set<string>) => void,
  ) => {
    const selected = items.filter(item => selectedIds.has(item.id));

    if (selected.length === 0) {
      toast.error("Aucun élément sélectionné");
      return;
    }

    const selectedKeys = selected.map(item => makeHandledKey(item.id, blocLabel));
    setBulkProcessing(true);
    setLocallyHandledKeys(prev => {
      const next = new Set(prev);
      selectedKeys.forEach(key => next.add(key));
      return next;
    });

    try {
      const results = await Promise.all(
        selected.map(item => createAutoNote(item.id, "marquer_fait", `Bloc: ${blocLabel} · Traitement en lot`, { bloc: blocLabel, bulk: true }))
      );
      const successfulNotes = results.filter((result): result is NonNullable<typeof result> => Boolean(result));
      const successfulIds = new Set(successfulNotes.map(note => note.contact_id));
      const failedItems = selected.filter(item => !successfulIds.has(item.id));

      if (failedItems.length > 0) {
        const failedKeys = failedItems.map(item => makeHandledKey(item.id, blocLabel));
        setLocallyHandledKeys(prev => {
          const next = new Set(prev);
          failedKeys.forEach(key => next.delete(key));
          return next;
        });
        toast.error(`${failedItems.length} élément${failedItems.length > 1 ? "s" : ""} non traité${failedItems.length > 1 ? "s" : ""}`);
      }

      if (successfulNotes.length > 0) {
        clearSuccessfulSelection(successfulIds);
        const successLabel = successfulNotes.length === 1
          ? `1 ${labels.singular}`
          : `${successfulNotes.length} ${labels.plural}`;

        toast.success(successLabel, {
          description: "Les éléments sont masqués de la liste du jour",
          action: {
            label: "Annuler",
            onClick: async () => {
              const undoResults = await Promise.all(successfulNotes.map(note => deleteAutoNote(note.id)));
              const undoneIds = new Set(
                successfulNotes
                  .filter((_, index) => undoResults[index])
                  .map(note => note.contact_id)
              );

              if (undoneIds.size > 0) {
                setLocallyHandledKeys(prev => {
                  const next = new Set(prev);
                  undoneIds.forEach(id => next.delete(makeHandledKey(id, blocLabel)));
                  return next;
                });
                toast.info(`${undoneIds.size} action${undoneIds.size > 1 ? "s" : ""} annulée${undoneIds.size > 1 ? "s" : ""}`);
                invalidate();
              }
            },
          },
          duration: 10000,
        });
        invalidate();
      }
    } finally {
      setBulkProcessing(false);
    }
  }, [invalidate]);

  const handleBulkCmaRelance = useCallback((items: any[]) => {
    const selected = items.filter(i => bulkCmaSelected.has(i.id) && i.email);
    if (selected.length === 0) { toast.error("Aucun apprenant sélectionné avec email"); return; }
    openComposer({
      recipients: selected.map(s => {
        const missingLabels = (s.missingDocs || []).map((d: string) => CMA_DOC_LABELS[d] || d);
        const dossierLabel = s.dossierShortLabel === "Carte Pro" ? "dossier de renouvellement carte pro" : "dossier CMA";
        const customBody = `Bonjour ${s.prenom},\n\nPour compléter votre ${dossierLabel}, il nous manque les documents suivants :\n\n${missingLabels.map((l: string) => `- ${l}`).join('\n')}\n\nMerci de nous les transmettre dans les meilleurs délais.\n\nCordialement,\nT3P Campus`;
        return { id: s.id, email: s.email, prenom: s.prenom, nom: s.nom, customBody };
      }),
      defaultSubject: "Documents manquants",
      defaultBody: "Bonjour,\n\nIl manque des documents pour compléter votre dossier.\nMerci de nous les transmettre rapidement.\n\nCordialement,\nT3P Campus",
      autoNoteCategory: "cma_relance_docs",
      autoNoteExtra: "Docs manquants (bulk)",
      onSuccess: () => { setBulkCmaSelected(new Set()); invalidate(); },
    });
  }, [bulkCmaSelected, invalidate, openComposer]);

  const handleBulkCmaDone = useCallback((items: any[]) => {
    markSelectedDone(
      items,
      bulkCmaSelected,
      "CMA",
      { singular: "dossier marqué traité", plural: "dossiers marqués traités" },
      (successfulIds) => {
        setBulkCmaSelected(prev => {
          const next = new Set(prev);
          successfulIds.forEach(id => next.delete(id));
          return next;
        });
      },
    );
  }, [bulkCmaSelected, markSelectedDone]);

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

  const handleBulkRelanceDone = useCallback((items: Prospect[]) => {
    markSelectedDone(
      items,
      bulkRelanceSelected,
      "Relance",
      { singular: "prospect marqué traité", plural: "prospects marqués traités" },
      (successfulIds) => {
        setBulkRelanceSelected(prev => {
          const next = new Set(prev);
          successfulIds.forEach(id => next.delete(id));
          return next;
        });
      },
    );
  }, [bulkRelanceSelected, markSelectedDone]);

  const openContact = (id: string) => { setSelectedContactId(id); setContactDetailOpen(true); };
  const openProspect = (p: Prospect) => { setSelectedProspect(p); setProspectDetailOpen(true); };

  // ─── Action handlers ───
  const handleCmaRelanceDocs = (item: any) => {
    const missingList = item.missingDocs.map((d: string) => CMA_DOC_LABELS[d] || d).join(", ");
    const dossierLabel = item.dossierShortLabel === "Carte Pro" ? "dossier de renouvellement carte pro" : "dossier CMA";
    openComposer({
      recipients: [{ id: item.id, email: item.email, prenom: item.prenom, nom: item.nom }],
      defaultSubject: "Documents manquants",
      defaultBody: `Bonjour ${item.prenom},\n\nIl manque les documents suivants pour compléter votre ${dossierLabel} :\n${item.missingDocs.map((d: string) => `- ${CMA_DOC_LABELS[d] || d}`).join('\n')}\n\nMerci de nous les transmettre rapidement.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "cma_relance_docs",
      autoNoteExtra: `Docs manquants: ${missingList}`,
      onSuccess: invalidate,
    });
  };

  const handleCmaWhatsApp = (item: any) => {
    const missingLabels = (item.missingDocs || []).map((d: string) => CMA_DOC_LABELS[d] || d);
    const dossierLabel = item.dossierShortLabel === "Carte Pro" ? "dossier de renouvellement carte pro" : "dossier CMA";
    logAction(item.id, "apprenant_whatsapp", `Docs ${item.dossierShortLabel || "CMA"} manquants: ${missingLabels.join(", ")}`);
    openWhatsApp(item.telephone, buildCmaDocsWhatsAppMessage({ prenom: item.prenom, missingDocsLabels: missingLabels, dossierLabel }));
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

  const handleRdvAppel = (p: any) => { logAction(p.id, "prospect_appel"); };
  const handleRdvWhatsApp = (p: any) => {
    const dateLabel = formatDateLabel(p.date_prochaine_relance);
    logAction(p.id, "prospect_relance_whatsapp", `RDV: ${p.date_prochaine_relance || "aujourd'hui"}`);
    openWhatsApp(p.telephone, buildRdvConfirmationWhatsAppMessage({ prenom: p.prenom, dateLabel }));
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
    logAction(p.id, "prospect_relance_whatsapp", `Formation: ${p.formation_souhaitee || ""}`);
    openWhatsApp(
      p.telephone,
      buildProspectFollowUpWhatsAppMessage({
        prenom: p.prenom,
        formationSouhaitee: p.formation_souhaitee,
      }),
    );
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

  const handleSessionRelanceDocs = useCallback((session: SessionPrepItem) => {
    const recipients = session.missingDocsContacts
      .filter((contact) => contact.email)
      .map((contact) => {
        const missingLabels = contact.missingDocs.map((d) => CMA_DOC_LABELS[d] || d);
        const dossierLabel = contact.dossierShortLabel === "Carte Pro" ? "dossier de renouvellement carte pro" : "dossier";
        return {
          id: contact.id,
          email: contact.email!,
          prenom: contact.prenom,
          nom: contact.nom,
          customBody: `Bonjour ${contact.prenom},\n\nVotre session "${session.nom}" est prévue ${session.timingLabel.toLowerCase()} (${format(parseISO(session.date_debut), "EEEE d MMMM", { locale: fr })}).\n\nPour finaliser votre ${dossierLabel} avant la session, il nous manque :\n\n${missingLabels.map((label) => `- ${label}`).join("\n")}\n\nMerci de nous transmettre ces éléments rapidement.\n\nCordialement,\nT3P Campus`,
        };
      });

    if (recipients.length === 0) {
      toast.error("Aucun apprenant à relancer avec email");
      return;
    }

    openComposer({
      recipients,
      defaultSubject: `Documents à fournir avant la session ${session.nom}`,
      defaultBody: `Bonjour,\n\nVotre session "${session.nom}" approche. Merci de nous transmettre les documents manquants afin de finaliser votre dossier.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "session_relance_cma",
      autoNoteExtra: `Session: ${session.nom}`,
      onSuccess: invalidate,
    });
  }, [invalidate, openComposer]);

  const handleSessionRelancePaiement = useCallback((session: SessionPrepItem) => {
    const recipients = session.unpaidContacts
      .filter((contact) => contact.email)
      .map((contact) => ({
        id: contact.id,
        email: contact.email!,
        prenom: contact.prenom,
        nom: contact.nom,
        customBody: `Bonjour ${contact.prenom},\n\nVotre session "${session.nom}" est prévue ${session.timingLabel.toLowerCase()} (${format(parseISO(session.date_debut), "EEEE d MMMM", { locale: fr })}).\n\nSauf erreur de notre part, votre paiement n'est pas encore finalisé. Merci de régulariser votre situation avant la session.\n\nCordialement,\nT3P Campus`,
      }));

    if (recipients.length === 0) {
      toast.error("Aucun apprenant à relancer avec email");
      return;
    }

    openComposer({
      recipients,
      defaultSubject: `Paiement à finaliser avant la session ${session.nom}`,
      defaultBody: `Bonjour,\n\nVotre session "${session.nom}" approche. Merci de finaliser votre paiement avant le démarrage.\n\nCordialement,\nT3P Campus`,
      autoNoteCategory: "apprenant_relance_paiement",
      autoNoteExtra: `Session: ${session.nom}`,
      onSuccess: invalidate,
    });
  }, [invalidate, openComposer]);

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
    return (data?.todayNotes || []).some(n => n.contact_id === contactId && ((n.titre.includes("CMA") || n.titre.includes("Carte Pro")) && n.titre.includes("[AUTO]")));
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
    resultatsAVerifier = [],
    convocationsAttendues = [],
    boitesMailAConsulter = [],
    sessionPrepItems = [],
    qualiopiSessions = [],
    crmQualityItems: rawCrmQualityItems = [],
    crmQualitySummary = null,
    todayNotes = [], recentNotes = [], journalEntries = [], postponedKeys = [],
  } = data || {};

  // Active filter
  const activeCma = includeInactive ? rawCma : rawCma.filter(c => c._isActive);
  const activeCritiques = includeInactive ? rawCritiques : rawCritiques.filter(c => c._isActive);
  const hiddenCount = (rawCma.length - rawCma.filter(c => c._isActive).length) + (rawCritiques.length - rawCritiques.filter(c => c._isActive).length);
  const isHandledForBloc = (
    contactId: string,
    categoryKeywords: string[],
    blocLabel: string,
  ) => locallyHandledKeys.has(makeHandledKey(contactId, blocLabel)) || isHandledToday(contactId, todayNotes, categoryKeywords);
  const isPostponedForBloc = (contactId: string, blocLabel: string) => (
    locallyPostponedKeys.has(makeHandledKey(contactId, blocLabel)) ||
    postponedKeys.includes(makeHandledKey(contactId, blocLabel))
  );

  // Anti-double-relance
  const availableCma = activeCma.filter(c => !isPostponedForBloc(c.id, "CMA"));
  const availableRdv = rawRdv.filter(p => !isPostponedForBloc(p.id, "RDV"));
  const availableRelances = rawRelances.filter(p => !isPostponedForBloc(p.id, "Relance"));
  const availableCritiques = activeCritiques.filter(c => !isPostponedForBloc(c.id, "Critique"));
  const availableCartePro = rawCartePro.filter((c: any) => !isPostponedForBloc(c.id, "Carte Pro"));
  const availableCrmQualityItems = rawCrmQualityItems.filter((item: any) => !isPostponedForBloc(item.ownerId, "Qualité CRM"));

  const filteredCma = (showHandled ? availableCma : availableCma.filter(c => !isHandledForBloc(c.id, CMA_KEYWORDS, "CMA")));
  const allCmaFiltered = cmaFilter === "all" ? filteredCma : filteredCma.filter(c => c.cmaCategory === cmaFilter);
  const cmaItems = cmaExpanded ? allCmaFiltered : allCmaFiltered.slice(0, CMA_INITIAL_LIMIT);
  const cmaHiddenCount = allCmaFiltered.length - cmaItems.length;

  const cmaCountAll = filteredCma.length;
  const cmaCountDocs = filteredCma.filter(c => c.cmaCategory === "docs_manquants").length;
  const cmaCountRejete = filteredCma.filter(c => c.cmaCategory === "rejete").length;
  const cmaCountEnCours = filteredCma.filter(c => c.cmaCategory === "en_cours").length;

  const rdvToday = (showHandled ? availableRdv : availableRdv.filter(p => !isHandledForBloc(p.id, RDV_KEYWORDS, "RDV"))).slice(0, 10);
  const relances = (showHandled ? availableRelances : availableRelances.filter(p => !isHandledForBloc(p.id, RELANCE_KEYWORDS, "Relance"))).slice(0, 10);
  const critiques = (showHandled ? availableCritiques : availableCritiques.filter(c => !isHandledForBloc(c.id, CRITIQUE_KEYWORDS, "Critique"))).slice(0, 10);
  const cartePro = (showHandled ? availableCartePro : availableCartePro.filter((c: any) => !isHandledForBloc(c.id, CARTE_PRO_KEYWORDS, "Carte Pro"))).slice(0, 10);
  const crmQualityItems = (showHandled
    ? availableCrmQualityItems
    : availableCrmQualityItems.filter((item: any) => !isHandledForBloc(item.ownerId, CRM_QUALITY_KEYWORDS, "Qualité CRM"))
  ).slice(0, 12);

  const handledCmaCount = availableCma.filter(c => isHandledForBloc(c.id, CMA_KEYWORDS, "CMA")).length;
  const handledRdvCount = availableRdv.filter(p => isHandledForBloc(p.id, RDV_KEYWORDS, "RDV")).length;
  const handledRelanceCount = availableRelances.filter(p => isHandledForBloc(p.id, RELANCE_KEYWORDS, "Relance")).length;
  const handledCritiqueCount = availableCritiques.filter(c => isHandledForBloc(c.id, CRITIQUE_KEYWORDS, "Critique")).length;
  const handledCrmQualityCount = availableCrmQualityItems.filter((item: any) => isHandledForBloc(item.ownerId, CRM_QUALITY_KEYWORDS, "Qualité CRM")).length;
  const totalHandled = handledCmaCount + handledRdvCount + handledRelanceCount + handledCritiqueCount + handledCrmQualityCount;

  const reprogramItems = rawReprogram;
  const parcoursCount = resultatsAVerifier.length + convocationsAttendues.length + boitesMailAConsulter.length;
  const totalActions = allCmaFiltered.length + rdvToday.length + relances.length + critiques.length + cartePro.length + reprogramItems.length + parcoursCount + sessionPrepItems.length + qualiopiSessions.length + crmQualityItems.length;
  const totalRaw = allCmaFiltered.length + availableRdv.length + availableRelances.length + availableCritiques.length + availableCartePro.length + reprogramItems.length + parcoursCount + sessionPrepItems.length + qualiopiSessions.length + availableCrmQualityItems.length;
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
          Tapez <kbd className="px-1.5 py-0.5 text-[11px] font-mono rounded bg-background/60 border">⌘ K</kbd> ou cliquez sur la barre de recherche en haut pour atteindre n'importe quel apprenant, session ou facture en 2 secondes.
        </HintBubble>
      </div>

      {/* Progress bar + Toggles + Focus */}
      <div className="px-8 space-y-3">
        {totalRaw > 0 && (
          <div className="flex items-center gap-3">
            <Progress value={progressPercent} className="h-2 flex-1" />
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              {totalHandled}/{totalRaw} traité{totalHandled > 1 ? "s" : ""}
            </span>
          </div>
        )}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <FocusModeBar
            focus={focusBloc}
            onChange={setFocusBloc}
            counts={{
              session_prep: sessionPrepItems.length,
              qualite_crm: crmQualityItems.length,
              cma: allCmaFiltered.length,
              rdv: rdvToday.length,
              relances: relances.length,
              critiques: critiques.length,
              parcours: parcoursCount,
              reprogrammer: reprogramItems.length,
              carte_pro: cartePro.length,
              qualiopi: qualiopiSessions.length,
            }}
          />
          <div className="flex items-center gap-4">
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
      </div>


      <div className="px-8 pb-8 space-y-5">
        {(!focusBloc || focusBloc === "session_prep") && (
          <BlocSessionPreparation
            sessions={sessionPrepItems}
            onRelanceDocs={handleSessionRelanceDocs}
            onRelancePaiement={handleSessionRelancePaiement}
            onOpenSession={(session) => {
              if (onNavigateWithParams) {
                onNavigateWithParams("sessions", { id: session.id });
              } else {
                onNavigate?.("sessions");
              }
            }}
          />
        )}

        {(!focusBloc || focusBloc === "qualite_crm") && (
          <BlocQualiteCrm
            items={crmQualityItems}
            summary={crmQualitySummary}
            todayNotes={todayNotes}
            recentNotes={recentNotes}
            openContact={openContact}
            openProspect={openProspect}
            markDone={markDone}
          />
        )}

        <div className={cn(
          "grid gap-5",
          focusBloc ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
        )}>
          {(!focusBloc || focusBloc === "cma") && (
            <BlocCma
              allCmaFiltered={allCmaFiltered} cmaItems={cmaItems} cmaHiddenCount={cmaHiddenCount}
              cmaExpanded={cmaExpanded} setCmaExpanded={setCmaExpanded}
              cmaFilter={cmaFilter} setCmaFilter={setCmaFilter}
              cmaCountAll={cmaCountAll} cmaCountDocs={cmaCountDocs} cmaCountRejete={cmaCountRejete} cmaCountEnCours={cmaCountEnCours}
              bulkCmaSelected={bulkCmaSelected} toggleBulkCma={toggleBulkCma} toggleBulkCmaVisible={toggleBulkCmaVisible}
              bulkProcessing={bulkProcessing} handleBulkCmaRelance={handleBulkCmaRelance} handleBulkCmaDone={handleBulkCmaDone}
              handleCmaRelanceDocs={handleCmaRelanceDocs} handleCmaWhatsApp={handleCmaWhatsApp}
              isCmaRelancedToday={isCmaRelancedToday}
              postponeAction={postponeAction}
              todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
            />
          )}

          {(!focusBloc || focusBloc === "rdv") && (
            <BlocRdv
              rdvToday={rdvToday}
              handleRdvConfirm={handleRdvConfirm} handleRdvAppel={handleRdvAppel} handleRdvWhatsApp={handleRdvWhatsApp}
              todayNotes={todayNotes} recentNotes={recentNotes} openProspect={openProspect} markDone={markDone}
              onNavigate={onNavigate}
            />
          )}

          {(!focusBloc || focusBloc === "relances") && (
            <BlocRelances
              relances={relances}
              bulkRelanceSelected={bulkRelanceSelected} toggleBulkRelance={toggleBulkRelance} toggleBulkRelanceVisible={toggleBulkRelanceVisible}
              bulkProcessing={bulkProcessing} handleBulkRelance={handleBulkRelance} handleBulkRelanceDone={handleBulkRelanceDone}
              handleRelanceEmail={handleRelanceEmail} handleRelanceWhatsApp={handleRelanceWhatsApp}
              postponeAction={postponeAction}
              todayNotes={todayNotes} recentNotes={recentNotes} openProspect={openProspect} markDone={markDone}
            />
          )}

          {(!focusBloc || focusBloc === "critiques") && (
            <BlocCritiques
              critiques={critiques}
              handleCritiqueDemanderDocs={handleCritiqueDemanderDocs} handleCritiqueRelancePaiement={handleCritiqueRelancePaiement}
              todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
            />
          )}
        </div>

        {(!focusBloc || focusBloc === "parcours") && parcoursCount > 0 && (
          <div className={cn(
            "grid gap-5",
            focusBloc ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
          )}>
            <BlocResultatsAVerifier items={resultatsAVerifier} openContact={openContact} />
            <BlocConvocationsCma items={convocationsAttendues} openContact={openContact} />
            <BlocBoitesMail
              items={boitesMailAConsulter}
              openContact={openContact}
              onConsulte={handleConsulteBoite}
              pendingIds={consulteBoitePending}
            />
          </div>
        )}

        {(!focusBloc || focusBloc === "reprogrammer") && (
          <BlocReprogrammer
            reprogramItems={reprogramItems}
            todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
          />
        )}

        {(!focusBloc || focusBloc === "carte_pro") && (
          <BlocCartePro
            cartePro={cartePro}
            handleCarteProEmail={handleCarteProEmail} handleCarteProMarkDone={handleCarteProMarkDone}
            todayNotes={todayNotes} recentNotes={recentNotes} openContact={openContact} markDone={markDone}
          />
        )}

        {(!focusBloc || focusBloc === "qualiopi") && (
          <BlocQualiopi qualiopiSessions={qualiopiSessions} onNavigate={onNavigate} />
        )}

        {!focusBloc && (
          <ActionJournal entries={journalEntries} onOpenContact={openContact} />
        )}
      </div>


      {/* Detail sheets */}
      <ApprenantDetailSheet
        contactId={selectedContactId}
        open={contactDetailOpen}
        onOpenChange={setContactDetailOpen}
        syncUrl={false}
        showFullPageAction={false}
      />
      <ProspectDetailSheet prospect={selectedProspect} open={prospectDetailOpen} onOpenChange={setProspectDetailOpen} />
      <EmailComposerModal {...composerProps} />
    </div>
  );
}
