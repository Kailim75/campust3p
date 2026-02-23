import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Calendar, Command, X, ArrowRight, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface SearchResult {
  type: "contact" | "session";
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // CMD+K shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isOpen]);

  // Search
  useEffect(() => {
    const searchData = async () => {
      if (query.length < 2) { setResults([]); return; }
      setIsLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, nom, prenom, email, telephone, formation")
          .eq("archived", false)
          .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%,telephone.ilike.%${query}%`)
          .limit(5);

        contacts?.forEach((contact) => {
          searchResults.push({
            type: "contact", id: contact.id,
            title: `${contact.prenom} ${contact.nom}`,
            subtitle: contact.email || contact.telephone || contact.formation || "",
            icon: <User className="h-4 w-4 text-primary" />,
          });
        });

        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, nom, date_debut, formation_type, lieu")
          .or(`nom.ilike.%${query}%,lieu.ilike.%${query}%,formation_type.ilike.%${query}%`)
          .limit(5);

        sessions?.forEach((session) => {
          searchResults.push({
            type: "session", id: session.id,
            title: session.nom,
            subtitle: `${session.formation_type} - ${format(new Date(session.date_debut), "dd/MM/yyyy", { locale: fr })}`,
            icon: <Calendar className="h-4 w-4 text-info" />,
          });
        });

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 200);
    return () => clearTimeout(debounce);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); setSelectedIndex((p) => (p + 1) % results.length); break;
      case "ArrowUp": e.preventDefault(); setSelectedIndex((p) => (p - 1 + results.length) % results.length); break;
      case "Enter": e.preventDefault(); handleSelect(results[selectedIndex]); break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery(""); setIsOpen(false);
    if (result.type === "contact") navigate(`/?section=contacts&id=${result.id}`);
    else if (result.type === "session") navigate(`/?section=sessions&id=${result.id}`);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setIsOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="text-[13px]">Rechercher...</span>
        <kbd className="ml-4 text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => { setIsOpen(false); setQuery(""); }} />
          
          {/* Command Palette */}
          <div ref={containerRef} className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-xl overflow-hidden animate-scale-in">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Rechercher un apprenant, une session..."
                className="border-0 shadow-none focus-visible:ring-0 h-12 text-sm bg-transparent px-0"
              />
              {query && (
                <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            {query.length >= 2 && (
              <div className="max-h-[320px] overflow-y-auto">
                {isLoading ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Recherche...</div>
                ) : results.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">Aucun résultat pour "<span className="font-medium text-foreground">{query}</span>"</p>
                  </div>
                ) : (
                  <div className="py-1">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors",
                          index === selectedIndex ? "bg-primary/8 text-foreground" : "hover:bg-muted/50"
                        )}
                      >
                        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                          {result.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                        </div>
                        {index === selectedIndex && (
                          <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Quick actions when empty */}
            {query.length < 2 && (
              <div className="p-2">
                <p className="px-3 py-1.5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Actions rapides</p>
                <button onClick={() => { setIsOpen(false); navigate("/?section=contacts"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Aller aux Apprenants</span>
                </button>
                <button onClick={() => { setIsOpen(false); navigate("/?section=sessions"); }} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Voir les Sessions</span>
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">↑↓</kbd> naviguer</span>
              <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">↵</kbd> ouvrir</span>
              <span className="flex items-center gap-1"><kbd className="font-mono bg-background border border-border rounded px-1">esc</kbd> fermer</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
