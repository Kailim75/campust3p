import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TrashItem {
  item_id: string;
  table_name: string;
  item_label: string;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_email: string | null;
  delete_reason: string | null;
  related_count: number;
}

export function useTrashItems(tableFilter: string | null = null, search: string = "") {
  return useQuery({
    queryKey: ["trash", tableFilter, search],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_trash_items", {
        p_table_filter: tableFilter,
        p_search: search || null,
        p_limit: 200,
        p_offset: 0,
      });
      if (error) throw error;
      return (data || []) as TrashItem[];
    },
  });
}

export const trashTableLabels: Record<string, string> = {
  sessions: "Sessions",
  contacts: "Apprenants",
  prospects: "Prospects",
  factures: "Factures",
  devis: "Devis",
  session_inscriptions: "Inscriptions",
  contact_documents: "Documents",
  paiements: "Paiements",
  emargements: "Émargements",
  catalogue_formations: "Catalogue",
  email_templates: "Modèles email",
  document_templates: "Modèles doc",
};

export const trashTableFilterOptions = [
  { value: "all", label: "Tous les types" },
  { value: "sessions", label: "Sessions" },
  { value: "contacts", label: "Apprenants" },
  { value: "prospects", label: "Prospects" },
  { value: "factures", label: "Factures" },
  { value: "devis", label: "Devis" },
  { value: "contact_documents", label: "Documents" },
  { value: "paiements", label: "Paiements" },
  { value: "catalogue_formations", label: "Catalogue" },
  { value: "email_templates", label: "Modèles email" },
];
