// ═══════════════════════════════════════════════════════════════
// CommunicationTrackingPanel — Combiné: documents + relances paiement
// À utiliser dans l'onglet Communications de la fiche apprenant
// ═══════════════════════════════════════════════════════════════

import { Separator } from "@/components/ui/separator";
import { DocumentEnvoiHistoryPanel } from "./DocumentEnvoiHistoryPanel";
import { PaymentReminderTrackingPanel } from "./PaymentReminderTrackingPanel";

interface Props {
  contactId: string;
  sessionId?: string | null;
}

export function CommunicationTrackingPanel({ contactId, sessionId }: Props) {
  return (
    <div className="space-y-6">
      <PaymentReminderTrackingPanel contactId={contactId} />
      <Separator />
      <DocumentEnvoiHistoryPanel contactId={contactId} sessionId={sessionId} />
    </div>
  );
}
