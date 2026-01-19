import { LucideIcon, Plus, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
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
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
      role="status"
      aria-label={title}
    >
      <div className="mb-4 rounded-full bg-muted p-4">
        <Icon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}

interface EmptyStateActionProps {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

/**
 * Pre-styled action button for EmptyState
 */
export function EmptyStateAction({
  label,
  onClick,
  icon: Icon = Plus,
}: EmptyStateActionProps) {
  return (
    <Button onClick={onClick} className="gap-2">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Button>
  );
}
