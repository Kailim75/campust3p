import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, isPast, parseISO, isToday, isBefore, startOfDay } from "date-fns";
import { useDismissedAlerts } from "./useDismissedAlerts";
export interface Alert {
  id: string;
  type: "carte_pro" | "permis" | "session" | "document" | "payment" | "exam_t3p" | "exam_pratique" | "rappel";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  daysUntilExpiry: number;
  contactId?: string;
  contactName?: string;
  expiryDate?: string;
  sessionId?: string;
  factureId?: string;
  documentId?: string;
  examenId?: string;
  montant?: number;
  actionType?: "view_contact" | "view_session" | "view_facture" | "view_exam" | "send_reminder" | "view_rappel";
}

// Alerts for expiring professional cards and permits
export function useExpirationAlerts() {
  return useQuery({
    queryKey: ["alerts", "expirations"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();
      const alertThresholdDays = 60; // Alert 60 days before expiry

      // Fetch contacts with expiration dates
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, nom, prenom, date_expiration_carte, date_delivrance_permis, numero_carte_professionnelle, numero_permis")
        .eq("archived", false);

      if (error) throw error;

      contacts?.forEach((contact) => {
        const fullName = `${contact.prenom} ${contact.nom}`;

        // Check professional card expiry
        if (contact.date_expiration_carte) {
          const expiryDate = parseISO(contact.date_expiration_carte);
          const daysUntil = differenceInDays(expiryDate, today);
          
          if (daysUntil <= alertThresholdDays) {
            const isExpired = isPast(expiryDate);
            alerts.push({
              id: `carte_${contact.id}`,
              type: "carte_pro",
              priority: isExpired ? "high" : daysUntil <= 14 ? "high" : daysUntil <= 30 ? "medium" : "low",
              title: isExpired ? "Carte professionnelle expirée" : "Carte professionnelle bientôt expirée",
              description: isExpired 
                ? `La carte pro de ${fullName} a expiré`
                : `La carte pro de ${fullName} expire dans ${daysUntil} jour${daysUntil > 1 ? 's' : ''}`,
              daysUntilExpiry: daysUntil,
              contactId: contact.id,
              contactName: fullName,
              expiryDate: contact.date_expiration_carte,
              actionType: "view_contact",
            });
          }
        }
      });

      // Sort by priority (high first) then by days until expiry
      alerts.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.daysUntilExpiry - b.daysUntilExpiry;
      });

      return alerts;
    },
  });
}

