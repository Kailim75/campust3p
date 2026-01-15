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

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-4 p-3 bg-primary/5 border border-primary/20 rounded-lg animate-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <Badge variant="secondary" className="text-sm font-medium">
          {selectedContacts.length} sélectionné(s)
        </Badge>
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4 mr-1" />
          Désélectionner
        </Button>
      </div>

      <div className="flex items-center gap-2">
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
