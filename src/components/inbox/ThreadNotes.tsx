import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Send, Bell, Calendar, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface ThreadNotesProps {
  threadId: string;
  centreId: string;
}

export function ThreadNotes({ threadId, centreId }: ThreadNotesProps) {
  const [noteText, setNoteText] = useState("");
  const [createRappel, setCreateRappel] = useState(false);
  const [rappelDate, setRappelDate] = useState("");
  const [rappelDescription, setRappelDescription] = useState("");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notes = [] } = useQuery({
    queryKey: ["crm-email-notes", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_notes")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Get linked contacts for rappel
  const { data: linkedContacts = [] } = useQuery({
    queryKey: ["crm-email-links-contacts", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_links")
        .select("entity_id, entity_type")
        .eq("thread_id", threadId)
        .in("entity_type", ["contact", "apprenant"]);
      if (error) throw error;
      return data || [];
    },
    enabled: createRappel,
  });

  const addNote = useMutation({
    mutationFn: async () => {
      if (!noteText.trim() || !user) return;

      // 1. Add note to thread
      const { error } = await supabase
        .from("crm_email_notes")
        .insert({
          thread_id: threadId,
          centre_id: centreId,
          content: noteText.trim(),
          created_by: user.id,
        });
      if (error) throw error;

      // 2. If rappel requested, create entries in contact_historique for linked contacts
      if (createRappel && rappelDate && linkedContacts.length > 0) {
        const rappelEntries = linkedContacts.map((lc) => ({
          contact_id: lc.entity_id,
          type: "rappel" as const,
          titre: `📧 Rappel Inbox: ${rappelDescription || noteText.trim().slice(0, 60)}`,
          contenu: noteText.trim(),
          date_echange: new Date().toISOString().split("T")[0],
          date_rappel: rappelDate,
          rappel_description: rappelDescription || noteText.trim().slice(0, 100),
          alerte_active: true,
          created_by: user.id,
        }));

        const { error: rappelError } = await supabase
          .from("contact_historique")
          .insert(rappelEntries);
        if (rappelError) throw rappelError;
      }
    },
    onSuccess: () => {
      const hadRappel = createRappel && rappelDate && linkedContacts.length > 0;
      setNoteText("");
      setCreateRappel(false);
      setRappelDate("");
      setRappelDescription("");
      queryClient.invalidateQueries({ queryKey: ["crm-email-notes", threadId] });
      if (hadRappel) {
        queryClient.invalidateQueries({ queryKey: ["contact-historique"] });
        toast.success("Note ajoutée + rappel CRM créé");
      } else {
        toast.success("Note ajoutée");
      }
    },
    onError: (e) => toast.error("Erreur: " + e.message),
  });

  // Set default rappel date to tomorrow
  const handleToggleRappel = (checked: boolean) => {
    setCreateRappel(checked);
    if (checked && !rappelDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setRappelDate(tomorrow.toISOString().split("T")[0]);
    }
  };

  return (
    <div className="bg-amber-50/80 dark:bg-amber-950/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StickyNote className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
            Notes internes
          </span>
          {notes.length > 0 && (
            <span className="text-[10px] bg-amber-200/60 dark:bg-amber-800/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-medium leading-none">
              {notes.length}
            </span>
          )}
        </div>
      </div>

      {/* Note input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ajouter une note interne…"
            rows={2}
            className="text-sm resize-none flex-1 bg-background"
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => addNote.mutate()}
            disabled={!noteText.trim() || addNote.isPending}
            className="self-end h-8 w-8"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Rappel option */}
        {noteText.trim() && (
          <div className="space-y-2 animate-in fade-in-0 duration-150">
            <div className="flex items-center gap-2">
              <Checkbox
                id="create-rappel"
                checked={createRappel}
                onCheckedChange={(v) => handleToggleRappel(v === true)}
              />
              <label htmlFor="create-rappel" className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1">
                <Bell className="h-3 w-3" />
                Créer un rappel CRM
              </label>
            </div>

            {createRappel && (
              <div className="pl-6 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                {linkedContacts.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    ⚠ Aucun contact rattaché — rattachez un contact pour créer le rappel
                  </p>
                )}
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    <Input
                      type="date"
                      value={rappelDate}
                      onChange={(e) => setRappelDate(e.target.value)}
                      className="h-7 text-xs w-[140px]"
                    />
                  </div>
                  <Input
                    value={rappelDescription}
                    onChange={(e) => setRappelDescription(e.target.value)}
                    placeholder="Description du rappel…"
                    className="h-7 text-xs flex-1"
                  />
                </div>
                {linkedContacts.length > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Rappel créé pour {linkedContacts.length} contact{linkedContacts.length > 1 ? "s" : ""} rattaché{linkedContacts.length > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {notes.map((note) => (
            <div key={note.id} className="text-sm bg-background rounded-md p-2.5 border border-amber-200/50 dark:border-amber-800/30">
              <p className="whitespace-pre-wrap text-foreground/85 text-[13px] leading-relaxed">{note.content}</p>
              <span className="text-[10px] text-muted-foreground/60 mt-1.5 block">
                {format(new Date(note.created_at), "dd MMM à HH:mm", { locale: fr })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
