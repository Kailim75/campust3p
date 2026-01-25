import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsSuperAdmin } from "./useCentres";

export interface SuperAdminStats {
  centresActifs: number;
  centresTotal: number;
  centresOnboarding: number;
  centresInactifs: number;
  totalApprenants: number;
  apprenantsTaxi: number;
  apprenantsVtc: number;
  apprenantsVmdtr: number;
  activationRate: number; // % centres activés en moins de 48h
  tauxReussiteGlobal: number;
  activiteLast7Days: number;
  activiteLast30Days: number;
}

export interface CentreAlert {
  id: string;
  centreNom: string;
  type: "onboarding_blocked" | "no_learners" | "low_activity" | "low_success";
  priority: "critical" | "attention" | "watch";
  message: string;
  daysSince?: number;
  healthScore?: number;
}

export interface OnboardingFunnelStep {
  step: string;
  count: number;
  percentage: number;
}

export function useSuperAdminStats() {
  const { data: isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async (): Promise<SuperAdminStats> => {
      // Récupérer tous les centres
      const { data: centres, error: centresError } = await supabase
        .from("centres")
        .select("id, actif, onboarding_completed_at, last_activity_at, health_score, created_at");

      if (centresError) throw centresError;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const centresActifs = centres?.filter(c => c.actif && c.onboarding_completed_at)?.length || 0;
      const centresOnboarding = centres?.filter(c => !c.onboarding_completed_at)?.length || 0;
      const centresInactifs = centres?.filter(c => !c.actif)?.length || 0;

      // Calculer le taux d'activation rapide (< 48h)
      const centresWithQuickActivation = centres?.filter(c => {
        if (!c.onboarding_completed_at || !c.created_at) return false;
        const createdAt = new Date(c.created_at);
        const completedAt = new Date(c.onboarding_completed_at);
        const hoursDiff = (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 48;
      })?.length || 0;

      const activationRate = centres?.length ? Math.round((centresWithQuickActivation / centres.length) * 100) : 0;

      // Activité récente
      const activiteLast7Days = centres?.filter(c => 
        c.last_activity_at && new Date(c.last_activity_at) >= sevenDaysAgo
      )?.length || 0;

      const activiteLast30Days = centres?.filter(c => 
        c.last_activity_at && new Date(c.last_activity_at) >= thirtyDaysAgo
      )?.length || 0;

      // Récupérer les apprenants par formation
      const { data: contacts, error: contactsError } = await supabase
        .from("contacts")
        .select("formation")
        .eq("archived", false);

      if (contactsError) throw contactsError;

      const totalApprenants = contacts?.length || 0;
      const apprenantsTaxi = contacts?.filter(c => c.formation === "TAXI")?.length || 0;
      const apprenantsVtc = contacts?.filter(c => c.formation === "VTC" || c.formation === "ACC VTC" || c.formation === "ACC VTC 75")?.length || 0;
      const apprenantsVmdtr = contacts?.filter(c => c.formation === "VMDTR")?.length || 0;

      // Taux de réussite global (examens T3P)
      const { data: examens, error: examensError } = await supabase
        .from("examens_t3p")
        .select("resultat");

      if (examensError) throw examensError;

      const examensReussis = examens?.filter(e => e.resultat === "admis")?.length || 0;
      const tauxReussiteGlobal = examens?.length ? Math.round((examensReussis / examens.length) * 100) : 0;

      return {
        centresActifs,
        centresTotal: centres?.length || 0,
        centresOnboarding,
        centresInactifs,
        totalApprenants,
        apprenantsTaxi,
        apprenantsVtc,
        apprenantsVmdtr,
        activationRate,
        tauxReussiteGlobal,
        activiteLast7Days,
        activiteLast30Days,
      };
    },
    enabled: isSuperAdmin === true,
    staleTime: 30000,
  });
}

