import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { ACTION_LABELS, type RequalificationActionType } from "@/lib/requalification/categories";
import { useRequalificationAction } from "@/hooks/useRequalificationActions";
import type { RequalificationContact } from "@/hooks/useRequalificationContacts";

const ACTION_OPTIONS: RequalificationActionType[] = [
  "mark_smartof",
  "exclude_kpi",
  "archive",
  "mark_diplome",
  "add_note",
  "create_task",
  "reset_category",
];

export function RequalificationActionDialog({
  contact,
  open,
  onOpenChange,
}: {
  contact: RequalificationContact | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [action, setAction] = useState<RequalificationActionType>("mark_smartof");
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const mut = useRequalificationAction();

  if (!contact) return null;

  const isDestructive = action === "archive" || action === "mark_diplome";

  const handleSubmit = async () => {
    if (!comment.trim() || !reason.trim()) return;
    await mut.mutateAsync({ contact, action, comment, reason });
    setComment("");
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Action — {contact.prenom} {contact.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Suggestion : <span className="font-medium">{contact.suggestion.recommended}</span> ({contact.suggestion.confidence}) — {contact.suggestion.reason}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Action</label>
            <Select value={action} onValueChange={(v) => setAction(v as RequalificationActionType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_LABELS[a]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isDestructive && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Cette action modifie le statut Qualiopi ou archive la fiche. Commentaire et raison obligatoires, action tracée dans le journal d'audit.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium">Raison <span className="text-destructive">*</span></label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex : Apprenant importé depuis SmartOF, formation 2022"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium">Commentaire <span className="text-destructive">*</span></label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Détails, référence de preuve, contexte…"
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!comment.trim() || !reason.trim() || mut.isPending}
          >
            {mut.isPending ? "Enregistrement…" : "Valider l'action"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
