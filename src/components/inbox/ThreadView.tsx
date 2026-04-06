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
import { Paperclip, Send, StickyNote, Link2, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { toast } from "sonner";
import { ThreadLinks } from "./ThreadLinks";
import { ThreadLinkAdd } from "./ThreadLinkAdd";
import { ThreadNotes } from "./ThreadNotes";
import { ThreadAssignment } from "./ThreadAssignment";
import { ThreadAttachments } from "./ThreadAttachments";
import { cn } from "@/lib/utils";
import type { InboxStatus } from "./InboxCrmPage";

interface ThreadViewProps {
  threadId: string;
  centreId: string;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string }> = {
  nouveau: { label: "Nouveau", dotColor: "bg-blue-500" },
  en_cours: { label: "En cours", dotColor: "bg-amber-500" },
  traite: { label: "Traité", dotColor: "bg-green-500" },
  archive: { label: "Archivé", dotColor: "bg-muted-foreground/50" },
};

export function ThreadView({ threadId, centreId }: ThreadViewProps) {
  const [replyText, setReplyText] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const queryClient = useQueryClient();

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
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-muted rounded w-2/3" />
          <div className="h-4 bg-muted rounded w-1/3" />
          <div className="h-24 bg-muted rounded w-full mt-6" />
        </div>
      </div>
    );
  }

  const hasAnyAttachments = thread.has_attachments || messages.some((m) => m.has_attachments);
  const statusConf = STATUS_CONFIG[thread.status] || STATUS_CONFIG.nouveau;

  return (
    <div className="flex flex-col h-full">
      {/* ── Thread header ── */}
      <div className="border-b px-6 py-4 space-y-3">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[15px] font-semibold text-foreground leading-snug flex-1">
            {thread.subject || "(Sans sujet)"}
          </h2>
          <Select
            value={thread.status}
            onValueChange={(v) => updateStatus.mutate(v as InboxStatus)}
          >
            <SelectTrigger className="w-[130px] h-7 text-xs gap-1.5 border-dashed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([val, conf]) => (
                <SelectItem key={val} value={val}>
                  <span className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", conf.dotColor)} />
                    {conf.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Assignment */}
        <ThreadAssignment
          threadId={threadId}
          centreId={centreId}
          assignedTo={thread.assigned_to}
        />

        {/* Action toggle bar */}
        <div className="flex gap-1 pt-1">
          <ToggleButton
            active={showLinks}
            onClick={() => setShowLinks(!showLinks)}
            icon={<Link2 className="h-3.5 w-3.5" />}
            label="Liens CRM"
          />
          <ToggleButton
            active={showNotes}
            onClick={() => setShowNotes(!showNotes)}
            icon={<StickyNote className="h-3.5 w-3.5" />}
            label="Notes"
          />
          {hasAnyAttachments && (
            <ToggleButton
              active={showAttachments}
              onClick={() => setShowAttachments(!showAttachments)}
              icon={<Paperclip className="h-3.5 w-3.5" />}
              label="Pièces jointes"
            />
          )}
        </div>

        {/* Expandable panels */}
        {showLinks && (
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <ThreadLinks threadId={threadId} centreId={centreId} />
            <ThreadLinkAdd threadId={threadId} centreId={centreId} />
          </div>
        )}
        {showNotes && (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <ThreadNotes threadId={threadId} centreId={centreId} />
          </div>
        )}
        {showAttachments && (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-200">
            <ThreadAttachments threadId={threadId} centreId={centreId} />
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg border p-4",
                isOutbound
                  ? "bg-primary/[0.03] border-primary/15 ml-6"
                  : "bg-card mr-6"
              )}
            >
              {/* Message header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-semibold flex-shrink-0",
                    isOutbound
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isOutbound ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {msg.from_name || msg.from_address}
                  </span>
                  {isOutbound && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">Envoyé</Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 tabular-nums">
                  {format(new Date(msg.received_at), "dd MMM yyyy · HH:mm", { locale: fr })}
                </span>
              </div>

              {/* Body */}
              <div className="pl-8">
                <EmailMessageBody bodyText={msg.body_text} bodyHtml={msg.body_html} />

                {msg.has_attachments && (
                  <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground/70">
                    <Paperclip className="h-3 w-3" /> Pièces jointes
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Reply ── */}
      <div className="border-t bg-muted/20 p-4">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Écrire une réponse…"
          rows={3}
          className="mb-2 resize-none bg-background text-sm"
        />
        <div className="flex justify-end">
          <Button
            onClick={() => sendReply.mutate()}
            disabled={!replyText.trim() || sendReply.isPending}
            size="sm"
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {sendReply.isPending ? "Envoi…" : "Répondre"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function ToggleButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
      {active ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
    </button>
  );
}

function EmailMessageBody({ bodyText, bodyHtml }: { bodyText?: string | null; bodyHtml?: string | null }) {
  if (bodyText?.trim()) {
    return <div className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{bodyText}</div>;
  }

  if (bodyHtml?.trim()) {
    return (
      <div
        className="prose prose-sm max-w-none text-foreground/85 prose-headings:text-foreground prose-p:text-foreground/85 prose-strong:text-foreground prose-a:text-primary prose-li:text-foreground/85"
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
