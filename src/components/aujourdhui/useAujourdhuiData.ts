import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, differenceInCalendarDays, isToday, isPast, parseISO } from "date-fns";
import { fetchTodayAutoNotes, fetchRecentAutoNotes, isProspectRdv } from "@/lib/aujourdhui-actions";
import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";
import { computeContactUrgency } from "@/lib/urgency-utils";
import {
  computeSessionReadinessScore,
  getSessionReadinessSeverity,
  isSettledPaymentStatus,
} from "@/lib/session-readiness";
import { computeCrmQuality } from "@/lib/crm-quality";
import type { Prospect } from "@/hooks/useProspects";
import type { CmaFilter, SessionPrepContact, SessionPrepItem } from "./aujourdhui-types";

export function useAujourdhuiData() {
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
        supabase.from("contacts").select("id, nom, prenom, formation, statut, statut_apprenant, statut_cma, email, telephone, updated_at").eq("archived", false).is("deleted_at", null),
        supabase.from("contact_documents").select("contact_id, type_document").is("deleted_at", null),
        supabase.from("factures").select("id, contact_id, session_inscription_id, montant_total, statut, date_echeance").is("deleted_at", null),
        supabase.from("paiements").select("facture_id, montant"),
        supabase.from("prospects").select("*").eq("is_active", true).not("statut", "in", '("converti","perdu")'),
        supabase
          .from("sessions")
          .select("id, nom, date_debut, date_fin, statut, formateur, formateur_id, objectifs, prerequis, lieu, adresse_rue, adresse_code_postal, adresse_ville, duree_heures, heure_debut, heure_fin, heure_debut_matin, heure_fin_matin, places_totales")
          .eq("archived", false)
          .neq("statut", "annulee")
          .is("deleted_at", null),
        supabase.from("session_inscriptions").select("id, contact_id, session_id, statut, statut_paiement, track").is("deleted_at", null),
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
      const sessions = sessionsRes.data || [];

      // Contact name map for journal
      const contactNameMap = new Map<string, string>();
      const contactsById = new Map<string, any>();
      contacts.forEach((c: any) => contactNameMap.set(c.id, `${c.prenom} ${c.nom}`));
      contacts.forEach((c: any) => contactsById.set(c.id, c));
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

      const facturesByInscriptionId = new Map<string, any[]>();
      factures.forEach((f: any) => {
        if (!f.session_inscription_id) return;
        if (!facturesByInscriptionId.has(f.session_inscription_id)) {
          facturesByInscriptionId.set(f.session_inscription_id, []);
        }
        facturesByInscriptionId.get(f.session_inscription_id)!.push(f);
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

      // ─── Bloc D: Critiques ───
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

      // Journal entries
      const journalEntries = todayNotes.map(n => ({
        ...n,
        contactName: contactNameMap.get(n.contact_id) || "Contact",
      }));

      // ─── Bloc E: Carte Pro ───
      const allPratiqueResults = (examensPratiqueRes.data || []) as Array<{ contact_id: string; resultat: string }>;
      const allTheorieResults = (examensTheorieRes.data || []) as Array<{ contact_id: string; resultat: string }>;
      const pratiqueAdmisIds = new Set(
        allPratiqueResults.filter((e) => e.resultat === "admis").map((e) => e.contact_id)
      );
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

      // ─── Bloc G: À reprogrammer ───
      const theorieEchoueIds = new Set(
        allTheorieResults.filter((e) => e.resultat === "ajourne").map((e) => e.contact_id)
      );
      const pratiqueEchoueIds = new Set(
        allPratiqueResults.filter((e) => e.resultat === "ajourne").map((e) => e.contact_id)
      );
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

      // ─── Bloc F: Qualiopi ───
      // ─── Bloc H: Préparation sessions J-1 / Jour J ───
      const today = new Date();
      const sessionPrepItems: SessionPrepItem[] = sessions
        .filter((s: any) => s.statut !== "annulee" && s.statut !== "terminee")
        .map((s: any) => {
          const startDiff = differenceInCalendarDays(parseISO(s.date_debut), today);
          const endDiff = differenceInCalendarDays(parseISO(s.date_fin || s.date_debut), today);
          const isCurrentSession = startDiff <= 0 && endDiff >= 0;
          const daysUntil = isCurrentSession ? 0 : startDiff;
          return { session: s, daysUntil };
        })
        .filter(({ daysUntil }) => daysUntil >= 0 && daysUntil <= 1)
        .map(({ session: s, daysUntil }) => {
          const addressLabel =
            s.lieu ||
            [s.adresse_rue, s.adresse_code_postal, s.adresse_ville].filter(Boolean).join(", ") ||
            null;
          const setupIssues: string[] = [];
          if (!s.formateur_id && !s.formateur) setupIssues.push("Formateur non assigné");
          if (!addressLabel) setupIssues.push("Lieu manquant");
          if (!s.heure_debut && !s.heure_debut_matin) setupIssues.push("Horaire manquant");
          if (!s.places_totales || s.places_totales <= 0) setupIssues.push("Places non renseignées");

          const sessionInscriptions = inscriptions.filter((i: any) => i.session_id === s.id);
          if (sessionInscriptions.length === 0) setupIssues.push("Aucun inscrit");

          const contactsForSession: SessionPrepContact[] = sessionInscriptions
            .map((inscription: any) => {
              const contact = contactsById.get(inscription.contact_id);
              if (!contact) return null;
              const contactDocs = docsMap.get(contact.id) || new Set();
              const shouldCheckCmaDocs = inscription.track === "initial";
              const missingDocs = shouldCheckCmaDocs
                ? CMA_REQUIRED_DOCS.filter((d) => !contactDocs.has(d))
                : [];
              const linkedFactures = facturesByInscriptionId.get(inscription.id) || [];
              const factureSettled =
                linkedFactures.length > 0 &&
                linkedFactures.every((f: any) => f.statut === "payee" || f.statut === "annulee");
              const statutPaiement = factureSettled ? "paye" : inscription.statut_paiement;

              return {
                id: contact.id,
                prenom: contact.prenom,
                nom: contact.nom,
                email: contact.email,
                telephone: contact.telephone,
                missingDocs,
                statutPaiement,
              };
            })
            .filter(Boolean) as SessionPrepContact[];

          const unavailableContactCount = sessionInscriptions.length - contactsForSession.length;
          if (unavailableContactCount > 0) {
            setupIssues.push(`${unavailableContactCount} fiche contact non disponible`);
          }

          const missingDocsContacts = contactsForSession.filter((c) => c.missingDocs.length > 0);
          const unpaidContacts = contactsForSession.filter((c) => !isSettledPaymentStatus(c.statutPaiement));
          const missingContactContacts = contactsForSession.filter((c) => !c.email || !c.telephone);
          const readinessScore = computeSessionReadinessScore({
            inscriptionCount: sessionInscriptions.length,
            missingDocsCount: missingDocsContacts.length,
            unpaidCount: unpaidContacts.length,
            missingContactCount: missingContactContacts.length,
            setupIssuesCount: setupIssues.length,
          });
          const issueCount =
            setupIssues.length +
            missingDocsContacts.length +
            unpaidContacts.length +
            missingContactContacts.length;

          return {
            id: s.id,
            nom: s.nom,
            date_debut: s.date_debut,
            date_fin: s.date_fin,
            heure_debut: s.heure_debut || s.heure_debut_matin,
            heure_fin: s.heure_fin || s.heure_fin_matin,
            lieu: s.lieu,
            addressLabel,
            daysUntil,
            timingLabel: daysUntil === 0 ? "Aujourd'hui" : "Demain",
            inscriptionCount: sessionInscriptions.length,
            placesTotales: s.places_totales || 0,
            readinessScore,
            severity: getSessionReadinessSeverity({ daysUntil, readinessScore, issueCount }),
            setupIssues,
            missingDocsContacts,
            unpaidContacts,
            missingContactContacts,
          };
        })
        .sort((a, b) => {
          if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
          if (a.severity !== b.severity) {
            const order = { critical: 0, warning: 1, ready: 2 };
            return order[a.severity] - order[b.severity];
          }
          return a.readinessScore - b.readinessScore;
        })
        .slice(0, 5);

      // ─── Bloc F: Qualiopi ───
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

      // ─── Bloc I: Qualité CRM / anti-oublis ───
      const crmQuality = computeCrmQuality({ contacts, prospects });
      const crmQualityItems = crmQuality.items;
      const crmQualitySummary = crmQuality.summary;

      // Fetch recent notes
      const allContactIds = [
        ...cmaItems.map(c => c.id),
        ...rdvToday.map(p => p.id),
        ...relances.map(p => p.id),
        ...critiques.map(c => c.id),
        ...carteProItems.map((c: any) => c.id),
        ...reprogramItems.map((r: any) => r.contactId),
        ...sessionPrepItems.flatMap((s) => [
          ...s.missingDocsContacts.map((c) => c.id),
          ...s.unpaidContacts.map((c) => c.id),
        ]),
        ...crmQualityItems.map((item) => item.ownerId),
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
        sessionPrepItems,
        qualiopiSessions,
        crmQualityItems,
        crmQualitySummary,
        todayNotes,
        recentNotes,
        journalEntries,
        totalActions: cmaItems.length + rdvToday.length + relances.length + critiques.length + carteProItems.length + reprogramItems.length + sessionPrepItems.length + qualiopiSessions.length + crmQualityItems.length,
      };
    },
    staleTime: 30_000,
  });
}
