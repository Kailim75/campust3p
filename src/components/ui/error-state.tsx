import { useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Relance la requête en échec (typiquement `refetch` de TanStack Query). */
  onRetry?: () => void | Promise<unknown>;
  /**
   * Nouvelle tentative en cours (typiquement `isFetching`). Facultatif : si
   * `onRetry` renvoie une promesse, le bouton se verrouille tout seul.
   */
  isRetrying?: boolean;
  /** Version resserrée pour une cellule de tableau ou un bloc secondaire. */
  compact?: boolean;
  className?: string;
}

/**
 * État d'erreur de chargement d'une liste — à afficher À LA PLACE de l'état vide.
 *
 * Audit du 13/08/2026 (UX P1) : quand une requête échouait, les pages rendaient
 * leur état vide (« Aucun retard », « Tout est à jour ») : un échec réseau ou
 * RLS passait pour une bonne nouvelle. Ce composant dit explicitement que ce
 * qui est affiché ne reflète pas la réalité, et propose de réessayer.
 */
export function ErrorState({
  title = "Impossible de charger les données",
  description = "Ces informations n'ont pas pu être récupérées : ce que vous voyez ne reflète pas la situation réelle. Vérifiez votre connexion puis réessayez.",
  onRetry,
  isRetrying = false,
  compact = false,
  className,
}: ErrorStateProps) {
  const [tentativeLocale, setTentativeLocale] = useState(false);
  const enCours = isRetrying || tentativeLocale;

  // Sans retour visuel, une panne persistante ressemble à un bouton mort :
  // l'utilisateur reclique pendant les ~7 s de nouvelles tentatives.
  const relancer = () => {
    const resultat = onRetry?.();
    if (resultat && typeof (resultat as Promise<unknown>).then === "function") {
      setTentativeLocale(true);
      const fin = () => setTentativeLocale(false);
      (resultat as Promise<unknown>).then(fin, fin);
    }
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-destructive/30 bg-destructive/5",
        compact ? "px-4 py-6" : "px-6 py-12",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-destructive/10 mb-4",
          compact ? "h-10 w-10" : "h-14 w-14",
        )}
      >
        <AlertTriangle className={cn("text-destructive", compact ? "h-5 w-5" : "h-7 w-7")} aria-hidden="true" />
      </div>
      <h3 className={cn("font-display font-semibold text-foreground", compact ? "text-base" : "text-lg")}>{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-md leading-relaxed">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={relancer} disabled={enCours}>
          <RefreshCw className={cn("h-4 w-4", enCours && "animate-spin")} aria-hidden="true" />
          {enCours ? "Nouvelle tentative…" : "Réessayer"}
        </Button>
      )}
    </div>
  );
}
