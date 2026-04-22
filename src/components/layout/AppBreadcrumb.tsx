import { Home, ChevronRight, MoreHorizontal } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getEntryById } from "@/config/navigationRegistry";

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
                <span className="flex items-center gap-1.5 text-muted-foreground/70 text-sm">
                  <MoreHorizontal className="h-3.5 w-3.5" />
                  {crumb.label}
                </span>
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
