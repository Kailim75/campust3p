import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BimProjet } from "@/hooks/useBimProjets";
import { BimScene } from "@/hooks/useBimScenes";
import { BimProgression } from "@/hooks/useBimProgressions";

interface BimProjetWithScenes extends BimProjet {
  scenes: BimScene[];
}

export function useLearnerBimProjets(contactId: string | null) {
  return useQuery({
    queryKey: ["learner-bim-projets", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      // Get active (published) BIM projects - using 'actif' status
      const { data: projets, error: projetsError } = await supabase
        .from("bim_projets")
        .select("*")
        .eq("statut", "actif")
        .order("created_at", { ascending: false });

      if (projetsError) throw projetsError;

      // Get all scenes for these projects
      const projetIds = projets?.map((p) => p.id) || [];
      if (projetIds.length === 0) return [];

      const { data: scenes, error: scenesError } = await supabase
        .from("bim_scenes")
        .select("*")
        .in("projet_id", projetIds)
        .eq("actif", true)
        .order("ordre", { ascending: true });

      if (scenesError) throw scenesError;

      // Get progressions for this contact
      const { data: progressions, error: progressionsError } = await supabase
        .from("bim_progressions")
        .select("*")
        .eq("contact_id", contactId)
        .in("projet_id", projetIds);

      if (progressionsError) throw progressionsError;

      // Combine data
      const projetsWithScenes: (BimProjetWithScenes & { progression?: BimProgression })[] =
        (projets || []).map((projet) => ({
          ...(projet as BimProjet),
          scenes: (scenes || []).filter((s) => s.projet_id === projet.id) as BimScene[],
          progression: (progressions || []).find((p) => p.projet_id === projet.id) as
            | BimProgression
            | undefined,
        }));

      return projetsWithScenes;
    },
    enabled: !!contactId,
  });
}

export function useStartBimInteraction() {
  return async (
    contactId: string,
    projetId: string,
    sceneId: string
  ): Promise<string> => {
    // Check for existing interaction
    const { data: existing } = await supabase
      .from("bim_interactions")
      .select("id")
      .eq("contact_id", contactId)
      .eq("projet_id", projetId)
      .eq("scene_id", sceneId)
      .maybeSingle();

    if (existing) {
      // Update started_at if not set
      await supabase
        .from("bim_interactions")
        .update({ started_at: new Date().toISOString() })
        .eq("id", existing.id)
        .is("started_at", null);
      return existing.id;
    }

    // Create new interaction
    const { data, error } = await supabase
      .from("bim_interactions")
      .insert({
        contact_id: contactId,
        projet_id: projetId,
        scene_id: sceneId,
        statut: "en_cours",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  };
}

export function useCompleteBimScene() {
  return async (
    interactionId: string,
    contactId: string,
    projetId: string,
    sceneId: string,
    scorePct: number,
    seuilValidation: number,
    answers: Record<string, number>,
    tempsPasse: number
  ) => {
    const now = new Date().toISOString();
    const reussi = scorePct >= seuilValidation;

    // Update interaction
    await supabase
      .from("bim_interactions")
      .update({
        statut: reussi ? "valide" : "a_reprendre",
        completed_at: now,
        temps_passe_sec: tempsPasse,
      })
      .eq("id", interactionId);

    // Get attempt number
    const { count } = await supabase
      .from("bim_evaluations")
      .select("*", { count: "exact", head: true })
      .eq("contact_id", contactId)
      .eq("scene_id", sceneId);

    // Create evaluation
    await supabase.from("bim_evaluations").insert({
      contact_id: contactId,
      projet_id: projetId,
      scene_id: sceneId,
      interaction_id: interactionId,
      type_evaluation: "qcm_contextuel",
      tentative_numero: (count || 0) + 1,
      score_pct: scorePct,
      reussi,
      seuil_applique: seuilValidation,
      temps_passe_sec: tempsPasse,
      reponses_detail: answers,
      completed_at: now,
    });
  };
}
