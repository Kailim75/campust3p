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
  GraduationCap,
  Car,
  Send,
  RotateCcw,
  Loader2,
  Lock,
  CreditCard,
  Check,
  Undo2,
  UserX,
} from "lucide-react";
import { useSessionInscrits } from "@/hooks/useSessionInscrits";
import { useInscritsExamResults } from "@/hooks/useInscritsExamResults";
import { useSession, useSessions, useAddInscription } from "@/hooks/useSessions";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import type { EmailRecipient } from "@/components/email/EmailComposerModal";
import { createAutoNote, fetchTodayAutoNotes, isHandledToday, type ActionCategory } from "@/lib/aujourdhui-actions";
import { shouldReactivate } from "@/lib/automationRules";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ReactivationDialog } from "@/components/apprenants/ReactivationDialog";

const CARTE_PRO_KEYWORDS = ["Carte Pro"];
const THEORIE_REUSSI_KEYWORDS = ["théorie réussie"];
const THEORIE_ECHOUE_KEYWORDS = ["théorie échouée"];
const PRATIQUE_REUSSI_KEYWORDS = ["pratique réussie"];
const PRATIQUE_ECHOUE_KEYWORDS = ["pratique échouée"];

interface SessionParcoursTabProps {
  sessionId: string;
}

export function SessionParcoursTab({ sessionId }: SessionParcoursTabProps) {
  const { inscrits, isLoading } = useSessionInscrits(sessionId);
  const { data: session } = useSession(sessionId);
  const { data: allSessions } = useSessions();
  const addInscription = useAddInscription();
  const queryClient = useQueryClient();
  const contactIds = useMemo(() => inscrits?.map((i) => i.contact_id) || [], [inscrits]);
  const { data: examResults = {}, setResult: setExamResult } = useInscritsExamResults(contactIds);
  const { composerProps, openComposer } = useEmailComposer();

  // Fetch today's auto notes for anti-double
  const { data: todayNotes = [] } = useQuery({
    queryKey: ["today-auto-notes-parcours"],
    queryFn: fetchTodayAutoNotes,
    staleTime: 30_000,
  });

  const [reprogramDialogOpen, setReprogramDialogOpen] = useState(false);
  const [reprogramTarget, setReprogramTarget] = useState<{
    contactId: string;
    contactName: string;
    type: "theorie" | "pratique";
  } | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [showLockedDialog, setShowLockedDialog] = useState(false);
  // Reactivation dialog state
  const [reactivationTarget, setReactivationTarget] = useState<{
    id: string; prenom: string; nom: string; statut_apprenant: any;
  } | null>(null);
  const [pendingReprogramAfterReactivation, setPendingReprogramAfterReactivation] = useState<{
    contactId: string; contactName: string; type: "theorie" | "pratique";
  } | null>(null);

  // Compute théorie counters
  const theorieStats = useMemo(() => {
    const stats = { pending: 0, admis: 0, ajourne: 0, absent: 0 };
    contactIds.forEach((id) => {
      const r = examResults[id]?.theorie;
      if (r === "admis") stats.admis++;
      else if (r === "ajourne") stats.ajourne++;
      else if (r === "absent") stats.absent++;
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
    const stats = { pending: 0, admis: 0, ajourne: 0, absent: 0 };
    pratiqueEligibleIds.forEach((id) => {
      const r = examResults[id]?.pratique;
      if (r === "admis") stats.admis++;
      else if (r === "ajourne") stats.ajourne++;
      else if (r === "absent") stats.absent++;
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

  const invalidateNotes = () => {
    queryClient.invalidateQueries({ queryKey: ["today-auto-notes-parcours"] });
  };

  const handleReprogrammer = (
    contactId: string,
    contactName: string,
    type: "theorie" | "pratique"
  ) => {
    // Check if contact needs reactivation
    const inscrit = inscrits?.find((i) => i.contact_id === contactId);
    const statutApprenant = (inscrit?.contact as any)?.statut_apprenant;
    if (shouldReactivate(statutApprenant)) {
      setReactivationTarget({
        id: contactId,
        prenom: inscrit?.contact?.prenom || "",
        nom: inscrit?.contact?.nom || "",
        statut_apprenant: statutApprenant,
      });
      setPendingReprogramAfterReactivation({ contactId, contactName, type });
      return;
    }
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
            ? "Examen théorique — On repart ensemble sur la prochaine date"
            : "Examen pratique — Nouvelle programmation + plan d'action",
          defaultBody: isTheorie
            ? `Bonjour ${inscrit.contact.prenom},\n\nNous avons bien noté le résultat de votre examen théorique. Rien d'anormal : beaucoup l'obtiennent en 2e tentative.\n\n👉 Prochaine étape : vous êtes inscrit(e) à la session "${targetSession?.nom || ""}" et nous allons revoir ensemble les points qui posent difficulté.\n\nRépondez simplement à ce message avec vos disponibilités, ou dites "OK" et je vous envoie une date.\n\nCordialement,\nÉcole T3P Montrouge`
            : `Bonjour ${inscrit.contact.prenom},\n\nMerci pour votre passage à l'examen pratique. Ce résultat ne remet pas en cause votre réussite future : on va ajuster et repartir rapidement.\n\n👉 Prochaine étape : vous êtes inscrit(e) à la session "${targetSession?.nom || ""}" et on cale un entraînement ciblé sur les points à améliorer.\n\nDites-moi vos disponibilités (2 créneaux) et je m'occupe du reste.\n\nCordialement,\nÉcole T3P Montrouge`,
          autoNoteCategory: isTheorie ? "theorie_reprogrammee" : "pratique_reprogrammee",
          autoNoteExtra: `Reprogrammé → ${targetSession?.nom || ""}`,
          onSuccess: invalidateNotes,
        });
      }

      setReprogramDialogOpen(false);
    } catch {
      toast.error("Erreur lors de l'inscription");
    }
  };

  // ─── Email handlers ───
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
        ? `Bonjour ${contact.prenom},\n\nFélicitations pour votre réussite à l'examen théorique ! 🎉\n\nLa prochaine étape est l'examen pratique. Nous allons vous programmer une session dans les meilleurs délais.\n\nBien cordialement,\nÉcole T3P Montrouge`
        : `Bonjour ${contact.prenom},\n\nFélicitations pour votre réussite à l'examen pratique ! 🎉\n\nVous pouvez maintenant entreprendre les démarches pour obtenir votre carte professionnelle auprès de votre préfecture.\n\nDocuments nécessaires :\n- Attestation de réussite (ci-jointe)\n- Pièce d'identité\n- Justificatif de domicile\n- Photo d'identité\n- Permis de conduire\n\nN'hésitez pas à nous contacter pour toute question.\n\nBien cordialement,\nÉcole T3P Montrouge`,
      autoNoteCategory: isTheorie ? "examen_theorie_reussi" : "examen_pratique_reussi",
      onSuccess: invalidateNotes,
    });
  };

  const handleSendEncouragement = (
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
        ? "Examen théorique — On repart ensemble sur la prochaine date"
        : "Examen pratique — Nouvelle programmation + plan d'action",
      defaultBody: isTheorie
        ? `Bonjour ${contact.prenom},\n\nNous avons bien noté le résultat de votre examen théorique. Rien d'anormal : beaucoup l'obtiennent en 2e tentative.\n\n👉 Prochaine étape : je vous propose de vous reprogrammer sur une nouvelle session et de revoir les points qui posent difficulté.\n\nRépondez simplement à ce message avec vos disponibilités, ou dites "OK" et je vous envoie une date.\n\nCordialement,\nÉcole T3P Montrouge`
        : `Bonjour ${contact.prenom},\n\nMerci pour votre passage à l'examen pratique. Ce résultat ne remet pas en cause votre réussite future : on va ajuster et repartir rapidement.\n\n👉 Prochaine étape : je vous reprogramme sur une nouvelle date et on cale un entraînement ciblé sur les points à améliorer.\n\nDites-moi vos disponibilités (2 créneaux) et je m'occupe du reste.\n\nCordialement,\nÉcole T3P Montrouge`,
      autoNoteCategory: isTheorie ? "examen_theorie_echoue" : "examen_pratique_echoue",
      onSuccess: invalidateNotes,
    });
  };

  const handleSendCartePro = (contactId: string, contact: any) => {
    if (!contact?.email) {
      toast.error("Cet apprenant n'a pas d'email");
      return;
    }
    openComposer({
      recipients: [
        {
          id: contactId,
          email: contact.email,
          prenom: contact.prenom || "",
          nom: contact.nom || "",
        },
      ],
      defaultSubject: "Démarches Carte Professionnelle — Examen pratique réussi",
      defaultBody: `Bonjour ${contact.prenom},\n\nSuite à votre réussite à l'examen pratique, vous pouvez maintenant faire votre demande de carte professionnelle en préfecture.\n\nDocuments nécessaires :\n- Attestation de réussite (ci-jointe)\n- Pièce d'identité en cours de validité\n- Justificatif de domicile de moins de 3 mois\n- 2 photos d'identité\n- Permis de conduire\n\nDélai moyen : 2 à 4 semaines.\n\nN'hésitez pas à nous contacter pour toute question.\n\nCordialement,\nÉcole T3P Montrouge`,
      autoNoteCategory: "carte_pro_envoyee",
      onSuccess: invalidateNotes,
    });
  };

  const handleMarkCarteProDone = async (contactId: string, contactName: string) => {
    await createAutoNote(contactId, "carte_pro_envoyee", "Marqué manuellement");
    toast.success(`Carte Pro marquée envoyée pour ${contactName}`);
    invalidateNotes();
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
        ? `Bonjour ${i.contact!.prenom},\n\nFélicitations pour votre réussite à l'examen théorique ! 🎉\n\nLa prochaine étape est l'examen pratique.\n\nBien cordialement,\nÉcole T3P Montrouge`
        : `Bonjour ${i.contact!.prenom},\n\nFélicitations pour votre réussite à l'examen pratique ! 🎉\n\nVous pouvez maintenant faire votre demande de carte professionnelle en préfecture.\n\nBien cordialement,\nÉcole T3P Montrouge`,
    }));
    openComposer({
      recipients,
      defaultSubject: isTheorie
        ? "🎉 Félicitations — Examen théorique réussi !"
        : "🎉 Félicitations — Examen pratique réussi !",
      defaultBody: "Contenu personnalisé par apprenant",
      autoNoteCategory: isTheorie ? "examen_theorie_reussi" : "examen_pratique_reussi",
      onSuccess: invalidateNotes,
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

  // ─── Théorie block ───
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
    const absentInscrits = inscrits?.filter(
      (i) => examResults[i.contact_id]?.theorie === "absent"
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
          <div className="grid grid-cols-4 gap-2">
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
            <div className="text-center p-2 rounded-lg bg-warning/10">
              <p className="text-lg font-bold text-warning">{theorieStats.absent}</p>
              <p className="text-[10px] text-warning">Absent</p>
            </div>
          </div>

          {renderPendingList(pendingInscrits, "theorie")}
          {renderAdmisList(admisInscrits, "theorie")}
          {renderAjourneList(ajourneInscrits, "theorie")}
          {renderAbsentList(absentInscrits, "theorie")}
        </CardContent>
      </Card>
    );
  };

  // ─── Pratique block ───
  const renderPratiqueBlock = () => {
    const eligibleInscrits = inscrits?.filter(
      (i) => pratiqueEligibleIds.includes(i.contact_id)
    );
    const lockedInscritsLocal = inscrits?.filter(
      (i) => pratiqueLockedIds.includes(i.contact_id)
    );
    const lockedCount = lockedInscritsLocal?.length || 0;

    const pendingInscrits = eligibleInscrits?.filter(
      (i) => !examResults[i.contact_id]?.pratique
    );
    const admisInscrits = eligibleInscrits?.filter(
      (i) => examResults[i.contact_id]?.pratique === "admis"
    );
    const ajourneInscrits = eligibleInscrits?.filter(
      (i) => examResults[i.contact_id]?.pratique === "ajourne"
    );
    const absentInscrits = eligibleInscrits?.filter(
      (i) => examResults[i.contact_id]?.pratique === "absent"
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
          <div className="grid grid-cols-4 gap-2">
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
            <div className="text-center p-2 rounded-lg bg-warning/10">
              <p className="text-lg font-bold text-warning">{pratiqueStats.absent}</p>
              <p className="text-[10px] text-warning">Absent</p>
            </div>
          </div>

          {(eligibleInscrits?.length ?? 0) === 0 && lockedCount > 0 && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted text-muted-foreground border text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              Aucun apprenant éligible — {lockedCount} en attente de la théorie
            </div>
          )}

          {renderPendingList(pendingInscrits, "pratique")}
          {renderAdmisList(admisInscrits, "pratique")}
          {renderAjourneList(ajourneInscrits, "pratique")}
          {renderAbsentList(absentInscrits, "pratique")}
        </CardContent>
      </Card>
    );
  };

  // ─── Pending list ───
  const renderPendingList = (
    students: typeof inscrits | undefined,
    type: "theorie" | "pratique"
  ) => {
    if (!students?.length) return null;
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] px-2 border-warning text-warning hover:bg-warning/10"
                  onClick={() =>
                    setExamResult({
                      contactId: inscrit.contact_id,
                      type,
                      value: "absent",
                      formationType:
                        inscrit.contact?.formation ||
                        session?.formation_type ||
                        "VTC",
                    })
                  }
                >
                  <UserX className="h-3 w-3 mr-0.5" />
                  Absent
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ─── Admis list with smart CTAs ───
  const renderAdmisList = (
    students: typeof inscrits | undefined,
    type: "theorie" | "pratique"
  ) => {
    if (!students?.length) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-success uppercase tracking-wide">
          Réussi ({students.length})
        </p>
        <div className="space-y-1.5">
          {students.map((inscrit) => {
            const carteProSent = isHandledToday(inscrit.contact_id, todayNotes, CARTE_PRO_KEYWORDS);
            const feliciteSent = isHandledToday(
              inscrit.contact_id,
              todayNotes,
              type === "theorie" ? THEORIE_REUSSI_KEYWORDS : PRATIQUE_REUSSI_KEYWORDS
            );
            return (
              <div
                key={inscrit.contact_id}
                className="flex flex-col p-2 rounded-lg border border-success/20 bg-success/5 gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <span className="text-sm">
                      {inscrit.contact?.prenom} {inscrit.contact?.nom}
                    </span>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Annuler le résultat "Réussi" pour ${inscrit.contact?.prenom} ${inscrit.contact?.nom} ?`)) {
                          setExamResult({
                            contactId: inscrit.contact_id,
                            type,
                            value: null,
                            formationType:
                              inscrit.contact?.formation ||
                              session?.formation_type ||
                              "VTC",
                          });
                        }
                      }}
                    >
                      <Undo2 className="h-3 w-3 mr-0.5" />
                      Corriger
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-primary"
                              disabled={feliciteSent}
                              onClick={() =>
                                handleSendFelicitations(
                                  inscrit.contact_id,
                                  inscrit.contact,
                                  type
                                )
                              }
                            >
                              <Send className="h-3 w-3 mr-0.5" />
                              {feliciteSent ? "Envoyé ✓" : "Féliciter"}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {feliciteSent && (
                          <TooltipContent>Déjà fait aujourd'hui</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
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
                        Programmer pratique
                      </Button>
                    )}
                    {type === "pratique" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-2 text-warning"
                          onClick={() => handleSendCartePro(inscrit.contact_id, inscrit.contact)}
                        >
                          <CreditCard className="h-3 w-3 mr-0.5" />
                          Démarches Carte Pro
                        </Button>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-[10px] px-2 text-muted-foreground"
                                  disabled={carteProSent}
                                  onClick={() => handleMarkCarteProDone(
                                    inscrit.contact_id,
                                    `${inscrit.contact?.prenom} ${inscrit.contact?.nom}`
                                  )}
                                >
                                  <Check className="h-3 w-3 mr-0.5" />
                                  {carteProSent ? "Envoyé ✓" : "Marquer envoyé"}
                                </Button>
                              </span>
                            </TooltipTrigger>
                            {carteProSent && (
                              <TooltipContent>Déjà marqué aujourd'hui</TooltipContent>
                            )}
                          </Tooltip>
                        </TooltipProvider>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Ajourné list with smart CTAs ───
  const renderAjourneList = (
    students: typeof inscrits | undefined,
    type: "theorie" | "pratique"
  ) => {
    if (!students?.length) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-destructive uppercase tracking-wide">
          Échoué ({students.length})
        </p>
        <div className="space-y-1.5">
          {students.map((inscrit) => {
            const encourageSent = isHandledToday(
              inscrit.contact_id,
              todayNotes,
              type === "theorie" ? THEORIE_ECHOUE_KEYWORDS : PRATIQUE_ECHOUE_KEYWORDS
            );
            return (
            <div
              key={inscrit.contact_id}
              className="flex flex-col p-2 rounded-lg border border-destructive/20 bg-destructive/5 gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span className="text-sm">
                    {inscrit.contact?.prenom} {inscrit.contact?.nom}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Annuler le résultat "Échoué" pour ${inscrit.contact?.prenom} ${inscrit.contact?.nom} ?`)) {
                        setExamResult({
                          contactId: inscrit.contact_id,
                          type,
                          value: null,
                          formationType:
                            inscrit.contact?.formation ||
                            session?.formation_type ||
                            "VTC",
                        });
                      }
                    }}
                  >
                    <Undo2 className="h-3 w-3 mr-0.5" />
                    Corriger
                  </Button>
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
                  {inscrit.contact?.email && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-[10px] px-2 text-primary"
                              disabled={encourageSent}
                              onClick={() =>
                                handleSendEncouragement(
                                  inscrit.contact_id,
                                  inscrit.contact,
                                  type
                                )
                              }
                            >
                              <Send className="h-3 w-3 mr-0.5" />
                              {encourageSent ? "Envoyé ✓" : "Encourager"}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {encourageSent && (
                          <TooltipContent>Déjà fait aujourd'hui</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Absent list ───
  const renderAbsentList = (
    students: typeof inscrits | undefined,
    type: "theorie" | "pratique"
  ) => {
    if (!students?.length) return null;
    return (
      <div className="space-y-1">
        <p className="text-xs font-semibold text-warning uppercase tracking-wide">
          Absent ({students.length})
        </p>
        <div className="space-y-1.5">
          {students.map((inscrit) => (
            <div
              key={inscrit.contact_id}
              className="flex flex-col p-2 rounded-lg border border-warning/20 bg-warning/5 gap-1.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-warning" />
                  <span className="text-sm">
                    {inscrit.contact?.prenom} {inscrit.contact?.nom}
                  </span>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-[10px] px-2 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Annuler le statut "Absent" pour ${inscrit.contact?.prenom} ${inscrit.contact?.nom} ?`)) {
                        setExamResult({
                          contactId: inscrit.contact_id,
                          type,
                          value: null,
                          formationType:
                            inscrit.contact?.formation ||
                            session?.formation_type ||
                            "VTC",
                        });
                      }
                    }}
                  >
                    <Undo2 className="h-3 w-3 mr-0.5" />
                    Corriger
                  </Button>
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
              </div>
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

      {/* Reactivation dialog for terminated students */}
      {reactivationTarget && (
        <ReactivationDialog
          open={!!reactivationTarget}
          onOpenChange={(open) => {
            if (!open) {
              setReactivationTarget(null);
              setPendingReprogramAfterReactivation(null);
            }
          }}
          contact={reactivationTarget}
          onReactivated={() => {
            setReactivationTarget(null);
            if (pendingReprogramAfterReactivation) {
              const { contactId, contactName, type } = pendingReprogramAfterReactivation;
              setPendingReprogramAfterReactivation(null);
              setReprogramTarget({ contactId, contactName, type });
              setSelectedSessionId("");
              setReprogramDialogOpen(true);
            }
          }}
        />
      )}
    </div>
  );
}
