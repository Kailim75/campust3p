import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Award, 
  Loader2, 
  FileText,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { useSessions } from "@/hooks/useSessions";
import { useQueryClient } from "@tanstack/react-query";

interface AttestationGeneratorDialogProps {
  contactId: string;
  contact?: {
    nom: string;
    prenom: string;
    formation?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ATTESTATION_TYPES = [
  { value: "formation", label: "Attestation de formation", description: "Attestation standard de fin de formation" },
  { value: "mobilite", label: "Attestation de mobilité", description: "Pour les formations de mobilité géographique" },
  { value: "competences", label: "Attestation de compétences", description: "Certification des compétences acquises" },
];

const FORMATION_TYPES = [
  { value: "INIT-TAXI", label: "Formation Initiale TAXI" },
  { value: "INIT-VTC", label: "Formation Initiale VTC" },
  { value: "INIT-VMDTR", label: "Formation Initiale VMDTR" },
  { value: "FC-TAXI", label: "Formation Continue TAXI" },
  { value: "FC-VTC", label: "Formation Continue VTC" },
  { value: "FC-VMDTR", label: "Formation Continue VMDTR" },
  { value: "MOB-TAXI-75", label: "Mobilité TAXI Paris (75)" },
  { value: "MOB-TAXI-92", label: "Mobilité TAXI Hauts-de-Seine (92)" },
];

export function AttestationGeneratorDialog({
  contactId,
  contact,
  open,
  onOpenChange,
}: AttestationGeneratorDialogProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCertificate, setGeneratedCertificate] = useState<{ id: string; numero: string } | null>(null);
  
  // Form state
  const [attestationType, setAttestationType] = useState<string>("formation");
  const [formationType, setFormationType] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  
  const queryClient = useQueryClient();
  const { centreFormation: centre } = useCentreFormation();
  const { data: sessions = [] } = useSessions();
  
  // Pre-fill formation type from contact
  useEffect(() => {
    if (contact?.formation) {
      setFormationType(contact.formation);
      
      // Auto-detect attestation type from formation
      if (contact.formation.startsWith("MOB-")) {
        setAttestationType("mobilite");
      }
    }
  }, [contact]);
  
  // Filter sessions for this contact
  const contactSessions = sessions.filter(session => {
    // Check if contact is enrolled in this session
    // For now, show all sessions of matching formation type
    return !formationType || session.formation_type === formationType;
  });
  
  const handleGenerate = async () => {
    if (!contactId) {
      toast.error("Contact non spécifié");
      return;
    }
    
    setIsGenerating(true);
    try {
      // Call the RPC to create certificate
      const { data, error } = await supabase.rpc("create_attestation_certificate", {
        p_contact_id: contactId,
        p_session_id: sessionId || null,
        p_type_attestation: attestationType,
        p_metadata: {
          formation_type: formationType,
          notes,
          generated_by: "manual",
          centre_id: centre?.id,
        },
      });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const cert = data[0];
        setGeneratedCertificate({
          id: cert.id,
          numero: cert.numero_certificat,
        });
        
        queryClient.invalidateQueries({ queryKey: ["contact-certificates", contactId] });
        toast.success(`Attestation ${cert.numero_certificat} générée avec succès`);
      }
    } catch (error) {
      console.error("Erreur génération:", error);
      toast.error("Erreur lors de la génération de l'attestation");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClose = () => {
    setGeneratedCertificate(null);
    setAttestationType("formation");
    setFormationType(contact?.formation || "");
    setSessionId("");
    setNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Générer une nouvelle attestation
          </DialogTitle>
          <DialogDescription>
            Créez une attestation pour {contact?.prenom} {contact?.nom}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="flex-1 overflow-auto pr-4">
          {generatedCertificate ? (
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Attestation générée !</h3>
                <p className="text-muted-foreground mt-1">
                  Numéro de certificat :
                </p>
                <code className="text-lg font-mono font-bold text-primary mt-2 block">
                  {generatedCertificate.numero}
                </code>
              </div>
              <p className="text-sm text-muted-foreground">
                L'attestation a été ajoutée au dossier du stagiaire.
                Vous pouvez maintenant l'éditer ou la télécharger.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Type d'attestation */}
              <div className="space-y-2">
                <Label>Type d'attestation</Label>
                <div className="grid grid-cols-1 gap-2">
                  {ATTESTATION_TYPES.map(type => (
                    <button
                      key={type.value}
                      type="button"
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        attestationType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setAttestationType(type.value)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{type.label}</span>
                        {attestationType === type.value && (
                          <CheckCircle className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {type.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Formation */}
              <div className="space-y-2">
                <Label>Formation concernée</Label>
                <Select value={formationType} onValueChange={setFormationType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une formation" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATION_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {contact?.formation && (
                  <p className="text-xs text-muted-foreground">
                    Formation du profil : {contact.formation}
                  </p>
                )}
              </div>
              
              {/* Session (optionnel) */}
              <div className="space-y-2">
                <Label>Session de formation (optionnel)</Label>
                <Select 
                  value={sessionId || "none"} 
                  onValueChange={(val) => setSessionId(val === "none" ? "" : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune session</SelectItem>
                    {contactSessions.map(session => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.nom} ({format(new Date(session.date_debut), "dd/MM/yyyy")})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Associer à une session permet de lier l'attestation au parcours de formation
                </p>
              </div>
              
              {/* Notes */}
              <div className="space-y-2">
                <Label>Notes internes (optionnel)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes additionnelles..."
                  rows={2}
                />
              </div>
              
              {/* Centre info */}
              {centre && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="font-medium">{centre.nom_commercial || centre.nom_legal}</p>
                  <p className="text-muted-foreground text-xs">{centre.adresse_complete}</p>
                  {centre.nda && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      NDA: {centre.nda}
                    </Badge>
                  )}
                </div>
              )}
              
              {!formationType && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning-foreground text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Veuillez sélectionner une formation pour générer l'attestation</span>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="flex-shrink-0">
          {generatedCertificate ? (
            <Button onClick={handleClose}>
              Fermer
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !formationType}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Générer l'attestation
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
