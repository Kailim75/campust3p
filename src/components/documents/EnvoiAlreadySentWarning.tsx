// ═══════════════════════════════════════════════════════════════
// EnvoiAlreadySentWarning — Non-blocking anti-doublon alert
// Shows when a document was already sent to this contact in this session
// ═══════════════════════════════════════════════════════════════

import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import type { EnvoiSummary } from "@/hooks/useDocumentEnvoiHistory";

interface EnvoiAlreadySentWarningProps {
  summaries: Record<string, EnvoiSummary>;
  selectedDocTypes: string[];
}

const DOC_LABELS: Record<string, string> = {
  convocation: "Convocation",
  convention: "Convention",
  contrat: "Contrat",
  attestation: "Attestation",
  programme: "Programme",
  reglement: "Règlement intérieur",
  cgv: "CGV",
  bulk_send: "Pack documents",
};

export function EnvoiAlreadySentWarning({
  summaries,
  selectedDocTypes,
}: EnvoiAlreadySentWarningProps) {
  const alreadySentDocs = selectedDocTypes.filter(
    (type) => summaries[type]?.alreadySent
  );

  if (alreadySentDocs.length === 0) return null;

  return (
    <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-warning">
            {alreadySentDocs.length === 1
              ? "Ce document a déjà été envoyé"
              : `${alreadySentDocs.length} documents déjà envoyés`}
          </p>
          <div className="space-y-1">
            {alreadySentDocs.map((type) => {
              const summary = summaries[type]!;
              return (
                <div key={type} className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-[10px] border-warning/30 text-warning"
                  >
                    {DOC_LABELS[type] ?? type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {summary.sendCount}x envoyé
                    {summary.lastSentAt && (
                      <> · dernier : {format(parseISO(summary.lastSentAt), "dd/MM/yyyy à HH:mm", { locale: fr })}</>
                    )}
                    {summary.lastStatus === "echec" && (
                      <span className="text-destructive font-medium"> · dernier en échec</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Vous pouvez renvoyer si nécessaire. Un nouvel événement sera créé.
          </p>
        </div>
      </div>
    </div>
  );
}