// Alerts for T3P exams (upcoming in 7 days, expired, max attempts)
export function useExamT3PAlerts() {
  return useQuery({
    queryKey: ["alerts", "exams_t3p"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();

      // Fetch all T3P exams with contact info
      const { data: examens, error } = await supabase
        .from("examens_t3p")
        .select(`
          id,
          contact_id,
          type_formation,
          date_examen,
          statut,
          resultat,
          numero_tentative,
          date_expiration,
          contacts (id, nom, prenom)
        `)
        .order("date_examen", { ascending: true });

      if (error) throw error;

      examens?.forEach((examen: any) => {
        const contact = examen.contacts;
        if (!contact) return;
        
        const fullName = `${contact.prenom} ${contact.nom}`;
        const examDate = parseISO(examen.date_examen);
        const daysUntilExam = differenceInDays(examDate, today);

        // Alert for upcoming exam (within 7 days)
        if (examen.statut === "planifie" && daysUntilExam >= 0 && daysUntilExam <= 7) {
          alerts.push({
            id: `exam_t3p_upcoming_${examen.id}`,
            type: "exam_t3p",
            priority: daysUntilExam <= 2 ? "high" : daysUntilExam <= 4 ? "medium" : "low",
            title: "Examen T3P à venir",
            description: daysUntilExam === 0 
              ? `${fullName} - ${examen.type_formation.toUpperCase()} aujourd'hui`
              : `${fullName} - ${examen.type_formation.toUpperCase()} dans ${daysUntilExam}j`,
            daysUntilExpiry: daysUntilExam,
            contactId: contact.id,
            contactName: fullName,
            examenId: examen.id,
            expiryDate: examen.date_examen,
            actionType: "view_exam",
          });
        }

        // Alert for expired T3P (attestation expired)
        if (examen.resultat === "admis" && examen.date_expiration) {
          const expirationDate = parseISO(examen.date_expiration);
          const daysUntilExpiry = differenceInDays(expirationDate, today);
          
          if (daysUntilExpiry <= 90) { // Alert 90 days before expiry
            const isExpired = isPast(expirationDate);
            alerts.push({
              id: `exam_t3p_expiry_${examen.id}`,
              type: "exam_t3p",
              priority: isExpired ? "high" : daysUntilExpiry <= 30 ? "high" : daysUntilExpiry <= 60 ? "medium" : "low",
              title: isExpired ? "Attestation T3P expirée" : "Attestation T3P bientôt expirée",
              description: isExpired 
                ? `${fullName} - Attestation ${examen.type_formation.toUpperCase()} expirée`
                : `${fullName} - ${examen.type_formation.toUpperCase()} expire dans ${daysUntilExpiry}j`,
              daysUntilExpiry: daysUntilExpiry,
              contactId: contact.id,
              contactName: fullName,
              examenId: examen.id,
              expiryDate: examen.date_expiration,
              actionType: "view_contact",
            });
          }
        }

        // Alert for max attempts reached (3 attempts)
        if (examen.numero_tentative >= 3 && examen.resultat !== "admis") {
          alerts.push({
            id: `exam_t3p_max_${examen.id}`,
            type: "exam_t3p",
            priority: "high",
            title: "Tentatives T3P épuisées",
            description: `${fullName} - ${examen.type_formation.toUpperCase()} : 3 tentatives utilisées`,
            daysUntilExpiry: 0,
            contactId: contact.id,
            contactName: fullName,
            examenId: examen.id,
            actionType: "view_contact",
          });
        }
      });

      return alerts;
    },
  });
}

// Alerts for practical exams (upcoming in 7 days)
export function useExamPratiqueAlerts() {
  return useQuery({
    queryKey: ["alerts", "exams_pratique"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();

      // Fetch all practical exams with contact info
      const { data: examens, error } = await supabase
        .from("examens_pratique")
        .select(`
          id,
          contact_id,
          type_examen,
          date_examen,
          statut,
          resultat,
          numero_tentative,
          contacts (id, nom, prenom)
        `)
        .order("date_examen", { ascending: true });

      if (error) throw error;

      examens?.forEach((examen: any) => {
        const contact = examen.contacts;
        if (!contact) return;
        
        const fullName = `${contact.prenom} ${contact.nom}`;
        const examDate = parseISO(examen.date_examen);
        const daysUntilExam = differenceInDays(examDate, today);

        // Alert for upcoming exam (within 7 days)
        if (examen.statut === "planifie" && daysUntilExam >= 0 && daysUntilExam <= 7) {
          alerts.push({
            id: `exam_pratique_upcoming_${examen.id}`,
            type: "exam_pratique",
            priority: daysUntilExam <= 2 ? "high" : daysUntilExam <= 4 ? "medium" : "low",
            title: "Examen pratique à venir",
            description: daysUntilExam === 0 
              ? `${fullName} - ${examen.type_examen} aujourd'hui`
              : `${fullName} - ${examen.type_examen} dans ${daysUntilExam}j`,
            daysUntilExpiry: daysUntilExam,
            contactId: contact.id,
            contactName: fullName,
            examenId: examen.id,
            expiryDate: examen.date_examen,
            actionType: "view_exam",
          });
        }
      });

      return alerts;
    },
  });
}

