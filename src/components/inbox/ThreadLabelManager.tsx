import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tags, Check, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ALL_CRM_LABELS, CrmLabelBadge } from "./CrmLabelBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ThreadLabelManagerProps {
  threadId: string;
  centreId: string;
  currentLabels: string[];
}

export function ThreadLabelManager({ threadId, centreId, currentLabels }: ThreadLabelManagerProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const toggleLabel = useMutation({
    mutationFn: async ({ label, add }: { label: string; add: boolean }) => {
      const { error } = await supabase.functions.invoke("gmail-thread-actions", {
        body: {
          threadId,
          centreId,
          action: add ? "add_labels" : "remove_labels",
          labels: [label],
        },
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-thread", threadId] });
      toast.success(vars.add ? "Label ajouté" : "Label retiré");
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <Tags className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Gérer les libellés
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-56 p-2">
        <p className="text-xs font-medium text-muted-foreground px-2 py-1.5 mb-1">
          Libellés CRM
        </p>
        <div className="space-y-0.5">
          {ALL_CRM_LABELS.map((label) => {
            const isActive = currentLabels.includes(label);
            return (
              <button
                key={label}
                onClick={() => toggleLabel.mutate({ label, add: !isActive })}
                disabled={toggleLabel.isPending}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors",
                  isActive
                    ? "bg-accent"
                    : "hover:bg-muted"
                )}
              >
                <CrmLabelBadge label={label} size="sm" />
                {isActive ? (
                  <X className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Check className="h-3 w-3 text-transparent" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
