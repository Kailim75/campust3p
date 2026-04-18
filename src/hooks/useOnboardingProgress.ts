import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { useAuth } from "@/hooks/useAuth";
import { onboardingChecklistL10n, type OnboardingStepId } from "@/components/onboarding/locales/fr";

const STEP_ORDER: OnboardingStepId[] = [
  "customize_centre",
  "invite_team",
  "create_formation",
  "create_session",
  "add_apprenant",
  "configure_iban",
  "customize_email",
  "send_invoice",
];

const STEP_ROUTES: Record<OnboardingStepId, string> = {
  customize_centre: "/settings",
  invite_team: "/settings",
  create_formation: "/formations",
  create_session: "/sessions",
  add_apprenant: "/apprenants",
  configure_iban: "/settings",
  customize_email: "/automations",
  send_invoice: "/finances",
};

export interface OnboardingStep {
  id: OnboardingStepId;
  title: string;
  hint: string;
  ctaLabel: string;
  route: string;
  completed: boolean;
  skippable: boolean;
}

interface OnboardingState {
  dismissed_at: string | null;
  steps_skipped: string[];
}

export function useOnboardingProgress(enabled = true) {
  const { centreId } = useCentreContext();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const stateQuery = useQuery({
    queryKey: ["onboarding-state", user?.id],
    enabled: !!user?.id && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<OnboardingState> => {
      const { data, error } = await supabase
        .from("onboarding_state")
        .select("dismissed_at, steps_skipped")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return {
        dismissed_at: data?.dismissed_at ?? null,
        steps_skipped: Array.isArray(data?.steps_skipped) ? (data!.steps_skipped as string[]) : [],
      };
    },
  });

  const progressQuery = useQuery({
    queryKey: ["onboarding-progress", centreId, user?.id],
    enabled: !!centreId && !!user?.id && enabled && !stateQuery.data?.dismissed_at,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    refetchInterval: enabled ? 30_000 : false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_onboarding_progress", {
        p_centre_id: centreId!,
      });
      if (error) throw error;
      return data as Record<string, boolean | string[]>;
    },
  });

  const skipStep = useMutation({
    mutationFn: async (stepId: OnboardingStepId) => {
      const { error } = await supabase.rpc("skip_onboarding_step", { p_step_id: stepId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-progress"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-state"] });
    },
  });

  const dismiss = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("dismiss_onboarding_checklist");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding-state"] });
    },
  });

  const dismissed = !!stateQuery.data?.dismissed_at;
  const raw = progressQuery.data ?? {};

  const steps: OnboardingStep[] = STEP_ORDER.map((id) => {
    const meta = onboardingChecklistL10n.steps[id];
    return {
      id,
      title: meta.title,
      hint: meta.hint,
      ctaLabel: meta.cta,
      route: STEP_ROUTES[id],
      completed: !!raw[id],
      skippable: id === "invite_team",
    };
  });

  const completedCount = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const progress = Math.round((completedCount / total) * 100);
  const allCompleted = completedCount === total;

  return {
    steps,
    completedCount,
    total,
    progress,
    allCompleted,
    dismissed,
    isLoading: stateQuery.isLoading || progressQuery.isLoading,
    isReady: !!centreId && !!user?.id,
    skipStep: skipStep.mutate,
    dismiss: dismiss.mutateAsync,
  };
}
