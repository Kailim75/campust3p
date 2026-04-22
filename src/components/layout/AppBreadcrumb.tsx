import { Home, ChevronRight, MoreHorizontal, ChevronDown } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getEntryById, MORE_ENTRIES } from "@/config/navigationRegistry";

interface BreadcrumbCrumb {
  label: string;
  section?: string;
  icon?: typeof Home;
  /** Disabled = niveau « Plus » (purement informatif, non cliquable) */
  disabled?: boolean;
}

interface AppBreadcrumbProps {
  activeSection: string;
  activeTab?: string;
  onNavigate: (section: string) => void;
}

/**
 * Onglets internes par section (libellés humains pour le 3e niveau).
 * Reste local car ce sont des sous-vues internes aux pages, pas des
 * entrées de navigation top-level (donc hors du navigationRegistry).
 */
const TAB_LABELS: Record<string, Record<string, string>> = {
  contacts: {
    list: "Liste",
    pipeline: "Pipeline",
    prospects: "Prospects",
    analytics: "Statistiques",
  },
  finances: {
    paiements: "Factures & Paiements",
    devis: "Devis",
    tresorerie: "Trésorerie",
  },
  qualite: {
    qualiopi: "Dashboard",
    criteres: "Critères",
    actions: "Actions",
    audits: "Audits",
    simulation: "Simulation d'audit",
    satisfaction: "Satisfaction",
  },
  prospects: {
    pipeline: "Pipeline",
    agenda: "Agenda",
    analytics: "Analytics",
  },
};

export function AppBreadcrumb({ activeSection, activeTab, onNavigate }: AppBreadcrumbProps) {
  const entry = getEntryById(activeSection);
  const isDashboard = activeSection === "dashboard";

  // Construction des miettes en suivant la hiérarchie réelle de la sidebar
  const crumbs: BreadcrumbCrumb[] = [];

  // 1. Accueil (toujours présent, cliquable sauf si on y est déjà)
  crumbs.push({ label: "Accueil", section: "dashboard", icon: Home });

  // 2. Si la section est dans « Plus », on insère un crumb de groupe non
  //    cliquable pour matérialiser la hiérarchie (Sidebar > Plus > X)
  if (entry?.group === "more") {
    crumbs.push({ label: "Plus", disabled: true });
  }

  // 3. Section courante (sauf si c'est déjà le dashboard)
  if (!isDashboard && entry) {
    crumbs.push({ label: entry.label, section: entry.id });
  } else if (!isDashboard && !entry) {
    // Section inconnue du registre : fallback sur l'id brut
    crumbs.push({ label: activeSection, section: activeSection });
  }

  // 4. Onglet actif s'il existe
  const tabLabel = activeTab && TAB_LABELS[activeSection]?.[activeTab];
  if (tabLabel) {
    crumbs.push({ label: tabLabel });
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <BreadcrumbItem key={`${crumb.label}-${index}`}>
              {index > 0 && (
                <BreadcrumbSeparator>
                  <ChevronRight className="h-3.5 w-3.5" />
                </BreadcrumbSeparator>
              )}

              {isLast ? (
                <BreadcrumbPage className="flex items-center gap-1.5 font-medium">
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {crumb.label}
                </BreadcrumbPage>
              ) : crumb.disabled ? (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="flex items-center gap-1 text-muted-foreground/80 hover:text-foreground text-sm rounded-md px-1 -mx-1 py-0.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Afficher les autres modules"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span>{crumb.label}</span>
                    <ChevronDown className="h-3 w-3 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 max-h-[60vh] overflow-y-auto">
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Autres modules
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {MORE_ENTRIES.map((item) => {
                      const ItemIcon = item.icon;
                      const isCurrent = item.id === activeSection;
                      return (
                        <DropdownMenuItem
                          key={item.id}
                          onClick={() => onNavigate(item.id)}
                          className={isCurrent ? "bg-accent text-accent-foreground" : ""}
                        >
                          <ItemIcon className="h-4 w-4 mr-2" />
                          <span className="flex-1">{item.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <BreadcrumbLink
                  onClick={() => crumb.section && onNavigate(crumb.section)}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors"
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {crumb.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
