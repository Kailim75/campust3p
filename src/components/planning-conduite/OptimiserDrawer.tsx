import { useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, User, Clock, Calendar, UserPlus, Eye, X } from "lucide-react";
import { CreneauConduite } from "@/hooks/usePlanningConduite";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface OptimiserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creneauxVides: CreneauConduite[];
  onReserver: (creneauId: string, apprenantId: string) => void;
}

interface SuggestedStudent {
  id: string;
  prenom: string;
  nom: string;
  formation: string | null;
  priorityLabel: string;
  priorityScore: number;
}

export function OptimiserDrawer({ open, onOpenChange, creneauxVides, onReserver }: OptimiserDrawerProps) {
  // Fetch students for suggestions - single grouped query
  const { data: students } = useQuery({
    queryKey: ["optimization-students"],
    queryFn: async () => {
      // Get contacts with active formation (not archived)
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("id, prenom, nom, formation")
        .eq("archived", false)
        .not("formation", "is", null)
        .limit(100);
      if (error) throw error;

      // Get progression data
      const { data: progressions } = await supabase
        .from("progression_conduite")
        .select("apprenant_id, niveau_actuel, heures_preventive_realisees, heures_ville_realisees");

      // Get this week's reservations
      const { data: weekReservations } = await supabase
        .from("reservations_conduite")
        .select("apprenant_id")
        .eq("statut", "confirmee");

      const progMap = new Map((progressions || []).map(p => [p.apprenant_id, p]));
      const reservedSet = new Set((weekReservations || []).map(r => r.apprenant_id));

      return (contacts || []).map(c => {
        const prog = progMap.get(c.id);
        let priorityScore = 0;
        let priorityLabel = "Disponible";

        // Priority 1: Near exam
        if (prog?.niveau_actuel === "pret_examen" || prog?.niveau_actuel === "avance") {
          priorityScore += 30;
          priorityLabel = "Proche examen";
        }

        // Priority 2: Many remaining hours (heuristic: low hours done)
        const totalDone = (prog?.heures_preventive_realisees || 0) + (prog?.heures_ville_realisees || 0);
        if (totalDone < 10) {
          priorityScore += 20;
          priorityLabel = priorityLabel === "Disponible" ? "Heures restantes" : priorityLabel;
        }

        // Priority 3: No slot this week
        if (!reservedSet.has(c.id)) {
          priorityScore += 15;
          if (priorityLabel === "Disponible") priorityLabel = "Sans créneau cette sem.";
        }

        return { ...c, priorityScore, priorityLabel } as SuggestedStudent;
      }).sort((a, b) => b.priorityScore - a.priorityScore);
    },
    enabled: open,
    staleTime: 30_000,
  });

  // Sort creneaux vides by urgency (closest first)
  const sortedCreneaux = useMemo(() => {
    const now = new Date();
    return [...creneauxVides].sort((a, b) => {
      const dateA = parseISO(a.date_creneau);
      const dateB = parseISO(b.date_creneau);
      return dateA.getTime() - dateB.getTime();
    });
  }, [creneauxVides]);

  const topStudents = (students || []).slice(0, 5);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Optimiser ma semaine
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {sortedCreneaux.length === 0 ? (
            <Card className="p-6 text-center">
              <Badge variant="default" className="mb-2">🎉 Bravo</Badge>
              <p className="text-sm text-muted-foreground">Aucun créneau vide à optimiser !</p>
            </Card>
          ) : (
            sortedCreneaux.map(creneau => {
              const hoursUntil = differenceInHours(parseISO(creneau.date_creneau), new Date());
              const isUrgent = hoursUntil < 48;
              
              return (
                <Card key={creneau.id} className={cn(
                  "p-4 space-y-3",
                  isUrgent && "border-warning"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {format(parseISO(creneau.date_creneau), "EEEE d MMMM", { locale: fr })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {creneau.heure_debut?.slice(0, 5)} - {creneau.heure_fin?.slice(0, 5)}
                      </span>
                    </div>
                    {isUrgent && (
                      <Badge variant="outline" className="border-warning text-warning text-[10px]">
                        ⚠️ &lt;48h
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {creneau.lieu_depart || "Lieu non précisé"} · {creneau.type_seance}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Élèves suggérés :</p>
                    {topStudents.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Aucun élève disponible</p>
                    ) : (
                      topStudents.map(student => (
                        <div key={student.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 group">
                          <div className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{student.prenom} {student.nom}</span>
                            <Badge variant="outline" className="text-[9px] py-0">
                              {student.priorityLabel}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => onReserver(creneau.id, student.id)}
                            >
                              <UserPlus className="h-3 w-3 mr-1" />
                              Inscrire
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
