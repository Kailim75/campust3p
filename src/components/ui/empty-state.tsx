import { LucideIcon, Plus, FileQuestion, Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** Tip shown below description - helpful context */
  tip?: string;
  /** Variant for different visual styles */
  variant?: "default" | "minimal" | "card";
}

/**
 * EmptyState component for displaying when there's no data
 * Use this instead of simple text for better UX
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action,
  className,
  tip,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center animate-fade-in",
        variant === "default" && "py-12 px-4",
        variant === "minimal" && "py-8 px-4",
        variant === "card" && "py-10 px-6 rounded-xl border border-dashed border-border bg-muted/30",
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Icon with gradient background */}
      <div className={cn(
        "mb-4 rounded-full p-4 transition-transform duration-300",
        variant === "card" 
          ? "bg-gradient-to-br from-primary/20 to-primary/5" 
          : "bg-muted"
      )}>
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      
      {/* Title */}
      <h3 className="text-lg font-display font-semibold text-foreground mb-1">{title}</h3>
      
      {/* Description */}
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      
      {/* Contextual tip */}
      {tip && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg mb-4">
          <Lightbulb className="h-3.5 w-3.5 text-warning shrink-0" />
          <span>{tip}</span>
        </div>
      )}
      
      {/* Action */}
      {action}
    </div>
  );
}

interface EmptyStateActionProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
  variant?: "default" | "primary" | "outline";
}

/**
 * Pre-styled action button for EmptyState
 */
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

/**
 * Pre-configured empty states for common use cases
 */
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
