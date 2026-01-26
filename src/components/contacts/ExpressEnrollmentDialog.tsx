import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { useCreateContact } from "@/hooks/useContacts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

interface ExpressEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (contactId: string) => void;
}

const FORMATION_TYPES = [
  { value: "TAXI", label: "Formation Taxi", color: "bg-yellow-500" },
  { value: "VTC", label: "Formation VTC", color: "bg-blue-500" },
  { value: "VMDTR", label: "Formation VMDTR", color: "bg-purple-500" },
];

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
    formation: "",
    sessionId: "",
    // Step 3: Billing
    financement: "personnel",
    notes: "",
  });

  const { data: sessions = [] } = useSessions();
  const createContact = useCreateContact();
  const queryClient = useQueryClient();

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

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Reset session when formation changes
    if (field === "formation") {
      setFormData(prev => ({ ...prev, sessionId: "" }));
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.prenom.trim() && formData.nom.trim() && (formData.email.trim() || formData.telephone.trim());
      case 2: return formData.formation && formData.sessionId;
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
        formation: formData.formation as any,
        statut: "En attente de validation",
        commentaires: formData.notes.trim() || null,
      });

      // 2. Create inscription directly
      if (contactResult?.id && formData.sessionId) {
        const { error: inscError } = await supabase
          .from("session_inscriptions")
          .insert({
            contact_id: contactResult.id,
            session_id: formData.sessionId,
            statut: "en_attente",
          });
        
        if (inscError) {
          console.error("Inscription error:", inscError);
          toast.error("Contact créé mais erreur lors de l'inscription à la session");
        }
        
        queryClient.invalidateQueries({ queryKey: ["session-inscrits"] });
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

                <div className="space-y-2">
                  <Label>Type de formation *</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATION_TYPES.map((type) => (
                      <Card
                        key={type.value}
                        className={cn(
                          "cursor-pointer transition-all hover:shadow-md",
                          formData.formation === type.value 
                            ? "ring-2 ring-primary bg-primary/5" 
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => updateField("formation", type.value)}
                      >
                        <CardContent className="p-3 text-center">
                          <div className={cn("w-3 h-3 rounded-full mx-auto mb-2", type.color)} />
                          <p className="text-sm font-medium">{type.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

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
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
              </div>
            )}

            {/* Step 3: Billing & Summary */}
            {step === 3 && (
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
                      <span className="text-muted-foreground">Formation</span>
                      <Badge variant="outline">
                        {FORMATION_TYPES.find(t => t.value === formData.formation)?.label}
                      </Badge>
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
                      <span>{FINANCEMENT_TYPES.find(t => t.value === formData.financement)?.label}</span>
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
