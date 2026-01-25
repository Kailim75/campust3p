import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OnboardingData } from "./OnboardingWizard";

// Mapping formations vers catalogue
const FORMATION_CATALOGUE: Record<string, { code: string; intitule: string; categorie: string; type: string }[]> = {
  taxi: [
    { code: "TAXI-INIT", intitule: "Formation initiale Taxi", categorie: "Taxi", type: "Mobilité Taxi" },
    { code: "TAXI-CONT", intitule: "Formation continue Taxi", categorie: "Taxi", type: "Formation continue Taxi" },
  ],
  vtc: [
    { code: "VTC-INIT", intitule: "Formation initiale VTC", categorie: "VTC", type: "Mobilité VTC" },
    { code: "VTC-CONT", intitule: "Formation continue VTC", categorie: "VTC", type: "Formation continue VTC" },
  ],
  vmdtr: [
    { code: "VMDTR-INIT", intitule: "Formation initiale VMDTR", categorie: "VMDTR", type: "Mobilité VMDTR" },
    { code: "VMDTR-CONT", intitule: "Formation continue VMDTR", categorie: "VMDTR", type: "Formation continue VMDTR" },
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

      // 3. Créer les formations au catalogue
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
              duree_heures: formationId.includes("CONT") ? 14 : 140,
              prix_ht: formationId.includes("CONT") ? 250 : 1500,
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
