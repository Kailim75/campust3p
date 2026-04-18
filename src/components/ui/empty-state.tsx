import { LucideIcon, Plus, FileQuestion, Sparkles, ArrowRight, Lightbulb, SearchX, FilterX, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EmptyStateVariant = "default" | "minimal" | "card" | "search" | "filter";

interface ActionObject {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Accepts a ReactNode (legacy) or an action object { label, onClick, icon }. */
  action?: React.ReactNode | ActionObject;
  secondaryAction?: ActionObject;
  className?: string;
  tip?: string;
  variant?: EmptyStateVariant;
  /** For variant="search" — surfaces the searched term in the description. */
  searchQuery?: string;
  /** For variant="search" / "filter" — handler wired to the default reset CTA. */
  onReset?: () => void;
}

function isActionObject(value: unknown): value is ActionObject {
  return (
    !!value &&
    typeof value === "object" &&
    "label" in (value as any) &&
    "onClick" in (value as any) &&
    typeof (value as any).label === "string" &&
    typeof (value as any).onClick === "function"
  );
}

function renderAction(action: React.ReactNode | ActionObject | undefined, variant: "default" | "outline" = "default") {
  if (!action) return null;
  if (isActionObject(action)) {
    const Icon = action.icon ?? Plus;
    return (
      <Button onClick={action.onClick} variant={variant} className="gap-2 group">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {action.label}
        <ArrowRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
      </Button>
    );
  }
  return action;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  tip,
  variant = "default",
  searchQuery,
  onReset,
}: EmptyStateProps) {
  // Defaults for special variants — caller can still override title/description/icon/action.
  const isSearch = variant === "search";
  const isFilter = variant === "filter";

  const ResolvedIcon =
    icon ?? (isSearch ? SearchX : isFilter ? FilterX : FileQuestion);

  const resolvedTitle =
    title ?? (isSearch ? "Aucun résultat" : isFilter ? "Aucun résultat" : "Rien à afficher");

  const resolvedDescription =
    description ??
    (isSearch
      ? searchQuery
        ? `Aucun résultat pour « ${searchQuery} ». Essayez avec d'autres mots-clés.`
        : "Aucun résultat. Essayez avec d'autres mots-clés."
      : isFilter
        ? "Aucun résultat avec ces filtres. Réinitialisez pour tout afficher."
        : undefined);

  // Auto reset CTA for search/filter when no action provided
  const resolvedAction =
    action ??
    ((isSearch || isFilter) && onReset
      ? {
          label: isSearch ? "Réinitialiser la recherche" : "Réinitialiser les filtres",
          onClick: onReset,
          icon: RotateCcw,
        }
      : undefined);

  // Visual sizing — keep "minimal" / "card" backwards compatible, default = generous py-16
  const isCard = variant === "card";
  const isMinimal = variant === "minimal";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex flex-col items-center justify-center text-center mx-auto",
        isMinimal && "py-8 px-4",
        isCard && "py-10 px-6 rounded-xl border border-dashed border-border bg-muted/30",
        !isMinimal && !isCard && "py-16 px-6",
        className
      )}
      role="status"
      aria-label={resolvedTitle}
    >
      {/* Icon with decorative rings */}
      <div className="relative mb-5">
        <div className="absolute inset-0 rounded-full bg-primary/5 scale-[2.4] -z-10" aria-hidden="true" />
        <div className="absolute inset-0 rounded-full bg-primary/8 scale-[1.7] -z-10" aria-hidden="true" />
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className={cn(
            "relative rounded-2xl flex items-center justify-center transition-transform duration-300",
            isMinimal ? "h-14 w-14" : "h-16 w-16",
            isCard
              ? "bg-gradient-to-br from-primary/20 to-primary/5"
              : "bg-muted/60 border border-border/60"
          )}
        >
          <ResolvedIcon
            className={cn("text-primary", isMinimal ? "h-6 w-6" : "h-7 w-7")}
            aria-hidden="true"
          />
        </motion.div>
      </div>

      <h3 className="text-lg font-display font-semibold text-foreground mb-1">{resolvedTitle}</h3>

      {resolvedDescription && (
        <p className="text-sm text-muted-foreground max-w-md mb-4 leading-relaxed">
          {resolvedDescription}
        </p>
      )}

      {tip && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg mb-4"
        >
          <Lightbulb className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
          <span>{tip}</span>
        </motion.div>
      )}

      {(resolvedAction || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          {renderAction(resolvedAction, "default")}
          {secondaryAction && renderAction(secondaryAction, "outline")}
        </motion.div>
      )}
    </motion.div>
  );
}

interface EmptyStateActionProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "primary" | "outline";
}

export function EmptyStateAction({
  label,
  onClick,
  icon: Icon = Plus,
  variant = "default",
}: EmptyStateActionProps) {
  return (
    <Button
      onClick={onClick}
      className={cn(
        "gap-2 group",
        variant === "primary" && "btn-gradient"
      )}
      variant={variant === "outline" ? "outline" : "default"}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
      <ArrowRight className="h-4 w-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
    </Button>
  );
}

export const emptyStateConfigs = {
  contacts: {
    icon: Plus,
    title: "Aucun contact pour le moment",
    description: "Commencez par ajouter votre premier stagiaire pour démarrer.",
    tip: "Raccourci : Ctrl+N pour créer rapidement un contact",
    actionLabel: "Ajouter un stagiaire",
  },
  sessions: {
    icon: Plus,
    title: "Aucune session planifiée",
    description: "Créez votre première session de formation pour commencer.",
    tip: "Vous pouvez dupliquer une session existante pour aller plus vite",
    actionLabel: "Créer une session",
  },
  documents: {
    icon: FileQuestion,
    title: "Aucun document",
    description: "Les documents uploadés ou générés apparaîtront ici.",
    tip: "Formats acceptés : PDF, images, Word",
    actionLabel: "Ajouter un document",
  },
  factures: {
    icon: Plus,
    title: "Aucune facture",
    description: "Les factures générées apparaîtront ici.",
    tip: "Les factures sont automatiquement créées à l'inscription",
    actionLabel: "Créer une facture",
  },
  historique: {
    icon: FileQuestion,
    title: "Aucun historique",
    description: "L'historique des échanges avec ce contact apparaîtra ici.",
    tip: "Notez chaque appel et email pour un suivi complet",
    actionLabel: "Ajouter une note",
  },
  alertes: {
    icon: Sparkles,
    title: "Tout est en ordre !",
    description: "Aucune alerte à traiter. Continuez votre excellent travail.",
    tip: "Les alertes apparaissent automatiquement selon vos échéances",
    actionLabel: undefined,
  },
  search: {
    icon: FileQuestion,
    title: "Aucun résultat",
    description: "Essayez avec d'autres mots-clés ou vérifiez l'orthographe.",
    tip: "La recherche porte sur le nom, prénom, email et téléphone",
    actionLabel: undefined,
  },
};
