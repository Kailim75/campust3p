import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Sparkles } from "lucide-react";
import {
  useEmailSnippets, useCreateSnippet, useUpdateSnippet, useDeleteSnippet,
  type EmailSnippet,
} from "@/hooks/useEmailSnippets";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const DEFAULT_BODY = "Bonjour {prenom},\n\n…\n\nCordialement,";

export function SnippetsSettings() {
  const { data: snippets = [], isLoading } = useEmailSnippets();
  const createMut = useCreateSnippet();
  const updateMut = useUpdateSnippet();
  const deleteMut = useDeleteSnippet();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailSnippet | null>(null);
  const [form, setForm] = useState({
    shortcut: "",
    title: "",
    body: DEFAULT_BODY,
    scope: "centre" as "centre" | "personal",
  });

  const [confirmDelete, setConfirmDelete] = useState<EmailSnippet | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm({ shortcut: "", title: "", body: DEFAULT_BODY, scope: "centre" });
    setOpen(true);
  };
  const openEdit = (s: EmailSnippet) => {
    setEditing(s);
    setForm({ shortcut: s.shortcut, title: s.title, body: s.body, scope: s.scope });
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      shortcut: form.shortcut.trim().startsWith("/") ? form.shortcut.trim() : "/" + form.shortcut.trim(),
      title: form.title.trim(),
      body: form.body,
      scope: form.scope,
      user_id: form.scope === "personal" ? userId : null,
    };
    if (!payload.shortcut || payload.shortcut === "/" || !payload.title || !payload.body.trim()) {
      return;
    }
    if (editing) {
      await updateMut.mutateAsync({ id: editing.id, ...payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Snippets email
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Modèles de réponses rapides accessibles depuis l'Inbox.
            Utilisez les variables <code className="bg-muted px-1 rounded text-xs">{"{prenom}"}</code>,{" "}
            <code className="bg-muted px-1 rounded text-xs">{"{nom}"}</code>,{" "}
            <code className="bg-muted px-1 rounded text-xs">{"{email}"}</code>,{" "}
            <code className="bg-muted px-1 rounded text-xs">{"{centre}"}</code>,{" "}
            <code className="bg-muted px-1 rounded text-xs">{"{date}"}</code>.
          </p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 shrink-0">
          <Plus className="h-4 w-4" /> Nouveau snippet
        </Button>
      </div>

      <div className="border rounded-lg divide-y bg-card">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground text-center">Chargement…</div>
        ) : snippets.length === 0 ? (
          <div className="p-8 text-sm text-muted-foreground text-center">
            Aucun snippet. Créez-en un pour gagner du temps sur vos emails fréquents.
          </div>
        ) : (
          snippets.map((s) => (
            <div key={s.id} className="p-4 flex items-start gap-3 hover:bg-muted/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{s.shortcut}</span>
                  <span className="font-medium text-sm">{s.title}</span>
                  <Badge variant={s.scope === "personal" ? "outline" : "secondary"} className="text-[10px]">
                    {s.scope === "personal" ? "Personnel" : "Partagé"}
                  </Badge>
                  {s.usage_count > 0 && (
                    <span className="text-[10px] text-muted-foreground">utilisé {s.usage_count}×</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">{s.body}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(s)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setConfirmDelete(s)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le snippet" : "Nouveau snippet"}</DialogTitle>
            <DialogDescription>
              Définissez un modèle de réponse réutilisable.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Raccourci</Label>
                <Input
                  value={form.shortcut}
                  onChange={(e) => setForm((f) => ({ ...f, shortcut: e.target.value }))}
                  placeholder="/relance"
                  className="h-9 font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visibilité</Label>
                <Select value={form.scope} onValueChange={(v: any) => setForm((f) => ({ ...f, scope: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="centre">Partagé (équipe)</SelectItem>
                    <SelectItem value="personal">Personnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Titre</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Relance prospect — sans réponse 7j"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contenu</Label>
              <Textarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                rows={10}
                className="text-sm font-mono resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Variables : {"{prenom}"} {"{nom}"} {"{email}"} {"{centre}"} {"{date}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le snippet ?</AlertDialogTitle>
            <AlertDialogDescription>
              « {confirmDelete?.title} » sera supprimé. Cette action peut être annulée par un administrateur.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDelete) await deleteMut.mutateAsync(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
