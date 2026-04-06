import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { InboxToolbar } from "./InboxToolbar";
import { InboxEmptyState } from "./InboxEmptyState";
import { NewMessageModal } from "./NewMessageModal";
import { EMPTY_FILTERS, type AdvancedFilters, hasActiveAdvancedFilters } from "./InboxAdvancedFilters";
import { Inbox, AlertTriangle, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { useInboxRealtime } from "@/hooks/useInboxRealtime";

export type InboxStatus = "nouveau" | "en_cours" | "traite" | "archive";

export function InboxCrmPage() {
  const { centreId } = useCentreContext();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "all">("all");
  const [directionFilter, setDirectionFilter] = useState<"inbox" | "sent" | "all">("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_FILTERS);
  const queryClient = useQueryClient();
  const debouncedSender = useDebounce(advancedFilters.sender, 300);

  // Silent realtime refresh — no UI indicator
  useInboxRealtime(centreId);

  const { data: account, isLoading: accountLoading } = useQuery({
    queryKey: ["crm-email-account", centreId],
    queryFn: async () => {
      if (!centreId) return null;
      const { data, error } = await supabase
        .from("crm_email_accounts")
        .select("*")
        .eq("centre_id", centreId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!centreId,
  });

  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["crm-email-threads", centreId, statusFilter, searchQuery, assignedFilter, debouncedSender, advancedFilters.dateFrom?.toISOString(), advancedFilters.dateTo?.toISOString(), advancedFilters.hasAttachments, advancedFilters.hasLinkedEntity, advancedFilters.crmLabel],
    queryFn: async () => {
      if (!centreId) return [];
      let query = supabase
        .from("crm_email_threads")
        .select("*")
        .eq("centre_id", centreId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      if (searchQuery.trim()) {
        query = query.ilike("subject", `%${searchQuery.trim()}%`);
      }
      if (assignedFilter === "unassigned") {
        query = query.is("assigned_to", null);
      } else if (assignedFilter !== "all") {
        query = query.eq("assigned_to", assignedFilter);
      }

      // Advanced filters
      if (advancedFilters.hasAttachments === true) {
        query = query.eq("has_attachments", true);
      }
      if (advancedFilters.dateFrom) {
        query = query.gte("last_message_at", advancedFilters.dateFrom.toISOString());
      }
      if (advancedFilters.dateTo) {
        const endOfDay = new Date(advancedFilters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("last_message_at", endOfDay.toISOString());
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;

      let filtered = data || [];

      // Client-side filters for sender (search in participants JSON)
      if (debouncedSender.trim()) {
        const term = debouncedSender.trim().toLowerCase();
        filtered = filtered.filter((t: any) => {
          const participants = Array.isArray(t.participants) ? t.participants : [];
          return participants.some(
            (p: any) =>
              (p?.email || "").toLowerCase().includes(term) ||
              (p?.name || "").toLowerCase().includes(term)
          );
        });
      }

      // Client-side filter for linked entities (requires separate query)
      if (advancedFilters.hasLinkedEntity === true) {
        const threadIds = filtered.map((t: any) => t.id);
        if (threadIds.length > 0) {
          const { data: links } = await supabase
            .from("crm_email_links")
            .select("thread_id")
            .in("thread_id", threadIds)
            .eq("centre_id", centreId);
          const linkedIds = new Set((links || []).map((l: any) => l.thread_id));
          filtered = filtered.filter((t: any) => linkedIds.has(t.id));
        } else {
          filtered = [];
        }
      }
      // Client-side filter for CRM labels
      if (advancedFilters.crmLabel && advancedFilters.crmLabel !== "all") {
        filtered = filtered.filter((t: any) =>
          Array.isArray(t.crm_labels) && t.crm_labels.includes(advancedFilters.crmLabel)
        );
      }

      return filtered;
    },
    enabled: !!centreId && !!account,
  });

  const markRead = useMutation({
    mutationFn: async (threadId: string) => {
      const { error } = await supabase
        .from("crm_email_threads")
        .update({ is_unread: false })
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] }),
  });

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    const thread = threads.find((t) => t.id === threadId);
    if (thread?.is_unread) {
      markRead.mutate(threadId);
    }
  };

  const unreadCount = threads.filter((t) => t.is_unread).length;

  if (accountLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="border-b px-6 py-3 flex items-center gap-2.5">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="space-y-3 w-64">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return <InboxEmptyState centreId={centreId} />;
  }

  const needsReauth = !account.oauth_encrypted_token;

  const handleReconnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-gmail-inbox", {
        body: {
          action: "init_oauth",
          centreId,
          email: account.email_address,
          displayName: account.display_name || undefined,
        },
      });
      if (error) throw error;
      if (data?.authUrl) {
        window.location.href = data.authUrl;
      }
    } catch (e: any) {
      toast.error("Erreur: " + e.message);
    }
  };

  if (needsReauth) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-amber-500" />
          </div>
          <h2 className="text-lg font-semibold">Reconnexion Google requise</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Le compte <strong>{account.email_address}</strong> est configuré mais l'autorisation Google n'a pas été finalisée.
          </p>
          <Button onClick={handleReconnect} className="w-full">
            Connecter via Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-3 flex items-center gap-2.5">
        <Inbox className="h-5 w-5 text-primary" />
        <h1 className="text-base font-semibold">Inbox CRM</h1>
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground text-[11px] font-bold px-2 py-0.5 rounded-full leading-none">
            {unreadCount}
          </span>
        )}
        <div className="ml-auto">
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowNewMessage(true)}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau message
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <InboxToolbar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        accountEmail={account.email_address}
        syncStatus={account.sync_status}
        lastSyncAt={account.last_sync_at}
        centreId={centreId!}
        assignedFilter={assignedFilter}
        onAssignedChange={setAssignedFilter}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
      />

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread list */}
        <div className="w-[360px] border-r overflow-y-auto flex-shrink-0">
          <ThreadList
            threads={threads}
            isLoading={threadsLoading}
            selectedThreadId={selectedThreadId}
            onSelect={handleSelectThread}
          />
        </div>

        {/* Thread detail */}
        <div className="flex-1 overflow-hidden">
          {selectedThreadId ? (
            <ThreadView threadId={selectedThreadId} centreId={centreId!} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="h-14 w-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Mail className="h-6 w-6 text-muted-foreground/30" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground/70">Sélectionnez un fil</p>
                  <p className="text-xs text-muted-foreground/40 mt-0.5">pour consulter les messages</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <NewMessageModal
        open={showNewMessage}
        onOpenChange={setShowNewMessage}
        centreId={centreId!}
        onSuccess={(threadId) => setSelectedThreadId(threadId)}
      />
    </div>
  );
}
