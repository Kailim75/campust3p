import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GrilleEvaluation {
  id: string;
  examen_pratique_id: string;
  categorie: string;
  competence: string;
  note: string | null;
  commentaire: string | null;
  created_at: string;
}

export type GrilleEvaluationInsert = Omit<GrilleEvaluation, "id" | "created_at">;

// Predefined evaluation categories and competencies
export const categoriesEvaluation = {
  taxi: [
    {
      categorie: "technique",
      competences: [
        "Maîtrise du véhicule",
        "Comportement dans le trafic",
        "Respect du code de la route",
        "Gestion du taximètre",
        "Utilisation des équipements",
      ],
    },
    {
      categorie: "connaissance_territoire",
      competences: [
        "Connaissance des axes principaux",
        "Connaissance des points d'intérêt",
        "Optimisation des trajets",
        "Connaissance des adresses clés",
      ],
    },
    {
      categorie: "relation_client",
      competences: [
        "Accueil et prise en charge",
        "Communication avec le client",
        "Gestion des bagages",
        "Facturation et encaissement",
      ],
    },
    {
      categorie: "securite",
      competences: [
        "Contrôle du véhicule",
        "Vérifications préalables",
        "Conduite préventive",
        "Gestion des situations d'urgence",
      ],
    },
  ],
  vtc: [
    {
      categorie: "technique",
      competences: [
        "Maîtrise du véhicule",
        "Conduite souple et confortable",
        "Respect du code de la route",
        "Utilisation du GPS/Application",
      ],
    },
    {
      categorie: "relation_client",
      competences: [
        "Accueil personnalisé",
        "Présentation et tenue",
        "Gestion des réservations",
        "Service premium",
        "Discrétion professionnelle",
      ],
    },
    {
      categorie: "securite",
      competences: [
        "Conduite préventive",
        "Anticipation des dangers",
        "Gestion des situations complexes",
      ],
    },
  ],
  vmdtr: [
    {
      categorie: "technique",
      competences: [
        "Maîtrise du véhicule de prestige",
        "Conduite de confort",
        "Utilisation des équipements haut de gamme",
      ],
    },
    {
      categorie: "relation_client",
      competences: [
        "Service haut de gamme",
        "Protocole et étiquette",
        "Confidentialité",
        "Anticipation des besoins",
        "Gestion du stress client VIP",
      ],
    },
    {
      categorie: "securite",
      competences: [
        "Sécurité passagers VIP",
        "Vérifications renforcées",
        "Conduite défensive",
      ],
    },
  ],
};

export const notesEvaluation = [
  { value: "A", label: "A - Excellent", class: "bg-success text-success-foreground" },
  { value: "B", label: "B - Satisfaisant", class: "bg-info/10 text-info" },
  { value: "C", label: "C - À améliorer", class: "bg-warning/10 text-warning" },
  { value: "D", label: "D - Insuffisant", class: "bg-destructive/10 text-destructive" },
];

export function useExamenGrilles(examenPratiqueId: string | null) {
  return useQuery({
    queryKey: ["grilles-evaluation", examenPratiqueId],
    queryFn: async () => {
      if (!examenPratiqueId) return [];
      const { data, error } = await supabase
        .from("grilles_evaluation")
        .select("*")
        .eq("examen_pratique_id", examenPratiqueId)
        .order("categorie", { ascending: true });

      if (error) throw error;
      return data as GrilleEvaluation[];
    },
    enabled: !!examenPratiqueId,
  });
}

export function useSaveGrillesEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      examenPratiqueId, 
      grilles 
    }: { 
      examenPratiqueId: string; 
      grilles: GrilleEvaluationInsert[] 
    }) => {
      // Delete existing grilles for this exam
      await supabase
        .from("grilles_evaluation")
        .delete()
        .eq("examen_pratique_id", examenPratiqueId);

      // Insert new grilles
      if (grilles.length > 0) {
        const { error } = await supabase
          .from("grilles_evaluation")
          .insert(grilles);

        if (error) throw error;
      }

      return { examenPratiqueId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["grilles-evaluation", result.examenPratiqueId] });
      toast.success("Grille d'évaluation enregistrée");
    },
    onError: (error: any) => {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    },
  });
}
