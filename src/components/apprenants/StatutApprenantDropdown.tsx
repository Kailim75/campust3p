import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateContact } from "@/hooks/useContacts";
import { useUndoAction } from "@/hooks/useUndoAction";
import type { StatutApprenant } from "@/lib/apprenant-active";

const statusConfig: Record<StatutApprenant, { label: string; className: string }> = {
  actif: { label: "Actif", className: "bg-primary/10 text-primary border-primary/20" },
  diplome: { label: "Diplômé", className: "bg-success/10 text-success border-success/20" },
  abandon: { label: "Abandon", className: "bg-destructive/10 text-destructive border-destructive/20" },
  archive: { label: "Archivé", className: "bg-muted text-muted-foreground border-border" },
};

const statusOrder: StatutApprenant[] = ["actif", "diplome", "abandon", "archive"];

interface StatutApprenantDropdownProps {
  contactId: string;
  contactName: string;
  currentStatus: StatutApprenant | null;
  disabled?: boolean;
}

export function StatutApprenantDropdown({
  contactId,
  contactName,
  currentStatus,
  disabled = false,
}: StatutApprenantDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateContact = useUpdateContact();
  const { registerUndo } = useUndoAction();

  const status: StatutApprenant = currentStatus || "actif";
  const config = statusConfig[status];

  const handleChange = async (newStatus: StatutApprenant) => {
    if (newStatus === status) { setIsOpen(false); return; }
    const prev = status;
    try {
      await updateContact.mutateAsync({
        id: contactId,
        updates: { statut_apprenant: newStatus } as any,
      });
      registerUndo(
        `${contactName} → ${statusConfig[newStatus].label}`,
        async () => {
          await updateContact.mutateAsync({
            id: contactId,
            updates: { statut_apprenant: prev } as any,
          });
        }
      );
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update statut_apprenant:", error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || updateContact.isPending}>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            config.className,
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {updateContact.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <>
              {config.label}
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40" onClick={(e) => e.stopPropagation()}>
        {statusOrder.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleChange(s)}
            className="flex items-center justify-between"
          >
            <Badge variant="outline" className={cn("text-xs", statusConfig[s].className)}>
              {statusConfig[s].label}
            </Badge>
            {s === status && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