export function useCentreAlerts() {
  const { data: isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["super-admin-alerts"],
    queryFn: async (): Promise<CentreAlert[]> => {
      const alerts: CentreAlert[] = [];
      const now = new Date();

      // Récupérer les centres avec leurs stats
      const { data: centresStats, error } = await supabase
        .from("centres_stats")
        .select("*");

      if (error) throw error;

      for (const centre of centresStats || []) {
        // 1. Centres bloqués en onboarding (> 5 jours)
        if (!centre.onboarding_completed_at) {
          const createdAt = new Date(centre.created_at);
          const daysSince = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSince > 5) {
            alerts.push({
              id: centre.id,
              centreNom: centre.nom,
              type: "onboarding_blocked",
              priority: daysSince > 10 ? "critical" : "attention",
              message: `Onboarding non terminé depuis ${daysSince} jours`,
              daysSince,
            });
          }
        }

        // 2. Centres sans apprenant
        if (centre.onboarding_completed_at && centre.nb_contacts === 0) {
          const completedAt = new Date(centre.onboarding_completed_at);
          const daysSince = Math.floor((now.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSince > 7) {
            alerts.push({
              id: centre.id,
              centreNom: centre.nom,
              type: "no_learners",
              priority: daysSince > 14 ? "critical" : "attention",
              message: `Aucun apprenant inscrit depuis l'activation`,
              daysSince,
            });
          }
        }

        // 3. Centres à faible activité
        if (centre.last_activity_at) {
          const lastActivity = new Date(centre.last_activity_at);
          const daysSince = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSince > 14) {
            alerts.push({
              id: centre.id,
              centreNom: centre.nom,
              type: "low_activity",
              priority: daysSince > 30 ? "critical" : "attention",
              message: `Aucune activité depuis ${daysSince} jours`,
              daysSince,
            });
          }
        }

        // 4. Centres à faible score de santé
        if (centre.health_score !== null && centre.health_score < 50) {
          alerts.push({
            id: centre.id,
            centreNom: centre.nom,
            type: "low_success",
            priority: centre.health_score < 30 ? "critical" : "attention",
            message: `Score de santé faible (${centre.health_score}%)`,
            healthScore: centre.health_score,
          });
        }
      }

      // Trier par priorité
      const priorityOrder = { critical: 0, attention: 1, watch: 2 };
      return alerts.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    },
    enabled: isSuperAdmin === true,
    staleTime: 30000,
  });
}

export function useOnboardingFunnel() {
  const { data: isSuperAdmin } = useIsSuperAdmin();

  return useQuery({
    queryKey: ["super-admin-onboarding-funnel"],
    queryFn: async (): Promise<OnboardingFunnelStep[]> => {
      const { data: centres, error } = await supabase
        .from("centres")
        .select("id, onboarding_completed_at, created_at");

      if (error) throw error;

      const total = centres?.length || 0;

      // Comptage par étape
      const comptes = await supabase.from("centres_stats").select("id, nb_users, nb_contacts, nb_sessions");
      
      const centresWithUsers = comptes.data?.filter(c => c.nb_users > 0)?.length || 0;
      const centresWithLearners = comptes.data?.filter(c => c.nb_contacts > 0)?.length || 0;
      const centresWithSessions = comptes.data?.filter(c => c.nb_sessions > 0)?.length || 0;
      const centresCompleted = centres?.filter(c => c.onboarding_completed_at)?.length || 0;

      const steps: OnboardingFunnelStep[] = [
        { step: "Compte créé", count: total, percentage: 100 },
        { step: "Équipe ajoutée", count: centresWithUsers, percentage: total ? Math.round((centresWithUsers / total) * 100) : 0 },
        { step: "Onboarding terminé", count: centresCompleted, percentage: total ? Math.round((centresCompleted / total) * 100) : 0 },
        { step: "1er apprenant", count: centresWithLearners, percentage: total ? Math.round((centresWithLearners / total) * 100) : 0 },
        { step: "1ère session", count: centresWithSessions, percentage: total ? Math.round((centresWithSessions / total) * 100) : 0 },
      ];

      return steps;
    },
    enabled: isSuperAdmin === true,
    staleTime: 60000,
  });
}
