import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays } from "date-fns";
import { getUserCentreId } from "@/utils/getCentreId";

// ─── Types ───
export interface CreneauConduite {
  id: string;
  formateur_id: string | null;
  type_seance: string;
  date_creneau: string;
  heure_debut: string;
  heure_fin: string;
  capacite_max: number;
  lieu_depart: string | null;
  notes_formateur: string | null;
  statut: string;
  contact_id: string | null;
  vehicule_id: string | null;
  centre_id: string | null;
  created_at: string;
  commentaires: string | null;
  visible_eleve: boolean | null;
  contacts?: { id: string; prenom: string; nom: string; formation: string | null } | null;
  formateurs?: { id: string; nom: string; prenom: string } | null;
}

export interface ReservationConduite {
  id: string;
  creneau_id: string;
  apprenant_id: string;
  statut: string;
  motif_annulation: string | null;
  rappel_24h_envoye: boolean;
  rappel_2h_envoye: boolean;
  created_at: string;
  contacts?: { id: string; prenom: string; nom: string; formation: string | null } | null;
}

export interface CompteRenduSeance {
  id: string;
  reservation_id: string;
  formateur_id: string | null;
  duree_reelle_minutes: number | null;
  points_travailles: string[] | null;
  points_positifs: string | null;
  points_ameliorer: string | null;
  niveau_global: string;
  recommandation_seances_sup: number | null;
  created_at: string;
}

export interface ProgressionConduite {
  id: string;
  apprenant_id: string;
  heures_preventive_realisees: number;
  heures_ville_realisees: number;
  accompagnement_examen_fait: boolean;
  date_dernier_bilan: string | null;
  niveau_actuel: string;
  commentaire_global: string | null;
  updated_at: string;
}

export interface RessourceConduite {
  id: string;
  titre: string;
  categorie: string;
  type_contenu: string;
  contenu: string;
  formation_cible: string;
  ordre_affichage: number;
  visible_eleve: boolean;
  created_at: string;
}

// ─── CRENEAUX ───
export function useCreneaux(dateRange: { start: Date; end: Date }) {
  return useQuery({
    queryKey: ["creneaux-conduite", format(dateRange.start, "yyyy-MM-dd"), format(dateRange.end, "yyyy-MM-dd")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("creneaux_conduite")
        .select("*, contacts(id, prenom, nom, formation), formateurs(id, nom, prenom)")
        .gte("date_creneau", format(dateRange.start, "yyyy-MM-dd"))
        .lte("date_creneau", format(dateRange.end, "yyyy-MM-dd"))
        .order("date_creneau", { ascending: true })
        .order("heure_debut", { ascending: true });
      if (error) throw error;
      return (data || []) as CreneauConduite[];
    },
  });
}

export function useCreateCreneau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      type_seance: string;
      date_creneau: string;
      heure_debut: string;
      heure_fin: string;
      lieu_depart: string;
      capacite_max: number;
      notes_formateur?: string;
    }) => {
      const centreId = await getUserCentreId();
      const { data, error } = await supabase
        .from("creneaux_conduite")
        .insert({
          centre_id: centreId,
          type_seance: values.type_seance,
          date_creneau: values.date_creneau,
          heure_debut: values.heure_debut,
          heure_fin: values.heure_fin,
          lieu_depart: values.lieu_depart,
          capacite_max: values.capacite_max,
          notes_formateur: values.notes_formateur || null,
          statut: "disponible",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Créneau créé avec succès");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate") || err.message?.includes("unique")) {
        toast.error("Conflit horaire avec un créneau existant");
      } else {
        toast.error("Erreur lors de la création du créneau");
      }
    },
  });
}

export function useUpdateCreneauStatut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase
        .from("creneaux_conduite")
        .update({ statut })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creneaux-conduite"] });
    },
  });
}

