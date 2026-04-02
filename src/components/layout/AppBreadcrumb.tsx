import { Home, ChevronRight } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  section?: string;
}

interface AppBreadcrumbProps {
  activeSection: string;
  activeTab?: string;
  onNavigate: (section: string) => void;
}

// Configuration des sections avec leurs labels et onglets
const sectionConfig: Record<string, { label: string; icon?: string; tabs?: Record<string, string> }> = {
  dashboard: { label: "Tableau de bord" },
  aujourdhui: { label: "Aujourd'hui" },
  contacts: { 
    label: "Apprenants",
    tabs: {
      list: "Liste",
      pipeline: "Pipeline",
      prospects: "Prospects",
      analytics: "Statistiques",
    }
  },
  formations: { label: "Formations" },
  sessions: { label: "Sessions" },
  formateurs: { label: "Formateurs" },
  documents: { 
    label: "Documents",
    tabs: {
      documents: "Documents",
      signatures: "Signatures",
    }
  },
  facturation: { 
    label: "Facturation",
    tabs: {
      paiements: "Factures & Paiements",
      devis: "Devis",
    }
  },
  tresorerie: { label: "Trésorerie" },
  communications: { label: "Communications" },
  alertes: { label: "Alertes" },
  settings: { label: "Paramètres" },
  corbeille: { label: "Corbeille" },
  workflows: { label: "Workflows" },
  partners: { label: "Partenaires" },
  planning: { label: "Planning conduite" },
  qualite: { 
    label: "Centre Qualiopi",
    tabs: {
      qualiopi: "Dashboard",
      criteres: "Critères",
      actions: "Actions",
      audits: "Audits",
      simulation: "Simulation d'audit",
      satisfaction: "Satisfaction",
    }
  },
};

export function AppBreadcrumb({ activeSection, activeTab, onNavigate }: AppBreadcrumbProps) {
  const section = sectionConfig[activeSection] || { label: activeSection };
  const isDashboard = activeSection === "dashboard";

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  
  // Always add home
  items.push({ label: "Accueil", section: "dashboard" });
  
  // Add current section if not dashboard
  if (!isDashboard) {
    items.push({ label: section.label, section: activeSection });
  }
  
  // Add active tab if present
  if (activeTab && section.tabs && section.tabs[activeTab]) {
    items.push({ label: section.tabs[activeTab] });
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isFirst = index === 0;
          
          return (
            <BreadcrumbItem key={index}>
              {index > 0 && <BreadcrumbSeparator><ChevronRight className="h-3.5 w-3.5" /></BreadcrumbSeparator>}
              
              {isLast ? (
                <BreadcrumbPage className="flex items-center gap-1.5">
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink 
                  onClick={() => item.section && onNavigate(item.section)}
                  className="flex items-center gap-1.5 cursor-pointer hover:text-primary transition-colors"
                >
                  {isFirst && <Home className="h-3.5 w-3.5" />}
                  {item.label}
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
