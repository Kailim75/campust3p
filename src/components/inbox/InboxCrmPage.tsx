import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { ThreadList } from "./ThreadList";
import { ThreadView } from "./ThreadView";
import { InboxToolbar } from "./InboxToolbar";
import { InboxEmptyState } from "./InboxEmptyState";
import { Inbox, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type InboxStatus = "nouveau" | "en_cours" | "traite" | "archive";

export function InboxCrmPage() {
  const { centreId } = useCentreContext();
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InboxStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Check if an email account is configured
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

  // Fetch threads
  const { data: threads = [], isLoading: threadsLoading } = useQuery({
    queryKey: ["crm-email-threads", centreId, statusFilter, searchQuery],
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

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
    enabled: !!centreId && !!account,
  });

  // Mark thread read
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
      <div className="p-6 flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Chargement…</div>
      </div>
    );
  }

  if (!account) {
    return <InboxEmptyState centreId={centreId} />;
  }

  // Account exists but OAuth tokens are missing — need to re-authorize
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
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500" />
          <h2 className="text-lg font-semibold">Reconnexion Google requise</h2>
          <p className="text-sm text-muted-foreground">
            Le compte <strong>{account.email_address}</strong> est configuré mais l'autorisation Google n'a pas été finalisée. Cliquez ci-dessous pour vous connecter via Google.
          </p>
          <Button onClick={handleReconnect} className="w-full">
            Connecter via Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <Inbox className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">Inbox CRM</h1>
        {unreadCount > 0 && (
          <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </div>

      {/* Toolbar */}
      <InboxToolbar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        accountEmail={account.email_address}
        syncStatus={account.sync_status}
      />

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thread list */}
        <div className="w-[380px] border-r overflow-y-auto flex-shrink-0">
          <ThreadList
            threads={threads}
            isLoading={threadsLoading}
            selectedThreadId={selectedThreadId}
            onSelect={handleSelectThread}
          />
        </div>

        {/* Thread detail */}
        <div className="flex-1 overflow-y-auto">
          {selectedThreadId ? (
            <ThreadView threadId={selectedThreadId} centreId={centreId!} />
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Sélectionnez un fil pour le consulter</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
