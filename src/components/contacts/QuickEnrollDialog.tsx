import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, MapPin, Users, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions, useAddInscription, useAllSessionInscriptionsCounts } from "@/hooks/useSessions";
import { useSessionInscriptions } from "@/hooks/useSessions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import type { Contact } from "@/hooks/useContacts";

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

interface QuickEnrollDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickEnrollDialog({ contact, open, onOpenChange }: QuickEnrollDialogProps) {
  const { data: sessions, isLoading } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const addInscription = useAddInscription();
  const [enrollingSessionId, setEnrollingSessionId] = useState<string | null>(null);

  // Filter sessions that are upcoming and match contact's formation if set
  const availableSessions = (sessions ?? []).filter((session) => {
    const isUpcoming = session.statut === "a_venir" || session.statut === "en_cours";
    const matchesFormation = !contact?.formation || session.formation_type === contact.formation;
    const hasSpace = (inscriptionsCounts[session.id] || 0) < session.places_totales;
    return isUpcoming && matchesFormation && hasSpace;
  });

  const handleEnroll = async (sessionId: string) => {
    if (!contact) return;
    
    setEnrollingSessionId(sessionId);
    try {
      await addInscription.mutateAsync({
        sessionId,
        contactId: contact.id,
      });
      toast.success("Contact inscrit à la session");
      onOpenChange(false);
    } catch (error: any) {
      if (error?.message?.includes("duplicate")) {
        toast.error("Ce contact est déjà inscrit à cette session");
      } else {
        toast.error("Erreur lors de l'inscription");
      }
    } finally {
      setEnrollingSessionId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Inscrire à une session</DialogTitle>
          <DialogDescription>
            {contact ? `${contact.prenom} ${contact.nom}` : ""}
            {contact?.formation && ` • ${formationLabels[contact.formation] || contact.formation}`}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : availableSessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Aucune session disponible
                {contact?.formation && " pour cette formation"}
              </div>
            ) : (
              availableSessions.map((session) => {
                const enrolled = inscriptionsCounts[session.id] || 0;
                const isFull = enrolled >= session.places_totales;
                
                return (
                  <div
                    key={session.id}
                    className={cn(
                      "p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      isFull && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{session.nom}</h4>
                          <Badge variant="outline" className="text-xs">
                            {formationLabels[session.formation_type] || session.formation_type}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(session.date_debut), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                          {session.lieu && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {session.lieu}
                            </span>
                          )}
                          <span className={cn(
                            "flex items-center gap-1",
                            isFull ? "text-destructive" : enrolled >= session.places_totales * 0.8 ? "text-warning" : ""
                          )}>
                            <Users className="h-3.5 w-3.5" />
                            {enrolled}/{session.places_totales}
                          </span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        disabled={isFull || enrollingSessionId === session.id}
                        onClick={() => handleEnroll(session.id)}
                      >
                        {enrollingSessionId === session.id ? (
                          "..."
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Inscrire
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
