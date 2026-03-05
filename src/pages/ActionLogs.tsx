import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUserRole } from "@/hooks/useUsers";
import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Filter, CheckCircle2, CalendarClock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  mark_done: { label: "Marqué fait", color: "text-green-600" },
  reschedule: { label: "Replanifié", color: "text-primary" },
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  prospect: "Prospect",
  facture: "Facture",
  apprenant: "Apprenant",
};

export default function ActionLogsPage() {
  const { data: userRole } = useCurrentUserRole();
  const isAllowed = userRole === "admin" || userRole === "staff" || userRole === "super_admin";

  const [dateFrom, setDateFrom] = useState(() => format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["action-logs", dateFrom, dateTo, entityFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("action_logs")
        .select("*")
        .gte("created_at", `${dateFrom}T00:00:00`)
        .lte("created_at", `${dateTo}T23:59:59`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (entityFilter !== "all") query = query.eq("entity_type", entityFilter);
      if (actionFilter !== "all") query = query.eq("action_type", actionFilter);

      const { data } = await query;
      return data || [];
    },
    enabled: isAllowed,
    staleTime: 30_000,
  });

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <History className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Historique des actions</h1>
            <p className="text-sm text-muted-foreground">Journal de traçabilité du dashboard</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Filtres</span>
          </div>
          <Input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="w-36 h-9 text-xs"
          />
          <span className="text-xs text-muted-foreground">→</span>
          <Input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="w-36 h-9 text-xs"
          />
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue placeholder="Entité" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes entités</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="facture">Facture</SelectItem>
              <SelectItem value="apprenant">Apprenant</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-32 h-9 text-xs">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes actions</SelectItem>
              <SelectItem value="mark_done">Marqué fait</SelectItem>
              <SelectItem value="reschedule">Replanifié</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {logs?.length ?? 0} résultat(s)
          </Badge>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Libellé</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Note</th>
                </tr>
              </thead>
              <tbody>
                {(logs || []).map(log => {
                  const actionMeta = ACTION_TYPE_LABELS[log.action_type] || { label: log.action_type, color: "text-foreground" };
                  const ActionIcon = log.action_type === "mark_done" ? CheckCircle2 : CalendarClock;
                  return (
                    <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(log.created_at), "dd/MM HH:mm", { locale: fr })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <ActionIcon className={cn("h-3.5 w-3.5", actionMeta.color)} />
                          <span className={cn("text-xs font-medium", actionMeta.color)}>{actionMeta.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {ENTITY_TYPE_LABELS[log.entity_type] || log.entity_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground max-w-[200px] truncate">
                        {log.label || "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {log.note || "—"}
                      </td>
                    </tr>
                  );
                })}
                {(logs || []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Aucune action enregistrée pour cette période.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
