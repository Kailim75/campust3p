import { useState, useEffect, useCallback } from "react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { 
  Search, Users, GraduationCap, Calendar, Receipt, Settings, 
  BarChart3, AlertTriangle, Briefcase, UserCheck, Car, Shield,
  Trash2, FileText, TrendingUp, BookOpen
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
  onOpenContact?: (contactId: string) => void;
}

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: "contact" | "session" | "prospect" | "facture";
}

const SECTIONS = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  { id: "aujourdhui", label: "Aujourd'hui", icon: Calendar },
  { id: "contacts", label: "Apprenants", icon: Users },
  { id: "sessions", label: "Sessions", icon: GraduationCap },
  { id: "prospects", label: "Prospects", icon: TrendingUp },
  { id: "formations", label: "Formations", icon: BookOpen },
  { id: "finances", label: "Finances", icon: Receipt },
  { id: "formateurs", label: "Formateurs", icon: UserCheck },
  { id: "partenaires", label: "Partenaires", icon: Briefcase },
  { id: "planning-conduite", label: "Planning conduite", icon: Car },
  { id: "qualite", label: "Qualité & Conformité", icon: Shield },
  { id: "alertes", label: "Alertes", icon: AlertTriangle },
  { id: "automations", label: "Automatisations", icon: FileText },
  { id: "settings", label: "Réglages", icon: Settings },
  { id: "corbeille", label: "Corbeille", icon: Trash2 },
];

export function CommandPalette({ open, onOpenChange, onNavigate, onOpenContact }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Search contacts, sessions, prospects
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const search = async () => {
      const searchTerm = `%${debouncedQuery}%`;
      const items: SearchResult[] = [];

      // Search contacts
      const { data: contacts } = await supabase
        .from("contacts")
        .select("id, nom, prenom, formation, telephone")
        .or(`nom.ilike.${searchTerm},prenom.ilike.${searchTerm},telephone.ilike.${searchTerm},email.ilike.${searchTerm}`)
        .is("deleted_at", null)
        .eq("archived", false)
        .limit(5);

      if (!cancelled && contacts) {
        contacts.forEach(c => items.push({
          id: c.id,
          label: `${c.prenom} ${c.nom}`,
          sublabel: [c.formation, c.telephone].filter(Boolean).join(" · "),
          type: "contact",
        }));
      }

      // Search sessions
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, nom, numero_session, formation_type, date_debut")
        .or(`nom.ilike.${searchTerm},numero_session.ilike.${searchTerm}`)
        .is("deleted_at", null)
        .limit(5);

      if (!cancelled && sessions) {
        sessions.forEach(s => items.push({
          id: s.id,
          label: s.nom || s.numero_session || "Session",
          sublabel: [s.formation_type, s.date_debut].filter(Boolean).join(" · "),
          type: "session",
        }));
      }

      // Search prospects
      const { data: prospects } = await supabase
        .from("prospects")
        .select("id, nom, prenom, telephone")
        .or(`nom.ilike.${searchTerm},prenom.ilike.${searchTerm},telephone.ilike.${searchTerm}`)
        .is("deleted_at", null)
        .limit(5);

      if (!cancelled && prospects) {
        prospects.forEach(p => items.push({
          id: p.id,
          label: `${p.prenom || ""} ${p.nom}`.trim(),
          sublabel: p.telephone || undefined,
          type: "prospect",
        }));
      }

      if (!cancelled) {
        setResults(items);
        setLoading(false);
      }
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = useCallback((value: string) => {
    onOpenChange(false);
    setQuery("");

    // Check if it's a section
    const section = SECTIONS.find(s => s.id === value);
    if (section) {
      onNavigate(section.id);
      return;
    }

    // Check if it's a search result
    const result = results.find(r => `${r.type}-${r.id}` === value);
    if (result) {
      switch (result.type) {
        case "contact":
          onNavigate("contacts");
          onOpenContact?.(result.id);
          break;
        case "session":
          onNavigate("sessions");
          break;
        case "prospect":
          onNavigate("prospects");
          break;
      }
    }
  }, [onOpenChange, onNavigate, onOpenContact, results]);

  const typeIcons: Record<string, typeof Users> = {
    contact: Users,
    session: GraduationCap,
    prospect: TrendingUp,
    facture: Receipt,
  };

  const typeLabels: Record<string, string> = {
    contact: "Apprenant",
    session: "Session",
    prospect: "Prospect",
    facture: "Facture",
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Rechercher un apprenant, une session, une page…" 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Recherche en cours…" : "Aucun résultat trouvé."}
        </CommandEmpty>

        {/* Search results */}
        {results.length > 0 && (
          <CommandGroup heading="Résultats">
            {results.map((result) => {
              const Icon = typeIcons[result.type] || Search;
              return (
                <CommandItem
                  key={`${result.type}-${result.id}`}
                  value={`${result.type}-${result.id}`}
                  onSelect={handleSelect}
                  className="flex items-center gap-3"
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{result.label}</span>
                    {result.sublabel && (
                      <span className="text-xs text-muted-foreground truncate">{result.sublabel}</span>
                    )}
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground/60 uppercase tracking-wider shrink-0">
                    {typeLabels[result.type]}
                  </span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* Navigation sections */}
        {(!query || query.length < 2) && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Navigation">
              {SECTIONS.map((section) => (
                <CommandItem
                  key={section.id}
                  value={section.id}
                  onSelect={handleSelect}
                  className="flex items-center gap-3"
                >
                  <section.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{section.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
