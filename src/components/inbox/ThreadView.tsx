import { useState, useRef, useEffect, forwardRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Paperclip, Send, StickyNote, Link2, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft, AlertCircle } from "lucide-react";
import { ThreadActions } from "./ThreadActions";
import { ThreadLabelManager } from "./ThreadLabelManager";
import { toast } from "sonner";
import { ThreadLinks } from "./ThreadLinks";
import { CrmLabelBadge } from "./CrmLabelBadge";
import { ThreadLinkAdd } from "./ThreadLinkAdd";
import { ThreadNotes } from "./ThreadNotes";
import { ThreadAssignment } from "./ThreadAssignment";
import { ThreadAttachments } from "./ThreadAttachments";
import { cn } from "@/lib/utils";
import type { InboxStatus } from "./InboxCrmPage";

interface ThreadViewProps {
  threadId: string;
  centreId: string;
  onThreadRemoved?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; dotColor: string }> = {
  nouveau: { label: "Nouveau", dotColor: "bg-blue-500" },
  en_cours: { label: "En cours", dotColor: "bg-amber-500" },
  traite: { label: "Traité", dotColor: "bg-green-500" },
  archive: { label: "Archivé", dotColor: "bg-muted-foreground/50" },
};

export function ThreadView({ threadId, centreId, onThreadRemoved }: ThreadViewProps) {
  const [replyText, setReplyText] = useState("");
  const [showLinks, setShowLinks] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notesInitialized, setNotesInitialized] = useState<string | null>(null);
  const [showAttachments, setShowAttachments] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Fetch note count to show badge and auto-open
  const { data: noteCount = 0 } = useQuery({
    queryKey: ["crm-email-notes-count", threadId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("crm_email_notes")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", threadId);
      if (error) throw error;
      return count || 0;
    },
  });

  // Auto-open notes panel when thread has notes (once per thread)
  useEffect(() => {
    if (noteCount > 0 && notesInitialized !== threadId) {
      setShowNotes(true);
      setNotesInitialized(threadId);
    } else if (noteCount === 0 && notesInitialized !== threadId) {
      setShowNotes(false);
      setNotesInitialized(threadId);
    }
  }, [noteCount, threadId, notesInitialized]);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (isLoading || !thread) {
    return (
      <div className="p-6 space-y-5">
        <div className="space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/4" />
        </div>
        <div className="space-y-3 pt-4">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-16 w-5/6 rounded-lg ml-auto" />
        </div>
      </div>
    );
  }

  const hasAnyAttachments = thread.has_attachments || messages.some((m) => m.has_attachments);
  const statusConf = STATUS_CONFIG[thread.status] || STATUS_CONFIG.nouveau;

  return (
    <div className="flex flex-col h-full">
      {/* ── Thread header ── */}
      <div className="border-b px-5 py-4 space-y-3">
        {/* Title + Status */}
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-foreground leading-snug flex-1 pr-2">
            {thread.subject || "(Sans sujet)"}
          </h2>
          <div className="flex items-center gap-1 flex-shrink-0">
            <ThreadActions threadId={threadId} centreId={centreId} isUnread={thread.is_unread} onThreadRemoved={onThreadRemoved} />
            <ThreadLabelManager threadId={threadId} centreId={centreId} currentLabels={(thread.crm_labels as string[]) || []} />
            <Select
              value={thread.status}
              onValueChange={(v) => updateStatus.mutate(v as InboxStatus)}
            >
              <SelectTrigger className="w-[125px] h-7 text-xs gap-1.5 border-dashed">
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
        </div>

        {/* CRM Labels */}
        {thread.crm_labels && (thread.crm_labels as string[]).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {(thread.crm_labels as string[]).map((label: string) => (
              <CrmLabelBadge key={label} label={label} size="sm" />
            ))}
          </div>
        )}

        {/* Assignment */}
        <ThreadAssignment
          threadId={threadId}
          centreId={centreId}
          assignedTo={thread.assigned_to}
        />

        {/* Action toggle bar */}
        <div className="flex gap-1 pt-0.5">
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
            count={noteCount}
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
          <div className="space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <ThreadLinks threadId={threadId} centreId={centreId} />
            <ThreadLinkAdd threadId={threadId} centreId={centreId} />
          </div>
        )}
        {showNotes && (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <ThreadNotes threadId={threadId} centreId={centreId} />
          </div>
        )}
        {showAttachments && (
          <div className="animate-in fade-in-0 slide-in-from-top-1 duration-150">
            <ThreadAttachments threadId={threadId} centreId={centreId} />
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((msg) => {
          const isOutbound = msg.direction === "outbound";
          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg border p-4",
                isOutbound
                  ? "bg-primary/[0.02] border-primary/10 ml-8"
                  : "bg-card mr-8"
              )}
            >
              {/* Message header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn(
                    "inline-flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0",
                    isOutbound
                      ? "bg-primary/8 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {isOutbound ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                  </span>
                  <span className="text-sm font-medium truncate text-foreground/85">
                    {msg.from_name || msg.from_address}
                  </span>
                  {isOutbound && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-primary/70 border-primary/20">Envoyé</Badge>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground/60 flex-shrink-0 tabular-nums">
                  {format(new Date(msg.received_at), "dd MMM yyyy · HH:mm", { locale: fr })}
                </span>
              </div>

              {/* Body */}
              <div className="pl-8">
                <EmailMessageBody bodyText={msg.body_text} bodyHtml={msg.body_html} />

                {msg.has_attachments && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground/50">
                    <Paperclip className="h-3 w-3" />
                    <span>Pièces jointes</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Reply ── */}
      <div className="border-t bg-muted/15 p-4">
        <Textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="Écrire une réponse…"
          rows={3}
          className="mb-2.5 resize-none bg-background text-sm focus-visible:ring-primary/30"
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

const ToggleButton = forwardRef<HTMLButtonElement, {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}>(function ToggleButton({ active, onClick, icon, label, count }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground/70 hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
      {count != null && count > 0 && (
        <span className="text-[9px] bg-amber-200/60 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 px-1 py-0.5 rounded-full font-medium leading-none">
          {count}
        </span>
      )}
      {active ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
    </button>
  );
});

function extractHtmlBody(html: string): string {
  // Extract content inside <body> if present, otherwise use as-is
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const content = bodyMatch ? bodyMatch[1] : html;
  // Extract <style> blocks to preserve email styling
  const styleBlocks: string[] = [];
  html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
    styleBlocks.push(css);
    return "";
  });
  const scopedStyle = styleBlocks.length > 0
    ? `<style>${styleBlocks.join("\n")}</style>`
    : "";
  return scopedStyle + content;
}

