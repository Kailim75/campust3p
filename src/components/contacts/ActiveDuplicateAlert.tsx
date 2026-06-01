import { AlertCircle, ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { ActiveDuplicateMatch } from "@/hooks/useActiveDuplicateCheck";

interface ActiveDuplicateAlertProps {
  match: ActiveDuplicateMatch | null;
  onOpenExisting?: (id: string) => void;
}

/**
 * Alerte rouge affichée quand un contact actif (non supprimé, non archivé)
 * du même centre utilise déjà cet email. Bloque la création/réactivation.
 */
export function ActiveDuplicateAlert({ match, onOpenExisting }: ActiveDuplicateAlertProps) {
  if (!match) return null;
  const fullName = [match.prenom, match.nom].filter(Boolean).join(" ").trim() || "Contact existant";

  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Contact actif déjà existant</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>
          Un contact actif avec cet email existe déjà dans ce centre&nbsp;: <strong>{fullName}</strong>.
          La création (ou la réactivation) est bloquée pour préserver l'historique métier.
        </p>
        {onOpenExisting && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenExisting(match.id)}
            className="gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Ouvrir la fiche existante
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
