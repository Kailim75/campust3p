import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface DocumentTemplate {
  id: string;
  nom: string;
  type_document: string;
  categorie: string;
  contenu: string;
  variables: string[] | null;
  actif: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentTemplateInsert = Omit<DocumentTemplate, "id" | "created_at" | "updated_at">;

export const documentTypes = [
  { value: "convention", label: "Convention de formation" },
  { value: "contrat", label: "Contrat de formation" },
  { value: "contrat_location", label: "Contrat de location de voiture" },
  { value: "attestation", label: "Attestation de formation" },
  { value: "convocation", label: "Convocation" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "facture", label: "Facture" },
  { value: "devis", label: "Devis" },
  { value: "autre", label: "Autre" },
] as const;

export const documentCategories = [
  { value: "formation", label: "Formation" },
  { value: "administratif", label: "Administratif" },
  { value: "communication", label: "Communication" },
  { value: "comptabilite", label: "Comptabilité" },
] as const;

// Variables disponibles pour la personnalisation
// Table de mapping: {{placeholder}} → champ base de données
export const availableVariables = [
  // Contact - Identité
  { key: "civilite", label: "Civilité", category: "Contact" },
  { key: "nom", label: "Nom", category: "Contact" },
  { key: "prenom", label: "Prénom", category: "Contact" },
  { key: "nom_complet", label: "Nom complet (Prénom Nom)", category: "Contact" },
  { key: "email", label: "Email", category: "Contact" },
  { key: "telephone", label: "Téléphone", category: "Contact" },
  
  // Contact - Adresse (aliases: adresse_apprenant, ADRESSE, rue_apprenant)
  { key: "rue", label: "Adresse (rue)", category: "Contact" },
  { key: "code_postal", label: "Code postal", category: "Contact" },
  { key: "ville", label: "Ville", category: "Contact" },
  { key: "adresse", label: "Adresse complète", category: "Contact" },
  
  // Contact - Naissance (aliases: DATE_NAISSANCE, LIEU_NAISSANCE, PAYS, etc.)
  { key: "date_naissance", label: "Date de naissance", category: "Contact" },
  { key: "ville_naissance", label: "Ville de naissance", category: "Contact" },
  { key: "pays_naissance", label: "Pays de naissance", category: "Contact" },
  { key: "lieu_naissance", label: "Lieu de naissance (ville, pays)", category: "Contact" },
  
  // Contact - Permis
  { key: "numero_permis", label: "N° Permis", category: "Contact" },
  { key: "prefecture_permis", label: "Préfecture permis", category: "Contact" },
  { key: "date_delivrance_permis", label: "Date délivrance permis", category: "Contact" },
  
  // Contact - Carte professionnelle (aliases: NUMERO_CARTE, carte_pro, n_carte, carte_taxi, etc.)
  { key: "numero_carte_professionnelle", label: "N° Carte professionnelle", category: "Contact" },
  { key: "prefecture_carte", label: "Préfecture carte", category: "Contact" },
  { key: "date_expiration_carte", label: "Date expiration carte", category: "Contact" },
  { key: "formation", label: "Type de formation", category: "Contact" },
  
  // Certificat / Attestation
  { key: "numero_certificat", label: "N° Certificat unique", category: "Certificat" },
  { key: "date_emission_certificat", label: "Date émission certificat", category: "Certificat" },
  
  // Session
  { key: "session_nom", label: "Nom de la session", category: "Session" },
  { key: "session_numero", label: "Numéro de session", category: "Session" },
  { key: "session_date_debut", label: "Date de début", category: "Session" },
  { key: "session_date_fin", label: "Date de fin", category: "Session" },
  { key: "dates_formation", label: "Période (début au fin)", category: "Session" },
  { key: "session_heure_debut", label: "Heure de début", category: "Session" },
  { key: "session_heure_fin", label: "Heure de fin", category: "Session" },
  { key: "horaires", label: "Horaires complets", category: "Session" },
  { key: "session_lieu", label: "Lieu (ancien)", category: "Session" },
  { key: "session_adresse_rue", label: "Adresse (rue)", category: "Session" },
  { key: "session_adresse_code_postal", label: "Code postal", category: "Session" },
  { key: "session_adresse_ville", label: "Ville", category: "Session" },
  { key: "session_adresse_complete", label: "Adresse complète", category: "Session" },
  { key: "session_formateur", label: "Formateur", category: "Session" },
  { key: "session_prix_ht", label: "Prix HT", category: "Session" },
  { key: "session_tva_percent", label: "TVA (%)", category: "Session" },
  { key: "session_prix_ttc", label: "Prix TTC", category: "Session" },
  { key: "duree_heures", label: "Durée (heures)", category: "Session" },
  { key: "session_places", label: "Places totales", category: "Session" },
  { key: "session_objectifs", label: "Objectifs", category: "Session" },
  { key: "session_prerequis", label: "Prérequis", category: "Session" },
  { key: "formation_type", label: "Type de formation session", category: "Session" },
  
  // Centre de formation
  { key: "centre_nom", label: "Nom du centre", category: "Centre" },
  { key: "centre_adresse", label: "Adresse du centre", category: "Centre" },
  { key: "centre_telephone", label: "Téléphone du centre", category: "Centre" },
  { key: "centre_email", label: "Email du centre", category: "Centre" },
  { key: "centre_siret", label: "SIRET du centre", category: "Centre" },
  { key: "centre_nda", label: "N° Déclaration Activité", category: "Centre" },
  
  // Dates
  { key: "date_jour", label: "Date du jour", category: "Dates" },
  { key: "date_generation", label: "Date de génération", category: "Dates" },
  { key: "fait_le", label: "Fait le (date longue)", category: "Dates" },
  
  // Véhicule (pour contrats de location)
  { key: "vehicule_immatriculation", label: "Plaque d'immatriculation", category: "Véhicule" },
  { key: "vehicule_marque", label: "Marque du véhicule", category: "Véhicule" },
  { key: "vehicule_modele", label: "Modèle du véhicule", category: "Véhicule" },
  { key: "vehicule_type", label: "Type de véhicule", category: "Véhicule" },
  
  // Contrat de location
  { key: "contrat_numero", label: "Numéro de contrat", category: "Location" },
  { key: "contrat_date_debut", label: "Date de début de location", category: "Location" },
  { key: "contrat_date_fin", label: "Date de fin de location", category: "Location" },
  { key: "contrat_montant_mensuel", label: "Montant mensuel (€)", category: "Location" },
  { key: "contrat_montant_caution", label: "Montant caution (€)", category: "Location" },
  { key: "contrat_objet", label: "Objet de la location", category: "Location" },
] as const;

/**
 * Table de correspondance des alias de placeholders
 * Permet aux templates d'utiliser différentes variantes de nommage
 */
export const placeholderAliases: Record<string, string[]> = {
  // Adresse
  rue: ["ADRESSE", "adresse_rue", "rue_apprenant", "street"],
  code_postal: ["CODE_POSTAL", "cp", "cp_apprenant", "code_postal_apprenant", "zip"],
  ville: ["VILLE", "ville_apprenant", "city"],
  adresse: ["adresse_complete", "adresse_apprenant", "adresse_stagiaire", "full_address"],
  
  // Naissance
  date_naissance: ["DATE_NAISSANCE", "DATE_DE_NAISSANCE", "date_de_naissance", "birth_date", "ne_le"],
  ville_naissance: ["VILLE_NAISSANCE", "ville_de_naissance", "birth_city", "ne_a"],
  pays_naissance: ["PAYS_NAISSANCE", "PAYS", "pays", "pays_de_naissance", "birth_country"],
  lieu_naissance: ["LIEU_NAISSANCE", "LIEU_DE_NAISSANCE", "lieu_de_naissance", "birth_place"],
  
  // Carte professionnelle
  numero_carte_professionnelle: [
    "NUMERO_CARTE_PROFESSIONNELLE", "NUMERO_CARTE", "numero_carte", "carte_pro", "CARTE_PRO",
    "n_carte", "N_CARTE", "no_carte", "num_carte", "carte_taxi", "carte_vtc",
    "numero_taxi", "numero_vtc", "professional_card_number", "card_number"
  ],
  prefecture_carte: ["PREFECTURE_CARTE", "carte_prefecture", "prefecture_delivrance_carte", "PREFECTURE_DELIVRANCE"],
  date_expiration_carte: ["DATE_EXPIRATION_CARTE", "carte_expiration", "date_expiration_carte_pro"],
  
  // Certificat
  numero_certificat: ["certificate_number", "certificat_numero", "reference_certificat", "ref_certificat", "attestation_numero"],
};

export function useDocumentTemplates() {
  return useQuery({
    queryKey: ["document-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .order("categorie", { ascending: true })
        .order("nom", { ascending: true });

      if (error) throw error;
      return data as DocumentTemplate[];
    },
  });
}

export function useDocumentTemplate(id: string | null) {
  return useQuery({
    queryKey: ["document-template", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as DocumentTemplate;
    },
    enabled: !!id,
  });
}

export function useCreateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: DocumentTemplateInsert) => {
      const { data, error } = await supabase
        .from("document_templates")
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Modèle créé avec succès");
    },
    onError: (error) => {
      console.error("Create error:", error);
      toast.error("Erreur lors de la création du modèle");
    },
  });
}