// Alerts for sessions that are almost full or starting soon
export function useSessionAlerts() {
  return useQuery({
    queryKey: ["alerts", "sessions"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();

      // Fetch upcoming sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("*")
        .in("statut", ["a_venir"])
        .eq("archived", false);

      if (sessionsError) throw sessionsError;

      // Fetch inscription counts
      const { data: inscriptions, error: inscriptionsError } = await supabase
        .from("session_inscriptions")
        .select("session_id");

      if (inscriptionsError) throw inscriptionsError;

      // Count inscriptions per session
      const counts: Record<string, number> = {};
      inscriptions?.forEach((i) => {
        counts[i.session_id] = (counts[i.session_id] || 0) + 1;
      });

      sessions?.forEach((session) => {
        const enrolled = counts[session.id] || 0;
        const fillRate = session.places_totales > 0 ? enrolled / session.places_totales : 0;
        const daysUntilStart = differenceInDays(parseISO(session.date_debut), today);

        // Alert for sessions almost full (>80%)
        if (fillRate >= 0.8 && fillRate < 1) {
          alerts.push({
            id: `session_full_${session.id}`,
            type: "session",
            priority: fillRate >= 0.9 ? "high" : "medium",
            title: "Session presque complète",
            description: `${session.nom} - ${session.places_totales - enrolled} place${session.places_totales - enrolled > 1 ? 's' : ''} restante${session.places_totales - enrolled > 1 ? 's' : ''}`,
            daysUntilExpiry: daysUntilStart,
            sessionId: session.id,
            actionType: "view_session",
          });
        }

        // Alert for sessions starting soon (within 7 days)
        if (daysUntilStart <= 7 && daysUntilStart >= 0) {
          alerts.push({
            id: `session_soon_${session.id}`,
            type: "session",
            priority: daysUntilStart <= 2 ? "high" : daysUntilStart <= 5 ? "medium" : "low",
            title: "Session démarre bientôt",
            description: daysUntilStart === 0 
              ? `${session.nom} commence aujourd'hui` 
              : `${session.nom} démarre dans ${daysUntilStart} jour${daysUntilStart > 1 ? 's' : ''}`,
            daysUntilExpiry: daysUntilStart,
            sessionId: session.id,
            actionType: "view_session",
          });
        }
      });

      return alerts;
    },
  });
}

// Alerts for overdue payments
export function usePaymentAlerts() {
  return useQuery({
    queryKey: ["alerts", "payments"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();

      // Fetch invoices with due dates that are past or soon
      const { data: factures, error } = await supabase
        .from("factures")
        .select(`
          id,
          numero_facture,
          montant_total,
          date_echeance,
          statut,
          contact:contacts (id, nom, prenom, email)
        `)
        .in("statut", ["emise", "partiel", "impayee"])
        .not("date_echeance", "is", null);

      if (error) throw error;

      // Fetch payments to calculate remaining amounts
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("facture_id, montant");

      if (paiementsError) throw paiementsError;

      // Calculate total paid per invoice
      const paidAmounts: Record<string, number> = {};
      paiements?.forEach((p) => {
        paidAmounts[p.facture_id] = (paidAmounts[p.facture_id] || 0) + Number(p.montant);
      });

      factures?.forEach((facture: any) => {
        if (!facture.date_echeance) return;
        
        const dueDate = parseISO(facture.date_echeance);
        const daysUntilDue = differenceInDays(dueDate, today);
        const totalPaid = paidAmounts[facture.id] || 0;
        const remaining = Number(facture.montant_total) - totalPaid;

        if (remaining <= 0) return; // Fully paid

        const contactName = facture.contact 
          ? `${facture.contact.prenom} ${facture.contact.nom}` 
          : "Contact inconnu";

        // Alert for overdue invoices
        if (daysUntilDue < 0) {
          const daysOverdue = Math.abs(daysUntilDue);
          alerts.push({
            id: `payment_overdue_${facture.id}`,
            type: "payment",
            priority: daysOverdue > 30 ? "high" : daysOverdue > 14 ? "high" : "medium",
            title: "Paiement en retard",
            description: `${contactName} - ${remaining.toLocaleString("fr-FR")}€ impayés (${daysOverdue}j de retard)`,
            daysUntilExpiry: daysUntilDue,
            contactId: facture.contact?.id,
            contactName,
            factureId: facture.id,
            montant: remaining,
            actionType: "view_facture",
          });
        }
        // Alert for due soon (within 7 days)
        else if (daysUntilDue <= 7) {
          alerts.push({
            id: `payment_soon_${facture.id}`,
            type: "payment",
            priority: daysUntilDue <= 2 ? "medium" : "low",
            title: "Échéance proche",
            description: daysUntilDue === 0 
              ? `${contactName} - ${remaining.toLocaleString("fr-FR")}€ à échéance aujourd'hui`
              : `${contactName} - ${remaining.toLocaleString("fr-FR")}€ dans ${daysUntilDue}j`,
            daysUntilExpiry: daysUntilDue,
            contactId: facture.contact?.id,
            contactName,
            factureId: facture.id,
            montant: remaining,
            actionType: "send_reminder",
          });
        }
      });

      return alerts;
    },
  });
}

