import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, differenceInDays, isPast, parseISO } from "date-fns";

export interface Alert {
  id: string;
  type: "carte_pro" | "permis" | "session" | "document" | "payment";
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
  montant?: number;
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
            });
          }
        }

        // Note: For permits, we don't have an expiry date field, but we could add logic based on issue date
        // French permits are generally valid for 15 years, but for now we skip this
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
        .in("statut", ["a_venir", "en_cours"])
        .gte("date_debut", today.toISOString().split("T")[0]);

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
          contact:contacts (id, nom, prenom)
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
          });
        }
      });

      return alerts;
    },
  });
}

// Combined alerts
export function useAllAlerts() {
  const { data: expirationAlerts = [], isLoading: loadingExpirations } = useExpirationAlerts();
  const { data: sessionAlerts = [], isLoading: loadingSessions } = useSessionAlerts();
  const { data: paymentAlerts = [], isLoading: loadingPayments } = usePaymentAlerts();
  const { data: documentAlerts = [], isLoading: loadingDocuments } = useDocumentAlerts();

  const allAlerts = [...expirationAlerts, ...sessionAlerts, ...paymentAlerts, ...documentAlerts].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });

  return {
    data: allAlerts,
    isLoading: loadingExpirations || loadingSessions || loadingPayments || loadingDocuments,
    counts: {
      total: allAlerts.length,
      high: allAlerts.filter(a => a.priority === "high").length,
      payments: paymentAlerts.length,
      documents: documentAlerts.length + expirationAlerts.length,
      sessions: sessionAlerts.length,
    }
  };
}
