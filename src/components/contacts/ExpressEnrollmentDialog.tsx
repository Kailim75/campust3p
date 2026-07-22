import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  User,
  GraduationCap,
  Calendar,
  Euro,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Phone,
  Mail,
  FileCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions } from "@/hooks/useSessions";
import { useCreateContact } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { autoQualifyFromFinancing } from "@/hooks/useContractQualification";
import { getCmaPiecesForTrack, getCmaDossierLabelForTrack } from "@/lib/cma-constants";
import { creerFactureExpress } from "@/lib/facture-express";

interface ExpressEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contactId: string) => void;
}

// Catégories principales
const CATEGORIES = [
  { value: "TAXI", label: "Taxi", color: "bg-amber-500", icon: "🚕" },
  { value: "VTC", label: "VTC", color: "bg-blue-500", icon: "🚗" },
  { value: "VMDTR", label: "VMDTR", color: "bg-purple-500", icon: "🛵" },
];

// Types de formation par catégorie
const FORMATION_TYPES_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  TAXI: [
    { value: "initiale", label: "Formation Initiale" },
    { value: "continue", label: "Formation Continue" },
    { value: "passerelle", label: "Passerelle / Mobilité" },
  ],
  VTC: [
    { value: "initiale", label: "Formation Initiale" },
    { value: "continue", label: "Formation Continue" },
    { value: "passerelle", label: "Passerelle / Mobilité" },
  ],
  VMDTR: [
    { value: "initiale", label: "Formation Initiale" },
    { value: "passerelle", label: "Mobilité" },
  ],
};

// Formations spécifiques selon catégorie + type
const FORMATIONS_MAP: Record<string, Record<string, { value: string; label: string; description?: string }[]>> = {
  TAXI: {
    initiale: [
      { value: "TAXI", label: "Formation Taxi Initiale", description: "Préparation à l'examen T3P Taxi" },
    ],
    continue: [
      { value: "Formation continue Taxi", label: "Formation Continue Taxi", description: "Recyclage obligatoire tous les 5 ans" },
    ],
    passerelle: [
      { value: "Passerelle VTC vers Taxi", label: "Passerelle VTC → Taxi", description: "Pour les titulaires de carte VTC" },
      { value: "Mobilité Taxi", label: "Mobilité Taxi", description: "Changement de zone d'exploitation" },
    ],
  },
  VTC: {
    initiale: [
      { value: "VTC", label: "Formation VTC Initiale", description: "Préparation à l'examen T3P VTC" },
    ],
    continue: [
      { value: "Formation continue VTC", label: "Formation Continue VTC", description: "Recyclage obligatoire tous les 5 ans" },
    ],
    passerelle: [
      { value: "Passerelle Taxi vers VTC", label: "Passerelle Taxi → VTC", description: "Pour les titulaires de carte Taxi" },
      { value: "Mobilité VTC", label: "Mobilité VTC", description: "Changement de zone d'exploitation" },
    ],
  },
  VMDTR: {
    initiale: [
      { value: "VMDTR", label: "Formation VMDTR Initiale", description: "Véhicules Motorisés à 2/3 Roues" },
    ],
    passerelle: [
      { value: "Mobilité VMDTR", label: "Mobilité VMDTR", description: "Changement de zone d'exploitation" },
    ],
  },
};

const FINANCEMENT_TYPES = [
  { value: "personnel", label: "Personnel" },
  { value: "cpf", label: "CPF" },
  { value: "entreprise", label: "Entreprise" },
  { value: "opco", label: "OPCO" },
];

const NB_STEPS = 4;

