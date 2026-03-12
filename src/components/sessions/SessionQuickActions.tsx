import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Mail, FileDown, GraduationCap, Download, Shield, CheckCircle2, MoreHorizontal } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

  if (archived) return null;

  const disabled = inscriptionCount === 0;

  // Mobile: show 2 primary buttons + overflow menu
  if (isMobile) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 flex-1"
          onClick={onSendDocuments}
          disabled={disabled}
        >
          <FileDown className="h-3.5 w-3.5" />
          Documents
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1 flex-1"
          onClick={onSendEmail}
          disabled={disabled}
        >
          <Mail className="h-3.5 w-3.5" />
          Email
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 w-8 p-0 flex-shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onManageExams} disabled={disabled}>
              <GraduationCap className="h-4 w-4 mr-2" />
              Examens
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport} disabled={disabled}>
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </DropdownMenuItem>
            {onPackAudit && (
              <DropdownMenuItem onClick={onPackAudit} disabled={disabled}>
                <Shield className="h-4 w-4 mr-2" />
                Pack Audit
              </DropdownMenuItem>
            )}
            {onCloseSession && !isTerminee && (
              <DropdownMenuItem onClick={onCloseSession} disabled={disabled}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Clôturer
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Desktop: original layout
  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2 sm:mt-3">
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onSendDocuments} disabled={disabled}>
        <FileDown className="h-3.5 w-3.5" />
        Documents
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onSendEmail} disabled={disabled}>
        <Mail className="h-3.5 w-3.5" />
        Email
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onManageExams} disabled={disabled}>
        <GraduationCap className="h-3.5 w-3.5" />
        Examens
      </Button>
      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={onExport} disabled={disabled}>
        <Download className="h-3.5 w-3.5" />
        Exporter
      </Button>
      {onPackAudit && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
          onClick={onPackAudit}
          disabled={disabled}
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
          disabled={disabled}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Clôturer
        </Button>
      )}
    </div>
  );
}
