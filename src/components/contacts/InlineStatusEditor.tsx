import { useState } from "react";
import { useUpdateContact } from "@/hooks/useContacts";
import { useUndoAction } from "@/hooks/useUndoAction";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Database } from "@/integrations/supabase/types";

type ContactStatut = Database["public"]["Enums"]["contact_statut"];

interface InlineStatusEditorProps {
  contactId: string;
  currentStatus: ContactStatut | null;
  contactName: string;
  disabled?: boolean;
}

const statusConfig: Record<ContactStatut, { label: string; className: string }> = {
  "En attente de validation": { label: "En attente", className: "bg-amber-500/10 text-amber-700 hover:bg-amber-500/20" },
  "Client": { label: "Client", className: "bg-blue-500/10 text-blue-700 hover:bg-blue-500/20" },
  "Bravo": { label: "Bravo", className: "bg-green-500/10 text-green-700 hover:bg-green-500/20" },
  "En formation théorique": { label: "Formation théo.", className: "bg-indigo-500/10 text-indigo-700 hover:bg-indigo-500/20" },
  "Examen T3P programmé": { label: "Examen T3P", className: "bg-purple-500/10 text-purple-700 hover:bg-purple-500/20" },
  "T3P obtenu": { label: "T3P obtenu", className: "bg-teal-500/10 text-teal-700 hover:bg-teal-500/20" },
  "En formation pratique": { label: "Formation prat.", className: "bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20" },
  "Examen pratique programmé": { label: "Examen prat.", className: "bg-violet-500/10 text-violet-700 hover:bg-violet-500/20" },
  "Abandonné": { label: "Abandonné", className: "bg-destructive/10 text-destructive hover:bg-destructive/20" },
};

const statusOrder: ContactStatut[] = [
  "En attente de validation",
  "Client",
  "En formation théorique",
  "Examen T3P programmé",
  "T3P obtenu",
  "En formation pratique",
  "Examen pratique programmé",
  "Bravo",
  "Abandonné",
];

export function InlineStatusEditor({ 
  contactId, 
  currentStatus, 
  contactName,
  disabled = false 
}: InlineStatusEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const updateContact = useUpdateContact();
  const { registerUndo } = useUndoAction();
  
  const status = currentStatus || "En attente de validation";
  const config = statusConfig[status];
  
  const handleStatusChange = async (newStatus: ContactStatut) => {
    if (newStatus === status) {
      setIsOpen(false);
      return;
    }
    
    const previousStatus = status;
    
    try {
      await updateContact.mutateAsync({
        id: contactId,
        updates: { statut: newStatus },
      });
      
      // Register undo action
      registerUndo(
        `Statut de ${contactName} changé en "${statusConfig[newStatus].label}"`,
        async () => {
          await updateContact.mutateAsync({
            id: contactId,
            updates: { statut: previousStatus },
          });
        }
      );
      
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || updateContact.isPending}>
        <button
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            config.className,
            disabled && "opacity-50 cursor-not-allowed"
          )}
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
      <DropdownMenuContent align="start" className="w-48">
        {statusOrder.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleStatusChange(s)}
            className="flex items-center justify-between"
          >
            <span className={cn(
              "text-sm",
              s === status && "font-medium"
            )}>
              {statusConfig[s].label}
            </span>
            {s === status && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
