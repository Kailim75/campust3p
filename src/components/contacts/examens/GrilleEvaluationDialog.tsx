import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import {
  useExamenGrilles,
  useSaveGrillesEvaluation,
  categoriesEvaluation,
  notesEvaluation,
  type GrilleEvaluationInsert,
} from "@/hooks/useGrillesEvaluation";

interface GrilleEvaluationDialogProps {
  examenId: string;
  typeExamen: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CompetenceEvaluation {
  categorie: string;
  competence: string;
  note: string;
  commentaire: string;
}

export function GrilleEvaluationDialog({
  examenId,
  typeExamen,
  open,
  onOpenChange,
}: GrilleEvaluationDialogProps) {
  const { data: existingGrilles = [], isLoading } = useExamenGrilles(examenId);
  const saveMutation = useSaveGrillesEvaluation();

  const [evaluations, setEvaluations] = useState<CompetenceEvaluation[]>([]);

  // Get the right categories based on exam type
  const getCategories = () => {
    const type = typeExamen.toLowerCase();
    if (type === "taxi") return categoriesEvaluation.taxi;
    if (type === "vtc") return categoriesEvaluation.vtc;
    if (type === "vmdtr") return categoriesEvaluation.vmdtr;
    return categoriesEvaluation.vtc; // Default
  };

  const categories = getCategories();

  // Initialize evaluations from categories or existing data
  useEffect(() => {
    if (!open) return;

    const initialEvaluations: CompetenceEvaluation[] = [];

    categories.forEach((cat) => {
      cat.competences.forEach((comp) => {
        const existing = existingGrilles.find(
          (g) => g.categorie === cat.categorie && g.competence === comp
        );
        initialEvaluations.push({
          categorie: cat.categorie,
          competence: comp,
          note: existing?.note || "",
          commentaire: existing?.commentaire || "",
        });
      });
    });

    setEvaluations(initialEvaluations);
  }, [existingGrilles, categories, open]);

  const updateEvaluation = (
    categorie: string,
    competence: string,
    field: "note" | "commentaire",
    value: string
  ) => {
    setEvaluations((prev) =>
      prev.map((e) =>
        e.categorie === categorie && e.competence === competence
          ? { ...e, [field]: value }
          : e
      )
    );
  };

  const handleSave = async () => {
    const grillesToSave: GrilleEvaluationInsert[] = evaluations
      .filter((e) => e.note || e.commentaire)
      .map((e) => ({
        examen_pratique_id: examenId,
        categorie: e.categorie,
        competence: e.competence,
        note: e.note || null,
        commentaire: e.commentaire || null,
      }));

    await saveMutation.mutateAsync({
      examenPratiqueId: examenId,
      grilles: grillesToSave,
    });
    onOpenChange(false);
  };

  const getCategorieLabel = (categorie: string) => {
    const labels: Record<string, string> = {
      technique: "Compétences Techniques",
      relation_client: "Relation Client",
      securite: "Sécurité & Réglementation",
      connaissance_territoire: "Connaissance du Territoire",
    };
    return labels[categorie] || categorie;
  };

  // Calculate category scores
  const getCategoryScore = (categorie: string) => {
    const catEvals = evaluations.filter((e) => e.categorie === categorie && e.note);
    if (catEvals.length === 0) return null;

    const scores = catEvals.map((e) => {
      const noteIdx = notesEvaluation.findIndex((n) => n.value === e.note);
      return noteIdx >= 0 ? 4 - noteIdx : 0; // A=4, B=3, C=2, D=1
    });

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    return avg >= 3.5 ? "A" : avg >= 2.5 ? "B" : avg >= 1.5 ? "C" : "D";
  };

  if (isLoading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            Grille d'évaluation - Examen {typeExamen.toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <Accordion type="multiple" defaultValue={categories.map((c) => c.categorie)} className="space-y-2">
            {categories.map((cat) => (
              <AccordionItem key={cat.categorie} value={cat.categorie} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-2">
                    <span className="font-medium">
                      {getCategorieLabel(cat.categorie)}
                    </span>
                    {getCategoryScore(cat.categorie) && (
                      <Badge
                        className={cn(
                          notesEvaluation.find(
                            (n) => n.value === getCategoryScore(cat.categorie)
                          )?.class
                        )}
                      >
                        {getCategoryScore(cat.categorie)}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  {cat.competences.map((comp) => {
                    const eval_ = evaluations.find(
                      (e) => e.categorie === cat.categorie && e.competence === comp
                    );
                    return (
                      <div key={comp} className="space-y-2 border-b pb-3 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{comp}</span>
                          <div className="flex gap-1">
                            {notesEvaluation.map((note) => (
                              <Button
                                key={note.value}
                                type="button"
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 w-8 p-0",
                                  eval_?.note === note.value && note.class
                                )}
                                onClick={() =>
                                  updateEvaluation(
                                    cat.categorie,
                                    comp,
                                    "note",
                                    eval_?.note === note.value ? "" : note.value
                                  )
                                }
                              >
                                {note.value}
                              </Button>
                            ))}
                          </div>
                        </div>
                        <Textarea
                          placeholder="Commentaire (optionnel)..."
                          value={eval_?.commentaire || ""}
                          onChange={(e) =>
                            updateEvaluation(
                              cat.categorie,
                              comp,
                              "commentaire",
                              e.target.value
                            )
                          }
                          rows={1}
                          className="text-sm resize-none"
                        />
                      </div>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <span className="font-medium">Légende :</span>
            {notesEvaluation.map((note) => (
              <span key={note.value} className="flex items-center gap-1">
                <Badge className={cn("h-5 w-5 p-0 justify-center", note.class)}>
                  {note.value}
                </Badge>
                <span className="text-xs">{note.label.split(" - ")[1]}</span>
              </span>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
