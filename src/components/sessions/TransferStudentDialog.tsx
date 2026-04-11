import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRightLeft, Calendar, MapPin, Users, Search, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions, useAllSessionInscriptionsCounts } from "@/hooks/useSessions";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

interface TransferStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  contactName: string;
  currentSessionId: string;
  currentSessionName: string;
  contactFormation?: string | null;
}

export function TransferStudentDialog({
  open,
  onOpenChange,
  contactId,
  contactName,
  currentSessionId,
  currentSessionName,
  contactFormation,
}: TransferStudentDialogProps) {
  const [search, setSearch] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmSession, setConfirmSession] = useState<any | null>(null);
  const { data: sessions = [], isLoading } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const queryClient = useQueryClient();

  const availableSessions = sessions
    .filter((s) => {
      if (s.id === currentSessionId) return false;
      const isUpcoming = new Date(s.date_fin) >= new Date();
      const isActive = s.statut === "a_venir" || s.statut === "en_cours";
      const filled = inscriptionsCounts[s.id] || 0;
      const hasSpace = filled < (s.places_totales || 0);
      const matchesFormation = !contactFormation || s.formation_type === contactFormation;
      const matchesSearch = !search ||
        s.nom.toLowerCase().includes(search.toLowerCase()) ||
        s.formation_type.toLowerCase().includes(search.toLowerCase()) ||
        (s.lieu || "").toLowerCase().includes(search.toLowerCase());
      return isUpcoming && isActive && hasSpace && matchesSearch && (matchesFormation || search);
    })
    .map((s) => {
      const filled = inscriptionsCounts[s.id] || 0;
      const remaining = (s.places_totales || 0) - filled;
      return { ...s, filled, remaining };
    })
    .sort((a, b) => new Date(a.date_debut).getTime() - new Date(b.date_debut).getTime());

  const handleTransfer = async (targetSession: typeof availableSessions[0]) => {
    setIsTransferring(true);
    try {
      // 1. Check no duplicate inscription in target
      const { data: existing } = await supabase
        .from("session_inscriptions")
        .select("id")
        .eq("session_id", targetSession.id)
        .eq("contact_id", contactId)
        .maybeSingle();

      if (existing) {
        toast.error("Cet apprenant est déjà inscrit à cette session");
        setIsTransferring(false);
        setConfirmSession(null);
        return;
      }

      // 2. Update inscription: change session_id (track will be auto-set by DB trigger)
      const { error: updateError } = await supabase
        .from("session_inscriptions")
        .update({ session_id: targetSession.id })
        .eq("session_id", currentSessionId)
        .eq("contact_id", contactId);

      if (updateError) throw updateError;

      // 3. Log the transfer in contact_historique
      await supabase.from("contact_historique").insert({
        contact_id: contactId,
        type: "note",
        titre: "[AUTO] Transfert de session",
        contenu: `Transféré de "${currentSessionName}" vers "${targetSession.nom}"`,
        date_echange: new Date().toISOString(),
      });

      // 4. Log in action_logs
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("action_logs").insert({
        entity_type: "session_inscription",
        entity_id: contactId,
        action_type: "transfer",
        label: `Transfert ${contactName}`,
        note: `De "${currentSessionName}" vers "${targetSession.nom}"`,
        user_id: user?.id || null,
        metadata: {
          from_session_id: currentSessionId,
          from_session_name: currentSessionName,
          to_session_id: targetSession.id,
          to_session_name: targetSession.nom,
        },
      });

      // 5. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-detail"] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["sessions"] });
      queryClient.invalidateQueries({ queryKey: ["apprenant-cockpit", contactId] });
      queryClient.invalidateQueries({ queryKey: ["apprenant-inscriptions", contactId] });
      queryClient.invalidateQueries({ queryKey: ["contact-historique", contactId] });

      toast.success(`${contactName} transféré vers "${targetSession.nom}"`);
      setConfirmSession(null);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error("Erreur lors du transfert : " + (error.message || "Erreur inconnue"));
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
              Transférer vers une autre session
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">{contactName}</span>
              {" — actuellement inscrit à "}
              <span className="font-medium text-foreground">{currentSessionName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une session…"
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
                <ArrowRightLeft className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune session compatible disponible</p>
                <p className="text-xs mt-1">Vérifiez le type de formation ou créez une nouvelle session</p>
              </div>
            ) : (
              availableSessions.map((session) => {
                const formColor = getFormationColor(session.formation_type);

                return (
                  <button
                    key={session.id}
                    disabled={isTransferring}
                    onClick={() => setConfirmSession(session)}
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
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(session.date_debut), "dd MMM yyyy", { locale: fr })}
                            {" — "}
                            {format(parseISO(session.date_fin), "dd MMM yyyy", { locale: fr })}
                          </span>
                          {session.lieu && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.lieu}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={cn("text-lg font-bold tabular-nums",
                          session.remaining <= 2 ? "text-warning" : "text-success"
                        )}>
                          {session.remaining}
                        </span>
                        <p className="text-[10px] text-muted-foreground">place{session.remaining > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialog */}
      <AlertDialog open={!!confirmSession} onOpenChange={(open) => !open && setConfirmSession(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le transfert</AlertDialogTitle>
            <AlertDialogDescription>
              Voulez-vous transférer <strong>{contactName}</strong> de <strong>"{currentSessionName}"</strong> vers{" "}
              <strong>"{confirmSession?.nom}"</strong> ?
              <br /><br />
              Les documents, notes, paiements et historique seront conservés. Le track sera automatiquement recalculé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransferring}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={isTransferring}
              onClick={() => confirmSession && handleTransfer(confirmSession)}
            >
              {isTransferring && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer le transfert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
