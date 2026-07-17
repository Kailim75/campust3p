import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileClock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ResultatAVerifierItem } from "./aujourdhui-types";

interface BlocResultatsAVerifierProps {
  items: ResultatAVerifierItem[];
  openContact: (id: string) => void;
}

/**
 * Candidats ayant passé un examen (théorique ou pratique) dont le résultat
 * n'est pas encore enregistré. Rappel dès J+21, alerte à J+35. Le bloc se
 * vide de lui-même dès que le résultat est saisi sur la fiche (état calculé).
 */
export function BlocResultatsAVerifier({ items, openContact }: BlocResultatsAVerifierProps) {
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
          </div>
        ))}
      </div>
    </Card>
  );
}
