import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRecentContacts } from "@/hooks/useContacts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const statusConfig = {
  "En attente de validation": { label: "En attente", class: "bg-info/10 text-info" },
  "Client": { label: "Client", class: "bg-success/10 text-success" },
  "Bravo": { label: "Bravo", class: "bg-warning/10 text-warning" },
};

const formationLabels: Record<string, string> = {
  TAXI: "Taxi",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "Continue Taxi",
  "Formation continue VTC": "Continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};

export function RecentContacts() {
  const { data: contacts, isLoading, error } = useRecentContacts(5);

  if (error) {
    return (
      <div className="card-elevated p-5 text-center text-destructive">
        Erreur lors du chargement
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-foreground">
          Contacts récents
        </h3>
        <button className="text-sm text-primary hover:underline">
          Voir tout
        </button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))
        ) : contacts && contacts.length > 0 ? (
          contacts.map((contact) => {
            const initials = `${contact.prenom?.[0] ?? ''}${contact.nom?.[0] ?? ''}`.toUpperCase();
            const status = contact.statut ?? "En attente de validation";
            
            return (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                    {initials || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {contact.prenom} {contact.nom}
                    </p>
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", statusConfig[status]?.class)}
                    >
                      {statusConfig[status]?.label ?? status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.formation ? (formationLabels[contact.formation] || contact.formation) : 'Pas de formation'}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(contact.created_at), 'dd MMM', { locale: fr })}
                </span>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            Aucun contact pour le moment
          </div>
        )}
      </div>
    </div>
  );
}
