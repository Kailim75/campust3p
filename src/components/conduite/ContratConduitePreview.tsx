import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  html: string | null;
  loading?: boolean;
}

export function ContratConduitePreview({ html, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }
  if (!html) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Aucun aperçu disponible. Vérifiez que le template Template Studio est publié.
      </div>
    );
  }
  return (
    <ScrollArea className="h-[60vh] w-full rounded-md border bg-card">
      <div
        className="prose prose-sm max-w-none p-6"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ScrollArea>
  );
}