// ─── RESERVATIONS ───
export function useReservations(creneauId?: string) {
  return useQuery({
    queryKey: ["reservations-conduite", creneauId],
    queryFn: async () => {
      let q = supabase
        .from("reservations_conduite")
        .select("*, contacts:apprenant_id(id, prenom, nom, formation)")
        .order("created_at", { ascending: false });
      if (creneauId) q = q.eq("creneau_id", creneauId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as ReservationConduite[];
    },
    enabled: !!creneauId,
  });
}

export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ creneau_id, apprenant_id }: { creneau_id: string; apprenant_id: string }) => {
      const { data, error } = await supabase
        .from("reservations_conduite")
        .insert({ creneau_id, apprenant_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reservations-conduite"] });
      qc.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Réservation confirmée");
    },
    onError: () => toast.error("Erreur lors de la réservation"),
  });
}

// ─── COMPTE RENDU ───
export function useCreateCompteRendu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      reservation_id: string;
      duree_reelle_minutes: number;
      points_travailles: string[];
      points_positifs: string;
      points_ameliorer: string;
      niveau_global: "debutant" | "intermediaire" | "avance" | "pret_examen";
      recommandation_seances_sup: number;
    }) => {
      const { data, error } = await supabase
        .from("compte_rendu_seance")
        .insert([values])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compte-rendu"] });
      qc.invalidateQueries({ queryKey: ["progression-conduite"] });
      toast.success("Compte rendu enregistré");
    },
    onError: () => toast.error("Erreur lors de l'enregistrement"),
  });
}

export function useCompteRendus(reservationIds?: string[]) {
  return useQuery({
    queryKey: ["compte-rendu", reservationIds],
    queryFn: async () => {
      if (!reservationIds?.length) return [];
      const { data, error } = await supabase
        .from("compte_rendu_seance")
        .select("*")
        .in("reservation_id", reservationIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as CompteRenduSeance[];
    },
    enabled: !!reservationIds?.length,
  });
}

// ─── PROGRESSION ───
export function useProgressions() {
  return useQuery({
    queryKey: ["progression-conduite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progression_conduite")
        .select("*");
      if (error) throw error;
      return (data || []) as ProgressionConduite[];
    },
  });
}

export function useProgression(apprenantId?: string) {
  return useQuery({
    queryKey: ["progression-conduite", apprenantId],
    queryFn: async () => {
      if (!apprenantId) return null;
      const { data, error } = await supabase
        .from("progression_conduite")
        .select("*")
        .eq("apprenant_id", apprenantId)
        .maybeSingle();
      if (error) throw error;
      return data as ProgressionConduite | null;
    },
    enabled: !!apprenantId,
  });
}

export function useUpsertProgression() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<ProgressionConduite> & { apprenant_id: string }) => {
      const insertValues = {
        ...values,
        niveau_actuel: (values.niveau_actuel || "debutant") as "debutant" | "intermediaire" | "avance" | "pret_examen",
      };
      const { data, error } = await supabase
        .from("progression_conduite")
        .upsert([insertValues], { onConflict: "apprenant_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progression-conduite"] });
    },
  });
}

// ─── RESSOURCES ───
export function useRessources() {
  return useQuery({
    queryKey: ["ressources-conduite"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ressources_conduite")
        .select("*")
        .order("categorie")
        .order("ordre_affichage", { ascending: true });
      if (error) throw error;
      return (data || []) as RessourceConduite[];
    },
  });
}

export function useCreateRessource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      titre: string;
      categorie: "regles_centre" | "regles_formateur" | "deroulement_examen" | "adresses_secteur" | "checklist_jour_j" | "conseils_conduite" | "documents_apporter";
      type_contenu: "texte" | "liste" | "carte" | "pdf" | "video";
      contenu: string;
      formation_cible?: "taxi_initial" | "vtc" | "vmdtr" | "tous";
      ordre_affichage?: number;
      visible_eleve?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("ressources_conduite")
        .insert([values])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ressources-conduite"] });
      toast.success("Ressource ajoutée");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });
}