export function ExpressEnrollmentDialog({ open, onOpenChange, onSuccess }: ExpressEnrollmentDialogProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Identity
    prenom: "",
    nom: "",
    email: "",
    telephone: "",
    // Step 2: Formation
    categorie: "",
    typeFormation: "",
    formation: "",
    sessionId: "",
    // Step 4: Billing
    financement: "personnel",
    notes: "",
  });
  // Step 3 : pièces remises par le stagiaire au bureau (workflow réel de
  // l'équipe, audit d'efficience du 22/07 : « à l'inscription nous cochons
  // tous les documents que l'apprenant nous a fournis »).
  const [piecesFournies, setPiecesFournies] = useState<Set<string>>(new Set());
  // Step 4 : facturation express enchaînée (mêmes règles que la fiche
  // session : prix de la session modifiable, échéance = début de session).
  const [facturer, setFacturer] = useState(true);
  const [montantFacture, setMontantFacture] = useState<string>("");

  const { data: sessions = [] } = useSessions();
  const createContact = useCreateContact();
  const queryClient = useQueryClient();

  // Get available formation types based on selected category
  const availableFormationTypes = useMemo(() => {
    if (!formData.categorie) return [];
    return FORMATION_TYPES_BY_CATEGORY[formData.categorie] || [];
  }, [formData.categorie]);

  // Get available formations based on category + type
  const availableFormations = useMemo(() => {
    if (!formData.categorie || !formData.typeFormation) return [];
    return FORMATIONS_MAP[formData.categorie]?.[formData.typeFormation] || [];
  }, [formData.categorie, formData.typeFormation]);

  // Filter sessions by selected formation
  const availableSessions = useMemo(() => {
    if (!formData.formation) return [];
    return sessions.filter(
      s => s.formation_type === formData.formation &&
           s.statut !== "terminee" &&
           s.statut !== "annulee" &&
           new Date(s.date_debut) >= new Date()
    );
  }, [sessions, formData.formation]);

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.id === formData.sessionId);
  }, [sessions, formData.sessionId]);

  // Pièces attendues selon le parcours (continue = 3 pièces, sinon 5).
  const piecesAttendues = useMemo(
    () => getCmaPiecesForTrack(formData.typeFormation === "continue" ? "continuing" : "initial"),
    [formData.typeFormation],
  );
  const dossierLabel = getCmaDossierLabelForTrack(
    formData.typeFormation === "continue" ? "continuing" : "initial",
  );

  const updateField = (field: string, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Reset dependent fields when parent changes
      if (field === "categorie") {
        newData.typeFormation = "";
        newData.formation = "";
        newData.sessionId = "";
      } else if (field === "typeFormation") {
        newData.formation = "";
        newData.sessionId = "";
      } else if (field === "formation") {
        newData.sessionId = "";
      }
      if (field === "typeFormation") setPiecesFournies(new Set());
      return newData;
    });
  };

  const togglePiece = (type: string) => {
    setPiecesFournies(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const montantDefaut = selectedSession?.prix != null ? String(selectedSession.prix) : "";
  const montantEffectif = montantFacture !== "" ? montantFacture : montantDefaut;

  const canProceed = () => {
    switch (step) {
      case 1: return formData.prenom.trim() && formData.nom.trim() && (formData.email.trim() || formData.telephone.trim());
      case 2: return formData.categorie && formData.typeFormation && formData.formation && formData.sessionId;
      case 3: return true; // les pièces sont facultatives — on coche ce qui est remis
      case 4: return formData.financement && (!facturer || Number(montantEffectif) > 0);
      default: return false;
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      prenom: "",
      nom: "",
      email: "",
      telephone: "",
      categorie: "",
      typeFormation: "",
      formation: "",
      sessionId: "",
      financement: "personnel",
      notes: "",
    });
    setPiecesFournies(new Set());
    setFacturer(true);
    setMontantFacture("");
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    try {
      // 1. Create contact
      const contactResult = await createContact.mutateAsync({
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        email: formData.email.trim() || null,
        telephone: formData.telephone.trim() || null,
        formation: formData.formation as any,
        statut: "En attente de validation",
        commentaires: formData.notes.trim() || null,
      });

      let inscriptionId: string | null = null;

      // 2. Create inscription directly
      if (contactResult?.id && formData.sessionId) {
        const { data: inscData, error: inscError } = await supabase
          .from("session_inscriptions")
          .insert({
            contact_id: contactResult.id,
            session_id: formData.sessionId,
            statut: "en_attente",
          })
          .select("id")
          .single();

        if (inscError) {
          console.error("Inscription error:", inscError);
          toast.error("Contact créé mais erreur lors de l'inscription à la session");
        }
        inscriptionId = inscData?.id ?? null;

        // Auto-qualify contract frame based on financing type
        if (inscData?.id && formData.financement) {
          try {
            await autoQualifyFromFinancing(inscData.id, formData.financement);
          } catch (e) {
            console.warn("Auto-qualification warning:", e);
          }
        }
      }

      // 3. Pièces remises : même écriture que la checklist CMA de la fiche
      // (placeholder contact_documents) — le statut du dossier se met à
      // jour tout seul.
      const nbPieces = piecesFournies.size;
      if (contactResult?.id && nbPieces > 0) {
        const rows = piecesAttendues
          .filter(p => piecesFournies.has(p.type))
          .map(p => ({
            contact_id: contactResult.id,
            type_document: p.type,
            nom: p.label,
            file_path: `cma/${p.type}_${Date.now()}`,
            commentaires: "Reçu à l'inscription (inscription express)",
          }));
        const { error: docsError } = await supabase.from("contact_documents").insert(rows);
        if (docsError) {
          console.error("Pièces error:", docsError);
          toast.error("Inscription créée mais erreur lors de l'enregistrement des pièces");
        }
      }

      // 4. Facturation express optionnelle (émise, TVA exonérée,
      // échéance = début de session).
      let numeroFacture: string | null = null;
      if (facturer && contactResult?.id && inscriptionId && Number(montantEffectif) > 0 && selectedSession) {
        try {
          const facture = await creerFactureExpress({
            contactId: contactResult.id,
            sessionInscriptionId: inscriptionId,
            montant: Number(montantEffectif),
            description: selectedSession.nom,
            dateEcheance: selectedSession.date_debut || null,
            financement: formData.financement as "personnel" | "entreprise" | "cpf" | "opco",
          });
          numeroFacture = facture.numero_facture;
        } catch (e) {
          console.error("Facturation express error:", e);
          toast.error("Inscription créée mais erreur lors de la facturation");
        }
      }

      queryClient.invalidateQueries({ queryKey: ["session-inscrits"] });
      queryClient.invalidateQueries({ queryKey: ["session_inscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["contract-qualification"] });
      queryClient.invalidateQueries({ queryKey: ["contact-documents"] });
      queryClient.invalidateQueries({ queryKey: ["factures"] });
      queryClient.invalidateQueries({ queryKey: ["session-factures"] });
      queryClient.invalidateQueries({ queryKey: ["session-inscrits-sans-facture"] });

      toast.success("Inscription express réussie !", {
        description: [
          `${formData.prenom} ${formData.nom} inscrit`,
          nbPieces > 0 ? `${nbPieces} pièce${nbPieces > 1 ? "s" : ""} enregistrée${nbPieces > 1 ? "s" : ""}` : null,
          numeroFacture ? `Facture ${numeroFacture} émise` : null,
        ].filter(Boolean).join(" · "),
      });
      onSuccess?.(contactResult?.id);
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Express enrollment error:", error);
      toast.error("Erreur lors de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: NB_STEPS }, (_, i) => i + 1).map((s) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
            step >= s
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < NB_STEPS && (
            <ChevronRight className={cn(
              "h-4 w-4 mx-1",
              step > s ? "text-primary" : "text-muted-foreground"
            )} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            Inscription Express
          </DialogTitle>
        </DialogHeader>

        {renderStepIndicator()}

        <ScrollArea className="max-h-[60vh]">
          <div className="px-1">
            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                  <User className="h-4 w-4" />
                  Identité du stagiaire
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      placeholder="Jean"
                      value={formData.prenom}
                      onChange={(e) => updateField("prenom", e.target.value)}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      placeholder="Dupont"
                      value={formData.nom}
                      onChange={(e) => updateField("nom", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone" className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    Téléphone
                  </Label>
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={formData.telephone}
                    onChange={(e) => updateField("telephone", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean.dupont@email.fr"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  * Au moins un moyen de contact (email ou téléphone) est requis
                </p>
              </div>
            )}

            {/* Step 2: Formation & Session */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                  <GraduationCap className="h-4 w-4" />
                  Formation et session
                </div>

                {/* Catégorie principale */}
                <div className="space-y-2">
                  <Label>Catégorie *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <Card
                        key={cat.value}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          formData.categorie === cat.value
                            ? "ring-2 ring-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => updateField("categorie", cat.value)}
                      >
                        <CardContent className="p-3 text-center">
                          <span className="text-xl mb-1 block">{cat.icon}</span>
                          <div className={cn("w-2 h-2 rounded-full mx-auto mb-1", cat.color)} />
                          <p className="text-sm font-medium">{cat.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Type de formation */}
                {formData.categorie && (
                  <div className="space-y-2">
                    <Label>Type de formation *</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableFormationTypes.map((type) => (
                        <Card
                          key={type.value}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            formData.typeFormation === type.value
                              ? "ring-2 ring-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => updateField("typeFormation", type.value)}
                        >
                          <CardContent className="p-2 text-center">
                            <p className="text-xs font-medium">{type.label}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formations disponibles */}
                {formData.typeFormation && (
                  <div className="space-y-2">
                    <Label>Formation *</Label>
                    <div className="space-y-2">
                      {availableFormations.map((formation) => (
                        <Card
                          key={formation.value}
                          className={cn(
                            "cursor-pointer transition-all hover:shadow-md",
                            formData.formation === formation.value
                              ? "ring-2 ring-primary bg-primary/5"
                              : "hover:bg-muted/50"
                          )}
                          onClick={() => updateField("formation", formation.value)}
                        >
                          <CardContent className="p-3">
                            <p className="text-sm font-medium">{formation.label}</p>
                            {formation.description && (
                              <p className="text-xs text-muted-foreground mt-1">{formation.description}</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sessions disponibles */}
                {formData.formation && (
                  <div className="space-y-2">
                    <Label>Session disponible *</Label>
                    {availableSessions.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground bg-muted/30 rounded-lg">
                        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Aucune session disponible</p>
                        <p className="text-xs">pour cette formation</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {availableSessions.map((session) => (
                          <Card
                            key={session.id}
                            className={cn(
                              "cursor-pointer transition-all",
                              formData.sessionId === session.id
                                ? "ring-2 ring-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            )}
                            onClick={() => updateField("sessionId", session.id)}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-sm">{session.nom}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(session.date_debut), "dd MMM yyyy", { locale: fr })}
                                    {session.lieu && ` • ${session.lieu}`}
                                  </p>
                                </div>
                                {session.prix != null && (
                                  <Badge variant="outline" className="shrink-0">
                                    {Number(session.prix).toLocaleString("fr-FR")} €
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Pièces remises */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                  <FileCheck className="h-4 w-4" />
                  Pièces remises aujourd'hui
                </div>
                <p className="text-xs text-muted-foreground">
                  Cochez ce que le stagiaire vous remet : le {dossierLabel.toLowerCase()} se met
                  à jour automatiquement. Le reste pourra être ajouté plus tard depuis sa fiche.
                </p>

                <div className="space-y-2">
                  {piecesAttendues.map((piece) => (
                    <label
                      key={piece.type}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                        piecesFournies.has(piece.type)
                          ? "border-primary/40 bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <Checkbox
                        checked={piecesFournies.has(piece.type)}
                        onCheckedChange={() => togglePiece(piece.type)}
                      />
                      <span className="text-sm">{piece.label}</span>
                    </label>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground">
                  {piecesFournies.size}/{piecesAttendues.length} pièce{piecesAttendues.length > 1 ? "s" : ""} —
                  {piecesFournies.size === piecesAttendues.length
                    ? " dossier complet dès l'inscription 🎉"
                    : " les manquantes resteront signalées sur la fiche."}
                </p>
              </div>
            )}

            {/* Step 4: Billing & Summary */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-4">
                  <Euro className="h-4 w-4" />
                  Financement et récapitulatif
                </div>

                <div className="space-y-2">
                  <Label>Mode de financement</Label>
                  <Select value={formData.financement} onValueChange={(v) => updateField("financement", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCEMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Facturation express enchaînée */}
                <div className="rounded-lg border p-3 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox checked={facturer} onCheckedChange={(c) => setFacturer(!!c)} />
                    <span className="text-sm font-medium">Émettre la facture maintenant</span>
                  </label>
                  {facturer && (
                    <div className="flex items-center gap-2 pl-7">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32"
                        value={montantEffectif}
                        onChange={(e) => setMontantFacture(e.target.value)}
                      />
                      <span className="text-sm text-muted-foreground">
                        € — échéance au début de session, aucun email envoyé.
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (optionnel)</Label>
                  <Input
                    id="notes"
                    placeholder="Informations complémentaires..."
                    value={formData.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                  />
                </div>

                <Separator className="my-4" />

                {/* Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Récapitulatif</h4>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Stagiaire</span>
                      <span className="font-medium">{formData.prenom} {formData.nom}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Catégorie</span>
                      <Badge variant="outline">
                        {CATEGORIES.find(c => c.value === formData.categorie)?.label}
                      </Badge>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Formation</span>
                      <span className="text-right text-sm font-medium">
                        {availableFormations.find(f => f.value === formData.formation)?.label || formData.formation}
                      </span>
                    </div>

                    {selectedSession && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Session</span>
                        <span className="text-right">
                          <p className="font-medium">{selectedSession.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(selectedSession.date_debut), "dd/MM/yyyy", { locale: fr })}
                          </p>
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pièces remises</span>
                      <span>{piecesFournies.size}/{piecesAttendues.length}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Financement</span>
                      <span>{FINANCEMENT_TYPES.find(t => t.value === formData.financement)?.label}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Facture</span>
                      <span>
                        {facturer && Number(montantEffectif) > 0
                          ? `${Number(montantEffectif).toLocaleString("fr-FR")} € émise à la validation`
                          : "plus tard"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
            >
              Retour
            </Button>
          )}

          {step < NB_STEPS ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="flex-1 sm:flex-none"
            >
              Continuer
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Inscription...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Valider l'inscription
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
