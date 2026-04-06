import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Paperclip, Download, Loader2, AlertCircle, FileText, Image, File } from "lucide-react";
import { toast } from "sonner";

interface ThreadAttachmentsProps {
  threadId: string;
  centreId: string;
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("text")) return FileText;
  return File;
}

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function ThreadAttachments({ threadId, centreId }: ThreadAttachmentsProps) {
  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["crm-email-attachments", threadId],
    queryFn: async () => {
      const { data: messages } = await supabase
        .from("crm_email_messages")
        .select("id")
        .eq("thread_id", threadId);

      if (!messages?.length) return [];

      const messageIds = messages.map((m) => m.id);
      const { data, error } = await supabase
        .from("crm_email_attachments")
        .select("*")
        .in("message_id", messageIds)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="bg-muted/40 rounded-lg p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
          <Loader2 className="h-3 w-3 animate-spin" /> Chargement…
        </div>
      </div>
    );
  }

  if (attachments.length === 0) {
    return (
      <div className="bg-muted/40 rounded-lg p-3">
        <div className="flex items-center gap-1.5">
          <Paperclip className="h-3 w-3 text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/50">Aucune pièce jointe</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Paperclip className="h-3 w-3 text-muted-foreground/60" />
        <span className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider">
          {attachments.length} pièce{attachments.length > 1 ? "s" : ""} jointe{attachments.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-1">
        {attachments.map((att) => (
          <AttachmentItem key={att.id} attachment={att} centreId={centreId} />
        ))}
      </div>
    </div>
  );
}

function AttachmentItem({ attachment, centreId }: { attachment: any; centreId: string }) {
  const Icon = getFileIcon(attachment.mime_type);

  const downloadMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("download-email-attachment", {
        body: { attachmentId: attachment.id, centreId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("URL non disponible");
      return data.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
    onError: (e) => {
      toast.error("Téléchargement impossible: " + e.message);
    },
  });

  const hasError = downloadMutation.isError;

  return (
    <div className="flex items-center gap-2 bg-background rounded-md px-2.5 py-2 border border-border/60 text-xs group">
      <Icon className="h-4 w-4 text-muted-foreground/60 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-foreground/80">{attachment.filename}</p>
        <p className="text-muted-foreground/50 text-[11px]">
          {attachment.mime_type?.split("/")[1]?.toUpperCase() || "Fichier"}
          {attachment.size_bytes ? ` · ${formatSize(attachment.size_bytes)}` : ""}
        </p>
      </div>
      {hasError ? (
        <div className="flex items-center gap-1 text-destructive/60" title="Téléchargement échoué">
          <AlertCircle className="h-3.5 w-3.5" />
        </div>
      ) : (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => downloadMutation.mutate()}
          disabled={downloadMutation.isPending}
          aria-label={`Télécharger ${attachment.filename}`}
        >
          {downloadMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
        </Button>
      )}
    </div>
  );
}
