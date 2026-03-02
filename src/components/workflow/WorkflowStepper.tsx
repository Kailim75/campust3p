import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";

export type StepStatus = "complete" | "active" | "blocked" | "pending";

export interface StepDef {
  label: string;
  status: StepStatus;
  tooltip?: string;
}

interface WorkflowStepperProps {
  steps: StepDef[];
}

const statusConfig: Record<StepStatus, { icon: typeof CheckCircle2; iconClass: string; labelClass: string; lineClass: string }> = {
  complete: {
    icon: CheckCircle2,
    iconClass: "text-success",
    labelClass: "text-success font-semibold",
    lineClass: "bg-success/50",
  },
  active: {
    icon: Circle,
    iconClass: "text-primary ring-2 ring-primary/20 rounded-full",
    labelClass: "text-primary font-semibold",
    lineClass: "bg-border",
  },
  blocked: {
    icon: AlertCircle,
    iconClass: "text-warning",
    labelClass: "text-warning font-medium",
    lineClass: "bg-border",
  },
  pending: {
    icon: Circle,
    iconClass: "text-muted-foreground/30",
    labelClass: "text-muted-foreground/60",
    lineClass: "bg-border",
  },
};

export function WorkflowStepper({ steps }: WorkflowStepperProps) {
  return (
    <TooltipProvider>
      <div className="flex items-center w-full">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const config = statusConfig[step.status];
          const Icon = step.status === "complete" ? CheckCircle2 : step.status === "blocked" ? AlertCircle : Circle;

          return (
            <div key={step.label} className="flex items-center flex-1 min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col items-center gap-1.5 cursor-help">
                    <div className={cn(
                      "flex items-center justify-center rounded-full transition-all",
                      step.status === "active" && "ring-[3px] ring-primary/20"
                    )}>
                      <Icon
                        className={cn("h-[18px] w-[18px] flex-shrink-0 transition-colors", config.iconClass)}
                        strokeWidth={step.status === "complete" ? 2.5 : step.status === "active" ? 2.5 : 1.5}
                        fill={step.status === "active" ? "hsl(var(--primary) / 0.15)" : "none"}
                      />
                    </div>
                    <span className={cn(
                      "text-[10px] text-center leading-tight whitespace-nowrap transition-colors",
                      config.labelClass
                    )}>
                      {step.label}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">{step.tooltip || step.label}</p>
                </TooltipContent>
              </Tooltip>
              {!isLast && (
                <div className={cn(
                  "flex-1 h-[2px] mx-2 mt-[-16px] rounded-full transition-colors",
                  config.lineClass
                )} />
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
