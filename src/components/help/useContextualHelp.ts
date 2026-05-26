import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { HELP_ARTICLES, type HelpArticle } from "./helpArticles";

/**
 * Retourne les articles d'aide pertinents pour la route courante,
 * triés par pertinence (contextuels d'abord).
 */
export function useContextualHelp(searchQuery = ""): {
  contextual: HelpArticle[];
  other: HelpArticle[];
  filtered: HelpArticle[] | null;
} {
  const { pathname } = useLocation();

  return useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (q.length >= 2) {
      const filtered = HELP_ARTICLES.filter((a) => {
        const haystack = [a.title, a.body, ...a.keywords].join(" ").toLowerCase();
        return haystack.includes(q);
      });
      return { contextual: [], other: [], filtered };
    }

    const segment = `/${pathname.replace(/^\//, "").split("/")[0]}`;
    const contextual = HELP_ARTICLES.filter((a) =>
      a.contextPaths.some((p) => p === segment || (p === "/" && pathname === "/")),
    );
    const other = HELP_ARTICLES.filter((a) => !contextual.includes(a));

    return { contextual, other, filtered: null };
  }, [pathname, searchQuery]);
}
