import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { ChevronUp, Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { onboardingChecklistL10n } from "./locales/fr";
import { OnboardingStepItem } from "./OnboardingStepItem";
import { useOnboardingProgress, type OnboardingStep } from "@/hooks/useOnboardingProgress";

function fireConfetti() {
  const duration = 2500;
  const end = Date.now() + duration;
  const colors = ["#1B6CA8", "#22c55e", "#facc15"];
  (function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function OnboardingChecklist() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const celebratedRef = useRef(false);

  const {
    steps,
    completedCount,
    total,
    progress,
    allCompleted,
    dismissed,
    isReady,
    skipStep,
    dismiss,
  } = useOnboardingProgress(!hidden);

  // Celebration once 100% reached
  useEffect(() => {
    if (!isReady || dismissed || hidden) return;
    if (allCompleted && !celebratedRef.current) {
      celebratedRef.current = true;
      fireConfetti();
      toast.success(onboardingChecklistL10n.celebration.toast);
      // Persist + hide after the animation
      window.setTimeout(async () => {
        try {
          await dismiss();
        } finally {
          setOpen(false);
          setHidden(true);
        }
      }, 2800);
    }
  }, [allCompleted, isReady, dismissed, hidden, dismiss]);

  if (!isReady || dismissed || hidden) return null;

  const firstPending = steps.find((s) => !s.completed);

  const handleCta = (step: OnboardingStep) => {
    setOpen(false);
    navigate(step.route);
  };

  const handleSkip = (step: OnboardingStep) => {
    skipStep(step.id);
    toast(onboardingChecklistL10n.sheet.skipped);
  };

  return (
    <>
      {/* Floating widget — above AIAssistant button (which sits at bottom-6) */}
      <AnimatePresence>
        {!open && (
          <motion.div
            key="onboarding-widget"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="fixed bottom-24 right-6 z-50 w-[320px] max-w-[calc(100vw-2rem)]"
          >
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label={`${onboardingChecklistL10n.widget.title} — ${completedCount}/${total} terminés`}
              className={cn(
                "group w-full rounded-xl border bg-card p-3 text-left shadow-md",
                "transition-all hover:-translate-y-0.5 hover:shadow-lg",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {onboardingChecklistL10n.widget.title}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  {onboardingChecklistL10n.widget.progress(completedCount, total)}
                  <ChevronUp className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" />
                </span>
              </div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "spring", stiffness: 200, damping: 28 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary to-success"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{progress}%</p>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {onboardingChecklistL10n.sheet.title}
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              {onboardingChecklistL10n.sheet.subtitle(completedCount, total, progress)}
            </p>
            <Progress value={progress} className="h-2" />
          </div>

          <ul className="mt-6 space-y-2">
            {steps.map((step) => (
              <OnboardingStepItem
                key={step.id}
                step={step}
                highlighted={firstPending?.id === step.id}
                onCta={handleCta}
                onSkip={step.skippable ? handleSkip : undefined}
              />
            ))}
          </ul>

          {allCompleted && (
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await dismiss();
                  setHidden(true);
                  setOpen(false);
                }}
              >
                <X className="mr-1 h-4 w-4" /> Fermer
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
