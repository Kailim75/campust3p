// ═══════════════════════════════════════════════════════════════
// PaymentReminderTrackingPanel — Suivi des relances de paiement
// Affiche statut envoi + clic sur le lien récap + "sans réponse"
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, Send, MousePointerClick, Clock, AlertCircle, Eye } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const NO_RESPONSE_THRESHOLD_DAYS = 7;

interface RelanceRow {
  id: string;
  facture_id: string;
  numero_relance: number;
  scheduled_at: string;
  sent_at: string | null;
  statut: string;
  email_destinataire: string | null;
  clicked_at: string | null;
  click_count: number;
  opened_at: string | null;
  open_count: number;
  tracking_token: string | null;
  factures: { numero_facture: string | null } | null;
}

function getEngagement(row: RelanceRow) {
  if (row.statut === "failed") {
    return { label: "Échec d'envoi", variant: "destructive" as const, icon: AlertCircle };
  }
  if (row.statut === "cancelled") {
    return { label: "Annulée (payée)", variant: "outline" as const, icon: Clock };
  }
  if (row.statut === "pending") {
    return { label: "Programmée", variant: "secondary" as const, icon: Clock };
  }
  // sent — engagement hierarchy: clicked > opened > no-response > sent
  if (row.clicked_at) {
    const c = row.click_count ?? 1;
    return {
      label: c > 1 ? `Lien cliqué ×${c}` : "Lien cliqué",
      variant: "default" as const,
      icon: MousePointerClick,
    };
  }
  if (row.opened_at) {
    const o = row.open_count ?? 1;
    return {
      label: o > 1 ? `Email ouvert ×${o}` : "Email ouvert",
      variant: "default" as const,
      icon: Eye,
    };
  }
  if (row.sent_at) {
    const days = differenceInDays(new Date(), parseISO(row.sent_at));
    if (days >= NO_RESPONSE_THRESHOLD_DAYS) {
      return { label: "Sans réponse", variant: "outline" as const, icon: Clock };
    }
  }
  return { label: "Envoyée", variant: "secondary" as const, icon: Send };
}

interface Props {
  contactId: string;
}

export function PaymentReminderTrackingPanel({ contactId }: Props) {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["payment-reminders-tracking", contactId],
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("relance_paiement_queue" as any)
        .select(
          "id, facture_id, numero_relance, scheduled_at, sent_at, statut, email_destinataire, clicked_at, click_count, opened_at, open_count, tracking_token, factures(numero_facture)"
        )
        .eq("contact_id", contactId)
        .order("scheduled_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RelanceRow[];
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Mail className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Aucune relance de paiement</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Relances de paiement
        </h4>
        <Badge variant="secondary" className="text-xs">
          {rows.length} relance{rows.length > 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="relative pl-6 space-y-0">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />

        {rows.map((row, idx) => {
          const eng = getEngagement(row);
          const Icon = eng.icon;
          const isLast = idx === rows.length - 1;
          const dateRef = row.sent_at ?? row.scheduled_at;

          return (
            <div key={row.id} className={cn("relative flex gap-3", !isLast && "pb-4")}>
              <div className="absolute -left-6 top-1 flex items-center justify-center">
                <div
                  className={cn(
                    "h-[18px] w-[18px] rounded-full border-2 bg-background flex items-center justify-center",
                    row.statut === "failed" ? "border-destructive" : "border-primary"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3 w-3",
                      row.statut === "failed" ? "text-destructive" : "text-primary"
                    )}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">
                    Relance n°{row.numero_relance}
                  </span>
                  {row.factures?.numero_facture && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {row.factures.numero_facture}
                    </Badge>
                  )}
                  <Badge variant={eng.variant} className="text-[10px] px-1.5 py-0 gap-1">
                    <Icon className="h-2.5 w-2.5" />
                    {eng.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>
                    {format(parseISO(dateRef), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                  </span>
                  {row.clicked_at && (
                    <span className="text-primary">
                      Cliqué le{" "}
                      {format(parseISO(row.clicked_at), "d MMM 'à' HH:mm", { locale: fr })}
                    </span>
                  )}
                  {row.email_destinataire && (
                    <span className="truncate max-w-[200px]">{row.email_destinataire}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
