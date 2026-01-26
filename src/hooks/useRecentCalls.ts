import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentCall {
  id: string;
  contact_id: string;
  titre: string;
  contenu: string | null;
  date_echange: string;
  duree_minutes: number | null;
  created_by: string | null;
  contact: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string | null;
    formation: string | null;
  } | null;
}

export function useRecentCalls(limit: number = 10) {
  return useQuery({
    queryKey: ["recent-calls", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select(`
          id,
          contact_id,
          titre,
          contenu,
          date_echange,
          duree_minutes,
          created_by,
          contacts (
            id,
            nom,
            prenom,
            telephone,
            formation
          )
        `)
        .eq("type", "appel")
        .order("date_echange", { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        contact: item.contacts
      })) as RecentCall[];
    },
  });
}

export function useCallStats() {
  return useQuery({
    queryKey: ["call-stats"],
    queryFn: async () => {
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Appels aujourd'hui
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      
      const { count: todayCount } = await supabase
        .from("contact_historique")
        .select("*", { count: "exact", head: true })
        .eq("type", "appel")
        .gte("date_echange", todayStart.toISOString());

      // Appels cette semaine
      const { count: weekCount } = await supabase
        .from("contact_historique")
        .select("*", { count: "exact", head: true })
        .eq("type", "appel")
        .gte("date_echange", startOfWeek.toISOString());

      // Appels ce mois
      const { count: monthCount } = await supabase
        .from("contact_historique")
        .select("*", { count: "exact", head: true })
        .eq("type", "appel")
        .gte("date_echange", startOfMonth.toISOString());

      // Durée totale ce mois (en minutes)
      const { data: durationData } = await supabase
        .from("contact_historique")
        .select("duree_minutes")
        .eq("type", "appel")
        .gte("date_echange", startOfMonth.toISOString())
        .not("duree_minutes", "is", null);

      const totalMinutes = (durationData || []).reduce(
        (sum, item) => sum + (item.duree_minutes || 0),
        0
      );

      return {
        today: todayCount || 0,
        thisWeek: weekCount || 0,
        thisMonth: monthCount || 0,
        totalMinutesThisMonth: totalMinutes,
      };
    },
  });
}
