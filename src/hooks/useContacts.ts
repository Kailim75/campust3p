import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { toast } from "sonner";
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
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Contact[];
    },
  });
}

export interface UseContactsPaginatedOptions {
  page: number;
  pageSize: number;
  search?: string;
  statusFilter?: string;
  formationFilter?: string;
  /** Si true, inclut aussi les imports historiques SmartOF dans la liste. Défaut: false. */
  inclureHistorique?: boolean;
}

export function useContactsPaginated({
  page,
  pageSize,
  search,
  statusFilter,
  formationFilter,
  inclureHistorique = false,
}: UseContactsPaginatedOptions) {
  return useQuery({
    queryKey: ["contacts", "paginated", page, pageSize, search, statusFilter, formationFilter, inclureHistorique],
    queryFn: async () => {
      // Count query
      let countQuery = supabase
        .from("contacts")
        .select("*", { count: "exact", head: true })
        .eq("archived", false)
        .is("deleted_at", null);

      // Data query
      let dataQuery = supabase
        .from("contacts")
        .select("*")
        .eq("archived", false)
        .is("deleted_at", null);

      if (!inclureHistorique) {
        countQuery = countQuery.eq("is_historical_import", false);
        dataQuery = dataQuery.eq("is_historical_import", false);
      }

      // Apply filters to both queries
      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        const filter = `nom.ilike.${s},prenom.ilike.${s},email.ilike.${s}`;
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }

      if (statusFilter && statusFilter !== "all") {
        countQuery = countQuery.eq("statut", statusFilter as any);
        dataQuery = dataQuery.eq("statut", statusFilter as any);
      }

      if (formationFilter && formationFilter !== "all") {
        countQuery = countQuery.eq("formation", formationFilter as any);
        dataQuery = dataQuery.eq("formation", formationFilter as any);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const [countRes, dataRes] = await Promise.all([
        countQuery,
        dataQuery.order("created_at", { ascending: false }).range(from, to),
      ]);

      if (countRes.error) throw countRes.error;
      if (dataRes.error) throw dataRes.error;

      return {
        data: dataRes.data as Contact[],
        totalCount: countRes.count ?? 0,
      };
    },
    placeholderData: (prev) => prev,
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
        .is("deleted_at", null)
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
        .eq("archived", false)
        .is("deleted_at", null)
        .eq("is_historical_import", false);

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

/**
 * Erreur typée levée quand le trigger `contacts_block_active_duplicate`
 * (ou la contrainte unique partielle) bloque l'insert/update.
 */
export class DuplicateActiveContactError extends Error {
  code = "DUPLICATE_ACTIVE_CONTACT" as const;
  existingContactId: string | null;
  constructor(message: string, existingContactId: string | null = null) {
    super(message);
    this.name = "DuplicateActiveContactError";
    this.existingContactId = existingContactId;
  }
}

/**
 * Détecte le blocage anti-doublon côté serveur :
 *  - Trigger qui RAISE EXCEPTION 'DUPLICATE_ACTIVE_CONTACT: ... (id=<uuid>)' (errcode 23505)
 *  - Conflit sur l'index unique partiel `contacts_active_email_centre_uidx` (errcode 23505)
 */
function parseDuplicateError(error: any): DuplicateActiveContactError | null {
  if (!error) return null;
  const msg = String(error.message ?? "");
  const code = String(error.code ?? "");
  const isOurTrigger = msg.includes("DUPLICATE_ACTIVE_CONTACT");
  const isUniqueIdx = code === "23505" && msg.includes("contacts_active_email_centre_uidx");
  if (!isOurTrigger && !isUniqueIdx) return null;
  const m = msg.match(/id=([0-9a-f-]{36})/i);
  return new DuplicateActiveContactError(
    "Un contact actif avec cet email existe déjà dans ce centre.",
    m ? m[1] : null,
  );
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

      if (error) {
        const dup = parseDuplicateError(error);
        if (dup) throw dup;
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error: Error) => {
      if (error instanceof DuplicateActiveContactError) {
        toast.error("Contact actif déjà existant", {
          description: "Un contact actif avec cet email existe déjà dans ce centre. Réactivation/création bloquée.",
        });
        return;
      }
      toast.error("Erreur lors de la création du contact : " + error.message);
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

      if (error) {
        const dup = parseDuplicateError(error);
        if (dup) throw dup;
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error: Error) => {
      if (error instanceof DuplicateActiveContactError) {
        toast.error("Modification bloquée", {
          description: "Un contact actif avec cet email existe déjà dans ce centre.",
        });
        return;
      }
      toast.error("Erreur lors de la mise à jour du contact : " + error.message);
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc("soft_delete_record", {
        p_table_name: "contacts",
        p_record_id: id,
        p_reason: null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["trash"] });
    },
    onError: (error: Error) => {
      toast.error("Erreur lors de la suppression du contact : " + error.message);
    },
  });
}
