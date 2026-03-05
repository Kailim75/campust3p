import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Phone, MessageCircle, Mail, Loader2 } from "lucide-react";
import { useReplanifyProspect, type ActionType } from "@/hooks/useProspectActions";
import { addDays, addHours, format } from "date-fns";

interface ProspectReplanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospectId: string | null;
  prospectName?: string;
}

const PRESETS = [
  { label: "Dans 1h", getValue: () => addHours(new Date(), 1).toISOString() },
  { label: "Demain 9h", getValue: () => { const d = addDays(new Date(), 1); d.setHours(9, 0, 0, 0); return d.toISOString(); } },
  { label: "Dans 3 jours", getValue: () => addDays(new Date(), 3).toISOString() },
  { label: "Dans 1 semaine", getValue: () => addDays(new Date(), 7).toISOString() },
];

const CHANNEL_OPTIONS: { value: ActionType; label: string; icon: React.ReactNode }[] = [
  { value: "call", label: "Appel", icon: <Phone className="h-4 w-4" /> },
  { value: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="h-4 w-4" /> },
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
];

export function ProspectReplanDialog({ open, onOpenChange, prospectId, prospectName }: ProspectReplanDialogProps) {
  const [date, setDate] = useState(format(addDays(new Date(), 1), "yyyy-MM-dd'T'HH:mm"));
  const [channel, setChannel] = useState<ActionType>("call");
  const [note, setNote] = useState("");
  const replanify = useReplanifyProspect();

  const handleSubmit = () => {
    if (!prospectId) return;
    replanify.mutate(
      { prospectId, nextActionAt: new Date(date).toISOString(), nextActionType: channel, note },
      { onSuccess: () => { onOpenChange(false); setNote(""); } }
    );
  };

  const applyPreset = (getValue: () => string) => {
    const iso = getValue();
    setDate(format(new Date(iso), "yyyy-MM-dd'T'HH:mm"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Replanifier
          </DialogTitle>
          {prospectName && (
            <DialogDescription>{prospectName}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Presets */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.label}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(p.getValue)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom date */}
          <div className="space-y-2">
            <Label>Date et heure</Label>
            <Input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Channel */}
          <div className="space-y-2">
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as ActionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <div className="flex items-center gap-2">
                      {c.icon}
                      {c.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (optionnel)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contexte de la relance..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={replanify.isPending}>
              {replanify.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Planifier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
