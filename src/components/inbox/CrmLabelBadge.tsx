import { cn } from "@/lib/utils";

const LABEL_CONFIG: Record<string, { short: string; className: string }> = {
  "CRM/Prospect": {
    short: "Prospect",
    className: "bg-secondary text-secondary-foreground border-secondary",
  },
  "CRM/Apprenant": {
    short: "Apprenant",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  "CRM/Document": {
    short: "Doc",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
  },
  "CRM/Facturation": {
    short: "Facture",
    className: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  "CRM/Examen": {
    short: "Examen",
    className: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
  },
  "CRM/Urgent": {
    short: "Urgent",
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  "CRM/A traiter": {
    short: "À traiter",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  },
  "CRM/Non rattaché": {
    short: "Non rattaché",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export const ALL_CRM_LABELS = Object.keys(LABEL_CONFIG);

interface CrmLabelBadgeProps {
  label: string;
  size?: "xs" | "sm";
}

export function CrmLabelBadge({ label, size = "sm" }: CrmLabelBadgeProps) {
  const config = LABEL_CONFIG[label];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border font-medium whitespace-nowrap",
        size === "xs"
          ? "text-[9px] px-1 py-px leading-tight"
          : "text-[10px] px-1.5 py-0.5 leading-none",
        config.className,
      )}
    >
      {config.short}
    </span>
  );
}
