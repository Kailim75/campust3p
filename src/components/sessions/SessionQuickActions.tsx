import { Button } from "@/components/ui/button";
import { Mail, FileDown, GraduationCap, Download, Shield, CheckCircle2 } from "lucide-react";

interface SessionQuickActionsProps {
  onSendDocuments: () => void;
  onSendEmail: () => void;
  onManageExams: () => void;
  onExport: () => void;
  onPackAudit?: () => void;
  onCloseSession?: () => void;
  inscriptionCount: number;
  archived?: boolean;
  isTerminee?: boolean;
}

export function SessionQuickActions({
  onSendDocuments,
  onSendEmail,
  onManageExams,
  onExport,
  onPackAudit,
  onCloseSession,
  inscriptionCount,
  archived,
  isTerminee,
}: SessionQuickActionsProps) {
  if (archived) return null;

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
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
      {onPackAudit && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          onClick={onPackAudit}
          disabled={inscriptionCount === 0}
        >
          <Shield className="h-3.5 w-3.5" />
          Pack Audit
        </Button>
      )}
      {onCloseSession && !isTerminee && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-success/30 text-success hover:bg-success/5"
          onClick={onCloseSession}
          disabled={inscriptionCount === 0}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Clôturer
        </Button>
      )}
    </div>
  );
}
