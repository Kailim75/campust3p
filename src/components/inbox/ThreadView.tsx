import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Send, StickyNote, Link2 } from "lucide-react";
import { toast } from "sonner";
import { ThreadLinks } from "./ThreadLinks";
import { ThreadLinkAdd } from "./ThreadLinkAdd";
import { ThreadNotes } from "./ThreadNotes";
import { ThreadAssignment } from "./ThreadAssignment";
import { ThreadAttachments } from "./ThreadAttachments";
import type { InboxStatus } from "./InboxCrmPage";

interface ThreadViewProps {
  threadId: string;
  centreId: string;
}

export function ThreadView({ threadId, centreId }: ThreadViewProps) {
  const [replyText, setReplyText] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const queryClient = useQueryClient();

  // Fetch thread
  const { data: thread } = useQuery({
    queryKey: ["crm-email-thread", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_threads")
        .select("*")
        .eq("id", threadId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["crm-email-messages", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("received_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Update status
  const updateStatus = useMutation({
    mutationFn: async (status: InboxStatus) => {
      const updates: any = { status };
      if (status === "archive") updates.archived_at = new Date().toISOString();
      const { error } = await supabase
        .from("crm_email_threads")
        .update(updates)
        .eq("id", threadId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-email-thread", threadId] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      toast.success("Statut mis à jour");
    },
  });

  // Send reply
  const sendReply = useMutation({
    mutationFn: async () => {
      if (!replyText.trim()) return;
      const { error } = await supabase.functions.invoke("send-gmail-reply", {
        body: { threadId, body: replyText.trim(), centreId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReplyText("");
      queryClient.invalidateQueries({ queryKey: ["crm-email-messages", threadId] });
      queryClient.invalidateQueries({ queryKey: ["crm-email-threads"] });
      toast.success("Réponse envoyée");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  if (isLoading || !thread) {
    return <div className="p-6 text-muted-foreground">Chargement…</div>;
  }

  const hasAnyAttachments = thread.has_attachments || messages.some((m) => m.has_attachments);

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="border-b px-6 py-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-base font-semibold flex-1">{thread.subject || "(Sans sujet)"}</h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select
              value={thread.status}
              onValueChange={(v) => updateStatus.mutate(v as InboxStatus)}
            >
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nouveau">🔵 Nouveau</SelectItem>
                <SelectItem value="en_cours">🟡 En cours</SelectItem>
                <SelectItem value="traite">🟢 Traité</SelectItem>
                <SelectItem value="archive">⚫ Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assignment */}
        <ThreadAssignment
          threadId={threadId}
          centreId={centreId}
          assignedTo={thread.assigned_to}
        />

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowLinks(!showLinks)}>
            <Link2 className="h-3.5 w-3.5 mr-1" /> Liens CRM
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNotes(!showNotes)}>
            <StickyNote className="h-3.5 w-3.5 mr-1" /> Notes
          </Button>
          {hasAnyAttachments && (
            <Button variant="ghost" size="sm" onClick={() => setShowAttachments(!showAttachments)}>
              <Paperclip className="h-3.5 w-3.5 mr-1" /> Pièces jointes
            </Button>
          )}
        </div>

        {showLinks && (
          <div className="space-y-2">
            <ThreadLinks threadId={threadId} centreId={centreId} />
            <ThreadLinkAdd threadId={threadId} centreId={centreId} />
          </div>
        )}
        {showNotes && <ThreadNotes threadId={threadId} centreId={centreId} />}
        {showAttachments && <ThreadAttachments threadId={threadId} centreId={centreId} />}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`rounded-lg border p-4 ${
              msg.direction === "outbound"
                ? "bg-primary/5 border-primary/20 ml-8"
                : "bg-card mr-8"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {msg.from_name || msg.from_address}
                </span>
                {msg.direction === "outbound" && (
                  <Badge variant="outline" className="text-xs">Envoyé</Badge>
                )}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(msg.received_at), "dd MMM yyyy à HH:mm", { locale: fr })}
              </span>
            </div>

            {/* Body */}
            <EmailMessageBody bodyText={msg.body_text} bodyHtml={msg.body_html} />

            {/* Attachments indicator */}
            {msg.has_attachments && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3 w-3" /> Pièces jointes
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reply */}
      <div className="border-t p-4">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Écrire une réponse…"
          rows={3}
          className="mb-2 resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => sendReply.mutate()}
            disabled={!replyText.trim() || sendReply.isPending}
            size="sm"
          >
            <Send className="h-4 w-4 mr-1" />
            {sendReply.isPending ? "Envoi…" : "Répondre"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmailMessageBody({ bodyText, bodyHtml }: { bodyText?: string | null; bodyHtml?: string | null }) {
  if (bodyText?.trim()) {
    return <div className="text-sm text-foreground/90 whitespace-pre-wrap">{bodyText}</div>;
  }

  if (bodyHtml?.trim()) {
    return (
      <div
        className="prose prose-sm max-w-none text-foreground/90 prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-a:text-primary prose-li:text-foreground/90"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(bodyHtml, {
            USE_PROFILES: { html: true },
          }),
        }}
      />
    );
  }

  return <div className="text-sm italic text-muted-foreground">(Vide)</div>;
}
