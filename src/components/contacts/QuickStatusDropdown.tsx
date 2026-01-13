import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateContact, type Contact } from "@/hooks/useContacts";
import { toast } from "sonner";

const statusConfig = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info border-info/20" },
  "Client": { label: "Client", class: "bg-success/10 text-success border-success/20" },
  "Bravo": { label: "Bravo", class: "bg-warning/10 text-warning border-warning/20" },
};

type ContactStatus = keyof typeof statusConfig;

interface QuickStatusDropdownProps {
  contact: Contact;
}

export function QuickStatusDropdown({ contact }: QuickStatusDropdownProps) {
  const updateContact = useUpdateContact();
  const currentStatus = (contact.statut ?? "En attente de validation") as ContactStatus;

  const handleStatusChange = async (newStatus: ContactStatus) => {
    if (newStatus === currentStatus) return;
    
    try {
      await updateContact.mutateAsync({
        id: contact.id,
        updates: { statut: newStatus },
      });
      toast.success(`Statut changé en "${statusConfig[newStatus].label}"`);
    } catch {
      toast.error("Erreur lors du changement de statut");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button className="flex items-center gap-1 focus:outline-none">
          <Badge
            variant="outline"
            className={cn(
              "text-xs cursor-pointer hover:opacity-80 transition-opacity",
              statusConfig[currentStatus]?.class ?? "bg-muted"
            )}
          >
            {statusConfig[currentStatus]?.label ?? currentStatus}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {(Object.keys(statusConfig) as ContactStatus[]).map((status) => (
          <DropdownMenuItem
            key={status}
            onClick={() => handleStatusChange(status)}
            className="flex items-center justify-between gap-2"
          >
            <Badge
              variant="outline"
              className={cn("text-xs", statusConfig[status].class)}
            >
              {statusConfig[status].label}
            </Badge>
            {status === currentStatus && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
