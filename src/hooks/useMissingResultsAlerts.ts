import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, parseISO } from "date-fns";

// Local alert type for missing results
interface MissingResultAlert {
  id: string;
  type: "exam_t3p" | "exam_pratique" | "document" | "session";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  daysUntilExpiry: number;
  contactId?: string;
  contactName?: string;
  examenId?: string;
  expiryDate?: string;
  sessionId?: string;
  actionType?: "view_contact" | "view_session" | "view_exam";
}

// Alerts for exams that happened more than 7 days ago without results
export function useMissingResultsAlerts() {
  return useQuery({
    queryKey: ["alerts", "missing_results"],
    queryFn: async () => {
      const alerts: MissingResultAlert[] = [];
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Fetch T3P exams without results that happened more than 7 days ago
      const { data: examensT3P, error: examensT3PError } = await supabase
        .from("examens_t3p")
        .select(`
          id,
          date_examen,
          type_formation,
          resultat,
          contacts (id, nom, prenom)
        `)
        .is("resultat", null)
        .eq("statut", "passe")
        .lt("date_examen", sevenDaysAgo.toISOString().split("T")[0]);

      if (!examensT3PError && examensT3P) {
        examensT3P.forEach((examen: any) => {
          const contact = examen.contacts;
          if (!contact) return;
          
          const fullName = `${contact.prenom} ${contact.nom}`;
          const examDate = parseISO(examen.date_examen);
          const daysSinceExam = Math.abs(differenceInDays(examDate, today));

          alerts.push({
            id: `missing_result_t3p_${examen.id}`,
            type: "exam_t3p",
            priority: daysSinceExam > 14 ? "high" : "medium",
            title: "Résultat T3P manquant",
            description: `${fullName} - ${examen.type_formation} passé il y a ${daysSinceExam}j sans résultat`,
            daysUntilExpiry: -daysSinceExam,
            contactId: contact.id,
            contactName: fullName,
            examenId: examen.id,
            expiryDate: examen.date_examen,
            actionType: "view_exam",
          });
        });
      }

      // Fetch practical exams without results that happened more than 7 days ago
      const { data: examensPratique, error: examensPratiqueError } = await supabase
        .from("examens_pratique")
        .select(`
          id,
          date_examen,
          type_examen,
          resultat,
          contacts (id, nom, prenom)
        `)
        .is("resultat", null)
        .eq("statut", "passe")
        .lt("date_examen", sevenDaysAgo.toISOString().split("T")[0]);

      if (!examensPratiqueError && examensPratique) {
        examensPratique.forEach((examen: any) => {
          const contact = examen.contacts;
          if (!contact) return;
          
          const fullName = `${contact.prenom} ${contact.nom}`;
          const examDate = parseISO(examen.date_examen);
          const daysSinceExam = Math.abs(differenceInDays(examDate, today));

          alerts.push({
            id: `missing_result_pratique_${examen.id}`,
            type: "exam_pratique",
            priority: daysSinceExam > 14 ? "high" : "medium",
            title: "Résultat pratique manquant",
            description: `${fullName} - ${examen.type_examen} passé il y a ${daysSinceExam}j sans résultat`,
            daysUntilExpiry: -daysSinceExam,
            contactId: contact.id,
            contactName: fullName,
            examenId: examen.id,
            expiryDate: examen.date_examen,
            actionType: "view_exam",
          });
        });
      }

      // Sort by days since exam (most overdue first)
      alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      return alerts;
    },
  });
}

// Alerts for sessions that have ended but not been closed
export function useSessionDocumentAlerts() {
  return useQuery({
    queryKey: ["alerts", "session_not_closed"],
    queryFn: async () => {
      const alerts: MissingResultAlert[] = [];
      const today = new Date();

      // Fetch sessions that are still marked as "en_cours" but have ended
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select(`
          id,
          nom,
          date_fin,
          formation_type,
          statut
        `)
        .eq("statut", "en_cours")
        .lt("date_fin", today.toISOString().split("T")[0]);

      if (sessionsError || !sessions) return alerts;

      for (const session of sessions) {
        const endDate = parseISO(session.date_fin);
        const daysSinceEnd = Math.abs(differenceInDays(endDate, today));

        // Get inscription count
        const { count: inscriptionCount } = await supabase
          .from("session_inscriptions")
          .select("*", { count: "exact", head: true })
          .eq("session_id", session.id);

        if (!inscriptionCount || inscriptionCount === 0) continue;

        alerts.push({
          id: `session_not_closed_${session.id}`,
          type: "session",
          priority: daysSinceEnd > 7 ? "high" : daysSinceEnd > 3 ? "medium" : "low",
          title: "Session à clôturer",
          description: `${session.nom} terminée depuis ${daysSinceEnd}j - ${inscriptionCount} stagiaire(s)`,
          daysUntilExpiry: -daysSinceEnd,
          sessionId: session.id,
          actionType: "view_session",
        });
      }

      return alerts;
    },
  });
}
