import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format, parseISO, isWithinInterval, addMonths } from "date-fns";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

// Types
export type Formateur = Tables<"formateurs">;
export type FormateurInsert = TablesInsert<"formateurs">;
export type FormateurUpdate = TablesUpdate<"formateurs">;
export type FormateurDocument = Tables<"formateur_documents">;
export type FormateurFacture = Tables<"formateur_factures">;

export interface FormateurStats {
  formateur: string;
  sessionsTotal: number;
  sessionsEnCours: number;
  sessionsAVenir: number;
  sessionsTerminees: number;
  stagiairesFormes: number;
  caGenere: number;
  tauxRemplissage: number;
  prochaineSessions: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    inscrits: number;
    places: number;
  }[];
}

export interface FormateurDisponibilite {
  formateur: string;
  mois: string;
  joursOccupes: number;
  joursTotaux: number;
  sessions: {
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
  }[];
}

// Get unique formateurs from sessions
export function useFormateurs() {
  return useQuery({
    queryKey: ["formateurs", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("formateur")
        .not("formateur", "is", null);

      if (error) throw error;

      const uniqueFormateurs = [...new Set(data.map((s) => s.formateur).filter(Boolean))] as string[];
      return uniqueFormateurs.sort();
    },
  });
}

// Get detailed stats per formateur
export function useFormateursStats() {
  return useQuery({
    queryKey: ["formateurs", "stats"],
    queryFn: async () => {
      // Fetch all sessions
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("*")
        .not("formateur", "is", null);

      if (error) throw error;

      // Fetch all inscriptions
      const { data: inscriptions, error: inscError } = await supabase
        .from("session_inscriptions")
        .select("session_id");

      if (inscError) throw inscError;

      // Fetch factures for CA
      const { data: factures, error: factError } = await supabase
        .from("factures")
        .select(`
          montant_total,
          session_inscription:session_inscriptions (
            session_id
          )
        `)
        .not("statut", "eq", "annulee");

      if (factError) throw factError;

      // Count inscriptions per session
      const inscriptionsBySession: Record<string, number> = {};
      inscriptions?.forEach((i) => {
        inscriptionsBySession[i.session_id] = (inscriptionsBySession[i.session_id] || 0) + 1;
      });

      // CA per session
      const caBySession: Record<string, number> = {};
      factures?.forEach((f: any) => {
        const sessionId = f.session_inscription?.session_id;
        if (sessionId) {
          caBySession[sessionId] = (caBySession[sessionId] || 0) + Number(f.montant_total);
        }
      });

      // Group by formateur
      const formateurMap: Record<string, FormateurStats> = {};
      const today = new Date();

      sessions?.forEach((session) => {
        const formateur = session.formateur!;
        if (!formateurMap[formateur]) {
          formateurMap[formateur] = {
            formateur,
            sessionsTotal: 0,
            sessionsEnCours: 0,
            sessionsAVenir: 0,
            sessionsTerminees: 0,
            stagiairesFormes: 0,
            caGenere: 0,
            tauxRemplissage: 0,
            prochaineSessions: [],
          };
        }

        const stats = formateurMap[formateur];
        stats.sessionsTotal += 1;

        const inscrits = inscriptionsBySession[session.id] || 0;
        stats.stagiairesFormes += inscrits;
        stats.caGenere += caBySession[session.id] || 0;

        // Count by status
        if (session.statut === "en_cours") stats.sessionsEnCours += 1;
        else if (session.statut === "a_venir") stats.sessionsAVenir += 1;
        else if (session.statut === "terminee") stats.sessionsTerminees += 1;

        // Add to upcoming sessions
        if (session.statut === "a_venir" || session.statut === "en_cours") {
          stats.prochaineSessions.push({
            id: session.id,
            nom: session.nom,
            date_debut: session.date_debut,
            date_fin: session.date_fin,
            inscrits,
            places: session.places_totales,
          });
        }
      });

      // Calculate taux de remplissage and sort prochaines sessions
      Object.values(formateurMap).forEach((stats) => {
        const totalPlaces = sessions
          ?.filter((s) => s.formateur === stats.formateur)
          .reduce((acc, s) => acc + s.places_totales, 0) || 0;
        
        stats.tauxRemplissage = totalPlaces > 0 
          ? Math.round((stats.stagiairesFormes / totalPlaces) * 100) 
          : 0;

        stats.prochaineSessions.sort((a, b) => 
          new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime()
        );
        stats.prochaineSessions = stats.prochaineSessions.slice(0, 3);
      });

      return Object.values(formateurMap).sort((a, b) => b.sessionsTotal - a.sessionsTotal);
    },
  });
}

