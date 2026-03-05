import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { getUserCentreId } from "@/utils/getCentreId";

export type Contact = Tables<"contacts">;
export type ContactInsert = TablesInsert<"contacts">;
export type ContactUpdate = TablesUpdate<"contacts">;

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useRecentContacts(limit = 5) {
  return useQuery({
    queryKey: ["contacts", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Contact[];
    },
  });
}

export function useContactsStats() {
  return useQuery({
    queryKey: ["contacts", "stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("statut, formation")
        .eq("archived", false);

      if (error) throw error;

      const stats = {
        total: data.length,
        enAttente: data.filter((c) => c.statut === "En attente de validation").length,
        clients: data.filter((c) => c.statut === "Client").length,
        bravo: data.filter((c) => c.statut === "Bravo").length,
        parFormation: {} as Record<string, number>,
      };

      data.forEach((contact) => {
        if (contact.formation) {
          stats.parFormation[contact.formation] = (stats.parFormation[contact.formation] || 0) + 1;
        }
      });

      return stats;
    },
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<ContactInsert, 'centre_id'> & { centre_id?: string }) => {
      const centreId = contact.centre_id || await getUserCentreId();
      const { data, error } = await supabase
        .from("contacts")
        .insert({ ...contact, centre_id: centreId } as ContactInsert)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ContactUpdate }) => {
      const { data, error } = await supabase
        .from("contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contacts")
        .update({ archived: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
