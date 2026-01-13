import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, Calendar, GraduationCap, X } from "lucide-react";
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

  // Search function
  useEffect(() => {
    const searchData = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      const searchResults: SearchResult[] = [];

      try {
        // Search contacts
        const { data: contacts } = await supabase
          .from("contacts")
          .select("id, nom, prenom, email, telephone, formation")
          .eq("archived", false)
          .or(`nom.ilike.%${query}%,prenom.ilike.%${query}%,email.ilike.%${query}%,telephone.ilike.%${query}%`)
          .limit(5);

        if (contacts) {
          contacts.forEach((contact) => {
            searchResults.push({
              type: "contact",
              id: contact.id,
              title: `${contact.prenom} ${contact.nom}`,
              subtitle: contact.email || contact.telephone || contact.formation || "",
              icon: <User className="h-4 w-4 text-primary" />,
            });
          });
        }

        // Search sessions
        const { data: sessions } = await supabase
          .from("sessions")
          .select("id, nom, date_debut, formation_type, lieu")
          .or(`nom.ilike.%${query}%,lieu.ilike.%${query}%,formation_type.ilike.%${query}%`)
          .limit(5);

        if (sessions) {
          sessions.forEach((session) => {
            searchResults.push({
              type: "session",
              id: session.id,
              title: session.nom,
              subtitle: `${session.formation_type} - ${format(new Date(session.date_debut), "dd/MM/yyyy", { locale: fr })}`,
              icon: <Calendar className="h-4 w-4 text-info" />,
            });
          });
        }

        setResults(searchResults);
        setSelectedIndex(0);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(searchData, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        handleSelect(results[selectedIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelect = (result: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    if (result.type === "contact") {
      navigate(`/contacts?id=${result.id}`);
    } else if (result.type === "session") {
      navigate(`/sessions?id=${result.id}`);
    }
  };

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Rechercher contacts, sessions..."
        className="w-72 pl-9 pr-8 input-focus"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Recherche en cours...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Aucun résultat pour "{query}"
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                    index === selectedIndex && "bg-muted"
                  )}
                >
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  </div>
                  <span className="text-xs text-muted-foreground capitalize">
                    {result.type === "contact" ? "Contact" : "Session"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
