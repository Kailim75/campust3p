import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Clock, MapPin, AlertTriangle } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCreateReservation } from "@/hooks/usePlanningConduite";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  conduite_preventive: "Préventive",
  conduite_ville: "Ville",
  accompagnement_examen: "Examen",
};

interface Props {
  apprenantId: string;
  apprenantNom: string;
  noShowCount: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ReprogrammerSheet({ apprenantId, apprenantNom, noShowCount, open, onOpenChange }: Props) {
  const [note, setNote] = useState("");
  const [selectedCreneauId, setSelectedCreneauId] = useState<string | null>(null);
  const createReservation = useCreateReservation();

  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const { data: creneaux } = useQuery({
    queryKey: ["creneaux-available-reprog", apprenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("creneaux_conduite")
        .select("id, type_seance, date_creneau, heure_debut, heure_fin, lieu_depart")
        .eq("statut", "disponible")
        .gte("date_creneau", tomorrow)
        .order("date_creneau")
        .order("heure_debut")
        .limit(20);
      return data || [];
    },
    enabled: open,
  });

  const handleConfirm = () => {
    if (!selectedCreneauId) return;
    createReservation.mutate(
      { creneau_id: selectedCreneauId, apprenant_id: apprenantId },
      {
        onSuccess: () => {
          toast.success(`Reprogrammation confirmée pour ${apprenantNom}`);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Reprogrammation — {apprenantNom}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">{noShowCount} no-show(s) au total</span>
          </div>

          <div>
            <Label>Note interne (optionnel)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note sur cet incident..."
              rows={2}
            />
          </div>

          <div>
            <Label className="mb-2 block">Sélectionner un créneau</Label>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {creneaux?.length ? (
                creneaux.map((c: any) => (
                  <Card
                    key={c.id}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedCreneauId === c.id ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedCreneauId(c.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {format(parseISO(c.date_creneau), "EEE d MMM", { locale: fr })}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {c.heure_debut?.slice(0, 5)} - {c.heure_fin?.slice(0, 5)}
                          {c.lieu_depart && (
                            <>
                              <MapPin className="h-3 w-3 ml-1" />
                              {c.lieu_depart}
                            </>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {TYPE_LABELS[c.type_seance] || c.type_seance}
                      </Badge>
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Aucun créneau disponible</p>
              )}
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            disabled={!selectedCreneauId || createReservation.isPending}
            className="w-full"
          >
            {createReservation.isPending ? "Confirmation..." : "Confirmer la reprogrammation"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
