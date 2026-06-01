import { cn } from "@/lib/utils";
import {
  CATEGORY_BADGE_TONE,
  CATEGORY_LABELS,
  type RequalificationCategory,
} from "@/lib/requalification/categories";

export function RequalificationCategoryBadge({
  category,
  className,
}: {
  category: RequalificationCategory | null;
  className?: string;
}) {
  const c = category ?? "non_classe";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-medium",
        CATEGORY_BADGE_TONE[c],
        className,
      )}
    >
      {CATEGORY_LABELS[c]}
    </span>
  );
}
