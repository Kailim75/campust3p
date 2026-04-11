import { useState, useMemo, useEffect } from "react";
import { autoQualifyFromFinancing } from "@/hooks/useContractQualification";
import type { FinancementType } from "@/hooks/useFactures";
import { getUserCentreId } from "@/utils/getCentreId";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserCheck, GraduationCap, Calendar, Users, Loader2,
  CheckCircle2, Sparkles, ArrowRight, FileText, Eye,
  LayoutDashboard, ChevronLeft, AlertTriangle, Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions, useAllSessionInscriptionsCounts } from "@/hooks/useSessions";
import { type Prospect } from "@/hooks/useProspects";
import { useDuplicateCheck, type DuplicateContact } from "@/hooks/useDuplicateCheck";
import type { SoftDeleteTable } from "@/hooks/useSoftDelete";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { getFormationColor, getFormationLabel } from "@/constants/formationColors";

const VALID_FORMATIONS = [
  "ACC VTC", "ACC VTC 75", "Formation continue Taxi",
  "Formation continue VTC", "Mobilité Taxi", "TAXI", "VMDTR", "VTC",
];

const FINANCEMENT_OPTIONS = [
  { value: "personnel", label: "Financement personnel" },
  { value: "cpf", label: "CPF" },
  { value: "pole_emploi", label: "Pôle Emploi" },
  { value: "entreprise", label: "Entreprise / OPCO" },
  { value: "autre", label: "Autre" },
] satisfies ReadonlyArray<{ value: SmartFinancementType; label: string }>;

type Step = "dedup" | "recommend" | "confirm" | "success";
type SmartFinancementType = FinancementType | "pole_emploi" | "autre";
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
type ProspectUpdate = Database["public"]["Tables"]["prospects"]["Update"];
type SoftDeleteTarget = Extract<SoftDeleteTable, "contacts" | "session_inscriptions" | "factures">;
type ConversionStage = "contact" | "inscription" | "facture" | "prospect_update";
type RankedSession = Database["public"]["Tables"]["sessions"]["Row"] & {
  filled: number;
  fillRate: number;
  matchesFormation: boolean | null;
  score: number;
};

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

function isPostgrestErrorLike(error: unknown): error is PostgrestErrorLike {
  return typeof error === "object" && error !== null;
}

function mapFinancementToFactureType(financement: SmartFinancementType): FinancementType {
  if (financement === "pole_emploi" || financement === "autre") {
    // Fallback conservateur: le schéma facture ne supporte pas encore ces deux cas.
    return "personnel";
  }

  return financement;
}

function getConversionErrorMessage(stage: ConversionStage, error: unknown) {
  if (isPostgrestErrorLike(error) && error.code === "23505") {
    if (stage === "inscription") {
      return "Ce stagiaire est déjà inscrit à cette session";
    }

    if (stage === "contact") {
      return "Un contact similaire existe déjà ou ne peut pas être créé";
    }
  }

  switch (stage) {
    case "contact":
      return "Impossible de créer la fiche apprenant";
    case "inscription":
      return "Impossible de créer l'inscription à la session";
    case "facture":
      return "Impossible de générer la facture brouillon";
    case "prospect_update":
      return "La conversion a échoué lors de la mise à jour du prospect";
    default:
      return "Erreur lors de la conversion";
  }
}

interface SmartConversionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospect: Prospect | null;
  onViewFiche?: (contactId: string) => void;
  onReturnDashboard?: () => void;
}

