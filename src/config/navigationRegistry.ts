/**
 * Source unique de vérité pour toutes les entrées de navigation de l'app.
 *
 * Ce registre est consommé par :
 *  - `src/components/layout/Sidebar.tsx`           → rendu des hubs/Plus/footer
 *  - `src/pages/Index.tsx`                         → mappings PATH ↔ SECTION et pageName
 *  - `src/components/admin/RouteCheckPanel.tsx`    → vérification automatique du routage
 *
 * Toute nouvelle entrée de Sidebar **doit** être ajoutée ici une seule fois,
 * en renseignant simultanément l'icône, le path et le nom de page attendu.
 */
import {
  LayoutDashboard, Users, Calendar, CreditCard, Settings,
  ClipboardList, UserPlus, Zap, GraduationCap, Bell, Award,
  Handshake, Car, UserCog, Trash2, Inbox, Shield,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "hub" | "more" | "footer";

export interface NavEntry {
  /** Identifiant interne (clé `activeSection` dans Index.tsx) */
  id: string;
  /** Libellé affiché dans la Sidebar */
  label: string;
  /** Icône Lucide associée */
  icon: LucideIcon;
  /** Groupe d'appartenance dans la Sidebar */
  group: NavGroup;
  /** URL canonique (pathname) — alimente SECTION_TO_PATH */
  path: string;
  /** Nom du composant React monté par Index.tsx (alimente data-page) */
  pageName: string;
  /** Alias d'URL legacy (alimente PATH_TO_SECTION) */
  legacyPaths?: string[];
}

/**
 * ⚠️ ORDRE IMPORTANT : reflète l'ordre d'affichage dans la Sidebar.
 */
export const NAV_REGISTRY: NavEntry[] = [
  // ── Hubs principaux (max 5) ────────────────────────────────────────────────
  { id: "aujourdhui", label: "Aujourd'hui", icon: ClipboardList, group: "hub", path: "/aujourdhui", pageName: "AujourdhuiPage" },
  { id: "contacts",   label: "Personnes",   icon: Users,         group: "hub", path: "/contacts",   pageName: "ApprenantsPage", legacyPaths: ["apprenants"] },
  { id: "sessions",   label: "Formations",  icon: Calendar,      group: "hub", path: "/sessions",   pageName: "SessionsPage" },
  { id: "finances",   label: "Finances",    icon: CreditCard,    group: "hub", path: "/finances",   pageName: "FinancesPage", legacyPaths: ["facturation", "paiements"] },
  { id: "inbox",      label: "Inbox CRM",   icon: Inbox,         group: "hub", path: "/inbox",      pageName: "InboxCrmPage" },

  // ── Menu « Plus » ──────────────────────────────────────────────────────────
  { id: "dashboard",         label: "Dashboard",         icon: LayoutDashboard, group: "more", path: "/",                  pageName: "Dashboard", legacyPaths: ["", "dashboard"] },
  { id: "prospects",         label: "Prospects",         icon: UserPlus,        group: "more", path: "/prospects",         pageName: "ProspectsPage" },
  { id: "formations",        label: "Catalogue",         icon: GraduationCap,   group: "more", path: "/formations",        pageName: "FormationsPage" },
  { id: "automations",       label: "Automations",       icon: Zap,             group: "more", path: "/automations",       pageName: "AutomationsPage" },
  { id: "formateurs",        label: "Formateurs",        icon: UserCog,         group: "more", path: "/formateurs",        pageName: "FormateursPage" },
  { id: "planning-conduite", label: "Planning conduite", icon: Car,             group: "more", path: "/planning-conduite", pageName: "PlanningConduitePage" },
  { id: "alertes",           label: "Alertes",           icon: Bell,            group: "more", path: "/alertes",           pageName: "AlertesPage" },
  { id: "qualite",           label: "Qualité",           icon: Award,           group: "more", path: "/qualite",           pageName: "QualiteUnifiedPage" },
  { id: "partenaires",       label: "Partenaires",       icon: Handshake,       group: "more", path: "/partenaires",       pageName: "PartnersPage" },
  { id: "security",          label: "Sécurité",          icon: Shield,          group: "more", path: "/security",          pageName: "SecurityStatusPage" },
  { id: "corbeille",         label: "Corbeille",         icon: Trash2,          group: "more", path: "/corbeille",         pageName: "CorbeillePage" },

  // ── Footer ────────────────────────────────────────────────────────────────
  { id: "settings", label: "Paramètres", icon: Settings, group: "footer", path: "/settings", pageName: "SettingsPage", legacyPaths: ["parametres"] },
];

// ── Sélecteurs de groupe (utilisés par la Sidebar) ───────────────────────────
export const HUB_ENTRIES    = NAV_REGISTRY.filter((e) => e.group === "hub");
export const MORE_ENTRIES   = NAV_REGISTRY.filter((e) => e.group === "more");
export const FOOTER_ENTRIES = NAV_REGISTRY.filter((e) => e.group === "footer");

// ── Mappings dérivés (consommés par Index.tsx) ───────────────────────────────

/** pathname segment → section id (inclut alias legacy) */
export const PATH_TO_SECTION: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const e of NAV_REGISTRY) {
    const segment = e.path.replace(/^\//, "");
    map[segment] = e.id;
    map[e.id] = e.id; // l'id est aussi reconnu comme segment
    for (const legacy of e.legacyPaths ?? []) {
      map[legacy] = e.id;
    }
  }
  return map;
})();

/** section id → pathname canonique */
export const SECTION_TO_PATH: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const e of NAV_REGISTRY) map[e.id] = e.path;
  return map;
})();

/** section id → nom de composant monté (data-page) */
export const SECTION_TO_PAGE_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const e of NAV_REGISTRY) map[e.id] = e.pageName;
  return map;
})();

/** Helper inverse pratique pour le panneau de vérification */
export function getEntryById(id: string): NavEntry | undefined {
  return NAV_REGISTRY.find((e) => e.id === id);
}
