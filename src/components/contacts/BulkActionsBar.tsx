import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, UserPlus, Send, FileText } from "lucide-react";
import type { Contact } from "@/hooks/useContacts";

interface BulkActionsBarProps {
  selectedContacts: Contact[];
  onClearSelection: () => void;
  onBulkEnroll: () => void;
  onBulkSendDocuments: () => void;
}

export function BulkActionsBar({
  selectedContacts,
  onClearSelection,
  onBulkEnroll,
  onBulkSendDocuments,
}: BulkActionsBarProps) {
  if (selectedContacts.length === 0) return null;

  const withEmail = selectedContacts.filter((contact) => contact.email).length;
  const withoutEmail = selectedContacts.length - withEmail;

  return (
    <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 animate-in slide-in-from-top-2 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="text-sm font-medium">
          {selectedContacts.length} sélectionné(s)
        </Badge>
        <Badge variant="outline" className="text-xs">
          {withEmail} avec email
        </Badge>
        {withoutEmail > 0 && (
          <Badge variant="outline" className="text-xs">
            {withoutEmail} sans email
          </Badge>
        )}
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-1" />
          Désélectionner
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onBulkEnroll}>
          <UserPlus className="h-4 w-4 mr-2" />
          Inscrire à une session
        </Button>
        <Button variant="outline" size="sm" onClick={onBulkSendDocuments}>
          <Send className="h-4 w-4 mr-2" />
          Envoyer des documents
        </Button>
      </div>
    </div>
  );
}
