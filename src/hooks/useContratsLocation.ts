import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ContratLocationType = "vehicule" | "materiel" | "autre";
export type ContratLocationStatut = "brouillon" | "envoye" | "signe" | "refuse" | "expire" | "resilie";

export interface ContratLocation {
  id: string;
  contact_id: string;
  numero_contrat: string;
  type_contrat: ContratLocationType;
  vehicule_id: string | null;
  objet_location: string;
  date_debut: string;
  date_fin: string;
  montant_mensuel: number;
  montant_caution: number | null;
  modalite_paiement: string | null;
  statut: ContratLocationStatut;
  template_file_id: string | null;
  document_genere_path: string | null;
  document_signe_path: string | null;
  date_envoi: string | null;
  date_signature: string | null;
  signature_data: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  conditions_particulieres: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  vehicules?: { id: string; immatriculation: string; marque: string; modele: string } | null;
  contacts?: { id: string; nom: string; prenom: string; email: string | null } | null;
}

export interface ContratLocationHistorique {
  id: string;
  contrat_id: string;
  action: string;
  ancien_statut: string | null;
  nouveau_statut: string | null;
  details: string | null;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  created_at: string;
}

export type ContratLocationInsert = Omit<ContratLocation, "id" | "numero_contrat" | "created_at" | "updated_at" | "vehicules" | "contacts">;
export type ContratLocationUpdate = Partial<Omit<ContratLocationInsert, "contact_id">>;

export const contratTypeLabels: Record<ContratLocationType, string> = {
  vehicule: "Véhicule",
  materiel: "Matériel",
  autre: "Autre",
};

export const contratStatutConfig: Record<ContratLocationStatut, { label: string; class: string }> = {
  brouillon: { label: "Brouillon", class: "bg-muted text-muted-foreground" },
  envoye: { label: "Envoyé", class: "bg-info/10 text-info" },
  signe: { label: "Signé", class: "bg-success text-success-foreground" },
  refuse: { label: "Refusé", class: "bg-destructive/10 text-destructive" },
  expire: { label: "Expiré", class: "bg-warning/10 text-warning" },
  resilie: { label: "Résilié", class: "bg-muted text-muted-foreground" },
};

export const modalitePaiementOptions = [
  { value: "mensuel", label: "Mensuel" },
  { value: "trimestriel", label: "Trimestriel" },
  { value: "annuel", label: "Annuel" },
];

export function useContactContrats(contactId: string | null) {
  return useQuery({
    queryKey: ["contrats-location", "contact", contactId],
    queryFn: async () => {
      if (!contactId) return [];
      const { data, error } = await supabase
        .from("contrats_location")
        .select(`
          *,
          vehicules (id, immatriculation, marque, modele)
        `)
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContratLocation[];
    },
    enabled: !!contactId,
  });
}

export function useAllContrats() {
  return useQuery({
    queryKey: ["contrats-location"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contrats_location")
        .select(`
          *,
          vehicules (id, immatriculation, marque, modele),
          contacts (id, nom, prenom, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContratLocation[];
    },
  });
}

export function useContratHistorique(contratId: string | null) {
  return useQuery({
    queryKey: ["contrat-historique", contratId],
    queryFn: async () => {
      if (!contratId) return [];
      const { data, error } = await supabase
        .from("contrats_location_historique")
        .select("*")
        .eq("contrat_id", contratId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ContratLocationHistorique[];
    },
    enabled: !!contratId,
  });
}

export function useCreateContratLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contrat: ContratLocationInsert) => {
      // Generate contract number
      const { data: numeroData } = await supabase.rpc("generate_numero_contrat");
      
      const { data, error } = await supabase
        .from("contrats_location")
        .insert({
          ...contrat,
          numero_contrat: numeroData || `LOC-${Date.now()}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contrats-location", "contact", variables.contact_id] });
      queryClient.invalidateQueries({ queryKey: ["contrats-location"] });
      toast.success("Contrat créé avec succès");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la création du contrat");
      console.error(error);
    },
  });
}

export function useUpdateContratLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId, ...updates }: ContratLocationUpdate & { id: string; contactId: string }) => {
      const { data, error } = await supabase
        .from("contrats_location")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { data, contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contrats-location", "contact", result.contactId] });
      queryClient.invalidateQueries({ queryKey: ["contrats-location"] });
      queryClient.invalidateQueries({ queryKey: ["contrat-historique", result.data.id] });
      toast.success("Contrat mis à jour");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la mise à jour");
      console.error(error);
    },
  });
}

export function useDeleteContratLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, contactId }: { id: string; contactId: string }) => {
      const { error } = await supabase
        .from("contrats_location")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { contactId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["contrats-location", "contact", result.contactId] });
      queryClient.invalidateQueries({ queryKey: ["contrats-location"] });
      toast.success("Contrat supprimé");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de la suppression");
      console.error(error);
    },
  });
}
