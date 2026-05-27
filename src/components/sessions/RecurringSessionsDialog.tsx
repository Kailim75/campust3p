import { useState } from "react";
import { addDays, addMonths, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Loader2, Repeat } from "lucide-react";
import { toast } from "sonner";
import { useCreateSession, type Session } from "@/hooks/useSessions";

type Frequency = "weekly" | "biweekly" | "monthly";

interface RecurringSessionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateSession: Session | null;
}

const FREQ_OPTIONS: Array<{ value: Frequency; label: string; days: number }> = [
  { value: "weekly", label: "Hebdomadaire (7 jours)", days: 7 },
  { value: "biweekly", label: "Toutes les 2 semaines (14 jours)", days: 14 },
  { value: "monthly", label: "Mensuel", days: 30 },
];

function shiftDate(iso: string, frequency: Frequency, iteration: number): string {
  const base = parseISO(iso);
  if (frequency === "monthly") return format(addMonths(base, iteration), "yyyy-MM-dd");
  const days = FREQ_OPTIONS.find((f) => f.value === frequency)!.days;
  return format(addDays(base, days * iteration), "yyyy-MM-dd");
}

export function RecurringSessionsDialog({ open, onOpenChange, templateSession }: RecurringSessionsDialogProps) {
  const createSession = useCreateSession();
  const [count, setCount] = useState(4);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [processing, setProcessing] = useState(false);

  if (!templateSession) return null;

  const baseStart = templateSession.date_debut;
  const baseEnd = templateSession.date_fin;
  const durationDays = baseStart && baseEnd
    ? Math.max(0, Math.round((parseISO(baseEnd).getTime() - parseISO(baseStart).getTime()) / 86400000))
    : 0;

  const preview = Array.from({ length: Math.min(count, 6) }, (_, i) => {
    const newStart = shiftDate(baseStart, frequency, i + 1);
    const newEnd = baseEnd
      ? format(addDays(parseISO(newStart), durationDays), "yyyy-MM-dd")
      : newStart;
    return { start: newStart, end: newEnd, index: i + 1 };
  });

  const handleGenerate = async () => {
    if (count < 1 || count > 24) {
      toast.error("Choisissez entre 1 et 24 occurrences");
      return;
    }
    setProcessing(true);
    let success = 0;
    let failed = 0;
    try {
      for (let i = 1; i <= count; i++) {
        const newStart = shiftDate(baseStart, frequency, i);
        const newEnd = baseEnd
          ? format(addDays(parseISO(newStart), durationDays), "yyyy-MM-dd")
          : newStart;
        const { id, created_at, updated_at, numero_session, deleted_at, deleted_by, ...sessionData } =
          templateSession as any;
        try {
          await createSession.mutateAsync({
            ...sessionData,
            nom: `${templateSession.nom} #${i + 1}`,
            date_debut: newStart,
            date_fin: newEnd,
            statut: "a_venir",
          });
          success++;
        } catch (e) {
          failed++;
          console.error(e);
        }
      }
      if (success > 0) {
        toast.success(`${success} session${success > 1 ? "s" : ""} créée${success > 1 ? "s" : ""}`, {
          description: failed > 0 ? `${failed} échec${failed > 1 ? "s" : ""}` : undefined,
        });
        onOpenChange(false);
      } else {
        toast.error("Aucune session créée");
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-primary" />
            Créer des sessions récurrentes
          </DialogTitle>
          <DialogDescription>
            Modèle : <span className="font-medium text-foreground">{templateSession.nom}</span>
            <br />
            Démarrage du modèle :{" "}
            <span className="font-medium text-foreground">
              {format(parseISO(baseStart), "EEEE d MMMM yyyy", { locale: fr })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rec-count">Nombre de sessions</Label>
              <Input
                id="rec-count"
                type="number"
                min={1}
                max={24}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(24, parseInt(e.target.value, 10) || 1)))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-freq">Fréquence</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger id="rec-freq">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQ_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Aperçu des {count} prochaine{count > 1 ? "s" : ""} session{count > 1 ? "s" : ""}
              {count > 6 && <Badge variant="outline" className="text-[9px]">6 premières</Badge>}
            </div>
            <ul className="space-y-1">
              {preview.map((p) => (
                <li key={p.index} className="text-xs text-foreground flex items-center gap-2">
                  <span className="text-muted-foreground w-6">#{p.index + 1}</span>
                  <span>{format(parseISO(p.start), "EEE d MMM yyyy", { locale: fr })}</span>
                  {p.start !== p.end && (
                    <>
                      <span className="text-muted-foreground">→</span>
                      <span>{format(parseISO(p.end), "EEE d MMM yyyy", { locale: fr })}</span>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-muted-foreground pt-1 border-t mt-2">
              Toutes les sessions hériteront du formateur, lieu, tarif et programme du modèle. Statut initial : « À venir ».
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                Création…
              </>
            ) : (
              <>Créer {count} session{count > 1 ? "s" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
