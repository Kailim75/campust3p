import { useState } from "react";
import { triggerAutoGeneration } from "@/lib/auto-generate-documents";
import { getTrackFromFormationType } from "@/lib/formation-track";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  GraduationCap, Users, Calendar, Search, Loader2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions, useAllSessionInscriptionsCounts } from "@/hooks/useSessions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

interface SessionAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  contactFormation?: string | null;
  onSuccess?: (sessionId: string, sessionName: string) => void;
}

export function SessionAssignDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  contactFormation,
  onSuccess,
}: SessionAssignDialogProps) {
  const [search, setSearch] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const { data: sessions = [], isLoading } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const queryClient = useQueryClient();

  // Filter: active, upcoming, with available places, sorted by fill rate ascending
  const availableSessions = sessions
    .filter((s) => {
      const isUpcoming = new Date(s.date_debut) >= new Date();
      const isActive = s.statut === "a_venir" || s.statut === "en_cours";
      const filled = inscriptionsCounts[s.id] || 0;
      const hasSpace = filled < (s.places_totales || 0);
      const matchesFormation = !contactFormation || s.formation_type === contactFormation;
      const matchesSearch = !search || 
        s.nom.toLowerCase().includes(search.toLowerCase()) ||
        s.formation_type.toLowerCase().includes(search.toLowerCase());
      return isUpcoming && isActive && hasSpace && matchesSearch && (matchesFormation || search);
    })
    .map((s) => {
      const filled = inscriptionsCounts[s.id] || 0;
      const fillRate = s.places_totales > 0 ? Math.round((filled / s.places_totales) * 100) : 0;
      return { ...s, filled, fillRate };
    })
    .sort((a, b) => a.fillRate - b.fillRate); // Lowest fill rate first

  const handleAssign = async (session: typeof availableSessions[0]) => {
    setIsAssigning(true);
    try {
      const { data: inscData, error } = await supabase
        .from("session_inscriptions")
        .insert({
          session_id: session.id,
          contact_id: contactId,
          statut: "inscrit",
        })
        .select("id")
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["apprenant-inscriptions", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });

      toast.success(`${contactName} inscrit à "${session.nom}"`);
      onOpenChange(false);
      onSuccess?.(session.id, session.nom);

      // Auto-generate documents in background (non-blocking)
      const track = getTrackFromFormationType(session.formation_type);
      triggerAutoGeneration({
        contactId,
        sessionId: session.id,
        inscriptionId: inscData?.id,
        track: track === "continuing" ? "continuing" : "initial",
      }).then((result) => {
        if (result.generated > 0) {
          toast.info(`${result.generated} document(s) auto-généré(s)`, { duration: 4000 });
          queryClient.invalidateQueries({ queryKey: ["generated-docs-v2"] });
        }
      });
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Ce stagiaire est déjà inscrit à cette session");
      } else {
        toast.error("Erreur lors de l'inscription");
      }
      console.error(error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Assigner à une session
          </DialogTitle>
          <DialogDescription>
            Sessions disponibles pour <span className="font-medium text-foreground">{contactName}</span>
            {contactFormation && (
              <> — Formation <Badge variant="outline" className="ml-1 text-xs">{contactFormation}</Badge></>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une session..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 min-h-0 py-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          ) : availableSessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune session disponible</p>
              <p className="text-xs mt-1">Modifiez la recherche ou créez une nouvelle session</p>
            </div>
          ) : (
            availableSessions.map((session) => {
              const formColor = getFormationColor(session.formation_type);
              const fillColor = session.fillRate >= 70 ? "text-warning" : "text-success";

              return (
                <button
                  key={session.id}
                  disabled={isAssigning}
                  onClick={() => handleAssign(session)}
                  className={cn(
                    "w-full p-4 rounded-xl border text-left transition-all group",
                    "hover:border-primary/30 hover:bg-primary/[0.03] hover:shadow-sm",
                    formColor.bg, formColor.border
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-foreground truncate">
                          {session.nom}
                        </h4>
                        <Badge variant="outline" className={cn("text-[10px]", formColor.badge)}>
                          {getFormationLabel(session.formation_type)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(session.date_debut), "dd MMM yyyy", { locale: fr })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {session.filled}/{session.places_totales} places
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={cn("text-lg font-bold tabular-nums", fillColor)}>
                        {session.fillRate}%
                      </span>
                      <p className="text-[10px] text-muted-foreground">rempli</p>
                    </div>
                  </div>

                  {/* Fill bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden mt-2.5">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        session.fillRate >= 70 ? "bg-warning" : "bg-success"
                      )}
                      style={{ width: `${Math.min(session.fillRate, 100)}%` }}
                    />
                  </div>

                  {isAssigning && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-primary">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Inscription en cours...
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
