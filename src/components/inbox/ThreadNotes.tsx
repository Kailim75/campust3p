import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ThreadNotesProps {
  threadId: string;
  centreId: string;
}

export function ThreadNotes({ threadId, centreId }: ThreadNotesProps) {
  const [noteText, setNoteText] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ["crm-email-notes", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_notes")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteText.trim() || !user) return;
      const { error } = await supabase
        .from("crm_email_notes")
        .insert({
          thread_id: threadId,
          centre_id: centreId,
          content: noteText.trim(),
          created_by: user.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setNoteText("");
      queryClient.invalidateQueries({ queryKey: ["crm-email-notes", threadId] });
      toast.success("Note ajoutée");
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 space-y-3">
      <span className="text-xs font-medium text-muted-foreground">Notes internes</span>

      {notes.length > 0 && (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="text-sm bg-background rounded p-2 border">
              <p className="whitespace-pre-wrap">{note.content}</p>
              <span className="text-[10px] text-muted-foreground mt-1 block">
                {format(new Date(note.created_at), "dd MMM à HH:mm", { locale: fr })}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="Ajouter une note interne…"
          rows={2}
          className="text-sm resize-none flex-1"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={() => addNote.mutate()}
          disabled={!noteText.trim() || addNote.isPending}
          className="self-end"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
