import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, StickyNote, User } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface NotesTabProps {
  contactId: string;
}

export function NotesTab({ contactId }: NotesTabProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: notes, isLoading } = useQuery({
    queryKey: ["apprenant-notes", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_historique")
        .select("*")
        .eq("contact_id", contactId)
        .eq("type", "note")
        .order("date_echange", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const addNote = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contact_historique").insert({
        contact_id: contactId,
        type: "note",
        titre: "Note interne",
        contenu: newNote,
        date_echange: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-notes", contactId] });
      toast.success("Note ajoutée");
      setNewNote("");
      setShowForm(false);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  if (isLoading) return <Skeleton className="h-[200px] rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          Notes internes
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-primary/20">
          <Textarea
            rows={3}
            placeholder="Saisir une note interne..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={!newNote.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
              {addNote.isPending ? "..." : "Enregistrer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      <ScrollArea className="h-[400px]">
        <div className="space-y-3">
          {(!notes || notes.length === 0) ? (
            <Card className="p-6 text-center text-muted-foreground">
              Aucune note interne
            </Card>
          ) : (
            notes.map((note: any) => (
              <Card key={note.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">Note interne</span>
                      <span className="text-[10px] text-muted-foreground">
                        {format(parseISO(note.date_echange), "dd/MM/yyyy à HH:mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.contenu}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
