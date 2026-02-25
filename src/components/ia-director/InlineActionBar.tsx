// ═══════════════════════════════════════════════════════════════
// Inline Quick Action Bar — 1-click actions for anomalies
// ═══════════════════════════════════════════════════════════════

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Eye, ListTodo, Mail, MessageCircle, Phone, Send, Loader2,
} from "lucide-react";
import { useQuickAction, getInlineActions, type QuickActionType } from "@/hooks/useRealActionExecution";
import type { Anomaly } from "./audit/types";

const iconMap: Record<string, typeof Eye> = {
  eye: Eye,
  "list-todo": ListTodo,
  mail: Mail,
  "message-circle": MessageCircle,
  phone: Phone,
  send: Send,
};

interface Props {
  anomaly: Anomaly;
  compact?: boolean;
  onStatusChange?: (anomalyId: string, status: "in_progress" | "resolved") => void;
}

export default function InlineActionBar({ anomaly, compact = false, onStatusChange }: Props) {
  const navigate = useNavigate();
  const quickAction = useQuickAction();
  const [confirmAction, setConfirmAction] = useState<{ type: QuickActionType; message: string } | null>(null);
  const [executingType, setExecutingType] = useState<string | null>(null);

  const actions = getInlineActions(anomaly);

  const execute = async (type: QuickActionType) => {
    setExecutingType(type);
    try {
      await quickAction.mutateAsync({
        anomaly,
        actionType: type,
        navigateFn: (path) => navigate(path),
      });
      // Auto-update status to in_progress for real actions
      if (type !== "open_filtered_view" && type !== "mark_resolved" && type !== "mark_ignored") {
        onStatusChange?.(anomaly.id, "in_progress");
      }
    } finally {
      setExecutingType(null);
    }
  };

  const handleClick = (type: QuickActionType, confirmation?: string) => {
    if (confirmation) {
      setConfirmAction({ type, message: confirmation });
    } else {
      execute(type);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {actions.slice(0, compact ? 3 : actions.length).map((action) => {
          const Icon = iconMap[action.icon] || Eye;
          const isExecuting = executingType === action.type;
          return (
            <Button
              key={action.type}
              variant={action.variant || "default"}
              size="sm"
              className="h-6 text-[10px] px-2 gap-1"
              disabled={isExecuting || quickAction.isPending}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(action.type, action.confirmation);
              }}
            >
              {isExecuting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
              {!compact && action.label}
            </Button>
          );
        })}
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'action</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (confirmAction) execute(confirmAction.type);
              setConfirmAction(null);
            }}>
              Exécuter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
