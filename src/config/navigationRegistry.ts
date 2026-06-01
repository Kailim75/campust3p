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
  Handshake, Car, UserCog, Trash2, Inbox, Shield, Package, HelpCircle,
  type LucideIcon,
} from "lucide-react";

export type NavGroup = "hub" | "more" | "footer";

export type NavSubgroup = "pilotage" | "production" | "qualite" | "admin";

export interface NavEntry {
  /** Identifiant interne (clé `activeSection` dans Index.tsx) */
  id: string;
  /** Libellé affiché dans la Sidebar */
  label: string;
  /** Icône Lucide associée */
  icon: LucideIcon;
  /** Groupe d'appartenance dans la Sidebar */
  group: NavGroup;
  /** Sous-groupe pour entrées « more » — sert au regroupement visuel */
  subgroup?: NavSubgroup;
  /** URL canonique (pathname) — alimente SECTION_TO_PATH */
  path: string;
  /** Nom du composant React monté par Index.tsx (alimente data-page) */
  pageName: string;
  /** Alias d'URL legacy (alimente PATH_TO_SECTION) */
  legacyPaths?: string[];
}

/**
 * ⚠️ ORDRE IMPORTANT : reflète l'ordre d'affichage dans la Sidebar.
 *
 * Sprint 3 — Hiérarchie produit :
 *  - Aujourd'hui = point d'entrée opérationnel principal (1er hub).
 *  - Dashboard = vue de pilotage dirigeante, déplacé en tête de "Plus"
 *    (libellé "Pilotage"). Sa route "/" est conservée pour ne pas
 *    casser les bookmarks existants ; seule sa visibilité change.
 *  - Prospects promu en tête de "Plus" pour l'accès commercial.
 *  - 5 hubs max, conformément au test navigationRegistry.
 */
export const NAV_REGISTRY: NavEntry[] = [
  // ── Hubs principaux (5 max) ────────────────────────────────────────────────
  { id: "aujourdhui", label: "Aujourd'hui", icon: ClipboardList,   group: "hub", path: "/aujourdhui", pageName: "AujourdhuiPage" },
  { id: "contacts",   label: "Apprenants",  icon: Users,           group: "hub", path: "/contacts",   pageName: "ApprenantsPage", legacyPaths: ["apprenants"] },
  { id: "sessions",   label: "Sessions",    icon: Calendar,        group: "hub", path: "/sessions",   pageName: "SessionsPage" },
  { id: "finances",   label: "Finances",    icon: CreditCard,      group: "hub", path: "/finances",   pageName: "FinancesPage", legacyPaths: ["facturation", "paiements"] },
  { id: "inbox",      label: "Inbox CRM",   icon: Inbox,           group: "hub", path: "/inbox",      pageName: "InboxCrmPage" },

  // ── Menu « Plus » ──────────────────────────────────────────────────────────
  // Pilotage (ex-Dashboard) en tête : accessible mais secondaire vs Aujourd'hui.
  { id: "dashboard",         label: "Pilotage",            icon: LayoutDashboard, group: "more", subgroup: "pilotage",   path: "/",                  pageName: "Dashboard", legacyPaths: ["", "dashboard"] },
  { id: "prospects",         label: "Prospects",           icon: UserPlus,        group: "more", subgroup: "pilotage",   path: "/prospects",         pageName: "ProspectsPage" },
  { id: "alertes",           label: "Alertes",             icon: Bell,            group: "more", subgroup: "pilotage",   path: "/alertes",           pageName: "AlertesPage" },

  { id: "formations",        label: "Catalogue",           icon: GraduationCap,   group: "more", subgroup: "production", path: "/formations",        pageName: "FormationsPage" },
  { id: "produits",          label: "Produits & Services", icon: Package,         group: "more", subgroup: "production", path: "/produits",          pageName: "ProduitsServicesPage" },
  { id: "formateurs",        label: "Formateurs",          icon: UserCog,         group: "more", subgroup: "production", path: "/formateurs",        pageName: "FormateursPage" },
  { id: "planning-conduite", label: "Planning conduite",   icon: Car,             group: "more", subgroup: "production", path: "/planning-conduite", pageName: "PlanningConduitePage" },
  { id: "partenaires",       label: "Partenaires",         icon: Handshake,       group: "more", subgroup: "production", path: "/partenaires",       pageName: "PartnersPage" },

  { id: "qualite",           label: "Qualité",             icon: Award,           group: "more", subgroup: "qualite",    path: "/qualite",           pageName: "QualiteUnifiedPage" },
  { id: "attestations-retard", label: "Attestations retard", icon: Award,         group: "more", subgroup: "qualite",    path: "/attestations-retard", pageName: "AttestationsEnRetardPage" },

  { id: "automations",       label: "Automations",         icon: Zap,             group: "more", subgroup: "admin",      path: "/automations",       pageName: "AutomationsPage" },
  { id: "security",          label: "Sécurité",            icon: Shield,          group: "more", subgroup: "admin",      path: "/security",          pageName: "SecurityStatusPage" },
  { id: "corbeille",         label: "Corbeille",           icon: Trash2,          group: "more", subgroup: "admin",      path: "/corbeille",         pageName: "CorbeillePage" },
  { id: "doublons-contacts", label: "Doublons contacts",   icon: Users,           group: "more", subgroup: "admin",      path: "/doublons-contacts", pageName: "DoublonsContactsPage" },
  { id: "requalification-contacts", label: "Requalification contacts", icon: Users, group: "more", subgroup: "admin",  path: "/requalification-contacts", pageName: "RequalificationPage" },

  // ── Footer ────────────────────────────────────────────────────────────────
  { id: "aide", label: "Aide & mémo", icon: HelpCircle, group: "footer", path: "/aide", pageName: "AidePage" },
  { id: "settings", label: "Paramètres", icon: Settings, group: "footer", path: "/settings", pageName: "SettingsPage", legacyPaths: ["parametres"] },
];