export function useUpdateDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DocumentTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from("document_templates")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Modèle mis à jour");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteDocumentTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("document_templates")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["document-templates"] });
      toast.success("Modèle supprimé");
    },
    onError: (error) => {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

// Fonction pour extraire les variables d'un texte
export function extractVariables(text: string): string[] {
  const regex = /\{\{(\w+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(text)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

// Helper function to escape HTML entities to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Fonction pour remplacer les variables par les valeurs (avec échappement HTML)
export function replaceVariables(
  template: string,
  contact: Record<string, any>,
  session?: Record<string, any>,
  vehicule?: Record<string, any>,
  contratLocation?: Record<string, any>
): string {
  let result = template;
  
  // Variables du contact - escape HTML to prevent XSS
  Object.entries(contact).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    const safeValue = escapeHtml(value?.toString() || "");
    result = result.replace(regex, safeValue);
  });
  
  // Variables de session - escape HTML to prevent XSS
  if (session) {
    result = result.replace(/\{\{session_nom\}\}/g, escapeHtml(session.nom || ""));
    result = result.replace(/\{\{session_numero\}\}/g, escapeHtml(session.numero_session || ""));
    result = result.replace(/\{\{session_date_debut\}\}/g, escapeHtml(session.date_debut || ""));
    result = result.replace(/\{\{session_date_fin\}\}/g, escapeHtml(session.date_fin || ""));
    result = result.replace(/\{\{session_heure_debut\}\}/g, escapeHtml(session.heure_debut || ""));
    result = result.replace(/\{\{session_heure_fin\}\}/g, escapeHtml(session.heure_fin || ""));
    result = result.replace(/\{\{session_lieu\}\}/g, escapeHtml(session.lieu || ""));
    result = result.replace(/\{\{session_adresse_rue\}\}/g, escapeHtml(session.adresse_rue || ""));
    result = result.replace(/\{\{session_adresse_code_postal\}\}/g, escapeHtml(session.adresse_code_postal || ""));
    result = result.replace(/\{\{session_adresse_ville\}\}/g, escapeHtml(session.adresse_ville || ""));
    
    // Adresse complète formatée
    const adresseParts = [];
    if (session.adresse_rue) adresseParts.push(session.adresse_rue);
    if (session.adresse_code_postal || session.adresse_ville) {
      adresseParts.push(`${session.adresse_code_postal || ""} ${session.adresse_ville || ""}`.trim());
    }
    const adresseComplete = adresseParts.join(", ") || session.lieu || "";
    result = result.replace(/\{\{session_adresse_complete\}\}/g, escapeHtml(adresseComplete));
    
    result = result.replace(/\{\{session_formateur\}\}/g, escapeHtml(session.formateur || ""));
    result = result.replace(/\{\{session_prix_ht\}\}/g, escapeHtml(session.prix_ht?.toString() || session.prix?.toString() || ""));
    result = result.replace(/\{\{session_tva_percent\}\}/g, escapeHtml(session.tva_percent?.toString() || "0"));
    
    // Calcul prix TTC
    const prixHT = session.prix_ht || session.prix || 0;
    const tva = session.tva_percent || 0;
    const prixTTC = prixHT * (1 + tva / 100);
    result = result.replace(/\{\{session_prix_ttc\}\}/g, escapeHtml(prixTTC.toFixed(2)));
    
    result = result.replace(/\{\{session_duree\}\}/g, escapeHtml(session.duree_heures?.toString() || ""));
    result = result.replace(/\{\{session_places\}\}/g, escapeHtml(session.places_totales?.toString() || ""));
    result = result.replace(/\{\{session_objectifs\}\}/g, escapeHtml(session.objectifs || ""));
    result = result.replace(/\{\{session_prerequis\}\}/g, escapeHtml(session.prerequis || ""));
  }
  
  // Variables véhicule (pour contrats de location)
  if (vehicule) {
    result = result.replace(/\{\{vehicule_immatriculation\}\}/g, escapeHtml(vehicule.immatriculation || ""));
    result = result.replace(/\{\{vehicule_marque\}\}/g, escapeHtml(vehicule.marque || ""));
    result = result.replace(/\{\{vehicule_modele\}\}/g, escapeHtml(vehicule.modele || ""));
    result = result.replace(/\{\{vehicule_type\}\}/g, escapeHtml(vehicule.type_vehicule || ""));
    result = result.replace(/\{\{immatriculation\}\}/g, escapeHtml(vehicule.immatriculation || ""));
    result = result.replace(/\{\{plaque\}\}/g, escapeHtml(vehicule.immatriculation || ""));
    result = result.replace(/\{\{plaque_immatriculation\}\}/g, escapeHtml(vehicule.immatriculation || ""));
    result = result.replace(/\{\{marque_vehicule\}\}/g, escapeHtml(vehicule.marque || ""));
    result = result.replace(/\{\{modele_vehicule\}\}/g, escapeHtml(vehicule.modele || ""));
    const voitureComplete = [vehicule.marque, vehicule.modele].filter(Boolean).join(" ");
    result = result.replace(/\{\{voiture\}\}/g, escapeHtml(voitureComplete));
    result = result.replace(/\{\{vehicule\}\}/g, escapeHtml(voitureComplete + (vehicule.immatriculation ? ` - ${vehicule.immatriculation}` : "")));
  }
  
  // Variables contrat de location
  if (contratLocation) {
    result = result.replace(/\{\{contrat_numero\}\}/g, escapeHtml(contratLocation.numero_contrat || ""));
    result = result.replace(/\{\{numero_contrat\}\}/g, escapeHtml(contratLocation.numero_contrat || ""));
    result = result.replace(/\{\{contrat_date_debut\}\}/g, escapeHtml(contratLocation.date_debut || ""));
    result = result.replace(/\{\{contrat_date_fin\}\}/g, escapeHtml(contratLocation.date_fin || ""));
    result = result.replace(/\{\{location_date_debut\}\}/g, escapeHtml(contratLocation.date_debut || ""));
    result = result.replace(/\{\{location_date_fin\}\}/g, escapeHtml(contratLocation.date_fin || ""));
    result = result.replace(/\{\{contrat_montant_mensuel\}\}/g, escapeHtml(contratLocation.montant_mensuel?.toFixed?.(2) || contratLocation.montant_mensuel?.toString() || ""));
    result = result.replace(/\{\{montant_mensuel\}\}/g, escapeHtml(contratLocation.montant_mensuel?.toFixed?.(2) || contratLocation.montant_mensuel?.toString() || ""));
    result = result.replace(/\{\{loyer_mensuel\}\}/g, escapeHtml(contratLocation.montant_mensuel?.toFixed?.(2) || contratLocation.montant_mensuel?.toString() || ""));
    result = result.replace(/\{\{contrat_montant_caution\}\}/g, escapeHtml(contratLocation.montant_caution?.toFixed?.(2) || contratLocation.montant_caution?.toString() || ""));
    result = result.replace(/\{\{montant_caution\}\}/g, escapeHtml(contratLocation.montant_caution?.toFixed?.(2) || contratLocation.montant_caution?.toString() || ""));
    result = result.replace(/\{\{caution\}\}/g, escapeHtml(contratLocation.montant_caution?.toFixed?.(2) || contratLocation.montant_caution?.toString() || ""));
    result = result.replace(/\{\{contrat_objet\}\}/g, escapeHtml(contratLocation.objet_location || ""));
    result = result.replace(/\{\{objet_location\}\}/g, escapeHtml(contratLocation.objet_location || ""));
  }
  
  // Variables de date
  const now = new Date();
  result = result.replace(/\{\{date_jour\}\}/g, escapeHtml(now.toLocaleDateString("fr-FR")));
  result = result.replace(/\{\{annee\}\}/g, escapeHtml(now.getFullYear().toString()));
  
  return result;
}

// Fonction pour exporter un template en fichier texte téléchargeable
export function downloadTemplateAsText(template: DocumentTemplate): void {
  const content = `=== ${template.nom} ===
Type: ${template.type_document}
Catégorie: ${template.categorie}
Description: ${template.description || "N/A"}
Variables utilisées: ${template.variables?.join(", ") || "Aucune"}

--- CONTENU DU MODÈLE ---

${template.contenu}
`;
  
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `modele-${template.type_document}-${template.nom.toLowerCase().replace(/\s+/g, "-")}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
