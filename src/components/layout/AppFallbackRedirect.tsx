import { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { resolveNavTarget, getEntryById } from "@/config/navigationRegistry";

/**
 * Route catch-all pour l'app authentifiée.
 *
 * Lorsqu'un utilisateur arrive sur une URL inconnue (ancien lien, faute
 * de frappe, deep-link périmé), on évite la page 404 brutale en
 * redirigeant automatiquement vers le hub le plus pertinent du registre
 * de navigation. Un toast informe l'utilisateur de la redirection.
 *
 * Ce composant doit être monté en aval de ProtectedRoute pour préserver
 * le NotFound public sur les URLs hors-app (ex. `/auth/typo`).
 */
export function AppFallbackRedirect() {
  const location = useLocation();
  const { section, matched, path } = resolveNavTarget(location.pathname);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (notifiedRef.current) return;
    notifiedRef.current = true;

    const entry = getEntryById(section);
    const targetLabel = entry?.label ?? "Tableau de bord";

    if (matched) {
      toast.info(`Redirigé vers « ${targetLabel} »`, {
        description: `L'URL ${location.pathname} n'existe plus, vous avez été déplacé vers la section correspondante.`,
      });
    } else {
      toast.warning("Page introuvable", {
        description: `Aucune correspondance pour ${location.pathname}. Retour au tableau de bord.`,
      });
    }
  }, [location.pathname, section, matched]);

  return <Navigate to={path} replace />;
}
