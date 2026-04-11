import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, UserCircle, Clock, Inbox, Send, MailOpen, Archive, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InboxStatus } from "./InboxCrmPage";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { InboxAdvancedFilters, type AdvancedFilters } from "./InboxAdvancedFilters";

export type DirectionFilter = "inbox" | "sent" | "all" | "archived" | "trash";

interface InboxToolbarProps {
  statusFilter: InboxStatus | "all";
  onStatusChange: (s: InboxStatus | "all") => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  accountEmail: string;
  syncStatus: string;
  lastSyncAt: string | null;
  centreId: string;
  assignedFilter: string;
  onAssignedChange: (userId: string) => void;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (f: AdvancedFilters) => void;
  directionFilter: DirectionFilter;
  onDirectionChange: (d: DirectionFilter) => void;
}

const STATUS_OPTIONS: { value: InboxStatus | "all"; label: string; color?: string }[] = [
  { value: "all", label: "Tous" },
  { value: "nouveau", label: "Nouveau", color: "bg-blue-500" },
  { value: "en_cours", label: "En cours", color: "bg-amber-500" },
  { value: "traite", label: "Traité", color: "bg-green-500" },
];

const DIRECTION_OPTIONS = [
  { value: "inbox" as const, label: "Inbox", icon: Inbox },
  { value: "sent" as const, label: "Envoyés", icon: Send },
  { value: "all" as const, label: "Tous", icon: MailOpen },
  { value: "archived" as const, label: "Archivés", icon: Archive },
  { value: "trash" as const, label: "Corbeille", icon: Trash2 },
];

export function InboxToolbar({
  statusFilter, onStatusChange, searchQuery, onSearchChange,
  accountEmail, syncStatus, lastSyncAt, centreId,
  assignedFilter, onAssignedChange,
  advancedFilters, onAdvancedFiltersChange,
  directionFilter, onDirectionChange,
}: InboxToolbarProps) {
  const [syncing, setSyncing] = useState(false);

  const { data: centreUsers = [] } = useQuery({
    queryKey: ["centre-users", centreId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_centres")
        .select("user_id, profiles(id, display_name, email)")
        .eq("centre_id", centreId);
      if (error) throw error;
      return (data || [])
        .filter((uc: any) => uc.profiles)
        .map((uc: any) => ({
          id: uc.user_id,
          label: uc.profiles.display_name || uc.profiles.email || uc.user_id.slice(0, 8),
        }));
    },
    enabled: !!centreId,
  });

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-gmail-inbox", {
        body: { manual: true },
      });
      if (error) throw error;
      toast.success("Synchronisation lancée");
    } catch (e: any) {
      toast.error("Erreur sync: " + e.message);
    } finally {
      setSyncing(false);
    }
  };

  const isSpecialView = directionFilter === "archived" || directionFilter === "trash";

  return (
    <div className="border-b px-4 py-2 space-y-2">
      {/* Row 1: Navigation tabs + Sync */}
      <div className="flex items-center gap-2">
        <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 flex-shrink-0">
          {DIRECTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onDirectionChange(opt.value)}
              className={cn(
                "flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                directionFilter === opt.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <opt.icon className="h-3 w-3" />
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search — grows to fill */}
        <div className="flex-1 min-w-[140px] max-w-[280px] relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher…"
            className="h-7 text-xs pl-8"
          />
        </div>

        {/* Sync — pushed right */}
        <div className="ml-auto flex items-center gap-1.5">
          {lastSyncAt && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {format(new Date(lastSyncAt), "dd MMM HH:mm", { locale: fr })}
            </span>
          )}
          {syncStatus === "error" && (
            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={triggerSync}
            disabled={syncing}
            aria-label="Synchroniser"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Row 2: Filters (hidden for special views) */}
      {!isSpecialView && (
        <div className="flex items-center gap-2">
          {/* Status filter pills */}
          <div className="flex gap-0.5 bg-muted/50 rounded-lg p-0.5 flex-shrink-0">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onStatusChange(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
                  statusFilter === opt.value
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.color && <span className={cn("w-1.5 h-1.5 rounded-full", opt.color)} />}
                {opt.label}
              </button>
            ))}
          </div>

          {/* Assignment filter */}
          <Select value={assignedFilter} onValueChange={onAssignedChange}>
            <SelectTrigger className="w-[140px] h-7 text-xs border-dashed">
              <UserCircle className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Assigné à…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="unassigned">Non assigné</SelectItem>
              {centreUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Advanced filters */}
          <InboxAdvancedFilters
            filters={advancedFilters}
            onChange={onAdvancedFiltersChange}
            centreUsers={centreUsers}
          />
        </div>
      )}
    </div>
  );
}
