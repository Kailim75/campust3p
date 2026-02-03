import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingData } from "./OnboardingWizard";

/**
 * Mapping formations vers catalogue avec nomenclature conforme
 * Format : [TYPE]-[METIER]-[ZONE]-v[VERSION]
 * 
 * Types: INIT (initiale), FC (continue), MOB (mobilité - TAXI uniquement)
 * Métiers: TAXI, VTC, VMDTR
 * Zones: NAT (national), 75, 92, 93, 94
 */
const FORMATION_CATALOGUE: Record<string, { code: string; intitule: string; categorie: string; type: string; duree: number; prix: number }[]> = {
  taxi: [
    { code: "INIT-TAXI-NAT-v1", intitule: "Formation initiale - Conducteur de Taxi", categorie: "Taxi", type: "initiale", duree: 250, prix: 2990 },
    { code: "FC-TAXI-NAT-v1", intitule: "Formation continue - Conducteur de Taxi", categorie: "Taxi", type: "continue", duree: 14, prix: 250 },
  ],
  vtc: [
    { code: "INIT-VTC-NAT-v1", intitule: "Formation initiale - Conducteur de VTC", categorie: "VTC", type: "initiale", duree: 250, prix: 2990 },
    { code: "FC-VTC-NAT-v1", intitule: "Formation continue - Conducteur de VTC", categorie: "VTC", type: "continue", duree: 14, prix: 250 },
  ],
  vmdtr: [
    { code: "INIT-VMDTR-NAT-v1", intitule: "Formation initiale - Conducteur de VMDTR", categorie: "VMDTR", type: "initiale", duree: 33, prix: 990 },
    { code: "FC-VMDTR-NAT-v1", intitule: "Formation continue - Conducteur de VMDTR", categorie: "VMDTR", type: "continue", duree: 14, prix: 250 },
  ],
};

export function useOnboardingSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [centreId, setCentreId] = useState<string | null>(null);

  const submit = async (data: OnboardingData) => {
    setIsSubmitting(true);
    
    try {
      // 1. Créer le centre
      const { data: centre, error: centreError } = await supabase
        .from("centres")
        .insert({
          nom: data.nomCentre,
          nom_commercial: data.nomCentre,
          email: data.email,
          telephone: data.telephone || null,
          adresse_complete: data.ville,
          plan_type: "starter",
          plan_start_date: new Date().toISOString().split("T")[0],
          actif: true,
        })
        .select()
        .single();

      if (centreError) throw centreError;
      setCentreId(centre.id);

      // 2. Associer l'utilisateur actuel comme admin du centre
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_centres").insert({
          user_id: user.id,
          centre_id: centre.id,
          is_primary: true,
        });
      }

      // 3. Créer les formations au catalogue (nomenclature conforme)
      const catalogueItems: any[] = [];
      for (const formationId of data.formations) {
        const items = FORMATION_CATALOGUE[formationId];
        if (items) {
          for (const item of items) {
            catalogueItems.push({
              code: item.code,
              intitule: item.intitule,
              categorie: item.categorie,
              type_formation: item.type,
              centre_id: centre.id,
              duree_heures: item.duree,
              prix_ht: item.prix,
              actif: true,
            });
          }
        }
      }

      if (catalogueItems.length > 0) {
        const { error: catalogueError } = await supabase
          .from("catalogue_formations")
          .insert(catalogueItems);
        
        if (catalogueError) {
          console.error("Erreur catalogue:", catalogueError);
          // Non bloquant
        }
      }

      // 4. Créer les comptes formateurs (si fournis)
      // Note: L'envoi d'emails se fait via Edge Function
      if (data.formateurs.length > 0) {
        for (const formateur of data.formateurs) {
          try {
            // Créer le formateur dans la table formateurs
            await supabase.from("formateurs").insert({
              nom: formateur.nom.split(" ").slice(-1)[0] || formateur.nom,
              prenom: formateur.nom.split(" ").slice(0, -1).join(" ") || "",
              email: formateur.email,
              centre_id: centre.id,
              specialites: data.formations.map((f) => f.toUpperCase()),
              actif: true,
            });
          } catch (e) {
            console.error("Erreur création formateur:", e);
          }
        }
      }

      toast.success("Centre configuré avec succès !");
      
    } catch (error: any) {
      console.error("Erreur onboarding:", error);
      toast.error("Une erreur est survenue lors de la configuration");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, centreId };
}