// Get disponibilité des formateurs sur les 3 prochains mois
export function useFormateursDisponibilite() {
  return useQuery({
    queryKey: ["formateurs", "disponibilite"],
    queryFn: async () => {
      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, nom, formateur, date_debut, date_fin")
        .not("formateur", "is", null)
        .in("statut", ["a_venir", "en_cours"]);

      if (error) throw error;

      const formateurs = [...new Set(sessions?.map((s) => s.formateur).filter(Boolean))] as string[];
      const today = new Date();
      const result: FormateurDisponibilite[] = [];

      formateurs.forEach((formateur) => {
        const formateurSessions = sessions?.filter((s) => s.formateur === formateur) || [];

        // Check next 3 months
        for (let i = 0; i < 3; i++) {
          const monthStart = startOfMonth(addMonths(today, i));
          const monthEnd = endOfMonth(addMonths(today, i));
          const mois = format(monthStart, "yyyy-MM");

          // Find sessions in this month
          const sessionsInMonth = formateurSessions.filter((s) => {
            const start = parseISO(s.date_debut);
            const end = parseISO(s.date_fin);
            return (
              isWithinInterval(start, { start: monthStart, end: monthEnd }) ||
              isWithinInterval(end, { start: monthStart, end: monthEnd }) ||
              (start <= monthStart && end >= monthEnd)
            );
          });

          // Count occupied days
          let joursOccupes = 0;
          sessionsInMonth.forEach((s) => {
            const start = parseISO(s.date_debut);
            const end = parseISO(s.date_fin);
            const effectiveStart = start < monthStart ? monthStart : start;
            const effectiveEnd = end > monthEnd ? monthEnd : end;
            const days = Math.ceil((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            joursOccupes += days;
          });

          // Total days in month (excluding weekends - simplified)
          const joursTotaux = 22; // Approximate working days

          result.push({
            formateur,
            mois,
            joursOccupes: Math.min(joursOccupes, joursTotaux),
            joursTotaux,
            sessions: sessionsInMonth.map((s) => ({
              id: s.id,
              nom: s.nom,
              date_debut: s.date_debut,
              date_fin: s.date_fin,
            })),
          });
        }
      });

      return result;
    },
  });
}

// ========== CRUD Operations for Formateurs ==========

// Fetch all formateurs from dedicated table
export function useFormateursTable() {
  return useQuery({
    queryKey: ["formateurs", "table"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formateurs")
        .select("*")
        .order("nom", { ascending: true });

      if (error) throw error;
      return data as Formateur[];
    },
  });
}

// Fetch single formateur
export function useFormateur(id: string | null) {
  return useQuery({
    queryKey: ["formateurs", "detail", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("formateurs")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Formateur;
    },
    enabled: !!id,
  });
}

// Create formateur
export function useCreateFormateur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (formateur: FormateurInsert) => {
      const { data, error } = await supabase
        .from("formateurs")
        .insert(formateur)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs"] });
    },
  });
}

// Update formateur
export function useUpdateFormateur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: FormateurUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("formateurs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs"] });
    },
  });
}

// Delete formateur
export function useDeleteFormateur() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formateurs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs"] });
    },
  });
}

// ========== Formateur Documents ==========

export function useFormateurDocuments(formateurId: string | null) {
  return useQuery({
    queryKey: ["formateurs", "documents", formateurId],
    queryFn: async () => {
      if (!formateurId) return [];
      const { data, error } = await supabase
        .from("formateur_documents")
        .select("*")
        .eq("formateur_id", formateurId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as FormateurDocument[];
    },
    enabled: !!formateurId,
  });
}

export function useCreateFormateurDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (doc: Omit<FormateurDocument, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("formateur_documents")
        .insert(doc)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs", "documents"] });
    },
  });
}

export function useDeleteFormateurDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formateur_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs", "documents"] });
    },
  });
}

// ========== Formateur Factures ==========

export function useFormateurFactures(formateurId: string | null) {
  return useQuery({
    queryKey: ["formateurs", "factures", formateurId],
    queryFn: async () => {
      if (!formateurId) return [];
      const { data, error } = await supabase
        .from("formateur_factures")
        .select("*")
        .eq("formateur_id", formateurId)
        .order("date_facture", { ascending: false });

      if (error) throw error;
      return data as FormateurFacture[];
    },
    enabled: !!formateurId,
  });
}

export function useCreateFormateurFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (facture: Omit<FormateurFacture, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("formateur_factures")
        .insert(facture)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs", "factures"] });
    },
  });
}

export function useUpdateFormateurFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<FormateurFacture> & { id: string }) => {
      const { data, error } = await supabase
        .from("formateur_factures")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs", "factures"] });
    },
  });
}

export function useDeleteFormateurFacture() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("formateur_factures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formateurs", "factures"] });
    },
  });
}