export function SmartConversionDialog({
  open,
  onOpenChange,
  prospect,
  onViewFiche,
  onReturnDashboard,
}: SmartConversionDialogProps) {
  const [step, setStep] = useState<Step>("dedup");
  const [selectedSession, setSelectedSession] = useState<RankedSession | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [financement, setFinancement] = useState<SmartFinancementType>("personnel");
  const [genererConvention, setGenererConvention] = useState(true);
  const [creerFacture, setCreerFacture] = useState(true);
  const [createdContactId, setCreatedContactId] = useState<string | null>(null);
  const [createdSessionName, setCreatedSessionName] = useState("");
  const [linkedContactId, setLinkedContactId] = useState<string | null>(null);

  const { data: sessions = [], isLoading } = useSessions();
  const { data: inscriptionsCounts = {} } = useAllSessionInscriptionsCounts();
  const { duplicates, isChecking, checkDuplicates, clearDuplicates } = useDuplicateCheck();
  const queryClient = useQueryClient();

  const invalidateConversionQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["prospects"] });
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-inscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["factures"] });
    queryClient.invalidateQueries({ queryKey: ["generated-docs-v2"] });
  };

  const rollbackPartialConversion = async ({
    factureId,
    inscriptionId,
    contactId,
  }: {
    factureId: string | null;
    inscriptionId: string | null;
    contactId: string | null;
  }) => {
    const targets: Array<{ table: SoftDeleteTarget; id: string }> = [];

    if (factureId) {
      targets.push({ table: "factures", id: factureId });
    }
    if (inscriptionId) {
      targets.push({ table: "session_inscriptions", id: inscriptionId });
    }
    if (contactId) {
      targets.push({ table: "contacts", id: contactId });
    }

    const failures: string[] = [];

    for (const target of targets) {
      const { error } = await supabase.rpc("soft_delete_record", {
        p_table_name: target.table,
        p_record_id: target.id,
        p_reason: "Rollback conversion automatique après erreur",
      });

      if (error) {
        failures.push(`${target.table}: ${error.message}`);
      }
    }

    if (targets.length > 0) {
      invalidateConversionQueries();
    }

    return failures;
  };

  // Run dedup check when dialog opens
  useEffect(() => {
    if (open && prospect) {
      checkDuplicates(prospect.nom, prospect.prenom, prospect.email || undefined);
      setStep("dedup");
      setLinkedContactId(null);
    }
  }, [open, prospect, checkDuplicates]);

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      setTimeout(() => {
        setStep("dedup");
        setSelectedSession(null);
        setShowAllSessions(false);
        setIsSubmitting(false);
        setFinancement("personnel");
        setGenererConvention(true);
        setCreerFacture(true);
        setCreatedContactId(null);
        setLinkedContactId(null);
        clearDuplicates();
      }, 200);
    }
    onOpenChange(o);
  };

  // Skip dedup step if no duplicates found
  useEffect(() => {
    if (step === "dedup" && !isChecking && duplicates.length === 0 && open && prospect) {
      setStep("recommend");
    }
  }, [step, isChecking, duplicates, open, prospect]);

  const handleLinkExisting = async (contactId: string) => {
    if (!prospect) return;
    setIsSubmitting(true);
    try {
      // Link prospect to existing contact
      const updates: ProspectUpdate = {
        statut: "converti",
        converted_contact_id: contactId,
      };
      await supabase
        .from("prospects")
        .update(updates)
        .eq("id", prospect.id);

      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Prospect associé au contact existant");
      handleOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'association");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipDedup = () => {
    setStep("recommend");
  };

  // Compute ranked sessions
  const rankedSessions = useMemo(() => {
    if (!prospect) return [];
    return sessions
      .filter((s) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const hasNotEnded = new Date(s.date_fin || s.date_debut) >= today;
        const isActive = s.statut === "a_venir" || s.statut === "en_cours";
        const filled = inscriptionsCounts[s.id] || 0;
        const hasSpace = filled < (s.places_totales || 0);
        return hasNotEnded && isActive && hasSpace;
      })
      .map((s) => {
        const filled = inscriptionsCounts[s.id] || 0;
        const fillRate = s.places_totales > 0 ? Math.round((filled / s.places_totales) * 100) : 0;
        const matchesFormation = prospect.formation_souhaitee && s.formation_type === prospect.formation_souhaitee;
        const score = (matchesFormation ? 100 : 0) + fillRate;
        return { ...s, filled, fillRate, matchesFormation, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [sessions, inscriptionsCounts, prospect]);

  const recommended = rankedSessions[0] || null;
  const otherSessions = rankedSessions.slice(1);

  const handleSelectRecommended = () => {
    if (recommended) {
      setSelectedSession(recommended);
      setStep("confirm");
    }
  };

  const handleSelectOther = (session: RankedSession) => {
    setSelectedSession(session);
    setShowAllSessions(false);
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!prospect || !selectedSession) return;
    setIsSubmitting(true);

    let currentStage: ConversionStage = "contact";
    let newContactId: string | null = null;
    let newInscriptionId: string | null = null;
    let newFactureId: string | null = null;

    try {
      // 1. Create contact
      const centreId = await getUserCentreId();
      const contactData: ContactInsert = {
        centre_id: centreId,
        nom: prospect.nom,
        prenom: prospect.prenom,
        telephone: prospect.telephone,
        email: prospect.email,
        statut: "En attente de validation",
        source: prospect.source || "Prospect converti",
      };

      if (prospect.formation_souhaitee && VALID_FORMATIONS.includes(prospect.formation_souhaitee)) {
        contactData.formation = prospect.formation_souhaitee as Database["public"]["Enums"]["formation_type"];
      }

      const { data: contact, error: contactError } = await supabase
        .from("contacts")
        .insert(contactData)
        .select("id")
        .single();

      if (contactError) throw contactError;
      newContactId = contact.id;

      // 2. Enroll in session
      currentStage = "inscription";
      const { data: inscription, error: inscriptionError } = await supabase
        .from("session_inscriptions")
        .insert({
          session_id: selectedSession.id,
          contact_id: contact.id,
          statut: "inscrit",
        })
        .select("id")
        .single();

      if (inscriptionError) throw inscriptionError;
      newInscriptionId = inscription.id;

      // 3. Auto-create facture if checked
      if (creerFacture) {
        currentStage = "facture";
        const { data: numeroFacture, error: numeroFactureError } = await supabase.rpc("generate_numero_facture");

        if (numeroFactureError) throw numeroFactureError;
        if (!numeroFacture) throw new Error("Aucun numéro de facture n'a été généré");

        const { data: facture, error: factureError } = await supabase
          .from("factures")
          .insert({
            centre_id: centreId,
            contact_id: contact.id,
            session_inscription_id: inscription.id,
            numero_facture: numeroFacture,
            montant_total: selectedSession.prix || 0,
            type_financement: mapFinancementToFactureType(financement),
            statut: "brouillon",
            date_emission: new Date().toISOString().split("T")[0],
            commentaires: `Facture auto - ${selectedSession.nom}`,
          })
          .select("id")
          .single();

        if (factureError) throw factureError;
        newFactureId = facture.id;
      }

      // 4. Update prospect
      currentStage = "prospect_update";
      const { error: prospectUpdateError } = await supabase
        .from("prospects")
        .update({ statut: "converti", converted_contact_id: contact.id })
        .eq("id", prospect.id);

      if (prospectUpdateError) throw prospectUpdateError;

      // 5. Try auto-generate Convention + Convocation (non-blocking)
      if (genererConvention) {
        try {
          const { triggerAutoGeneration } = await import("@/lib/auto-generate-documents");

          // 5a. Auto-qualify contract frame from financing
          try {
            await autoQualifyFromFinancing(inscription.id, financement);
          } catch (e) {
            console.warn("Auto-qualification from conversion:", e);
          }

          triggerAutoGeneration({
            contactId: contact.id,
            sessionId: selectedSession.id,
            inscriptionId: inscription.id,
            track: selectedSession.track === "continuing" ? "continuing" : "initial",
            formationType: selectedSession.formation_type,
          }).then((result) => {
            if (result.generated > 0) {
              toast.info(`${result.generated} document(s) auto-généré(s)`, { duration: 4000 });
              queryClient.invalidateQueries({ queryKey: ["generated-docs-v2"] });
            }
            if (result.errors > 0) {
              const firstFailure = result.details.find((detail) => detail.status === "failed");
              toast.warning(`${result.errors} document(s) n'ont pas pu être généré(s)`, {
                description: firstFailure?.message,
                duration: 5000,
              });
              queryClient.invalidateQueries({ queryKey: ["generated-docs-v2"] });
            }
          }).catch((autoGenError) => {
            console.error("Auto-generation error after conversion:", autoGenError);
          });
        } catch {
          /* auto-gen is best-effort */
        }
      }

      // Invalidate
      invalidateConversionQueries();

      setCreatedContactId(contact.id);
      setCreatedSessionName(selectedSession.nom);
      setStep("success");
    } catch (error) {
      console.error("Conversion error:", error);

      const rollbackFailures = await rollbackPartialConversion({
        factureId: newFactureId,
        inscriptionId: newInscriptionId,
        contactId: newContactId,
      });

      toast.error(getConversionErrorMessage(currentStage, error), {
        description: rollbackFailures.length > 0
          ? `Rollback incomplet : ${rollbackFailures.join(" | ")}`
          : "Les créations partielles ont été annulées automatiquement.",
      });

      if (rollbackFailures.length > 0) {
        toast.warning("Certaines données provisoires nécessitent une vérification manuelle.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!prospect) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(
        "overflow-hidden transition-all",
        step === "success" ? "max-w-sm" : "max-w-md"
      )}>
        {/* ─── STEP 0: DEDUP CHECK ─── */}
        {step === "dedup" && (
          <>
            <DialogHeader className="text-center pb-1">
              <DialogTitle className="text-lg flex items-center justify-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                Doublons potentiels détectés
              </DialogTitle>
              <DialogDescription className="text-sm">
                {duplicates.length} contact(s) similaire(s) trouvé(s) pour {prospect.prenom} {prospect.nom}
              </DialogDescription>
            </DialogHeader>

            {isChecking ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {duplicates.map((dup) => (
                  <div key={dup.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{dup.prenom} {dup.nom}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          {dup.email && <span>{dup.email}</span>}
                          {dup.telephone && <span>• {dup.telephone}</span>}
                        </div>
                        {dup.formation && (
                          <Badge variant="outline" className="mt-1 text-xs">{dup.formation}</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {dup.match_type === "email" ? "Email" : dup.match_type === "nom_prenom_naissance" ? "Nom+Date" : "Nom+Prénom"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={isSubmitting}
                      onClick={() => handleLinkExisting(dup.id)}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1.5" />
                      Associer à ce contact
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Annuler
              </Button>
              <Button onClick={handleSkipDedup}>
                <ArrowRight className="h-4 w-4 mr-2" />
                Créer un nouveau contact
              </Button>
            </div>
          </>
        )}

        {/* ─── SCREEN 1: RECOMMENDATION ─── */}
        {step === "recommend" && (
          <>
            <DialogHeader className="text-center pb-1">
              <DialogTitle className="text-lg flex items-center justify-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Convertir {prospect.prenom} {prospect.nom}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {prospect.formation_souhaitee
                  ? `Formation souhaitée : ${prospect.formation_souhaitee}`
                  : "Choisissez la session d'inscription"}
              </DialogDescription>
            </DialogHeader>

            {isLoading ? (
              <div className="space-y-3 pt-2">
                <Skeleton className="h-28 w-full rounded-xl" />
              </div>
            ) : !recommended ? (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Aucune session disponible</p>
                <p className="text-xs mt-1">Créez une session avant de convertir</p>
              </div>
            ) : !showAllSessions ? (
              <div className="space-y-4 pt-2">
                {/* Recommended session card */}
                <div className="relative">
                  <div className="absolute -top-2.5 left-4 z-10">
                    <Badge className="bg-primary text-primary-foreground text-[10px] px-2 py-0.5 shadow-sm">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Session recommandée
                    </Badge>
                  </div>
                  <button
                    onClick={handleSelectRecommended}
                    className={cn(
                      "w-full p-5 pt-6 rounded-xl border-2 border-primary/30 bg-primary/[0.03]",
                      "text-left transition-all hover:border-primary/50 hover:shadow-md group"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground text-base">{recommended.nom}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant="outline" className={cn("text-xs", getFormationColor(recommended.formation_type).badge)}>
                            {getFormationLabel(recommended.formation_type)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(parseISO(recommended.date_debut), "dd MMM yyyy", { locale: fr })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            {recommended.places_totales - recommended.filled} place{recommended.places_totales - recommended.filled > 1 ? "s" : ""} restante{recommended.places_totales - recommended.filled > 1 ? "s" : ""}
                          </span>
                        </div>

                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Remplissage</span>
                            <span className={cn(
                              "font-semibold tabular-nums",
                              recommended.fillRate >= 70 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {recommended.fillRate}%
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                recommended.fillRate >= 70 ? "bg-warning" : "bg-primary/40"
                              )}
                              style={{ width: `${Math.min(recommended.fillRate, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-primary/70 mt-3 italic">
                      {recommended.matchesFormation
                        ? "Correspond à la formation souhaitée"
                        : "Priorité stratégique pour optimiser le remplissage"}
                    </p>
                  </button>
                </div>

                <Button size="lg" className="w-full text-base h-12" onClick={handleSelectRecommended}>
                  <ArrowRight className="h-5 w-5 mr-2" />
                  Assigner à cette session
                </Button>

                {otherSessions.length > 0 && (
                  <Button variant="ghost" className="w-full text-muted-foreground text-sm" onClick={() => setShowAllSessions(true)}>
                    Choisir une autre session ({otherSessions.length} disponible{otherSessions.length > 1 ? "s" : ""})
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-2">
                <Button variant="ghost" size="sm" className="text-muted-foreground mb-1" onClick={() => setShowAllSessions(false)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Retour à la recommandation
                </Button>
                <div className="max-h-[50vh] overflow-y-auto space-y-2">
                  {rankedSessions.map((session) => {
                    const formColor = getFormationColor(session.formation_type);
                    return (
                      <button
                        key={session.id}
                        onClick={() => handleSelectOther(session)}
                        className={cn(
                          "w-full p-3.5 rounded-xl border text-left transition-all",
                          "hover:border-primary/30 hover:bg-primary/[0.03]",
                          formColor.bg, formColor.border
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-sm font-semibold text-foreground truncate">{session.nom}</h4>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(parseISO(session.date_debut), "dd MMM", { locale: fr })}
                              </span>
                              <span className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {session.places_totales - session.filled} places
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={cn(
                              "text-sm font-bold tabular-nums",
                              session.fillRate >= 70 ? "text-warning" : "text-muted-foreground"
                            )}>
                              {session.fillRate}%
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── SCREEN 2: QUICK CONFIRM ─── */}
        {step === "confirm" && selectedSession && (
          <>
            <DialogHeader className="pb-1">
              <Button variant="ghost" size="sm" className="w-fit text-muted-foreground -ml-2 mb-1" onClick={() => setStep("recommend")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Retour
              </Button>
              <DialogTitle className="text-lg">Confirmer la conversion</DialogTitle>
              <DialogDescription>
                <span className="font-medium text-foreground">{prospect.prenom} {prospect.nom}</span>
                {" → "}
                <span className="font-medium text-foreground">{selectedSession.nom}</span>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 pt-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Mode de financement</label>
                <Select value={financement} onValueChange={(v) => setFinancement(v as SmartFinancementType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FINANCEMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tarif</label>
                <div className="h-10 px-3 rounded-md border bg-muted/30 flex items-center text-sm font-medium tabular-nums">
                  {selectedSession.prix ? `${selectedSession.prix.toLocaleString("fr-FR")} €` : "Non défini"}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={genererConvention} onCheckedChange={(c) => setGenererConvention(!!c)} />
                  <span className="text-sm">Générer Convention + Convocation</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox checked={creerFacture} onCheckedChange={(c) => setCreerFacture(!!c)} />
                  <span className="text-sm">Créer la facture brouillon</span>
                </label>
              </div>

              <Button size="lg" className="w-full text-base h-12" onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Conversion...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirmer la conversion
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* ─── SUCCESS SCREEN ─── */}
        {step === "success" && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 p-4 rounded-full bg-success/10 w-fit">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">Apprenant créé</h2>
            <p className="text-sm text-muted-foreground mb-1">
              Session : <span className="font-medium text-foreground">{createdSessionName}</span>
            </p>
            {genererConvention && (
              <p className="text-xs text-muted-foreground">
                Convention et convocation en cours de génération
              </p>
            )}

            <div className="space-y-2 mt-6">
              {creerFacture && (
                <Button className="w-full" onClick={() => { handleOpenChange(false); toast.info("Ouvrez la fiche apprenant pour finaliser la facture"); }}>
                  <FileText className="h-4 w-4 mr-2" />
                  Générer la facture
                </Button>
              )}
              {createdContactId && onViewFiche && (
                <Button variant="outline" className="w-full" onClick={() => { handleOpenChange(false); onViewFiche(createdContactId); }}>
                  <Eye className="h-4 w-4 mr-2" />
                  Voir la fiche apprenant
                </Button>
              )}
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => { handleOpenChange(false); onReturnDashboard?.(); }}>
                <LayoutDashboard className="h-4 w-4 mr-2" />
                Retour au dashboard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
