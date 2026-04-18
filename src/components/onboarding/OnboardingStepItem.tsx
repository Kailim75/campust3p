import { motion } from "framer-motion";
import { Check, Circle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { onboardingChecklistL10n } from "./locales/fr";
import type { OnboardingStep } from "@/hooks/useOnboardingProgress";

interface Props {
  step: OnboardingStep;
  highlighted: boolean;
  onCta: (step: OnboardingStep) => void;
  onSkip?: (step: OnboardingStep) => void;
}

export function OnboardingStepItem({ step, highlighted, onCta, onSkip }: Props) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: step.completed ? 0.6 : 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      aria-label={`${step.title}${step.completed ? " — terminé" : ""}`}
      className={cn(
        "rounded-lg border p-3 transition-colors",
        highlighted && !step.completed
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <motion.span
          key={String(step.completed)}
          initial={step.completed ? { scale: 1 } : false}
          animate={step.completed ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
          className={cn(
            "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
            step.completed
              ? "bg-success text-success-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {step.completed ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
        </motion.span>

        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-snug",
              step.completed && "line-through text-muted-foreground",
            )}
          >
            {step.title}
          </p>
          {!step.completed && (
            <p className="mt-0.5 text-xs text-muted-foreground">{step.hint}</p>
          )}

          {!step.completed && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onCta(step)}>
                {step.ctaLabel}
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
              {step.skippable && onSkip && (
                <Button size="sm" variant="ghost" onClick={() => onSkip(step)}>
                  {onboardingChecklistL10n.sheet.later}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  );
}
