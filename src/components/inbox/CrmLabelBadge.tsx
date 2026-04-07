import { cn } from "@/lib/utils";

const LABEL_CONFIG: Record<string, { short: string; className: string; group: string }> = {
  // — Statut contact —
  "CRM/Prospect": {
    short: "Prospect",
    className: "bg-secondary text-secondary-foreground border-secondary",
    group: "Statut",
  },
  "CRM/Apprenant": {
    short: "Apprenant",
    className: "bg-primary/10 text-primary border-primary/20",
    group: "Statut",
  },
  // — Gestion —
  "CRM/Inscription": {
    short: "Inscription",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    group: "Gestion",
  },
  "CRM/Planification": {
    short: "Planification",
    className: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    group: "Gestion",
  },
  "CRM/Relance": {
    short: "Relance",
    className: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    group: "Gestion",
  },
  "CRM/Financement": {
    short: "Financement",
    className: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    group: "Gestion",
  },
  // — Documents & admin —
  "CRM/Document": {
    short: "Doc",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    group: "Admin",
  },
  "CRM/Facturation": {
    short: "Facture",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    group: "Admin",
  },
  "CRM/Examen": {
    short: "Examen",
    className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    group: "Admin",
  },
  "CRM/Réclamation": {
    short: "Réclamation",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    group: "Admin",
  },
  "CRM/Partenaire": {
    short: "Partenaire",
    className: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    group: "Admin",
  },
  // — Priorité / tri —
  "CRM/Urgent": {
    short: "Urgent",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    group: "Priorité",
  },
  "CRM/A traiter": {
    short: "À traiter",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    group: "Priorité",
  },
  "CRM/Non rattaché": {
    short: "Non rattaché",
    className: "bg-muted text-muted-foreground border-border",
    group: "Priorité",
  },
};

export const ALL_CRM_LABELS = Object.keys(LABEL_CONFIG);

export const CRM_LABEL_GROUPS = (() => {
  const groups: Record<string, string[]> = {};
  for (const [name, cfg] of Object.entries(LABEL_CONFIG)) {
    if (!groups[cfg.group]) groups[cfg.group] = [];
    groups[cfg.group].push(name);
  }
  return groups;
})();

interface CrmLabelBadgeProps {
  label: string;
  size?: "xs" | "sm";
  /** For custom labels not in the static config */
  customColor?: string;
  customShort?: string;
}

export function CrmLabelBadge({ label, size = "sm", customColor, customShort }: CrmLabelBadgeProps) {
  const config = LABEL_CONFIG[label];

  // Support custom labels
  if (!config && !customShort) return null;

  const colorMap: Record<string, string> = {
    gray: "bg-muted text-muted-foreground border-border",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800",
    yellow: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    purple: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    pink: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    teal: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    cyan: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800",
    orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  };

  const cls = config?.className || colorMap[customColor || "gray"] || colorMap.gray;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border font-medium whitespace-nowrap",
        size === "xs"
          ? "text-[9px] px-1 py-px leading-tight"
          : "text-[10px] px-1.5 py-0.5 leading-none",
        cls,
      )}
    >
      {config?.short || customShort || label}
    </span>
  );
}
