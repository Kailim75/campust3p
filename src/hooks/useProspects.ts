import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ProspectStatus = "nouveau" | "contacte" | "relance" | "converti" | "perdu";
export type ProspectPriorite = "basse" | "normale" | "haute" | "urgente";

export interface Prospect {
  id: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  email: string | null;
  formation_souhaitee: string | null;
  source: string | null;
  statut: ProspectStatus;
  priorite: ProspectPriorite | null;
  notes: string | null;
  converted_contact_id: string | null;
  is_active: boolean;
  date_prochaine_relance: string | null;
  next_action_at: string | null;
  next_action_type: string | null;
  assigned_to: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ProspectInsert {
  nom: string;
  prenom: string;
  telephone?: string | null;
  email?: string | null;
  formation_souhaitee?: string | null;
  source?: string | null;
  statut?: ProspectStatus;
  priorite?: ProspectPriorite;
  date_prochaine_relance?: string | null;
  notes?: string | null;
}

export interface ProspectUpdate {
  nom?: string;
  prenom?: string;
  telephone?: string | null;
  email?: string | null;
  formation_souhaitee?: string | null;
  source?: string | null;
  statut?: ProspectStatus;
  priorite?: ProspectPriorite;
  date_prochaine_relance?: string | null;
  notes?: string | null;
  is_active?: boolean;
  converted_contact_id?: string | null;
}

export function useProspects() {
  return useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Prospect[];
    },
  });
}

export function useProspectsStats() {
  return useQuery({
    queryKey: ["prospects", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("statut, formation_souhaitee, next_action_at")
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayEnd = new Date(todayStart);
      todayEnd.setDate(todayEnd.getDate() + 1);
      const weekEnd = new Date(todayStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const active = data.filter((p: any) => p.statut !== "converti" && p.statut !== "perdu");

      const overdue = active.filter((p: any) => p.next_action_at && new Date(p.next_action_at) < now).length;
      const today = active.filter((p: any) => {
        if (!p.next_action_at) return false;
        const d = new Date(p.next_action_at);
        return d >= todayStart && d < todayEnd;
      }).length;
      const week = active.filter((p: any) => {
        if (!p.next_action_at) return false;
        const d = new Date(p.next_action_at);
        return d >= todayStart && d < weekEnd;
      }).length;
      const nouveaux = active.filter((p: any) => !p.next_action_at && p.statut === "nouveau").length;

      const stats = {
        total: data.length,
        nouveau: data.filter((p: any) => p.statut === "nouveau").length,
        contacte: data.filter((p: any) => p.statut === "contacte").length,
        relance: data.filter((p: any) => p.statut === "relance").length,
        converti: data.filter((p: any) => p.statut === "converti").length,
        perdu: data.filter((p: any) => p.statut === "perdu").length,
        // New relance KPIs
        overdue,
        today,
        week,
        nouveaux,
      };

      return stats;
    },
  });
}

export function useCreateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospect: ProspectInsert) => {
      const { data, error } = await supabase
        .from("prospects")
        .insert([prospect] as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect créé avec succès");
    },
    onError: (error: any) => {
      if (error.code === "23505") {
        toast.error("Un prospect avec cet email existe déjà");
      } else {
        toast.error("Erreur lors de la création du prospect");
      }
      console.error(error);
    },
  });
}

export function useUpdateProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ProspectUpdate }) => {
      const { data, error } = await supabase
        .from("prospects")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      toast.success("Prospect mis à jour");
    },
    onError: (error) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("prospects")
        .update({ is_active: false, deleted_at: new Date().toISOString() } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
      toast.success("Prospect envoyé à la corbeille");
    },
    onError: (error) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}

export function useConvertProspect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prospect: Prospect) => {
      // Build contact data - only include formation if it's valid
      const contactData: Record<string, unknown> = {
        nom: prospect.nom,
        prenom: prospect.prenom,
        telephone: prospect.telephone,
        email: prospect.email,
        statut: "En attente de validation",
        source: prospect.source || "Prospect converti",
      };

      // Only add formation if it matches a valid enum value
      const validFormations = ["ACC VTC", "ACC VTC 75", "Formation continue Taxi", "Formation continue VTC", "Mobilité Taxi", "TAXI", "VMDTR", "VTC"];
      if (prospect.formation_souhaitee && validFormations.includes(prospect.formation_souhaitee)) {
        contactData.formation = prospect.formation_souhaitee;
      }

      // Create contact from prospect
      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert([contactData] as any)
        .select()
        .single();

      if (contactError) throw contactError;

      // Update prospect status
      const { error: prospectError } = await supabase
        .from("prospects")
        .update({
          statut: "converti" as ProspectStatus,
          converted_contact_id: contact.id,
        })
        .eq("id", prospect.id);

      if (prospectError) throw prospectError;

      return contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Prospect converti en contact avec succès !");
    },
    onError: (error) => {
      toast.error("Erreur lors de la conversion");
      console.error(error);
    },
  });
}
