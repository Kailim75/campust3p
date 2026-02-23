import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CreneauConduite, useCreateCompteRendu, useUpsertProgression } from "@/hooks/usePlanningConduite";
import { toast } from "sonner";

const COMPETENCES = [
  "Créneaux", "Priorité à droite", "Ronds-points", "Voie rapide",
  "Stationnement", "Demi-tour", "Signalisation", "Conduite défensive",
  "Comportement carrefour", "Gestion des piétons", "Maîtrise vitesse", "Anticipation",
];

const NIVEAUX = [
  { value: "debutant", label: "Débutant", desc: "Manque les bases" },
  { value: "intermediaire", label: "Intermédiaire", desc: "Acquis partiels" },
  { value: "avance", label: "Avancé", desc: "Bonne maîtrise" },
  { value: "pret_examen", label: "Prêt pour l'examen ✅", desc: "Prêt à passer l'examen" },
];

const TYPE_LABELS: Record<string, string> = {
  conduite_preventive: "Conduite préventive",
  conduite_ville: "Conduite en ville",
  accompagnement_examen: "Accompagnement examen",
};

interface Props {
  creneau: CreneauConduite;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function CompteRenduModal({ creneau, open, onOpenChange }: Props) {
  const createCR = useCreateCompteRendu();
  const upsertProgression = useUpsertProgression();

  const [duree, setDuree] = useState<number>(60);
  const [competences, setCompetences] = useState<string[]>([]);
  const [positifs, setPositifs] = useState("");
  const [ameliorer, setAmeliorer] = useState("");
  const [niveau, setNiveau] = useState("intermediaire");
  const [seancesSup, setSeancesSup] = useState(0);

  const apprenantId = creneau.contact_id || creneau.contacts?.id;
  const apprenantNom = creneau.contacts ? `${creneau.contacts.prenom} ${creneau.contacts.nom}` : "Élève";

  const toggleCompetence = (c: string) => {
    setCompetences((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSubmit = async () => {
    if (!positifs.trim() || !ameliorer.trim()) {
      toast.error("Les points positifs et à améliorer sont obligatoires");
      return;
    }

    // We need a reservation_id — for now create with creneau.id as reference
    // In a real scenario we'd look up the reservation
    try {
      // First try to find the reservation
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: reservations } = await supabase
        .from("reservations_conduite")
        .select("id")
        .eq("creneau_id", creneau.id)
        .limit(1);

      let reservationId = reservations?.[0]?.id;

      // If no reservation exists, create one
      if (!reservationId && apprenantId) {
        const { data: newRes } = await supabase
          .from("reservations_conduite")
          .insert({ creneau_id: creneau.id, apprenant_id: apprenantId, statut: "realisee" })
          .select("id")
          .single();
        reservationId = newRes?.id;
      }

      if (!reservationId) {
        toast.error("Impossible de trouver la réservation associée");
        return;
      }

      await createCR.mutateAsync({
        reservation_id: reservationId,
        duree_reelle_minutes: duree,
        points_travailles: competences,
        points_positifs: positifs,
        points_ameliorer: ameliorer,
        niveau_global: niveau as "avance" | "debutant" | "intermediaire" | "pret_examen",
        recommandation_seances_sup: seancesSup,
      });

      // Update progression
      if (apprenantId) {
        const heuresField =
          creneau.type_seance === "conduite_preventive"
            ? "heures_preventive_realisees"
            : "heures_ville_realisees";

        const updateData: any = {
          apprenant_id: apprenantId,
          niveau_actuel: niveau,
          date_dernier_bilan: format(new Date(), "yyyy-MM-dd"),
          updated_at: new Date().toISOString(),
        };

        if (creneau.type_seance === "accompagnement_examen") {
          updateData.accompagnement_examen_fait = true;
        }

        await upsertProgression.mutateAsync(updateData);
      }

      onOpenChange(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compte rendu de séance</DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{apprenantNom}</span>
            <span>—</span>
            <span>{format(parseISO(creneau.date_creneau), "d MMMM yyyy", { locale: fr })}</span>
            <span>—</span>
            <span>{TYPE_LABELS[creneau.type_seance]}</span>
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Durée */}
          <div>
            <Label>Durée réelle (minutes)</Label>
            <Input type="number" min={15} max={240} value={duree} onChange={(e) => setDuree(Number(e.target.value))} className="w-32" />
          </div>

          {/* Compétences */}
          <div>
            <Label className="mb-2 block">Compétences travaillées</Label>
            <div className="flex flex-wrap gap-2">
              {COMPETENCES.map((c) => (
                <Badge
                  key={c}
                  variant={competences.includes(c) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  onClick={() => toggleCompetence(c)}
                >
                  {c}
                </Badge>
              ))}
            </div>
          </div>

          {/* Points positifs */}
          <div>
            <Label>Points positifs *</Label>
            <Textarea value={positifs} onChange={(e) => setPositifs(e.target.value)} rows={3} placeholder="Ce que l'élève a bien fait..." />
          </div>

          {/* Points à améliorer */}
          <div>
            <Label>Points à améliorer *</Label>
            <Textarea value={ameliorer} onChange={(e) => setAmeliorer(e.target.value)} rows={3} placeholder="Ce qui doit être travaillé..." />
          </div>

          {/* Niveau */}
          <div>
            <Label className="mb-2 block">Niveau global atteint</Label>
            <RadioGroup value={niveau} onValueChange={setNiveau} className="space-y-2">
              {NIVEAUX.map((n) => (
                <div key={n.value} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50">
                  <RadioGroupItem value={n.value} id={n.value} />
                  <label htmlFor={n.value} className="cursor-pointer">
                    <span className="font-medium">{n.label}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {n.desc}</span>
                  </label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Séances sup */}
          <div>
            <Label>Séances supplémentaires recommandées</Label>
            <div className="flex gap-2 mt-1">
              {[0, 1, 2, 3].map((n) => (
                <Button
                  key={n}
                  variant={seancesSup === n ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSeancesSup(n)}
                >
                  {n === 3 ? "3+" : n}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={createCR.isPending} className="w-full">
            {createCR.isPending ? "Enregistrement..." : "Enregistrer le compte rendu"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
