import { useState, useEffect, useCallback, useMemo } from "react";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Users, GraduationCap, Calendar, Receipt, Settings,
  BarChart3, AlertTriangle, Briefcase, UserCheck, Car, Shield,
  Trash2, FileText, TrendingUp, BookOpen, Plus, Mail, Clock, Inbox,
} from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useRecentItems } from "@/hooks/useRecentItems";
import { useCommandPalette } from "@/hooks/useCommandPalette";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (section: string) => void;
  onOpenContact?: (contactId: string) => void;
  onNewContact?: () => void;
  onNewProspect?: () => void;
}

interface SearchResult {
  id: string;
  label: string;
  sublabel?: string;
  type: "contact" | "session" | "prospect" | "formation" | "facture";
}

const NAV_SECTIONS = [
  { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
  { id: "aujourdhui", label: "Aujourd'hui", icon: Calendar },
  { id: "contacts", label: "Apprenants", icon: Users },
  { id: "sessions", label: "Sessions", icon: GraduationCap },
  { id: "prospects", label: "Prospects", icon: TrendingUp },
  { id: "formations", label: "Formations", icon: BookOpen },
  { id: "finances", label: "Finances", icon: Receipt },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "formateurs", label: "Formateurs", icon: UserCheck },
  { id: "partenaires", label: "Partenaires", icon: Briefcase },
  { id: "planning-conduite", label: "Planning conduite", icon: Car },
  { id: "qualite", label: "Qualité & Conformité", icon: Shield },
  { id: "alertes", label: "Alertes", icon: AlertTriangle },
  { id: "automations", label: "Automatisations", icon: FileText },
  { id: "settings", label: "Réglages", icon: Settings },
  { id: "corbeille", label: "Corbeille", icon: Trash2 },
];

const TYPE_ICONS: Record<SearchResult["type"], typeof Users> = {
  contact: Users,
  session: GraduationCap,
  prospect: TrendingUp,
  formation: BookOpen,
  facture: Receipt,
};

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  contact: "Apprenant",
  session: "Session",
  prospect: "Prospect",
  formation: "Formation",
  facture: "Facture",
};

