import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Plus, StickyNote, User, Bell, Clock, Bot, Filter } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface NotesTabProps {
  contactId: string;
}

type NoteFilter = "all" | "manual" | "auto";

export function NotesTab({ contactId }: NotesTabProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [alerteActive, setAlerteActive] = useState(false);
  const [dateRappel, setDateRappel] = useState("");
  const [heureRappel, setHeureRappel] = useState("09:00");
  const [rappelDescription, setRappelDescription] = useState("");
  const [filter, setFilter] = useState<NoteFilter>("manual");

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

  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    switch (filter) {
      case "manual":
        return notes.filter((n: any) => !n.titre?.startsWith("[AUTO]"));
      case "auto":
        return notes.filter((n: any) => n.titre?.startsWith("[AUTO]"));
      default:
        return notes;
    }
  }, [notes, filter]);

  const counts = useMemo(() => {
    if (!notes) return { all: 0, manual: 0, auto: 0 };
    const auto = notes.filter((n: any) => n.titre?.startsWith("[AUTO]")).length;
    return { all: notes.length, manual: notes.length - auto, auto };
  }, [notes]);

  const addNote = useMutation({
    mutationFn: async () => {
      let dateRappelFull: string | null = null;
      if (alerteActive && dateRappel) {
        dateRappelFull = `${dateRappel}T${heureRappel}:00`;
      }
      const { error } = await supabase.from("contact_historique").insert({
        contact_id: contactId,
        type: "note",
        titre: "Note interne",
        contenu: newNote,
        date_echange: new Date().toISOString(),
        alerte_active: alerteActive,
        date_rappel: dateRappelFull,
        rappel_description: rappelDescription.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-notes", contactId] });
      toast.success("Note ajoutée");
      resetForm();
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const resetForm = () => {
    setNewNote("");
    setShowForm(false);
    setAlerteActive(false);
    setDateRappel("");
    setHeureRappel("09:00");
    setRappelDescription("");
  };

  if (isLoading) return <Skeleton className="h-[200px] rounded-xl" />;

  const FILTERS: { value: NoteFilter; label: string; count: number }[] = [
    { value: "manual", label: "Manuelles", count: counts.manual },
    { value: "auto", label: "Auto", count: counts.auto },
    { value: "all", label: "Toutes", count: counts.all },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          Notes
        </h3>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              "text-xs px-2.5 py-1 rounded-full border transition-colors",
              filter === f.value
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted/30 text-muted-foreground border-transparent hover:bg-muted/50"
            )}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Add note form */}
      {showForm && (
        <Card className="p-4 space-y-3 border-primary/20">
          <Textarea
            rows={3}
            placeholder="Saisir une note interne..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                <Label htmlFor="alerte-note" className="font-medium text-sm">Créer un rappel</Label>
              </div>
              <Switch id="alerte-note" checked={alerteActive} onCheckedChange={setAlerteActive} />
            </div>
            {alerteActive && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="dateRappelNote" className="text-xs">Date *</Label>
                    <Input id="dateRappelNote" type="date" value={dateRappel} onChange={(e) => setDateRappel(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heureRappelNote" className="text-xs">Heure</Label>
                    <Input id="heureRappelNote" type="time" value={heureRappel} onChange={(e) => setHeureRappel(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rappelDescNote" className="text-xs">Motif du rappel</Label>
                  <Input id="rappelDescNote" value={rappelDescription} onChange={(e) => setRappelDescription(e.target.value)} placeholder="Ex: Rappeler pour documents manquants" />
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={!newNote.trim() || addNote.isPending || (alerteActive && !dateRappel)} onClick={() => addNote.mutate()}>
              {addNote.isPending ? "..." : "Enregistrer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>Annuler</Button>
          </div>
        </Card>
      )}

      {/* Notes list */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {filteredNotes.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              {filter === "auto" ? "Aucune note automatique" : filter === "manual" ? "Aucune note manuelle" : "Aucune note"}
            </Card>
          ) : (
            filteredNotes.map((note: any) => {
              const isAuto = note.titre?.startsWith("[AUTO]");
              return (
                <Card key={note.id} className={cn("p-3", isAuto && "bg-muted/20 border-muted")}>
                  <div className="flex items-start gap-2.5">
                    <div className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                      isAuto ? "bg-muted" : "bg-primary/10"
                    )}>
                      {isAuto ? (
                        <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-xs font-medium text-foreground truncate">
                          {isAuto ? note.titre.replace("[AUTO] ", "") : note.titre || "Note interne"}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(parseISO(note.date_echange), "dd/MM/yy HH:mm", { locale: fr })}
                        </span>
                      </div>
                      {note.contenu && (
                        <p className={cn("text-xs whitespace-pre-wrap", isAuto ? "text-muted-foreground" : "text-foreground/80")}>
                          {note.contenu}
                        </p>
                      )}
                      {/* Rappel indicator */}
                      {note.alerte_active && note.date_rappel && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] bg-warning/10 text-warning rounded-md px-2 py-1">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>
                            Rappel : {format(parseISO(note.date_rappel), "dd/MM/yyyy à HH:mm", { locale: fr })}
                            {note.rappel_description && ` — ${note.rappel_description}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
