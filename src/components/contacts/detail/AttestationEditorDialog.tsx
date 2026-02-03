import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Edit, 
  Eye, 
  Download, 
  Save, 
  Loader2,
  FileText,
  User,
  Calendar,
  GraduationCap,
  Clock,
  Building2,
  Award
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { useContact } from "@/hooks/useContact";
import { useQueryClient } from "@tanstack/react-query";

interface AttestationData {
  // Stagiaire
  civilite: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  paysNaissance: string;
  
  // Formation
  intituleFormation: string;
  typeFormation: string;
  dateDebut: string;
  dateFin: string;
  dureeHeures: number;
  modulesContenus: string;
  
  // Émission
  dateEmission: string;
  numeroCertificat: string;
  
  // Centre
  nomCentre: string;
  adresseCentre: string;
  nda: string;
  qualiopi: string;
}

interface AttestationEditorDialogProps {
  certificate: {
    id: string;
    numero_certificat: string;
    contact_id: string;
    session_id?: string | null;
    type_attestation: string;
    date_emission: string;
    metadata?: any;
    status: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function AttestationEditorDialog({
  certificate,
  open,
  onOpenChange,
}: AttestationEditorDialogProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  
  const queryClient = useQueryClient();
  const { centreFormation: centre } = useCentreFormation();
  const { data: contact } = useContact(certificate.contact_id);
  
  // Form state
  const [formData, setFormData] = useState<AttestationData>({
    civilite: "",
    nom: "",
    prenom: "",
    dateNaissance: "",
    lieuNaissance: "",
    paysNaissance: "France",
    intituleFormation: "",
    typeFormation: "",
    dateDebut: "",
    dateFin: "",
    dureeHeures: 0,
    modulesContenus: "",
    dateEmission: "",
    numeroCertificat: "",
    nomCentre: "",
    adresseCentre: "",
    nda: "",
    qualiopi: "",
  });
  
  // Initialize form data from certificate and contact
  useEffect(() => {
    if (contact && certificate) {
      setFormData(prev => ({
        ...prev,
        civilite: contact.civilite || "Monsieur",
        nom: contact.nom || "",
        prenom: contact.prenom || "",
        dateNaissance: contact.date_naissance || "",
        lieuNaissance: contact.ville_naissance || "",
        paysNaissance: contact.pays_naissance || "France",
        intituleFormation: getFormationLabel(contact.formation),
        typeFormation: contact.formation || "",
        dateEmission: certificate.date_emission ? format(new Date(certificate.date_emission), "yyyy-MM-dd") : "",
        numeroCertificat: certificate.numero_certificat,
        dureeHeures: getDureeFormation(contact.formation),
        modulesContenus: getModulesFormation(contact.formation),
        ...(certificate.metadata || {}),
      }));
    }
  }, [contact, certificate]);
  
  // Initialize centre data
  useEffect(() => {
    if (centre) {
      setFormData(prev => ({
        ...prev,
        nomCentre: centre.nom_commercial || centre.nom_legal || "",
        adresseCentre: centre.adresse_complete || "",
        nda: centre.nda || "",
        qualiopi: centre.qualiopi_numero || "",
      }));
    }
  }, [centre]);
  
  const updateField = (field: keyof AttestationData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update certificate metadata
      const { error } = await supabase
        .from("attestation_certificates")
        .update({
          metadata: {
            ...formData,
            lastModified: new Date().toISOString(),
          },
        })
        .eq("id", certificate.id);
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["contact-certificates", certificate.contact_id] });
      toast.success("Attestation mise à jour");
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      // Import the new attestation PDF generator with full branding
      const { downloadAttestationPDF } = await import("@/lib/attestation-pdf-generator");
      
      // Build organisme info from centre data
      const organismeInfo = {
        nom: formData.nomCentre,
        nomCommercial: formData.nomCentre,
        adresse: formData.adresseCentre,
        telephone: centre?.telephone || "",
        email: centre?.email || "",
        siret: centre?.siret || "",
        nda: formData.nda,
        qualiopiNumero: formData.qualiopi,
        logoUrl: centre?.logo_url,
        signatureCachetUrl: centre?.signature_cachet_url,
        responsableLegal: {
          nom: centre?.responsable_legal_nom || "Le Responsable",
          fonction: centre?.responsable_legal_fonction || "Directeur pédagogique",
        },
        ville: formData.adresseCentre.split(",")[0]?.trim() || "Paris",
      };
      
      // Generate and download PDF with full branding
      await downloadAttestationPDF(
        {
          civilite: formData.civilite,
          nom: formData.nom,
          prenom: formData.prenom,
          dateNaissance: formData.dateNaissance,
          lieuNaissance: formData.lieuNaissance,
          paysNaissance: formData.paysNaissance,
          intituleFormation: formData.intituleFormation,
          typeFormation: formData.typeFormation,
          dateDebut: formData.dateDebut,
          dateFin: formData.dateFin,
          dureeHeures: formData.dureeHeures,
          modulesContenus: formData.modulesContenus,
          dateEmission: formData.dateEmission || new Date().toISOString(),
          numeroCertificat: formData.numeroCertificat,
        },
        organismeInfo
      );
      
      toast.success("PDF généré avec succès - Charte graphique appliquée");
    } catch (error) {
      console.error("Erreur génération PDF:", error);
      toast.error("Erreur lors de la génération du PDF");
    } finally {
      setIsGeneratingPdf(false);
    }
  };
  
  // Preview content
  const previewContent = useMemo(() => {
    const dateEmission = formData.dateEmission 
      ? format(new Date(formData.dateEmission), "dd MMMM yyyy", { locale: fr })
      : format(new Date(), "dd MMMM yyyy", { locale: fr });
    
    return `
${formData.nomCentre}
${formData.adresseCentre}
${formData.nda ? `N° Déclaration d'activité : ${formData.nda}` : ""}
${formData.qualiopi ? `Certification Qualiopi : ${formData.qualiopi}` : ""}

═══════════════════════════════════════════

ATTESTATION DE FIN DE FORMATION
N° ${formData.numeroCertificat}

═══════════════════════════════════════════

Je soussigné(e), représentant(e) de ${formData.nomCentre}, certifie que :

${formData.civilite} ${formData.prenom} ${formData.nom}
${formData.dateNaissance ? `Né(e) le ${format(new Date(formData.dateNaissance), "dd MMMM yyyy", { locale: fr })} à ${formData.lieuNaissance} (${formData.paysNaissance})` : ""}

A suivi avec succès la formation :

${formData.intituleFormation}

${formData.dateDebut && formData.dateFin ? `Du ${format(new Date(formData.dateDebut), "dd/MM/yyyy")} au ${format(new Date(formData.dateFin), "dd/MM/yyyy")}` : ""}
Durée : ${formData.dureeHeures} heures

${formData.modulesContenus ? `Contenu pédagogique :\n${formData.modulesContenus.split("\n").map(m => `• ${m}`).join("\n")}` : ""}

Fait le ${dateEmission}

Le Responsable pédagogique
[Signature et cachet]
    `.trim();
  }, [formData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Éditer l'attestation
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'attestation {certificate.numero_certificat}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "edit" | "preview")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Édition
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Prévisualisation
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="edit" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(60vh-80px)] pr-4">
              <div className="space-y-6 py-4">
                {/* Stagiaire section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                    <User className="h-4 w-4" />
                    Identité du stagiaire
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Civilité</Label>
                      <Select value={formData.civilite} onValueChange={(v) => updateField("civilite", v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Civilité" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monsieur">Monsieur</SelectItem>
                          <SelectItem value="Madame">Madame</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Prénom</Label>
                      <Input
                        value={formData.prenom}
                        onChange={(e) => updateField("prenom", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nom</Label>
                      <Input
                        value={formData.nom}
                        onChange={(e) => updateField("nom", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date de naissance</Label>
                      <Input
                        type="date"
                        value={formData.dateNaissance}
                        onChange={(e) => updateField("dateNaissance", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lieu de naissance</Label>
                      <Input
                        value={formData.lieuNaissance}
                        onChange={(e) => updateField("lieuNaissance", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Pays de naissance</Label>
                      <Input
                        value={formData.paysNaissance}
                        onChange={(e) => updateField("paysNaissance", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Formation section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                    <GraduationCap className="h-4 w-4" />
                    Formation
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type de formation</Label>
                      <Select value={formData.typeFormation} onValueChange={(v) => {
                        updateField("typeFormation", v);
                        updateField("intituleFormation", getFormationLabel(v));
                        updateField("dureeHeures", getDureeFormation(v));
                        updateField("modulesContenus", getModulesFormation(v));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMATION_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Intitulé de la formation</Label>
                      <Input
                        value={formData.intituleFormation}
                        onChange={(e) => updateField("intituleFormation", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Date de début</Label>
                      <Input
                        type="date"
                        value={formData.dateDebut}
                        onChange={(e) => updateField("dateDebut", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date de fin</Label>
                      <Input
                        type="date"
                        value={formData.dateFin}
                        onChange={(e) => updateField("dateFin", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Durée (heures)</Label>
                      <Input
                        type="number"
                        value={formData.dureeHeures}
                        onChange={(e) => updateField("dureeHeures", parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Modules / Contenu pédagogique</Label>
                    <Textarea
                      value={formData.modulesContenus}
                      onChange={(e) => updateField("modulesContenus", e.target.value)}
                      rows={4}
                      placeholder="Un module par ligne..."
                    />
                  </div>
                </div>
                
                <Separator />
                
                {/* Émission section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                    <Calendar className="h-4 w-4" />
                    Émission
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date d'émission</Label>
                      <Input
                        type="date"
                        value={formData.dateEmission}
                        onChange={(e) => updateField("dateEmission", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Numéro de certificat</Label>
                      <Input
                        value={formData.numeroCertificat}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                {/* Centre section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase">
                    <Building2 className="h-4 w-4" />
                    Centre de formation
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nom du centre</Label>
                      <Input
                        value={formData.nomCentre}
                        onChange={(e) => updateField("nomCentre", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse</Label>
                      <Input
                        value={formData.adresseCentre}
                        onChange={(e) => updateField("adresseCentre", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>N° Déclaration d'activité (NDA)</Label>
                      <Input
                        value={formData.nda}
                        onChange={(e) => updateField("nda", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Certification Qualiopi</Label>
                      <Input
                        value={formData.qualiopi}
                        onChange={(e) => updateField("qualiopi", e.target.value)}
                        placeholder="En cours"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="preview" className="flex-1 overflow-hidden">
            <ScrollArea className="h-[calc(60vh-80px)]">
              <div className="border rounded-lg p-6 bg-background font-serif">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed">
                  {previewContent}
                </pre>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="secondary" onClick={handleGeneratePdf} disabled={isGeneratingPdf}>
            {isGeneratingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Télécharger PDF
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
function getFormationLabel(type: string | null | undefined): string {
  const types: Record<string, string> = {
    "TAXI": "Formation TAXI",
    "VTC": "Formation VTC",
    "VMDTR": "Formation VMDTR",
    "INIT-TAXI": "Formation Initiale Chauffeur de Taxi",
    "INIT-VTC": "Formation Initiale Conducteur de VTC",
    "INIT-VMDTR": "Formation Initiale VMDTR",
    "FC-TAXI": "Formation Continue Chauffeur de Taxi",
    "FC-VTC": "Formation Continue Conducteur de VTC",
    "FC-VMDTR": "Formation Continue VMDTR",
    "MOB-TAXI-75": "Formation Mobilité TAXI - Paris (75)",
    "MOB-TAXI-92": "Formation Mobilité TAXI - Hauts-de-Seine (92)",
  };
  return types[type || ""] || type || "Formation professionnelle";
}

function getDureeFormation(type: string | null | undefined): number {
  const durees: Record<string, number> = {
    "INIT-TAXI": 250,
    "INIT-VTC": 250,
    "INIT-VMDTR": 33,
    "FC-TAXI": 14,
    "FC-VTC": 14,
    "FC-VMDTR": 14,
    "MOB-TAXI-75": 14,
    "MOB-TAXI-92": 14,
    "TAXI": 250,
    "VTC": 250,
    "VMDTR": 33,
  };
  return durees[type || ""] || 0;
}

function getModulesFormation(type: string | null | undefined): string {
  const modules: Record<string, string> = {
    "INIT-TAXI": `Réglementation du transport public de personnes
Gestion d'entreprise
Sécurité routière
Développement commercial
Langue française
Langue anglaise
Réglementation nationale TAXI
Réglementation locale`,
    "INIT-VTC": `Réglementation du transport public de personnes
Gestion d'entreprise
Sécurité routière
Développement commercial
Langue française
Langue anglaise
Réglementation nationale VTC`,
    "FC-TAXI": `Actualisation des connaissances réglementaires
Sécurité routière
Gestion de la relation client
Prévention des risques`,
    "FC-VTC": `Actualisation des connaissances réglementaires
Sécurité routière
Gestion de la relation client
Prévention des risques`,
    "MOB-TAXI-75": `Réglementation locale Paris (75)
Topographie locale
Tarification parisienne
Stations et emplacements`,
    "MOB-TAXI-92": `Réglementation locale Hauts-de-Seine (92)
Topographie départementale
Spécificités locales`,
  };
  return modules[type || ""] || "";
}
