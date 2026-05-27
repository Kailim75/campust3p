import { useCallback, useRef } from "react";
import { useEmailSnippets, useIncrementSnippetUsage, applySnippetVariables } from "@/hooks/useEmailSnippets";
import { useCentreContext } from "@/contexts/CentreContext";
import { toast } from "sonner";

interface SlashContext {
  prenom?: string;
  nom?: string;
  email?: string;
}

/**
 * Detects when the user finishes typing a slash command (e.g. "/relance ")
 * followed by space or newline, and expands it inline to the snippet body.
 *
 * Usage:
 *   const { handleChange } = useSlashSnippet({ value, setValue, context });
 *   <Textarea value={value} onChange={handleChange} />
 */
export function useSlashSnippet(opts: {
  value: string;
  setValue: (v: string) => void;
  context?: SlashContext;
}) {
  const { value, setValue, context } = opts;
  const { data: snippets = [] } = useEmailSnippets();
  const increment = useIncrementSnippetUsage();
  const { currentCentre } = useCentreContext();
  const lastExpandedRef = useRef<string>("");

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      setValue(next);

      // Only check on space / enter — last char triggers expansion
      const lastChar = next.slice(-1);
      if (lastChar !== " " && lastChar !== "\n") return;

      // Look for a slash command at the end: /word + trigger char
      const trimmed = next.slice(0, -1);
      const match = trimmed.match(/(^|\s)(\/[\w-]+)$/);
      if (!match) return;

      const shortcut = match[2].toLowerCase();
      if (shortcut === lastExpandedRef.current) return;

      const snippet = snippets.find((s) => s.shortcut.toLowerCase() === shortcut);
      if (!snippet) return;

      const resolved = applySnippetVariables(snippet.body, {
        ...context,
        centre: currentCentre?.nom,
      });

      // Replace the shortcut + trigger char with the resolved body
      const before = trimmed.slice(0, match.index! + match[1].length);
      const newValue = before + resolved + (lastChar === "\n" ? "\n" : " ");

      lastExpandedRef.current = shortcut;
      setValue(newValue);
      increment.mutate(snippet.id);
      toast.success(`Snippet « ${snippet.title} » inséré`, { duration: 1500 });

      // Reset the lock after a short delay
      setTimeout(() => {
        lastExpandedRef.current = "";
      }, 500);
    },
    [setValue, snippets, context, currentCentre?.nom, increment],
  );

  return { handleChange };
}
