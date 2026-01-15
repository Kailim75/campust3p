import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Users, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useSessions, useAllSessionInscriptionsCounts } from "@/hooks/useSessions";
import { useBulkEnrollment } from "@/hooks/useBulkEnrollment";
import type { Contact } from "@/hooks/useContacts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface BulkEnrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContacts: Contact[];
  onSuccess?: () => void;
}

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

export function BulkEnrollDialog({
  open,
  onOpenChange,
  selectedContacts,
  onSuccess,
}: BulkEnrollDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [enrollmentResult, setEnrollmentResult] = useState<{
    success: string[];
    duplicates: string[];
    errors: string[];
  } | null>(null);

  const { data: sessions, isLoading: sessionsLoading } = useSessions();
  const { data: inscriptionsCounts } = useAllSessionInscriptionsCounts();
  const bulkEnrollment = useBulkEnrollment();

  // Filter sessions that are not yet finished and have available places
  const availableSessions = useMemo(() => {
    if (!sessions) return [];
    const today = new Date().toISOString().split("T")[0];
    return sessions.filter((session) => {
      const currentCount = inscriptionsCounts?.[session.id] || 0;
      const hasPlaces = currentCount < session.places_totales;
      const notFinished = session.date_fin >= today;
      return hasPlaces && notFinished && session.statut !== "terminee" && session.statut !== "annulee";
    });
  }, [sessions, inscriptionsCounts]);

  const selectedSession = useMemo(
    () => availableSessions.find((s) => s.id === selectedSessionId),
    [availableSessions, selectedSessionId]
  );

  const availablePlaces = useMemo(() => {
    if (!selectedSession || !inscriptionsCounts) return 0;
    return selectedSession.places_totales - (inscriptionsCounts[selectedSession.id] || 0);
  }, [selectedSession, inscriptionsCounts]);

  const handleEnroll = async () => {
    if (!selectedSessionId || !selectedSession) return;

    try {
      const result = await bulkEnrollment.mutateAsync({
        sessionId: selectedSessionId,
        contactIds: selectedContacts.map((c) => c.id),
        session: selectedSession,
      });

      setEnrollmentResult(result);

      if (result.success.length > 0) {
        toast.success(`${result.success.length} inscription(s) réussie(s)`);
      }
      if (result.duplicates.length > 0) {
        toast.warning(`${result.duplicates.length} doublon(s) ignoré(s)`);
      }
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} échec(s) d'inscription`);
      }
    } catch (error) {
      console.error("Erreur inscription groupée:", error);
      toast.error("Erreur lors de l'inscription groupée");
    }
  };

  const handleClose = () => {
    setSelectedSessionId("");
    setEnrollmentResult(null);
    onOpenChange(false);
    if (enrollmentResult?.success.length) {
      onSuccess?.();
    }
  };

  const getContactName = (contactId: string) => {
    const contact = selectedContacts.find((c) => c.id === contactId);
    return contact ? `${contact.prenom} ${contact.nom}` : contactId;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Inscription groupée à une session
          </DialogTitle>
          <DialogDescription>
            {selectedContacts.length} candidat(s) sélectionné(s)
          </DialogDescription>
        </DialogHeader>

        {!enrollmentResult ? (
          <>
            <div className="space-y-4">
              {/* Selected contacts preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Candidats sélectionnés</label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-muted/50 rounded-md">
                  {selectedContacts.map((contact) => (
                    <Badge key={contact.id} variant="secondary" className="text-xs">
                      {contact.prenom} {contact.nom}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Session selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Session de formation</label>
                <Select
                  value={selectedSessionId}
                  onValueChange={setSelectedSessionId}
                  disabled={sessionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une session..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        Aucune session disponible
                      </div>
                    ) : (
                      availableSessions.map((session) => {
                        const count = inscriptionsCounts?.[session.id] || 0;
                        const remaining = session.places_totales - count;
                        return (
                          <SelectItem key={session.id} value={session.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{session.nom}</span>
                              <Badge variant="outline" className="text-xs">
                                {formationLabels[session.formation_type] || session.formation_type}
                              </Badge>
                              <span className="text-muted-foreground text-xs">
                                {format(new Date(session.date_debut), "dd/MM/yyyy", { locale: fr })}
                              </span>
                              <Badge
                                variant={remaining < selectedContacts.length ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {remaining} place(s)
                              </Badge>
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Warning if not enough places */}
              {selectedSession && availablePlaces < selectedContacts.length && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Attention : seulement {availablePlaces} place(s) disponible(s) pour{" "}
                    {selectedContacts.length} candidat(s). Les premiers seront prioritaires.
                  </AlertDescription>
                </Alert>
              )}

              {/* Session info */}
              {selectedSession && (
                <div className="p-3 bg-muted/50 rounded-md space-y-1 text-sm">
                  <p>
                    <strong>Session :</strong> {selectedSession.nom}
                  </p>
                  <p>
                    <strong>Dates :</strong>{" "}
                    {format(new Date(selectedSession.date_debut), "dd/MM/yyyy", { locale: fr })} -{" "}
                    {format(new Date(selectedSession.date_fin), "dd/MM/yyyy", { locale: fr })}
                  </p>
                  <p>
                    <strong>Lieu :</strong> {selectedSession.lieu || "Non défini"}
                  </p>
                  <p>
                    <strong>Places disponibles :</strong> {availablePlaces} / {selectedSession.places_totales}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button
                onClick={handleEnroll}
                disabled={!selectedSessionId || bulkEnrollment.isPending}
              >
                {bulkEnrollment.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Inscrire {selectedContacts.length} candidat(s)
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results view */}
            <div className="space-y-4">
              {enrollmentResult.success.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      {enrollmentResult.success.length} inscription(s) réussie(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enrollmentResult.success.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs bg-success/10 text-success">
                        {getContactName(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {enrollmentResult.duplicates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                      {enrollmentResult.duplicates.length} doublon(s) ignoré(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enrollmentResult.duplicates.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs bg-warning/10 text-warning">
                        {getContactName(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {enrollmentResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    <span className="font-medium">
                      {enrollmentResult.errors.length} échec(s) (places insuffisantes)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {enrollmentResult.errors.map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs bg-destructive/10 text-destructive">
                        {getContactName(id)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Fermer</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
