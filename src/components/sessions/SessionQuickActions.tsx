import { Button } from "@/components/ui/button";
import { Mail, FileDown, GraduationCap, Download } from "lucide-react";

interface SessionQuickActionsProps {
  onSendDocuments: () => void;
  onSendEmail: () => void;
  onManageExams: () => void;
  onExport: () => void;
  inscriptionCount: number;
  archived?: boolean;
}

export function SessionQuickActions({
  onSendDocuments,
  onSendEmail,
  onManageExams,
  onExport,
  inscriptionCount,
  archived,
}: SessionQuickActionsProps) {
  if (archived) return null;

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        onClick={onSendDocuments}
        disabled={inscriptionCount === 0}
      >
        <FileDown className="h-3.5 w-3.5" />
        Documents
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        onClick={onSendEmail}
        disabled={inscriptionCount === 0}
      >
        <Mail className="h-3.5 w-3.5" />
        Email
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        onClick={onManageExams}
        disabled={inscriptionCount === 0}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Examens
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        onClick={onExport}
        disabled={inscriptionCount === 0}
      >
        <Download className="h-3.5 w-3.5" />
        Exporter
      </Button>
    </div>
  );
}
