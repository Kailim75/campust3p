import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Inbox, MailCheck } from "lucide-react";
import type { BoiteMailAConsulterItem } from "./aujourdhui-types";

interface BlocBoitesMailProps {
  items: BoiteMailAConsulterItem[];
  openContact: (id: string) => void;
  /** Horodate la consultation de la boîte (réarme le compteur de 7 jours). */
  onConsulte: (contactId: string) => void;
  /** Contacts dont la consultation est en cours d'enregistrement. */
  pendingIds: Set<string>;
}

/**
 * Boîtes mail internes (Outlook, non rattachées au CRM) des candidats actifs
 * à consulter : jamais consultée ou plus de 7 jours. « J'ai consulté »
 * horodate la fiche et réarme le compteur.
 */
export function BlocBoitesMail({ items, openContact, onConsulte, pendingIds }: BlocBoitesMailProps) {
  if (items.length === 0) return null;

  return (
    <Card className="p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Inbox className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Boîtes mail à consulter</h3>
            <p className="text-[11px] text-muted-foreground">
              {items.length} boîte{items.length > 1 ? "s" : ""} Outlook à vérifier
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/10 text-primary">{items.length}</Badge>
      </div>
      <div className="divide-y max-h-72 overflow-y-auto">
        {items.map((item) => {
          const jamais = item.joursDepuisConsultation == null;
          return (
            <div key={item.id} className="px-5 py-3 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between mb-1">
                <button
                  onClick={() => openContact(item.contactId)}
                  className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1"
                >
                  {item.prenom} {item.nom}
                  <ExternalLink className="h-3 w-3 opacity-40" />
                </button>
                <Badge variant="outline" className="text-[11px] bg-muted text-muted-foreground">
                  {jamais ? "Jamais consultée" : `Il y a ${item.joursDepuisConsultation} j`}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2 truncate">{item.emailInterne}</p>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] gap-1"
                disabled={pendingIds.has(item.contactId)}
                onClick={() => onConsulte(item.contactId)}
              >
                <MailCheck className="h-3 w-3" />
                {pendingIds.has(item.contactId) ? "Enregistrement…" : "J'ai consulté"}
              </Button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
