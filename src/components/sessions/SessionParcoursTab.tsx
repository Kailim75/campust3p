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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  XCircle,
  Clock,
  GraduationCap,
  Car,
  Send,
  RotateCcw,
  Loader2,
  Lock,
  Eye,
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
  const [showLockedDialog, setShowLockedDialog] = useState(false);

  // Compute théorie counters (unchanged)
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

  // Compute pratique counters — ONLY for théorie-admis students
  const pratiqueEligibleIds = useMemo(() => {
    return contactIds.filter((id) => examResults[id]?.theorie === "admis");
  }, [contactIds, examResults]);

  const pratiqueLockedIds = useMemo(() => {
    return contactIds.filter((id) => examResults[id]?.theorie !== "admis");
  }, [contactIds, examResults]);

  const pratiqueStats = useMemo(() => {
    const stats = { pending: 0, admis: 0, ajourne: 0 };
    pratiqueEligibleIds.forEach((id) => {
      const r = examResults[id]?.pratique;
      if (r === "admis") stats.admis++;
      else if (r === "ajourne") stats.ajourne++;
      else stats.pending++;
    });
    return stats;
  }, [pratiqueEligibleIds, examResults]);

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
    const sourceIds = type === "pratique" ? pratiqueEligibleIds : contactIds;
    const admisInscrits = inscrits?.filter(
      (i) => sourceIds.includes(i.contact_id) && examResults[i.contact_id]?.[type] === "admis" && i.contact?.email
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

  const renderTheorieBlock = () => {
    const pendingInscrits = inscrits?.filter(
      (i) => !examResults[i.contact_id]?.theorie
    );
    const admisInscrits = inscrits?.filter(
      (i) => examResults[i.contact_id]?.theorie === "admis"
    );
    const ajourneInscrits = inscrits?.filter(
      (i) => examResults[i.contact_id]?.theorie === "ajourne"
    );

    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-info" />
              Théorie
            </div>
            {theorieStats.admis > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-success text-success hover:bg-success/10"
                onClick={() => handleBulkFelicitations("theorie")}
              >
                <Send className="h-3 w-3" />
                Féliciter ({theorieStats.admis})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-muted-foreground">{theorieStats.pending}</p>
              <p className="text-[10px] text-muted-foreground">En attente</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-success/10">
              <p className="text-lg font-bold text-success">{theorieStats.admis}</p>
              <p className="text-[10px] text-success">Réussi</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10">
              <p className="text-lg font-bold text-destructive">{theorieStats.ajourne}</p>
              <p className="text-[10px] text-destructive">Échoué</p>
            </div>
          </div>

          {renderStudentList(pendingInscrits, "theorie", "pending")}
          {renderStudentList(admisInscrits, "theorie", "admis")}
          {renderStudentList(ajourneInscrits, "theorie", "ajourne")}
        </CardContent>
      </Card>
    );
  };

  const renderPratiqueBlock = () => {
    const eligibleInscrits = inscrits?.filter(
      (i) => pratiqueEligibleIds.includes(i.contact_id)
    );
    const lockedInscrits = inscrits?.filter(
      (i) => pratiqueLockedIds.includes(i.contact_id)
    );
    const lockedCount = lockedInscrits?.length || 0;

    const pendingInscrits = eligibleInscrits?.filter(
      (i) => !examResults[i.contact_id]?.pratique
    );
    const admisInscrits = eligibleInscrits?.filter(
      (i) => examResults[i.contact_id]?.pratique === "admis"
    );
    const ajourneInscrits = eligibleInscrits?.filter(
      (i) => examResults[i.contact_id]?.pratique === "ajourne"
    );

    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-warning" />
              Pratique
              {lockedCount > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2 gap-1 text-muted-foreground"
                        onClick={() => setShowLockedDialog(true)}
                      >
                        <Lock className="h-3 w-3" />
                        {lockedCount} verrouillé{lockedCount > 1 ? "s" : ""}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Théorie non validée — non éligibles à la pratique
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {pratiqueStats.admis > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 border-success text-success hover:bg-success/10"
                onClick={() => handleBulkFelicitations("pratique")}
              >
                <Send className="h-3 w-3" />
                Féliciter ({pratiqueStats.admis})
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-muted-foreground">{pratiqueStats.pending}</p>
              <p className="text-[10px] text-muted-foreground">En attente</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-success/10">
              <p className="text-lg font-bold text-success">{pratiqueStats.admis}</p>
              <p className="text-[10px] text-success">Réussi</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-destructive/10">
              <p className="text-lg font-bold text-destructive">{pratiqueStats.ajourne}</p>
              <p className="text-[10px] text-destructive">Échoué</p>
            </div>
          </div>

          {(eligibleInscrits?.length ?? 0) === 0 && lockedCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground border text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              Aucun apprenant éligible — {lockedCount} en attente de la théorie
            </div>
          )}

          {renderStudentList(pendingInscrits, "pratique", "pending")}
          {renderStudentList(admisInscrits, "pratique", "admis")}
          {renderStudentList(ajourneInscrits, "pratique", "ajourne")}
        </CardContent>
      </Card>
    );
  };

  const renderStudentList = (
    students: typeof inscrits | undefined,
    type: "theorie" | "pratique",
    status: "pending" | "admis" | "ajourne"
  ) => {
    if (!students?.length) return null;

    if (status === "pending") {
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            À traiter ({students.length})
          </p>
          <div className="space-y-1.5">
            {students.map((inscrit) => (
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
                    onClick={() => {
                      setExamResult({
                        contactId: inscrit.contact_id,
                        type,
                        value: "admis",
                        formationType:
                          inscrit.contact?.formation ||
                          session?.formation_type ||
                          "VTC",
                      });
                      if (type === "theorie") {
                        toast.success(
                          `${inscrit.contact?.prenom} ${inscrit.contact?.nom} → Déplacé vers Pratique`
                        );
                      }
                    }}
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
      );
    }

    if (status === "admis") {
      return (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-success uppercase tracking-wide">
            Réussi ({students.length})
          </p>
          <div className="space-y-1.5">
            {students.map((inscrit) => (
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
      );
    }

    // ajourne
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
          Échoué ({students.length})
        </p>
        <div className="space-y-1.5">
          {students.map((inscrit) => (
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
    );
  };

  const lockedInscrits = inscrits?.filter(
    (i) => pratiqueLockedIds.includes(i.contact_id)
  );

  return (
    <div className="space-y-4">
      {renderTheorieBlock()}
      {renderPratiqueBlock()}

      {/* Locked students dialog */}
      <Dialog open={showLockedDialog} onOpenChange={setShowLockedDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Apprenants verrouillés ({lockedInscrits?.length || 0})
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-3">
            Ces apprenants doivent d'abord réussir la théorie pour accéder à la pratique.
          </p>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
            {lockedInscrits?.map((inscrit) => {
              const theorieResult = examResults[inscrit.contact_id]?.theorie;
              return (
                <div
                  key={inscrit.contact_id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">
                        {`${inscrit.contact?.prenom?.[0] || ""}${inscrit.contact?.nom?.[0] || ""}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {inscrit.contact?.prenom} {inscrit.contact?.nom}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {theorieResult === "ajourne" ? "Échoué" : "En attente"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

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