// Alerts for expiring documents
export function useDocumentAlerts() {
  return useQuery({
    queryKey: ["alerts", "documents"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = new Date();
      const alertThresholdDays = 60;

      // Fetch documents with expiration dates
      const { data: documents, error } = await supabase
        .from("contact_documents")
        .select(`
          id,
          nom,
          type_document,
          date_expiration,
          contact:contacts (id, nom, prenom)
        `)
        .not("date_expiration", "is", null);

      if (error) throw error;

      documents?.forEach((doc: any) => {
        if (!doc.date_expiration) return;

        const expiryDate = parseISO(doc.date_expiration);
        const daysUntil = differenceInDays(expiryDate, today);

        if (daysUntil <= alertThresholdDays) {
          const isExpired = isPast(expiryDate);
          const contactName = doc.contact 
            ? `${doc.contact.prenom} ${doc.contact.nom}` 
            : "Contact inconnu";

          alerts.push({
            id: `document_${doc.id}`,
            type: "document",
            priority: isExpired ? "high" : daysUntil <= 14 ? "high" : daysUntil <= 30 ? "medium" : "low",
            title: isExpired ? "Document expiré" : "Document bientôt expiré",
            description: isExpired 
              ? `${doc.type_document} de ${contactName} a expiré`
              : `${doc.type_document} de ${contactName} expire dans ${daysUntil}j`,
            daysUntilExpiry: daysUntil,
            contactId: doc.contact?.id,
            contactName,
            documentId: doc.id,
            expiryDate: doc.date_expiration,
            actionType: "view_contact",
          });
        }
      });

      return alerts;
    },
  });
}

// Alerts for rappels (contact historique reminders + prospect follow-ups)
export function useRappelAlerts() {
  return useQuery({
    queryKey: ["alerts", "rappels"],
    queryFn: async () => {
      const alerts: Alert[] = [];
      const today = startOfDay(new Date());

      // 1) Contact historique rappels
      const { data: rappels, error: rappelsError } = await supabase
        .from("contact_historique")
        .select(`
          id,
          contact_id,
          titre,
          rappel_description,
          date_rappel,
          contacts (id, nom, prenom)
        `)
        .eq("alerte_active", true)
        .not("date_rappel", "is", null);

      if (rappelsError) throw rappelsError;

      rappels?.forEach((r: any) => {
        const contact = r.contacts;
        if (!contact || !r.date_rappel) return;

        const fullName = `${contact.prenom} ${contact.nom}`;
        const rappelDate = parseISO(r.date_rappel);
        const daysUntil = differenceInDays(startOfDay(rappelDate), today);
        const overdue = isBefore(rappelDate, today) && !isToday(rappelDate);

        // Skip rappels older than 30 days (stale)
        if (daysUntil < -30) return;

        // Show if overdue or within 7 days
        if (daysUntil <= 7) {
          alerts.push({
            id: `rappel_contact_${r.id}`,
            type: "rappel",
            priority: overdue ? (daysUntil < -7 ? "medium" : "high") : daysUntil <= 0 ? "high" : daysUntil <= 2 ? "medium" : "low",
            title: overdue ? "Rappel en retard" : isToday(rappelDate) ? "Rappel aujourd'hui" : "Rappel à venir",
            description: `${fullName} — ${r.rappel_description || r.titre}`,
            daysUntilExpiry: daysUntil,
            contactId: contact.id,
            contactName: fullName,
            expiryDate: r.date_rappel,
            actionType: "view_contact",
          });
        }
      });

      // 2) Prospect follow-up dates
      const { data: prospects, error: prospectsError } = await supabase
        .from("prospects")
        .select("id, nom, prenom, date_prochaine_relance, statut")
        .not("date_prochaine_relance", "is", null)
        .neq("statut", "converti")
        .neq("statut", "perdu");

      if (prospectsError) throw prospectsError;

      prospects?.forEach((p: any) => {
        if (!p.date_prochaine_relance) return;

        const fullName = `${p.prenom || ""} ${p.nom}`.trim();
        const relanceDate = parseISO(p.date_prochaine_relance);
        const daysUntil = differenceInDays(startOfDay(relanceDate), today);
        const overdue = isBefore(relanceDate, today) && !isToday(relanceDate);

        // Skip prospect relances older than 30 days
        if (daysUntil < -30) return;

        if (daysUntil <= 7) {
          alerts.push({
            id: `rappel_prospect_${p.id}`,
            type: "rappel",
            priority: overdue ? (daysUntil < -7 ? "medium" : "high") : daysUntil <= 0 ? "high" : daysUntil <= 2 ? "medium" : "low",
            title: overdue ? "Relance prospect en retard" : isToday(relanceDate) ? "Relance prospect aujourd'hui" : "Relance prospect à venir",
            description: `${fullName} — Relance prévue`,
            daysUntilExpiry: daysUntil,
            expiryDate: p.date_prochaine_relance,
            actionType: "view_contact",
          });
        }
      });

      return alerts;
    },
  });
}

