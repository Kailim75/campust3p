import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileClock, Check, X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { enregistrerResultat, invalidateParcours, type ResultatSaisi } from "@/lib/parcours-actions";
import type { ResultatAVerifierItem } from "./aujourdhui-types";

interface BlocResultatsAVerifierProps {
  items: ResultatAVerifierItem[];
  openContact: (id: string) => void;
}

const CHOIX: Array<{ valeur: ResultatSaisi; label: string; icon: typeof Check; className: string }> = [
  { valeur: "admis", label: "Admis", icon: Check, className: "text-success border-success/30 hover:bg-success/10" },
  { valeur: "ajourne", label: "Ajourné", icon: X, className: "text-destructive border-destructive/30 hover:bg-destructive/10" },
  { valeur: "absent", label: "Absent", icon: Minus, className: "text-warning border-warning/30 hover:bg-warning/10" },
];

/**
 * Candidats ayant passé un examen (théorique ou pratique) dont le résultat
 * n'est pas encore enregistré. Rappel dès J+21, alerte à J+35. Le bloc se
 * vide de lui-même dès que le résultat est saisi sur la fiche (état calculé).
 */
export function BlocResultatsAVerifier({ items, openContact }: BlocResultatsAVerifierProps) {
  const queryClient = useQueryClient();
  const [enCours, setEnCours] = useState<string | null>(null);

  // Saisie du résultat directement depuis le bloc : évite d'ouvrir chaque
  // fiche pour un rattrapage. Horodate la réception → le candidat sort du bloc.
  const saisir = async (item: ResultatAVerifierItem, resultat: ResultatSaisi) => {
    if (!item.examenId) {
      toast.error("Examen introuvable — ouvrir la fiche pour saisir le résultat");
      return;
    }
    setEnCours(item.id);
    try {
      await enregistrerResultat({ examenId: item.examenId, source: item.examenSource, resultat });
      invalidateParcours(queryClient, item.contactId);
      toast.success(`${item.prenom} ${item.nom} — résultat enregistré`);
    } catch {
      toast.error("Erreur lors de l'enregistrement du résultat");
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
            <FileClock className="h-4 w-4 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Résultats à vérifier</h3>
            <p className="text-[11px] text-muted-foreground">
              {items.length} résultat{items.length > 1 ? "s" : ""} en attente
              {alertes > 0 ? ` · ${alertes} en retard` : ""}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-warning/10 text-warning">{items.length}</Badge>
      </div>
      <div className="divide-y max-h-72 overflow-y-auto">
        {items.map((item) => (
          <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
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
              <Badge variant="outline" className="text-[11px] bg-muted text-muted-foreground">
                {item.type === "pratique" ? "Pratique" : "Théorie"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Examen passé il y a <span className={cn(
                "font-medium",
                item.niveau === "alerte" ? "text-destructive" : "text-warning",
              )}>{item.joursEcoules} jour{item.joursEcoules > 1 ? "s" : ""}</span>
              {item.niveau === "alerte" ? " — résultat en retard, à relancer auprès de la CMA" : " — résultat toujours attendu"}
            </p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground mr-0.5">Résultat reçu :</span>
              {CHOIX.map(({ valeur, label, icon: Icon, className }) => (
                <Button
                  key={valeur}
                  size="sm"
                  variant="outline"
                  className={cn("h-6 text-[11px] gap-1", className)}
                  disabled={enCours === item.id}
                  onClick={() => saisir(item, valeur)}
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
