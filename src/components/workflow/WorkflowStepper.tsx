import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, Circle } from "lucide-react";

interface StepDef {
  label: string;
  isComplete: boolean;
  tooltip?: string;
}

interface WorkflowStepperProps {
  steps: StepDef[];
}

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  const completedCount = steps.filter((s) => s.isComplete).length;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-0.5 w-full">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <div key={step.label} className="flex items-center flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1 cursor-help">
                    {step.isComplete ? (
                      <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" strokeWidth={2.5} />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" strokeWidth={1.5} />
                    )}
                    <span className={cn(
                      "text-[9px] font-medium text-center leading-tight whitespace-nowrap",
                      step.isComplete ? "text-success" : "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{step.tooltip || step.label}</p>
                </TooltipContent>
              </Tooltip>
              {!isLast && (
                <div className={cn(
                  "flex-1 h-px mx-1 mt-[-14px]",
                  step.isComplete ? "bg-success/40" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