export function CommandPalette({
  open, onOpenChange, onNavigate, onOpenContact, onNewContact, onNewProspect,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 200);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const recentItems = useRecentItems((s) => s.recentItems);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setQuery(""), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Live search across contacts / sessions / prospects / formations / factures
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const search = async () => {
      const term = `%${debouncedQuery}%`;
      const items: SearchResult[] = [];

      const [contactsRes, sessionsRes, prospectsRes, formationsRes, facturesRes] = await Promise.all([
        supabase.from("contacts")
          .select("id, nom, prenom, formation, telephone")
          .or(`nom.ilike.${term},prenom.ilike.${term},telephone.ilike.${term},email.ilike.${term}`)
          .is("deleted_at", null).eq("archived", false).limit(5),
        supabase.from("sessions")
          .select("id, nom, numero_session, formation_type, date_debut")
          .or(`nom.ilike.${term},numero_session.ilike.${term}`)
          .is("deleted_at", null).limit(5),
        supabase.from("prospects")
          .select("id, nom, prenom, telephone")
          .or(`nom.ilike.${term},prenom.ilike.${term},telephone.ilike.${term}`)
          .is("deleted_at", null).limit(5),
        supabase.from("catalogue_formations")
          .select("id, intitule, code")
          .or(`intitule.ilike.${term},code.ilike.${term}`)
          .is("deleted_at", null).eq("actif", true).limit(5),
        supabase.from("factures")
          .select("id, numero_facture, statut")
          .ilike("numero_facture", term)
          .is("deleted_at", null).limit(5),
      ]);

      if (cancelled) return;

      contactsRes.data?.forEach((c: any) => items.push({
        id: c.id, label: `${c.prenom} ${c.nom}`,
        sublabel: [c.formation, c.telephone].filter(Boolean).join(" · "),
        type: "contact",
      }));
      sessionsRes.data?.forEach((s: any) => items.push({
        id: s.id, label: s.nom || s.numero_session || "Session",
        sublabel: [s.formation_type, s.date_debut].filter(Boolean).join(" · "),
        type: "session",
      }));
      prospectsRes.data?.forEach((p: any) => items.push({
        id: p.id, label: `${p.prenom || ""} ${p.nom}`.trim(),
        sublabel: p.telephone || undefined, type: "prospect",
      }));
      formationsRes.data?.forEach((f: any) => items.push({
        id: f.id, label: f.intitule, sublabel: f.code || undefined, type: "formation",
      }));
      facturesRes.data?.forEach((f: any) => items.push({
        id: f.id, label: f.numero_facture, sublabel: f.statut || undefined, type: "facture",
      }));

      setResults(items);
      setLoading(false);
    };

    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const close = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleNavigate = useCallback((section: string) => {
    close();
    onNavigate(section);
  }, [close, onNavigate]);

  const handleResult = useCallback((result: SearchResult) => {
    close();
    switch (result.type) {
      case "contact":
        onNavigate("contacts");
        onOpenContact?.(result.id);
        break;
      case "session": onNavigate("sessions"); break;
      case "prospect": onNavigate("prospects"); break;
      case "formation": onNavigate("formations"); break;
      case "facture": onNavigate("finances"); break;
    }
  }, [close, onNavigate, onOpenContact]);

  const handleRecent = useCallback((item: typeof recentItems[number]) => {
    close();
    switch (item.type) {
      case "contact":
        onNavigate("contacts");
        onOpenContact?.(item.id);
        break;
      case "session": onNavigate("sessions"); break;
      case "facture": onNavigate("finances"); break;
      case "document": onNavigate("automations"); break;
    }
  }, [close, onNavigate, onOpenContact]);

  const showRecents = !query && recentItems.length > 0;

  // Group results by type for clearer headings
  const groupedResults = useMemo(() => {
    const groups: Record<SearchResult["type"], SearchResult[]> = {
      contact: [], session: [], prospect: [], formation: [], facture: [],
    };
    results.forEach((r) => groups[r.type].push(r));
    return groups;
  }, [results]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
            <CommandInput
              placeholder="Rechercher ou taper une commande..."
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                {loading
                  ? "Recherche en cours…"
                  : query
                    ? `Aucun résultat pour "${query}"`
                    : "Tapez pour rechercher…"}
              </CommandEmpty>

              {/* Quick actions — always visible at top */}
              <CommandGroup heading="Actions rapides">
                {onNewContact && (
                  <CommandItem value="action-new-contact" onSelect={() => { close(); onNewContact(); }}>
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="ml-3">Créer un apprenant</span>
                  </CommandItem>
                )}
                {onNewProspect && (
                  <CommandItem value="action-new-prospect" onSelect={() => { close(); onNewProspect(); }}>
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="ml-3">Créer un prospect</span>
                  </CommandItem>
                )}
                <CommandItem value="action-new-session" onSelect={() => handleNavigate("sessions")}>
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="ml-3">Planifier une session</span>
                </CommandItem>
                <CommandItem value="action-new-facture" onSelect={() => handleNavigate("finances")}>
                  <Receipt className="h-4 w-4 text-primary" />
                  <span className="ml-3">Nouvelle facture</span>
                </CommandItem>
                <CommandItem value="action-inbox" onSelect={() => handleNavigate("inbox")}>
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="ml-3">Ouvrir l'inbox</span>
                </CommandItem>
                <CommandItem value="action-dashboard" onSelect={() => handleNavigate("dashboard")}>
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="ml-3">Voir le tableau de bord</span>
                </CommandItem>
              </CommandGroup>

              {/* Recents — only when no query */}
              {showRecents && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Récents">
                    {recentItems.slice(0, 5).map((item) => {
                      const Icon = TYPE_ICONS[item.type as SearchResult["type"]] || Clock;
                      return (
                        <CommandItem
                          key={`recent-${item.type}-${item.id}`}
                          value={`recent-${item.type}-${item.id}`}
                          onSelect={() => handleRecent(item)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <div className="ml-3 flex flex-col min-w-0">
                            <span className="truncate">{item.name}</span>
                            {item.subtitle && (
                              <span className="text-xs text-muted-foreground truncate">{item.subtitle}</span>
                            )}
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* Search results — grouped by type */}
              {(["contact", "session", "prospect", "formation", "facture"] as const).map((type) => {
                const items = groupedResults[type];
                if (items.length === 0) return null;
                const Icon = TYPE_ICONS[type];
                return (
                  <div key={type}>
                    <CommandSeparator />
                    <CommandGroup heading={TYPE_LABELS[type] + "s"}>
                      {items.map((result) => (
                        <CommandItem
                          key={`${result.type}-${result.id}`}
                          value={`${result.type}-${result.id}-${result.label}`}
                          onSelect={() => handleResult(result)}
                        >
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="ml-3 flex flex-col min-w-0 flex-1">
                            <span className="truncate">{result.label}</span>
                            {result.sublabel && (
                              <span className="text-xs text-muted-foreground truncate">{result.sublabel}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </div>
                );
              })}

              {/* Navigation — always visible */}
              <CommandSeparator />
              <CommandGroup heading="Navigation">
                {NAV_SECTIONS.map((section) => (
                  <CommandItem
                    key={section.id}
                    value={`nav-${section.id}`}
                    onSelect={() => handleNavigate(section.id)}
                  >
                    <section.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="ml-3">{section.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>

            {/* Footer hints */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-background border border-border rounded px-1.5">↵</kbd>
                Sélectionner
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-background border border-border rounded px-1.5">↑↓</kbd>
                Naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="font-mono bg-background border border-border rounded px-1.5">esc</kbd>
                Fermer
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CommandDialog>
  );
}
