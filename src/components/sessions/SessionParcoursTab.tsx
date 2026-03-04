import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Car,
  Send,
  RotateCcw,
  Loader2,
} from "lucide-react";
import { useSessionInscrits } from "@/hooks/useSessionInscrits";
import { useInscritsExamResults } from "@/hooks/useInscritsExamResults";
import { useSession, useSessions, useAddInscription } from "@/hooks/useSessions";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import type { EmailRecipient } from "@/components/email/EmailComposerModal";
import { toast } from "sonner";

interface SessionParcoursTabProps {
  sessionId: string;
}

export function SessionParcoursTab({ sessionId }: SessionParcoursTabProps) {
  const { inscrits, isLoading } = useSessionInscrits(sessionId);
  const { data: session } = useSession(sessionId);
  const { data: allSessions } = useSessions();
  const addInscription = useAddInscription();
  const contactIds = useMemo(() => inscrits?.map((i) => i.contact_id) || [], [inscrits]);
  const { data: examResults = {}, setResult: setExamResult } = useInscritsExamResults(contactIds);
  const { composerProps, openComposer } = useEmailComposer();

  const [reprogramDialogOpen, setReprogramDialogOpen] = useState(false);
  const [reprogramTarget, setReprogramTarget] = useState<{
    contactId: string;
    contactName: string;
    type: "theorie" | "pratique";
  } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  // Compute counters
  const theorieStats = useMemo(() => {
    const stats = { pending: 0, admis: 0, ajourne: 0 };
    contactIds.forEach((id) => {
      const r = examResults[id]?.theorie;
      if (r === "admis") stats.admis++;
      else if (r === "ajourne") stats.ajourne++;
      else stats.pending++;
    });
    return stats;
  }, [contactIds, examResults]);

  const pratiqueStats = useMemo(() => {
    const stats = { pending: 0, admis: 0, ajourne: 0 };
    contactIds.forEach((id) => {
      const r = examResults[id]?.pratique;
      if (r === "admis") stats.admis++;
      else if (r === "ajourne") stats.ajourne++;
      else stats.pending++;
    });
    return stats;
  }, [contactIds, examResults]);

  // Future sessions (same formation type)
  const futureSessions = useMemo(() => {
    if (!allSessions || !session) return [];
    return allSessions.filter(
      (s) =>
        s.id !== sessionId &&
        s.formation_type === session.formation_type &&
        s.statut === "a_venir" &&
        new Date(s.date_debut) > new Date()
    );
  }, [allSessions, session, sessionId]);

  const handleReprogrammer = (
    contactId: string,
    contactName: string,
    type: "theorie" | "pratique"
  ) => {
    setReprogramTarget({ contactId, contactName, type });
    setSelectedSessionId("");
    setReprogramDialogOpen(true);
  };

  const handleConfirmReprogrammation = async () => {
    if (!reprogramTarget || !selectedSessionId) return;
    try {
      const targetSession = allSessions?.find((s) => s.id === selectedSessionId);
      await addInscription.mutateAsync({
        sessionId: selectedSessionId,
        contactId: reprogramTarget.contactId,
      });
      toast.success(
        `${reprogramTarget.contactName} inscrit à ${targetSession?.nom || "la session"}`
      );

      // Send email notification
      const inscrit = inscrits?.find((i) => i.contact_id === reprogramTarget.contactId);
      if (inscrit?.contact?.email) {
        const isTheorie = reprogramTarget.type === "theorie";
        openComposer({
          recipients: [
            {
              id: reprogramTarget.contactId,
              email: inscrit.contact.email,
              prenom: inscrit.contact.prenom || "",
              nom: inscrit.contact.nom || "",
            },
          ],
          defaultSubject: isTheorie
            ? `Reprogrammation examen théorique — ${targetSession?.nom || ""}`
            : `Reprogrammation examen pratique — ${targetSession?.nom || ""}`,
          defaultBody: `Bonjour ${inscrit.contact.prenom},\n\nSuite à votre examen ${isTheorie ? "théorique" : "pratique"}, vous avez été inscrit(e) à la session "${targetSession?.nom || ""}".\n\nNous vous communiquerons les détails de votre nouvelle session prochainement.\n\nBien cordialement,\nL'équipe pédagogique`,
          autoNoteCategory: isTheorie ? "examen_theorie_echoue" : "examen_pratique_echoue",
          autoNoteExtra: `Reprogrammé → ${targetSession?.nom || ""}`,
        });
      }

      setReprogramDialogOpen(false);
    } catch {
      toast.error("Erreur lors de l'inscription");
    }
  };

  const handleSendFelicitations = (
    contactId: string,
    contact: any,
    type: "theorie" | "pratique"
  ) => {
    if (!contact?.email) {
      toast.error("Cet apprenant n'a pas d'email");
      return;
    }
    const isTheorie = type === "theorie";
    openComposer({
      recipients: [
        {
          id: contactId,
          email: contact.email,
          prenom: contact.prenom || "",
          nom: contact.nom || "",
        },
      ],
      defaultSubject: isTheorie
        ? "🎉 Félicitations — Examen théorique réussi !"
        : "🎉 Félicitations — Examen pratique réussi !",
      defaultBody: isTheorie
        ? `Bonjour ${contact.prenom},\n\nFélicitations pour votre réussite à l'examen théorique ! 🎉\n\nLa prochaine étape est l'examen pratique. Nous allons vous programmer une session dans les meilleurs délais.\n\nBien cordialement,\nL'équipe pédagogique`
        : `Bonjour ${contact.prenom},\n\nFélicitations pour votre réussite à l'examen pratique ! 🎉\n\nVous pouvez maintenant entreprendre les démarches pour obtenir votre carte professionnelle auprès de votre préfecture.\n\nDocuments nécessaires :\n- Attestation de réussite (ci-jointe)\n- Pièce d'identité\n- Justificatif de domicile\n- Photo d'identité\n- Permis de conduire\n\nN'hésitez pas à nous contacter pour toute question.\n\nBien cordialement,\nL'équipe pédagogique`,
      autoNoteCategory: isTheorie ? "examen_theorie_reussi" : "examen_pratique_reussi",
    });
  };

  const handleBulkFelicitations = (type: "theorie" | "pratique") => {
    const admisInscrits = inscrits?.filter(
      (i) => examResults[i.contact_id]?.[type] === "admis" && i.contact?.email
    );
    if (!admisInscrits?.length) {
      toast.error("Aucun apprenant admis avec email");
      return;
    }
    const isTheorie = type === "theorie";
    const recipients: EmailRecipient[] = admisInscrits.map((i) => ({
      id: i.contact_id,
      email: i.contact!.email!,
      prenom: i.contact!.prenom || "",
      nom: i.contact!.nom || "",
      customBody: isTheorie
        ? `Bonjour ${i.contact!.prenom},\n\nFélicitations pour votre réussite à l'examen théorique ! 🎉\n\nLa prochaine étape est l'examen pratique.\n\nBien cordialement,\nL'équipe pédagogique`
        : `Bonjour ${i.contact!.prenom},\n\nFélicitations pour votre réussite à l'examen pratique ! 🎉\n\nVous pouvez maintenant faire votre demande de carte professionnelle en préfecture.\n\nBien cordialement,\nL'équipe pédagogique`,
    }));
    openComposer({
      recipients,
      defaultSubject: isTheorie
        ? "🎉 Félicitations — Examen théorique réussi !"
        : "🎉 Félicitations — Examen pratique réussi !",
      defaultBody: "Contenu personnalisé par apprenant",
      autoNoteCategory: isTheorie ? "examen_theorie_reussi" : "examen_pratique_reussi",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!inscrits?.length) {
    return (
      <div className="text-center text-muted-foreground py-12 text-sm">
        Aucun stagiaire inscrit
      </div>
    );
  }

  const renderExamBlock = (
    type: "theorie" | "pratique",
    stats: { pending: number; admis: number; ajourne: number },
    icon: React.ReactNode,
    title: string
  ) => {
    const pendingInscrits = inscrits?.filter(
      (i) => !examResults[i.contact_id]?.[type]
    );
    const admisInscrits = inscrits?.filter(
      (i) => examResults[i.contact_id]?.[type] === "admis"
    );
    const ajourneInscrits = inscrits?.filter(
      (i) => examResults[i.contact_id]?.[type] === "ajourne"
    );

    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              {icon}
              {title}
            </div>
            {stats.admis > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-success text-success hover:bg-success/10"
                onClick={() => handleBulkFelicitations(type)}
              >
                <Send className="h-3 w-3" />
                Féliciter ({stats.admis})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Counters */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-muted-foreground">{stats.pending}</p>
              <p className="text-[10px] text-muted-foreground">En attente</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-success/10">
              <p className="text-lg font-bold text-success">{stats.admis}</p>
              <p className="text-[10px] text-success">Réussi</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10">
              <p className="text-lg font-bold text-destructive">{stats.ajourne}</p>
              <p className="text-[10px] text-destructive">Échoué</p>
            </div>
          </div>

          {/* Pending list */}
          {(pendingInscrits?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                À traiter ({pendingInscrits?.length})
              </p>
              <div className="space-y-1.5">
                {pendingInscrits?.map((inscrit) => (
                  <div
                    key={inscrit.contact_id}
                    className="flex items-center justify-between p-2 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                          {`${inscrit.contact?.prenom?.[0] || ""}${inscrit.contact?.nom?.[0] || ""}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {inscrit.contact?.prenom} {inscrit.contact?.nom}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 border-success text-success hover:bg-success/10"
                        onClick={() =>
                          setExamResult({
                            contactId: inscrit.contact_id,
                            type,
                            value: "admis",
                            formationType:
                              inscrit.contact?.formation ||
                              session?.formation_type ||
                              "VTC",
                          })
                        }
                      >
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Réussi
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2 border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() =>
                          setExamResult({
                            contactId: inscrit.contact_id,
                            type,
                            value: "ajourne",
                            formationType:
                              inscrit.contact?.formation ||
                              session?.formation_type ||
                              "VTC",
                          })
                        }
                      >
                        <XCircle className="h-3 w-3 mr-0.5" />
                        Échoué
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admis list */}
          {(admisInscrits?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-success uppercase tracking-wide">
                Réussi ({admisInscrits?.length})
              </p>
              <div className="space-y-1.5">
                {admisInscrits?.map((inscrit) => (
                  <div
                    key={inscrit.contact_id}
                    className="flex items-center justify-between p-2 rounded-lg border border-success/20 bg-success/5"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="text-sm">
                        {inscrit.contact?.prenom} {inscrit.contact?.nom}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 text-primary"
                        onClick={() =>
                          handleSendFelicitations(
                            inscrit.contact_id,
                            inscrit.contact,
                            type
                          )
                        }
                      >
                        <Send className="h-3 w-3 mr-0.5" />
                        Féliciter
                      </Button>
                      {type === "theorie" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-2 text-info"
                          onClick={() =>
                            handleReprogrammer(
                              inscrit.contact_id,
                              `${inscrit.contact?.prenom} ${inscrit.contact?.nom}`,
                              "pratique"
                            )
                          }
                        >
                          <Car className="h-3 w-3 mr-0.5" />
                          → Pratique
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ajourné list */}
          {(ajourneInscrits?.length ?? 0) > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
                Échoué ({ajourneInscrits?.length})
              </p>
              <div className="space-y-1.5">
                {ajourneInscrits?.map((inscrit) => (
                  <div
                    key={inscrit.contact_id}
                    className="flex items-center justify-between p-2 rounded-lg border border-destructive/20 bg-destructive/5"
                  >
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-destructive" />
                      <span className="text-sm">
                        {inscrit.contact?.prenom} {inscrit.contact?.nom}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2 text-warning"
                      onClick={() =>
                        handleReprogrammer(
                          inscrit.contact_id,
                          `${inscrit.contact?.prenom} ${inscrit.contact?.nom}`,
                          type
                        )
                      }
                    >
                      <RotateCcw className="h-3 w-3 mr-0.5" />
                      Reprogrammer
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {renderExamBlock(
        "theorie",
        theorieStats,
        <GraduationCap className="h-4 w-4 text-info" />,
        "Théorie"
      )}
      {renderExamBlock(
        "pratique",
        pratiqueStats,
        <Car className="h-4 w-4 text-warning" />,
        "Pratique"
      )}

      {/* Reprogrammation dialog */}
      <Dialog open={reprogramDialogOpen} onOpenChange={setReprogramDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reprogrammer {reprogramTarget?.contactName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Inscrire à une prochaine session{" "}
              {reprogramTarget?.type === "theorie" ? "théorique" : "pratique"} :
            </p>
            <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir une session à venir..." />
              </SelectTrigger>
              <SelectContent>
                {futureSessions.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    Aucune session à venir
                  </div>
                ) : (
                  futureSessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex flex-col">
                        <span className="text-sm">{s.nom}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(s.date_debut).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              className="w-full"
              onClick={handleConfirmReprogrammation}
              disabled={!selectedSessionId || addInscription.isPending}
            >
              {addInscription.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Confirmer l'inscription
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <EmailComposerModal {...composerProps} />
    </div>
  );
}