export function useUpdateRessource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string } & Partial<Omit<RessourceConduite, "categorie" | "type_contenu" | "formation_cible">> & {
      categorie?: "regles_centre" | "regles_formateur" | "deroulement_examen" | "adresses_secteur" | "checklist_jour_j" | "conseils_conduite" | "documents_apporter";
      type_contenu?: "texte" | "liste" | "carte" | "pdf" | "video";
      formation_cible?: "taxi_initial" | "vtc" | "vmdtr" | "tous";
    }) => {
      const { error } = await supabase
        .from("ressources_conduite")
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ressources-conduite"] });
      toast.success("Ressource mise à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}

// ─── ELEVES WITH RESERVATIONS ───
export function useElevesConduite() {
  return useQuery({
    queryKey: ["eleves-conduite"],
    queryFn: async () => {
      const [reservationsRes, progressionsRes, syncedContactsRes] = await Promise.all([
        supabase
          .from("reservations_conduite")
          .select("apprenant_id, statut, created_at, contacts:apprenant_id(id, prenom, nom, formation)")
          .order("created_at", { ascending: false }),
        supabase
          .from("progression_conduite")
          .select("*"),
        supabase
          .from("contacts")
          .select("id, prenom, nom, formation")
          .eq("archived", false)
          .is("deleted_at", null)
          .eq("source", "webhook")
          .eq("statut_apprenant", "actif")
          .order("created_at", { ascending: false }),
      ]);

      if (reservationsRes.error) throw reservationsRes.error;
      if (syncedContactsRes.error) throw syncedContactsRes.error;

      const reservations = reservationsRes.data || [];
      const progressions = progressionsRes.data || [];
      const syncedContacts = syncedContactsRes.data || [];
      const progressionMap = new Map((progressions as any[]).map((p: any) => [p.apprenant_id, p]));

      // Deduplicate by apprenant_id
      const eleveMap = new Map<string, any>();

      (reservations as any[]).forEach((r: any) => {
        if (!eleveMap.has(r.apprenant_id) && r.contacts) {
          eleveMap.set(r.apprenant_id, {
            ...r.contacts,
            progression: progressionMap.get(r.apprenant_id) || null,
            derniere_seance: r.created_at,
          });
        }
      });

      // Fallback: include synced contacts even without reservation yet
      (syncedContacts as any[]).forEach((c: any) => {
        if (!eleveMap.has(c.id)) {
          eleveMap.set(c.id, {
            ...c,
            progression: progressionMap.get(c.id) || null,
            derniere_seance: null,
          });
        }
      });

      return Array.from(eleveMap.values());
    },
  });
}

// ─── TODAY'S CRENEAUX COUNT (for sidebar badge) ───
export function useTodayCreneauxCount() {
  const today = format(new Date(), "yyyy-MM-dd");
  return useQuery({
    queryKey: ["creneaux-today-count", today],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("creneaux_conduite")
        .select("id", { count: "exact", head: true })
        .eq("date_creneau", today)
        .neq("statut", "annule");
      if (error) throw error;
      return count || 0;
    },
    staleTime: 60_000,
  });
}

// ─── DRIVING ALERTS FOR DASHBOARD ───
export function useDrivingAlerts() {
  return useQuery({
    queryKey: ["driving-alerts"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
      const alerts: any[] = [];

      // 🏁 Élèves prêts pour l'examen
      const { data: readyStudents } = await supabase
        .from("progression_conduite")
        .select("apprenant_id, contacts:apprenant_id(prenom, nom)")
        .eq("niveau_actuel", "pret_examen" as any);

      (readyStudents || []).forEach((s: any) => {
        if (s.contacts) {
          alerts.push({
            id: `ready-exam-${s.apprenant_id}`,
            type: "info",
            message: `🏁 ${s.contacts.prenom} ${s.contacts.nom} a atteint le niveau "prêt pour l'examen"`,
            action: "Voir fiche",
            section: "planning-conduite",
          });
        }
      });

      // 📅 Rappels J-1
      const { data: tomorrowCreneaux } = await supabase
        .from("creneaux_conduite")
        .select("id, heure_debut, lieu_depart, type_seance")
        .eq("date_creneau", tomorrow)
        .neq("statut", "annule");

      if (tomorrowCreneaux?.length) {
        const creneauIds = tomorrowCreneaux.map(c => c.id);
        const { data: pendingReminders } = await supabase
          .from("reservations_conduite")
          .select("id, creneau_id, contacts:apprenant_id(prenom, nom)")
          .in("creneau_id", creneauIds)
          .eq("statut", "confirmee" as any)
          .eq("rappel_24h_envoye", false);

        (pendingReminders || []).forEach((r: any) => {
          const creneau = tomorrowCreneaux.find(c => c.id === r.creneau_id);
          if (r.contacts && creneau) {
            alerts.push({
              id: `reminder-24h-${r.id}`,
              type: "warning",
              message: `📅 Rappel J-1 : ${r.contacts.prenom} — séance demain à ${creneau.heure_debut?.slice(0, 5)} — ${creneau.lieu_depart || ""}`,
              action: "Voir planning",
              section: "planning-conduite",
              reservationId: r.id,
            });
          }
        });
      }

      // ⚠️ No-show (créneaux passés aujourd'hui encore confirmés)
      const { data: pastCreneaux } = await supabase
        .from("creneaux_conduite")
        .select("id, heure_fin")
        .eq("date_creneau", today)
        .neq("statut", "annule");

      const now = format(new Date(), "HH:mm:ss");
      const passedCreneaux = (pastCreneaux || []).filter(c => c.heure_fin < now);
      if (passedCreneaux.length) {
        const { data: noShows } = await supabase
          .from("reservations_conduite")
          .select("id, creneau_id, contacts:apprenant_id(prenom, nom)")
          .in("creneau_id", passedCreneaux.map(c => c.id))
          .eq("statut", "confirmee" as any);

        (noShows || []).forEach((r: any) => {
          const creneau = passedCreneaux.find(c => c.id === r.creneau_id);
          if (r.contacts && creneau) {
            alerts.push({
              id: `noshow-${r.id}`,
              type: "danger",
              message: `⚠️ No-show : ${r.contacts.prenom} ${r.contacts.nom} ne s'est pas présenté (${creneau.heure_fin?.slice(0, 5)})`,
              action: "Voir planning",
              section: "planning-conduite",
            });
          }
        });
      }

      // 🟠 Inactivity alerts (no reservation in 10+ days)
      const { data: activeStudents } = await supabase
        .from("contacts")
        .select("id, prenom, nom")
        .eq("archived", false)
        .in("statut", ["inscrit" as any, "en_formation" as any]);

      if (activeStudents?.length) {
        for (const student of activeStudents.slice(0, 50)) {
          const { data: lastResa } = await supabase
            .from("reservations_conduite")
            .select("created_at")
            .eq("apprenant_id", student.id)
            .in("statut", ["confirmee" as any, "realisee" as any])
            .order("created_at", { ascending: false })
            .limit(1);

          if (lastResa?.length) {
            const daysSince = Math.floor((Date.now() - new Date(lastResa[0].created_at).getTime()) / 86400000);
            if (daysSince > 10) {
              // Check no future reservation
              const { data: futureResa } = await supabase
                .from("reservations_conduite")
                .select("id")
                .eq("apprenant_id", student.id)
                .eq("statut", "confirmee" as any)
                .limit(1);

              if (!futureResa?.length) {
                alerts.push({
                  id: `inactive-${student.id}`,
                  type: "warning",
                  message: `🟠 ${student.prenom} ${student.nom} n'a pas réservé de séance depuis ${daysSince} jours`,
                  action: "Envoyer le lien",
                  section: "planning-conduite",
                  apprenantId: student.id,
                  apprenantPrenom: student.prenom,
                });
              }
            }
          }
        }
      }

      return alerts;
    },
    staleTime: 2 * 60_000,
  });
}

// ─── TOGGLE VISIBLE_ELEVE ───
export function useToggleVisibleEleve() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const { error } = await supabase
        .from("creneaux_conduite")
        .update({ visible_eleve: visible })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["creneaux-conduite"] });
      toast.success("Visibilité mise à jour");
    },
  });
}
