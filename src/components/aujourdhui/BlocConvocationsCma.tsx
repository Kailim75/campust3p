import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MailQuestion, MailCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { marquerConvocationRecue, invalidateParcours } from "@/lib/parcours-actions";
import type { ConvocationAttendueItem } from "./aujourdhui-types";

interface BlocConvocationsCmaProps {
  items: ConvocationAttendueItem[];
  openContact: (id: string) => void;
}

/**
 * Candidats admis à la théorie qui attendent leur convocation CMA à l'épreuve
 * pratique. Rappel dès J+21, alerte à J+28. Le bloc se vide dès que la
 * convocation est enregistrée (n° de convocation ou date reçue) sur la fiche.
 */
export function BlocConvocationsCma({ items, openContact }: BlocConvocationsCmaProps) {
  const queryClient = useQueryClient();
  const [enCours, setEnCours] = useState<string | null>(null);

  // Marquage direct depuis le bloc : la colonne date_convocation_pratique_recue
  // étant récente, beaucoup de candidats ont en réalité déjà leur convocation.
  // Ce bouton permet le rattrapage sans ouvrir chaque fiche.
  const marquer = async (item: ConvocationAttendueItem) => {
    if (!item.examenId) {
      toast.error("Examen introuvable — ouvrir la fiche pour enregistrer la convocation");
      return;
    }
    setEnCours(item.id);
    try {
      await marquerConvocationRecue(item.examenId);
      invalidateParcours(queryClient, item.contactId);
      toast.success(`${item.prenom} ${item.nom} — convocation enregistrée`);
    } catch {
      toast.error("Erreur lors de l'enregistrement de la convocation");
    } finally {
      setEnCours(null);
    }
  };

  if (items.length === 0) return null;
  const alertes = items.filter((i) => i.niveau === "alerte").length;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <MailQuestion className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Convocations CMA attendues</h3>
            <p className="text-[11px] text-muted-foreground">
              {items.length} convocation{items.length > 1 ? "s" : ""} en attente
              {alertes > 0 ? ` · ${alertes} en retard` : ""}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{items.length}</Badge>
      </div>
      <div className="divide-y max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "inline-block h-2 w-2 rounded-full shrink-0",
                item.niveau === "alerte" ? "bg-destructive" : "bg-warning",
              )} />
              <button
                onClick={() => openContact(item.contactId)}
                className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
              >
                {item.prenom} {item.nom}
                <ExternalLink className="h-3 w-3 opacity-40" />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Admis à la théorie il y a <span className={cn(
                "font-medium",
                item.niveau === "alerte" ? "text-destructive" : "text-warning",
              )}>{item.joursEcoules} jour{item.joursEcoules > 1 ? "s" : ""}</span>
              {item.niveau === "alerte" ? " — convocation en retard, à relancer auprès de la CMA" : " — convocation toujours attendue"}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[11px] gap-1 mt-2"
              disabled={enCours === item.id}
              onClick={() => marquer(item)}
            >
              <MailCheck className="h-3 w-3" />
              {enCours === item.id ? "Enregistrement…" : "Convocation reçue"}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
