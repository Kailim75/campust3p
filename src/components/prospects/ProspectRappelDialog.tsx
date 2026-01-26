import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Bell, CalendarIcon } from "lucide-react";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useUpdateProspect, type Prospect } from "@/hooks/useProspects";
import { toast } from "sonner";

interface ProspectRappelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect;
}

export function ProspectRappelDialog({
  open,
  onOpenChange,
  prospect,
}: ProspectRappelDialogProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    prospect.date_prochaine_relance 
      ? new Date(prospect.date_prochaine_relance) 
      : undefined
  );

  const updateProspect = useUpdateProspect();

  const handleQuickDate = (days: number) => {
    setSelectedDate(addDays(new Date(), days));
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      toast.error("Veuillez sélectionner une date");
      return;
    }

    try {
      await updateProspect.mutateAsync({
        id: prospect.id,
        updates: { 
          date_prochaine_relance: format(selectedDate, "yyyy-MM-dd"),
        },
      });
      toast.success("Rappel programmé");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la programmation du rappel");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Programmer un rappel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Programmer une date de rappel pour relancer{" "}
            <span className="font-medium text-foreground">
              {prospect.prenom} {prospect.nom}
            </span>
          </div>

          {/* Quick date buttons */}
          <div className="space-y-2">
            <Label>Raccourcis</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(1)}
              >
                Demain
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(3)}
              >
                Dans 3 jours
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(7)}
              >
                Dans 1 semaine
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(14)}
              >
                Dans 2 semaines
              </Button>
            </div>
          </div>

          {/* Calendar */}
          <div className="space-y-2">
            <Label>Ou choisir une date</Label>
            <div className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={fr}
                disabled={(date) => date < new Date()}
                className={cn("rounded-md border pointer-events-auto")}
              />
            </div>
          </div>

          {/* Selected date display */}
          {selectedDate && (
            <div className="p-3 rounded-lg bg-primary/10 text-primary flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span className="font-medium">
                Rappel prévu le {format(selectedDate, "EEEE dd MMMM yyyy", { locale: fr })}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedDate || updateProspect.isPending}>
            <Bell className="h-4 w-4 mr-2" />
            Programmer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
