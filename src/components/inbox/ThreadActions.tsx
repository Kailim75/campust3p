import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Archive, Trash2, MailOpen, Mail } from "lucide-react";
import { toast } from "sonner";

interface ThreadActionsProps {
  threadId: string;
  centreId: string;
  isUnread: boolean;
  onThreadRemoved?: () => void;
}

export function ThreadActions({ threadId, centreId, isUnread, onThreadRemoved }: ThreadActionsProps) {
  const queryClient = useQueryClient();

  const action = useMutation({
    mutationFn: async (params: { action: string; labels?: string[] }) => {
      const { error } = await supabase.functions.invoke("gmail-thread-actions", {
        body: { threadId, centreId, action: params.action, labels: params.labels },
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-thread", threadId] });
      const msgs: Record<string, string> = {
        archive: "Archivé",
        trash: "Mis à la corbeille",
        mark_read: "Marqué comme lu",
        mark_unread: "Marqué comme non lu",
        restore: "Restauré dans la boîte de réception",
      };
      toast.success(msgs[vars.action] || "Action effectuée");
      // Clear selection for destructive actions
      if ((vars.action === "archive" || vars.action === "trash") && onThreadRemoved) {
        onThreadRemoved();
      }
    },
    onError: (e: any) => toast.error("Erreur: " + e.message),
  });

  const actions = [
    { key: "archive", label: "Archiver", icon: Archive },
    { key: "trash", label: "Corbeille", icon: Trash2 },
    {
      key: isUnread ? "mark_read" : "mark_unread",
      label: isUnread ? "Marquer comme lu" : "Marquer comme non lu",
      icon: isUnread ? MailOpen : Mail,
    },
  ];

  return (
    <div className="flex items-center gap-0.5">
      {actions.map((a) => (
        <Tooltip key={a.key}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => action.mutate({ action: a.key })}
              disabled={action.isPending}
            >
              <a.icon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            {a.label}
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