// Combined alerts - filters out dismissed alerts
export function useAllAlerts(options?: { includeDismissed?: boolean }) {
  const { data: expirationAlerts = [], isLoading: loadingExpirations } = useExpirationAlerts();
  const { data: sessionAlerts = [], isLoading: loadingSessions } = useSessionAlerts();
  const { data: paymentAlerts = [], isLoading: loadingPayments } = usePaymentAlerts();
  const { data: documentAlerts = [], isLoading: loadingDocuments } = useDocumentAlerts();
  const { data: examT3PAlerts = [], isLoading: loadingExamT3P } = useExamT3PAlerts();
  const { data: examPratiqueAlerts = [], isLoading: loadingExamPratique } = useExamPratiqueAlerts();
  const { data: rappelAlerts = [], isLoading: loadingRappels } = useRappelAlerts();
  const { data: dismissedAlertIds = [], isLoading: loadingDismissed } = useDismissedAlerts();

  const allRawAlerts = [
    ...expirationAlerts, 
    ...sessionAlerts, 
    ...paymentAlerts, 
    ...documentAlerts,
    ...examT3PAlerts,
    ...examPratiqueAlerts,
    ...rappelAlerts,
  ];

  // Filter out dismissed alerts unless explicitly requested
  const allAlerts = options?.includeDismissed 
    ? allRawAlerts 
    : allRawAlerts.filter(alert => !dismissedAlertIds.includes(alert.id));

  // Sort by priority then by days until expiry
  const sortedAlerts = allAlerts.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });

  // Count based on filtered alerts
  const filteredPayments = paymentAlerts.filter(a => !dismissedAlertIds.includes(a.id));
  const filteredDocuments = [...documentAlerts, ...expirationAlerts].filter(a => !dismissedAlertIds.includes(a.id));
  const filteredSessions = sessionAlerts.filter(a => !dismissedAlertIds.includes(a.id));
  const filteredExams = [...examT3PAlerts, ...examPratiqueAlerts].filter(a => !dismissedAlertIds.includes(a.id));
  const filteredRappels = rappelAlerts.filter(a => !dismissedAlertIds.includes(a.id));

  return {
    data: sortedAlerts,
    isLoading: loadingExpirations || loadingSessions || loadingPayments || loadingDocuments || loadingExamT3P || loadingExamPratique || loadingRappels || loadingDismissed,
    counts: {
      total: sortedAlerts.length,
      high: sortedAlerts.filter(a => a.priority === "high").length,
      payments: filteredPayments.length,
      documents: filteredDocuments.length,
      sessions: filteredSessions.length,
      exams: filteredExams.length,
      rappels: filteredRappels.length,
    },
    dismissedCount: dismissedAlertIds.length,
  };
}
