import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarDays, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { SendDocumentsToContactDialog } from "@/components/sessions/SendDocumentsToContactDialog";

interface ContactInfo {
  id: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  civilite?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
  pays_naissance?: string | null;
  numero_permis?: string | null;
  prefecture_permis?: string | null;
  date_delivrance_permis?: string | null;
  numero_carte_professionnelle?: string | null;
  prefecture_carte?: string | null;
  date_expiration_carte?: string | null;
  formation?: string | null;
}

interface SendDocumentsFromSignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactNom: string;
  contactPrenom: string;
}

function useContactSessions(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-sessions-for-docs", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      // Get sessions the contact is enrolled in
      const { data: inscriptions, error: inscError } = await supabase
        .from("session_inscriptions")
        .select("session_id")
        .eq("contact_id", contactId!);

      if (inscError) throw inscError;
      if (!inscriptions || inscriptions.length === 0) return [];

      const sessionIds = inscriptions.map((i) => i.session_id);

      const { data: sessions, error: sessError } = await supabase
        .from("sessions")
        .select("*")
        .in("id", sessionIds)
        .order("date_debut", { ascending: false });

      if (sessError) throw sessError;
      return sessions || [];
    },
  });
}

function useContactDetails(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-details-for-docs", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", contactId!)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function SendDocumentsFromSignatureDialog({
  open,
  onOpenChange,
  contactId,
  contactNom,
  contactPrenom,
}: SendDocumentsFromSignatureDialogProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showSendDialog, setShowSendDialog] = useState(false);

  const { data: sessions = [], isLoading: loadingSessions } = useContactSessions(open ? contactId : null);
  const { data: contactDetails } = useContactDetails(open ? contactId : null);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === selectedSessionId),
    [sessions, selectedSessionId]
  );

  const handleContinue = () => {
    if (!selectedSessionId || !selectedSession) return;
    setShowSendDialog(true);
  };

  const handleClose = () => {
    setSelectedSessionId("");
    setShowSendDialog(false);
    onOpenChange(false);
  };

  const contactForDialog: ContactInfo = contactDetails
    ? {
        id: contactDetails.id,
        nom: contactDetails.nom,
        prenom: contactDetails.prenom,
        email: contactDetails.email,
        telephone: contactDetails.telephone,
        civilite: contactDetails.civilite,
        rue: contactDetails.rue,
        code_postal: contactDetails.code_postal,
        ville: contactDetails.ville,
        date_naissance: contactDetails.date_naissance,
        ville_naissance: contactDetails.ville_naissance,
        pays_naissance: contactDetails.pays_naissance,
        numero_permis: contactDetails.numero_permis,
        prefecture_permis: contactDetails.prefecture_permis,
        date_delivrance_permis: contactDetails.date_delivrance_permis,
        numero_carte_professionnelle: contactDetails.numero_carte_professionnelle,
        prefecture_carte: contactDetails.prefecture_carte,
        date_expiration_carte: contactDetails.date_expiration_carte,
        formation: contactDetails.formation,
      }
    : {
        id: contactId,
        nom: contactNom,
        prenom: contactPrenom,
      };

  const sessionForDialog = selectedSession
    ? {
        id: selectedSession.id,
        nom: selectedSession.nom,
        formation_type: selectedSession.formation_type,
        date_debut: selectedSession.date_debut,
        date_fin: selectedSession.date_fin,
        lieu: selectedSession.lieu,
        adresse_rue: selectedSession.adresse_rue,
        adresse_code_postal: selectedSession.adresse_code_postal,
        adresse_ville: selectedSession.adresse_ville,
        duree_heures: selectedSession.duree_heures ?? undefined,
        prix: selectedSession.prix ?? undefined,
        heure_debut: selectedSession.heure_debut,
        heure_fin: selectedSession.heure_fin,
        formateur: selectedSession.formateur,
        objectifs: selectedSession.objectifs,
        prerequis: selectedSession.prerequis,
        places_totales: selectedSession.places_totales,
        tva_percent: selectedSession.tva_percent,
      }
    : null;

  // If send dialog is open, show it instead
  if (showSendDialog && sessionForDialog) {
    return (
      <SendDocumentsToContactDialog
        open={true}
        onOpenChange={(val) => {
          if (!val) handleClose();
        }}
        contact={contactForDialog}
        sessionInfo={sessionForDialog}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Envoyer des documents à {contactPrenom} {contactNom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Sélectionner une session
            </Label>

            {loadingSessions ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des sessions...
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                Ce contact n'est inscrit à aucune session.
              </p>
            ) : (
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une session..." />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <span>{session.nom}</span>
                        <Badge variant="outline" className="text-xs">
                          {format(parseISO(session.date_debut), "dd/MM/yyyy", { locale: fr })}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleContinue}
              disabled={!selectedSessionId || sessions.length === 0}
            >
              <Send className="h-4 w-4 mr-2" />
              Continuer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