function EmailMessageBody({ bodyText, bodyHtml }: { bodyText?: string | null; bodyHtml?: string | null }) {
  // Prioritize HTML over plain text so images and formatting are preserved
  if (bodyHtml?.trim()) {
    const processedHtml = extractHtmlBody(bodyHtml);
    return (
      <div
        className="prose prose-sm max-w-none text-foreground/80 prose-headings:text-foreground prose-p:text-foreground/80 prose-strong:text-foreground prose-a:text-primary prose-li:text-foreground/80 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded [&_table]:w-auto [&_td]:p-1"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(processedHtml, {
            USE_PROFILES: { html: true },
            ADD_TAGS: ["img", "style", "table", "thead", "tbody", "tr", "td", "th", "colgroup", "col", "center", "font"],
            ADD_ATTR: ["src", "alt", "width", "height", "style", "loading", "class", "align", "valign", "bgcolor", "border", "cellpadding", "cellspacing", "color", "face", "size", "dir", "colspan", "rowspan"],
          }),
        }}
      />
    );
  }

  if (bodyText?.trim()) {
    return <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{bodyText}</div>;
  }

  return (
    <div className="flex items-center gap-1.5 text-sm text-muted-foreground/50 italic">
      <AlertCircle className="h-3.5 w-3.5" />
      Contenu vide
    </div>
  );
}
