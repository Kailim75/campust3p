import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { addDays, differenceInDays, isPast, parseISO } from "date-fns";

export interface Alert {
  id: string;
  type: "carte_pro" | "permis" | "session";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  daysUntilExpiry: number;
  contactId?: string;
  contactName?: string;
  expiryDate?: string;
  sessionId?: string;
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

// Combined alerts
export function useAllAlerts() {
  const { data: expirationAlerts = [], isLoading: loadingExpirations } = useExpirationAlerts();
  const { data: sessionAlerts = [], isLoading: loadingSessions } = useSessionAlerts();

  const allAlerts = [...expirationAlerts, ...sessionAlerts].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.daysUntilExpiry - b.daysUntilExpiry;
  });

  return {
    data: allAlerts,
    isLoading: loadingExpirations || loadingSessions,
  };
}
