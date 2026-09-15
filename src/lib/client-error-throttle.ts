/**
 * Throttle en mémoire pour la capture serveur des erreurs front
 * (supervision minimale, 15/09/2026 — voir `report-client-error`).
 *
 * Le CRM est une SPA longue durée (onglet ouvert toute la journée) : une
 * erreur qui se répète (ex. un composant qui re-render en boucle) ne doit
 * pas spammer l'edge function ni gonfler `client_error_logs`. Fonction
 * pure et testable, extraite de `main.tsx` / `AppErrorBoundary`.
 */

const DEFAULT_WINDOW_MS = 60_000;
// Borne dure sur la taille de la Map : une page qui produit des centaines
// d'erreurs DIFFÉRENTES (clé à chaque fois nouvelle) ne doit pas faire
// grossir la mémoire indéfiniment sur une session ouverte toute la journée.
const DEFAULT_MAX_ENTRIES = 200;

export type ErrorThrottle = (key: string, now?: number) => boolean;

/**
 * Crée un throttle indépendant (une Map par instance — un par appelant,
 * typiquement un singleton au niveau module de `main.tsx`).
 *
 * `shouldReport(key)` renvoie `true` la première fois qu'une clé est vue,
 * puis `false` tant que `windowMs` ne s'est pas écoulé depuis le dernier
 * passage à `true` pour cette même clé.
 */
export function createErrorThrottle(
  windowMs: number = DEFAULT_WINDOW_MS,
  maxEntries: number = DEFAULT_MAX_ENTRIES,
): ErrorThrottle {
  const lastSeenAt = new Map<string, number>();

  return function shouldReport(key: string, now: number = Date.now()): boolean {
    const last = lastSeenAt.get(key);
    if (last !== undefined && now - last < windowMs) {
      return false;
    }

    lastSeenAt.set(key, now);

    if (lastSeenAt.size > maxEntries) {
      // Map conserve l'ordre d'insertion : la première clé est la plus
      // ancienne encore présente. Éviction simple, pas un vrai LRU — la
      // borne dure est le seul objectif ici.
      const oldestKey = lastSeenAt.keys().next().value;
      if (oldestKey !== undefined) lastSeenAt.delete(oldestKey);
    }

    return true;
  };
}

/** Clé de dédup : message + début de la stack (deux erreurs au même message
 * mais à des endroits différents ne doivent pas s'écraser l'une l'autre). */
export function buildClientErrorKey(message: string, stack?: string | null): string {
  return `${message}::${(stack ?? "").slice(0, 200)}`;
}
