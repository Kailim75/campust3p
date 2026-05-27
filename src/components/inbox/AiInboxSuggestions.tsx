import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Mail, AlertCircle, Clock, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AiInboxSuggestionsProps {
  centreId: string;
  onAction?: (action: SuggestionAction) => void;
}

export type SuggestionAction =
  | { type: "stale_prospects"; ids: string[] }
  | { type: "unanswered_threads"; ids: string[] }
  | { type: "unassigned_threads"; ids: string[] };

interface Suggestion {
  key: string;
  icon: typeof Sparkles;
  tone: "warning" | "info" | "critical";
  title: string;
  description: string;
  cta: string;
  action: SuggestionAction;
}

const TONE_STYLES: Record<Suggestion["tone"], string> = {
  warning: "border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900",
  info: "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900",
  critical: "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900",
};

const ICON_STYLES: Record<Suggestion["tone"], string> = {
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
  critical: "text-red-600 dark:text-red-400",
};

export function AiInboxSuggestions({ centreId, onAction }: AiInboxSuggestionsProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: suggestions = [] } = useQuery({
    queryKey: ["inbox-ai-suggestions", centreId],
    queryFn: async (): Promise<Suggestion[]> => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();

      // 1. Prospects sans contact depuis 7j
      const { data: staleProspects } = await supabase
        .from("prospects")
        .select("id")
        .eq("centre_id", centreId)
        .is("deleted_at", null)
        .lt("updated_at", sevenDaysAgo)
        .in("statut", ["nouveau", "contacte", "relance"])
        .limit(50);

      // 2. Threads entrants sans réponse depuis 3j
      const { data: unansweredThreads } = await supabase
        .from("crm_email_threads")
        .select("id")
        .eq("centre_id", centreId)
        .eq("status", "nouveau")
        .lt("last_message_at", threeDaysAgo)
        .limit(50);

      // 3. Threads non assignés
      const { data: unassigned } = await supabase
        .from("crm_email_threads")
        .select("id")
        .eq("centre_id", centreId)
        .is("assigned_to", null)
        .in("status", ["nouveau", "en_cours"])
        .limit(50);

      const out: Suggestion[] = [];
      if (staleProspects && staleProspects.length >= 3) {
        out.push({
          key: "stale_prospects",
          icon: Clock,
          tone: "warning",
          title: `${staleProspects.length} prospects sans contact depuis 7j`,
          description: "Relancer en lot ou marquer comme perdus",
          cta: "Voir les prospects",
          action: { type: "stale_prospects", ids: staleProspects.map((p) => p.id) },
        });
      }
      if (unansweredThreads && unansweredThreads.length >= 2) {
        out.push({
          key: "unanswered_threads",
          icon: AlertCircle,
          tone: "critical",
          title: `${unansweredThreads.length} emails sans réponse depuis 3j`,
          description: "Risque de perte de qualité de service",
          cta: "Filtrer",
          action: { type: "unanswered_threads", ids: unansweredThreads.map((t) => t.id) },
        });
      }
      if (unassigned && unassigned.length >= 3) {
        out.push({
          key: "unassigned_threads",
          icon: Mail,
          tone: "info",
          title: `${unassigned.length} fils non assignés`,
          description: "Répartir entre les membres de l'équipe",
          cta: "Assigner",
          action: { type: "unassigned_threads", ids: unassigned.map((t) => t.id) },
        });
      }
      return out;
    },
    enabled: !!centreId,
    staleTime: 5 * 60 * 1000,
  });

  const visible = suggestions.filter((s) => !dismissed.has(s.key));
  if (visible.length === 0) return null;

  return (
    <div className="border-b bg-gradient-to-r from-primary/5 via-transparent to-transparent px-4 py-2.5">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Suggestions IA
        </span>
        <Badge variant="outline" className="text-[10px] h-4 px-1.5">{visible.length}</Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.key}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border px-3 py-1.5 text-xs",
                TONE_STYLES[s.tone],
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", ICON_STYLES[s.tone])} />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{s.title}</span>
                <span className="text-[10px] text-muted-foreground truncate">{s.description}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs gap-0.5 shrink-0"
                onClick={() => onAction?.(s.action)}
              >
                {s.cta}
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 shrink-0"
                onClick={() => setDismissed((prev) => new Set(prev).add(s.key))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
