import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Contact {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  status: "prospect" | "inscrit" | "stagiaire" | "ancien";
  formation: string;
  dateContact: string;
}

interface RecentContactsProps {
  contacts: Contact[];
}

const statusConfig = {
  prospect: { label: "Prospect", class: "bg-info/10 text-info" },
  inscrit: { label: "Inscrit", class: "bg-warning/10 text-warning" },
  stagiaire: { label: "En formation", class: "bg-success/10 text-success" },
  ancien: { label: "Ancien", class: "bg-muted text-muted-foreground" },
};

export function RecentContacts({ contacts }: RecentContactsProps) {
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
        {contacts.map((contact) => {
          const initials = `${contact.prenom[0]}${contact.nom[0]}`.toUpperCase();
          
          return (
            <div
              key={contact.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-medium text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">
                    {contact.prenom} {contact.nom}
                  </p>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", statusConfig[contact.status].class)}
                  >
                    {statusConfig[contact.status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {contact.formation}
                </p>
              </div>

              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {contact.dateContact}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
