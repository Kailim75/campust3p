import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InboxStatus } from "./InboxCrmPage";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
}

const STATUS_OPTIONS: { value: InboxStatus | "all"; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "nouveau", label: "🔵 Nouveau" },
  { value: "en_cours", label: "🟡 En cours" },
  { value: "traite", label: "🟢 Traité" },
  { value: "archive", label: "⚫ Archivé" },
];

export function InboxToolbar({
  statusFilter, onStatusChange, searchQuery, onSearchChange,
  accountEmail, syncStatus, lastSyncAt, centreId,
  assignedFilter, onAssignedChange,
}: InboxToolbarProps) {
  const [syncing, setSyncing] = useState(false);

  // Fetch centre users for assignment filter
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

  return (
    <div className="border-b px-4 py-2 space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filters */}
        <div className="flex gap-1">
          {STATUS_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={statusFilter === opt.value ? "default" : "ghost"}
              size="sm"
              className="text-xs h-7"
              onClick={() => onStatusChange(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {/* Assignment filter */}
        <Select value={assignedFilter} onValueChange={onAssignedChange}>
          <SelectTrigger className="w-[160px] h-7 text-xs">
            <UserCircle className="h-3 w-3 mr-1" />
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

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-[300px] relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher…"
            className="h-7 text-xs pl-8"
          />
        </div>

        {/* Sync info */}
        <div className="ml-auto flex items-center gap-2">
          <div className="text-right">
            <span className="text-xs text-muted-foreground block">{accountEmail}</span>
            {lastSyncAt && (
              <span className="text-[10px] text-muted-foreground">
                Sync: {format(new Date(lastSyncAt), "dd MMM HH:mm", { locale: fr })}
              </span>
            )}
          </div>
          <Badge variant={syncStatus === "error" ? "destructive" : "secondary"} className="text-xs">
            {syncStatus === "syncing" ? "Sync…" : syncStatus === "error" ? "Erreur" : "OK"}
          </Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={triggerSync} disabled={syncing}>
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>
    </div>
  );
}