// ── Sélecteurs de groupe (utilisés par la Sidebar) ───────────────────────────
export const HUB_ENTRIES    = NAV_REGISTRY.filter((e) => e.group === "hub");
export const MORE_ENTRIES   = NAV_REGISTRY.filter((e) => e.group === "more");
export const FOOTER_ENTRIES = NAV_REGISTRY.filter((e) => e.group === "footer");

/** Ordre + libellé des sous-sections du menu « Plus ». */
export const MORE_SUBGROUPS: Array<{ id: NavSubgroup; label: string }> = [
  { id: "pilotage",   label: "Pilotage commercial" },
  { id: "production", label: "Production & catalogue" },
  { id: "qualite",    label: "Qualité & conformité" },
  { id: "admin",      label: "Administration" },
];

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

/**
 * Tente de résoudre une URL inconnue vers la meilleure entrée du registre.
 * Stratégie en cascade :
 *  1. Match exact sur PATH_TO_SECTION (segment ou alias legacy)
 *  2. Match préfixe : `/contacts/123` → `contacts`
 *  3. Match par mot-clé fuzzy (ex: `/factures` → `finances`)
 *  4. Fallback ultime : `dashboard`
 *
 * `matched=false` indique qu'aucune correspondance pertinente n'a été
 * trouvée et que le fallback dashboard a été appliqué (utile pour
 * afficher un toast d'avertissement à l'utilisateur).
 */
const FUZZY_KEYWORDS: Array<{ keywords: string[]; section: string }> = [
  { keywords: ["facture", "paiement", "devis", "tresorerie", "encaiss", "comptab"], section: "finances" },
  { keywords: ["apprenant", "eleve", "stagiaire", "personne", "client"],            section: "contacts" },
  { keywords: ["lead", "opportunit"],                                                section: "prospects" },
  { keywords: ["session", "stage", "promotion"],                                     section: "sessions" },
  { keywords: ["catalogue", "programme", "module"],                                  section: "formations" },
  { keywords: ["mail", "email", "message", "courriel"],                              section: "inbox" },
  { keywords: ["alerte", "notification"],                                            section: "alertes" },
  { keywords: ["qualiopi", "audit"],                                                 section: "qualite" },
  { keywords: ["partenaire", "apporteur"],                                           section: "partenaires" },
  { keywords: ["conduite", "vehicule", "creneau"],                                   section: "planning-conduite" },
  { keywords: ["formateur", "intervenant"],                                          section: "formateurs" },
  { keywords: ["param", "config", "reglage"],                                        section: "settings" },
  { keywords: ["corbeille", "trash", "supprim"],                                     section: "corbeille" },
  { keywords: ["secur", "rgpd"],                                                     section: "security" },
  { keywords: ["aujourd"],                                                           section: "aujourdhui" },
];

export interface ResolvedNavTarget {
  section: string;
  matched: boolean;
  /** Path canonique vers lequel rediriger (issu de SECTION_TO_PATH) */
  path: string;
}

export function resolveNavTarget(pathname: string): ResolvedNavTarget {
  const cleaned = pathname.replace(/^\//, "").toLowerCase();
  const firstSegment = cleaned.split("/")[0] ?? "";

  // 1. Match exact (inclut alias legacy)
  if (PATH_TO_SECTION[firstSegment] !== undefined) {
    const section = PATH_TO_SECTION[firstSegment];
    return { section, matched: true, path: SECTION_TO_PATH[section] ?? "/" };
  }

  // 2. Match préfixe sur un id de section connu
  for (const e of NAV_REGISTRY) {
    if (firstSegment === e.id || firstSegment.startsWith(`${e.id}-`)) {
      return { section: e.id, matched: true, path: e.path };
    }
  }

  // 3. Match par mot-clé fuzzy
  for (const { keywords, section } of FUZZY_KEYWORDS) {
    if (keywords.some((k) => firstSegment.includes(k))) {
      return { section, matched: true, path: SECTION_TO_PATH[section] ?? "/" };
    }
  }

  // 4. Fallback ultime
  return { section: "dashboard", matched: false, path: "/" };
}
