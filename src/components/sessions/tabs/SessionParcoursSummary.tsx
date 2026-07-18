import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Route, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeParcours,
  classerExamensParContact,
  type ExamenT3pRow,
  type ExamenPratiqueRow,
} from "@/lib/parcours-examen";

interface SessionParcoursSummaryProps {
  sessionId: string;
  onOpenExamens: () => void;
}

/**
 * Agrégat du parcours d'examen des inscrits de la session : combien sont en
 * attente de résultat, de convocation CMA, à réinscrire ou admis — étape
 * calculée par le moteur partagé (src/lib/parcours-examen.ts), rien de saisi.
 */
export function SessionParcoursSummary({ sessionId, onOpenExamens }: SessionParcoursSummaryProps) {
  const { data } = useQuery({
    queryKey: ["session-parcours-summary", sessionId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: insc, error } = await supabase
        .from("session_inscriptions")
        .select("contact_id")
        .eq("session_id", sessionId)
        .is("deleted_at", null);
      if (error) throw error;
      const ids = [...new Set((insc || []).map((i) => i.contact_id))];
      if (ids.length === 0) return null;

      const [t3pRes, pratRes] = await Promise.all([
        supabase
          .from("examens_t3p")
          .select("contact_id, type_formation, date_examen, resultat, date_resultat_recu, date_reussite, date_convocation_pratique_recue, numero_convocation")
          .in("contact_id", ids),
        supabase
          .from("examens_pratique")
          .select("contact_id, date_examen, resultat, date_resultat_recu")
          .in("contact_id", ids),
      ]);

      const parContact = classerExamensParContact(
        (t3pRes.data || []) as ExamenT3pRow[],
        (pratRes.data || []) as ExamenPratiqueRow[],
      );

      const now = new Date();
      const counts = { attenteResultat: 0, attenteConvocation: 0, aReinscrire: 0, admis: 0, enRetard: 0 };
      for (const id of ids) {
        const exams = parContact.get(id);
        const p = computeParcours(
          { theorie: exams?.theorie ?? null, pratique: exams?.pratique ?? null },
          now,
        );
        if (p.stage === "theorie_attente_resultat" || p.stage === "pratique_attente_resultat") {
          counts.attenteResultat++;
          if (p.attente?.niveau === "alerte") counts.enRetard++;
        } else if (p.stage === "attente_convocation_cma") {
          counts.attenteConvocation++;
          if (p.attente?.niveau === "alerte") counts.enRetard++;
        } else if (p.kind === "failed") {
          counts.aReinscrire++;
        } else if (p.stage === "admis") {
          counts.admis++;
        }
      }
      const aSuivre = counts.attenteResultat + counts.attenteConvocation + counts.aReinscrire;
      return { total: ids.length, aSuivre, ...counts };
    },
  });

  // Rien à afficher tant que personne n'est engagé dans le parcours d'examen.
  if (!data || (data.aSuivre === 0 && data.admis === 0)) return null;

  const chips: Array<{ label: string; value: number; className: string }> = [
    { label: "résultat attendu", value: data.attenteResultat, className: "bg-warning/10 text-warning border-warning/20" },
    { label: "convocation CMA attendue", value: data.attenteConvocation, className: "bg-warning/10 text-warning border-warning/20" },
    { label: "à réinscrire", value: data.aReinscrire, className: "bg-destructive/10 text-destructive border-destructive/20" },
    { label: "admis", value: data.admis, className: "bg-success/10 text-success border-success/20" },
  ].filter((c) => c.value > 0);

  return (
    <Card className={cn("p-3", data.enRetard > 0 ? "border-warning/30 bg-warning/5" : "")}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Route className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm font-semibold text-foreground">Parcours d'examen</p>
          {chips.map((c) => (
            <Badge key={c.label} variant="outline" className={cn("text-[11px]", c.className)}>
              {c.value} {c.label}{c.value > 1 && !c.label.endsWith("s") && c.label !== "admis" ? "s" : ""}
            </Badge>
          ))}
          {data.enRetard > 0 && (
            <span className="text-[11px] font-medium text-warning">
              dont {data.enRetard} en retard — relancer la CMA
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" className="h-7 text-[11px] gap-1" onClick={onOpenExamens}>
          Gérer les examens <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
