import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Mail
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSessions } from "@/hooks/useSessions";
import { useCreateContact, type ContactInsert } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { autoQualifyFromFinancing } from "@/hooks/useContractQualification";

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
    // Step 3: Billing
    financement: "personnel",
    notes: "",
  });

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessions.filter(
      s => s.formation_type === formData.formation && 
           s.statut !== "terminee" && 
           s.statut !== "annulee" &&
           new Date(s.date_fin || s.date_debut) >= today
    );
  }, [sessions, formData.formation]);

  const selectedSession = useMemo(() => {
    return sessions.find(s => s.id === formData.sessionId);
  }, [sessions, formData.sessionId]);
  const selectedCategory = useMemo(
    () => CATEGORIES.find((category) => category.value === formData.categorie),
    [formData.categorie],
  );
  const selectedFormationType = useMemo(
    () => availableFormationTypes.find((type) => type.value === formData.typeFormation),
    [availableFormationTypes, formData.typeFormation],
  );
  const selectedFormation = useMemo(
    () => availableFormations.find((formation) => formation.value === formData.formation),
    [availableFormations, formData.formation],
  );
  const selectedFinancement = useMemo(
    () => FINANCEMENT_TYPES.find((type) => type.value === formData.financement),
    [formData.financement],
  );
  const contactChecks = useMemo(() => {
    return [
      !formData.prenom.trim() ? "Ajouter le prénom" : null,
      !formData.nom.trim() ? "Ajouter le nom" : null,
      !formData.email.trim() && !formData.telephone.trim() ? "Renseigner au moins un moyen de contact" : null,
    ].filter(Boolean) as string[];
  }, [formData.email, formData.nom, formData.prenom, formData.telephone]);
  const enrollmentChecks = useMemo(() => {
    return [
      !formData.categorie ? "Choisir une catégorie" : null,
      !formData.typeFormation ? "Choisir un type de formation" : null,
      !formData.formation ? "Choisir une formation" : null,
      !formData.sessionId ? "Sélectionner une session" : null,
    ].filter(Boolean) as string[];
  }, [formData.categorie, formData.formation, formData.sessionId, formData.typeFormation]);
  const finalChecks = useMemo(() => {
    return [
      ...contactChecks,
      ...enrollmentChecks,
      !formData.financement ? "Choisir le mode de financement" : null,
    ].filter(Boolean) as string[];
  }, [contactChecks, enrollmentChecks, formData.financement]);

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
      return newData;
    });
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.prenom.trim() && formData.nom.trim() && (formData.email.trim() || formData.telephone.trim());
      case 2: return formData.categorie && formData.typeFormation && formData.formation && formData.sessionId;
      case 3: return formData.financement;
      default: return false;
    }
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
        formation: formData.formation as ContactInsert["formation"],
        statut: "En attente de validation",
        commentaires: formData.notes.trim() || null,
      });

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

        // Auto-qualify contract frame based on financing type
        if (inscData?.id && formData.financement) {
          try {
            await autoQualifyFromFinancing(inscData.id, formData.financement);
          } catch (e) {
            console.warn("Auto-qualification warning:", e);
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ["session-inscrits"] });
        queryClient.invalidateQueries({ queryKey: ["contract-qualification"] });
      }

      toast.success("Inscription express réussie !");
      onSuccess?.(contactResult?.id);
      onOpenChange(false);
      
      // Reset form
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
    } catch (error) {
      console.error("Express enrollment error:", error);
      toast.error("Erreur lors de l'inscription");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
            step >= s 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
          )}>
            {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
          {s < 3 && (
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
          <DialogDescription>
            Créez un apprenant et rattachez-le à une session en quelques étapes, avec un minimum de saisie.
          </DialogDescription>
        </DialogHeader>

        {renderStepIndicator()}

        <ScrollArea className="max-h-[60vh]">
          <div className="px-1">
            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <User className="h-4 w-4" />
                        Identité du stagiaire
                      </div>
                      <p className="mt-2 text-sm font-semibold">Point de départ du dossier</p>
                      <p className="text-xs text-muted-foreground">
                        Renseignez l’identité et au moins un moyen de contact pour pouvoir poursuivre.
                      </p>
                    </div>
                    <Badge variant={contactChecks.length === 0 ? "default" : "secondary"}>
                      {contactChecks.length === 0 ? "Prêt" : `${contactChecks.length} point${contactChecks.length > 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                  {contactChecks.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2">
                      <p className="text-xs font-medium">À compléter :</p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {contactChecks.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
                      Les informations de contact minimales sont renseignées.
                    </div>
                  )}
                </Card>
                
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

                <Card className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">Lecture rapide</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Nom complet</p>
                      <p className="font-medium">
                        {[formData.prenom.trim(), formData.nom.trim()].filter(Boolean).join(" ") || "À renseigner"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Canal disponible</p>
                      <p className="font-medium">
                        {formData.email.trim() && formData.telephone.trim()
                          ? "Email + téléphone"
                          : formData.email.trim()
                            ? "Email"
                            : formData.telephone.trim()
                              ? "Téléphone"
                              : "Aucun"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Step 2: Formation & Session */}
            {step === 2 && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        Formation et session
                      </div>
                      <p className="mt-2 text-sm font-semibold">Orientation du parcours</p>
                      <p className="text-xs text-muted-foreground">
                        Choisissez la filière, le type de parcours puis la session réellement disponible.
                      </p>
                    </div>
                    <Badge variant={enrollmentChecks.length === 0 ? "default" : "secondary"}>
                      {enrollmentChecks.length === 0 ? "Prêt" : `${enrollmentChecks.length} point${enrollmentChecks.length > 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                  {enrollmentChecks.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2">
                      <p className="text-xs font-medium">À compléter :</p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {enrollmentChecks.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
                      Le parcours et la session sont sélectionnés.
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">Parcours retenu</p>
                    <p className="mt-1 text-sm font-semibold">
                      {selectedFormation?.label || selectedFormationType?.label || selectedCategory?.label || "À définir"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.label}` : "Choisir une catégorie"}
                    </p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">Sessions trouvées</p>
                    <p className="mt-1 text-sm font-semibold">{availableSessions.length}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formData.formation ? "pour la formation sélectionnée" : "après choix de la formation"}
                    </p>
                  </Card>
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
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedSession && (
                  <Card className="p-4">
                    <p className="text-xs font-medium text-muted-foreground">Session sélectionnée</p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{selectedSession.nom}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(selectedSession.date_debut), "dd MMM yyyy", { locale: fr })}
                          {selectedSession.lieu ? ` • ${selectedSession.lieu}` : ""}
                        </p>
                      </div>
                      <Badge variant="outline">{selectedFormationType?.label || "Session"}</Badge>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Step 3: Billing & Summary */}
            {step === 3 && (
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        Financement et récapitulatif
                      </div>
                      <p className="mt-2 text-sm font-semibold">Validation de l'inscription</p>
                      <p className="text-xs text-muted-foreground">
                        Définissez le financement et vérifiez le dossier avant création du contact et de l'inscription.
                      </p>
                    </div>
                    <Badge variant={finalChecks.length === 0 ? "default" : "secondary"}>
                      {finalChecks.length === 0 ? "Prêt à valider" : `${finalChecks.length} point${finalChecks.length > 1 ? "s" : ""}`}
                    </Badge>
                  </div>
                  {finalChecks.length > 0 ? (
                    <div className="mt-3 rounded-lg border border-warning/40 bg-warning/5 px-3 py-2">
                      <p className="text-xs font-medium">À vérifier avant validation :</p>
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {finalChecks.map((item) => (
                          <li key={item}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="mt-3 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success-foreground">
                      Le dossier est prêt à être créé et inscrit automatiquement.
                    </div>
                  )}
                </Card>

                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">Mode de financement</p>
                    <p className="mt-1 text-sm font-semibold">{selectedFinancement?.label || "À définir"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">utilisé pour la qualification du contrat</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs font-medium text-muted-foreground">Action automatique</p>
                    <p className="mt-1 text-sm font-semibold">Contact + inscription</p>
                    <p className="mt-1 text-xs text-muted-foreground">avec qualification de financement si possible</p>
                  </Card>
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
                        {selectedCategory?.label}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Formation</span>
                      <span className="text-right text-sm font-medium">
                        {selectedFormation?.label || formData.formation}
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
                      <span className="text-muted-foreground">Financement</span>
                      <span>{selectedFinancement?.label}</span>
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
          
          {step < 3 ? (
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
