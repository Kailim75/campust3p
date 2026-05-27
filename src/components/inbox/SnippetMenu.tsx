import { useState, useMemo } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Search, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEmailSnippets, useIncrementSnippetUsage, applySnippetVariables, type EmailSnippet } from "@/hooks/useEmailSnippets";
import { useCentre } from "@/contexts/CentreContext";

interface SnippetMenuProps {
  /** Called with the resolved (variables substituted) body */
  onInsert: (text: string) => void;
  /** Context used for variable substitution */
  context?: { prenom?: string; nom?: string; email?: string };
}

/**
 * Compact button that opens a popover listing all email snippets,
 * with search and quick-insert. Variables {prenom}, {nom}, {email},
 * {centre}, {date} are substituted at insert time.
 */
export function SnippetMenu({ onInsert, context }: SnippetMenuProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: snippets = [] } = useEmailSnippets();
  const increment = useIncrementSnippetUsage();
  const { currentCentre } = useCentre();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return snippets;
    return snippets.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.shortcut.toLowerCase().includes(q) ||
        s.body.toLowerCase().includes(q),
    );
  }, [snippets, search]);

  const handlePick = (s: EmailSnippet) => {
    const text = applySnippetVariables(s.body, {
      ...context,
      centre: currentCentre?.nom,
    });
    onInsert(text);
    increment.mutate(s.id);
    setOpen(false);
    setSearch("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5" />
          Snippet
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un snippet…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {snippets.length === 0 ? (
                <>
                  Aucun snippet.<br />
                  <Link
                    to="/parametres/snippets"
                    onClick={() => setOpen(false)}
                    className="text-primary hover:underline inline-flex items-center gap-1 mt-2"
                  >
                    <Plus className="h-3 w-3" /> Créer le premier
                  </Link>
                </>
              ) : (
                "Aucun résultat"
              )}
            </div>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                onClick={() => handlePick(s)}
                className="w-full text-left px-3 py-2 hover:bg-muted/60 focus:bg-muted/60 focus:outline-none transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                    {s.shortcut}
                  </span>
                  <span className="text-xs font-medium truncate flex-1">{s.title}</span>
                  {s.scope === "personal" && (
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">perso</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {s.body}
                </div>
              </button>
            ))
          )}
        </div>
        <div className="border-t p-1.5">
          <Link
            to="/parametres/snippets"
            onClick={() => setOpen(false)}
            className="block text-center text-[11px] text-muted-foreground hover:text-primary py-1 transition-colors"
          >
            Gérer les snippets
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
