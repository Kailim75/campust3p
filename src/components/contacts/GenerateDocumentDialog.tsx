import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FileText,
  File,
  Download,
  Save,
  Loader2,
  GraduationCap,
  FolderOpen,
  ScrollText,
  Award,
} from "lucide-react";
import { useDocumentTemplates, replaceVariables } from "@/hooks/useDocumentTemplates";
import { useDocumentTemplateFiles, useSaveGeneratedDocument } from "@/hooks/useDocumentTemplateFiles";
import { useDocumentGenerator } from "@/hooks/useDocumentGenerator";
import { useSessions } from "@/hooks/useSessions";
import { useAttestationCertificates } from "@/hooks/useAttestationCertificates";
import { Contact } from "@/hooks/useContacts";
import { toast } from "sonner";
import jsPDF from "jspdf";

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  contact,
}: GenerateDocumentDialogProps) {
  const [selectedTemplateType, setSelectedTemplateType] = useState<"text" | "file">("text");
  const [selectedTextTemplate, setSelectedTextTemplate] = useState<string>("");
  const [selectedFileTemplate, setSelectedFileTemplate] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [saveToContact, setSaveToContact] = useState(true);
  const [generateCertificate, setGenerateCertificate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: textTemplates = [] } = useDocumentTemplates();
  const { data: fileTemplates = [] } = useDocumentTemplateFiles();
  const { data: sessions = [] } = useSessions();
  const saveDocument = useSaveGeneratedDocument();
  const { generateDocument } = useDocumentGenerator();
  const { getOrCreateCertificate, updateDocumentUrl } = useAttestationCertificates();

  // Filtrer les sessions auxquelles le contact est inscrit
  const contactSessions = useMemo(() => {
    return sessions; // Pour simplifier, on affiche toutes les sessions
  }, [sessions]);

  const selectedSession = useMemo(() => {
    if (!selectedSessionId) return null;
    return sessions.find((s) => s.id === selectedSessionId);
  }, [selectedSessionId, sessions]);

  const activeTextTemplates = textTemplates.filter((t) => t.actif);
  const activeFileTemplates = fileTemplates.filter((t) => t.actif);

  const handleGenerateFromText = async () => {
    const template = textTemplates.find((t) => t.id === selectedTextTemplate);
    if (!template) {
      toast.error("Veuillez sélectionner un modèle");
      return;
    }

    setIsGenerating(true);
    try {
      // Générer le certificat si demandé
      let certificateData: { id: string; numero_certificat: string; date_emission: string } | null = null;
      if (generateCertificate) {
        certificateData = await getOrCreateCertificate({
          contactId: contact.id,
          sessionId: selectedSessionId || null,
          typeAttestation: template.type_document === 'attestation_mobilite' ? 'mobilite' : 'formation',
          metadata: { template_id: template.id, template_name: template.nom },
        });
      }

      // Préparer les données du contact
      const contactData: Record<string, string> = {
        civilite: contact.civilite || "",
        nom: contact.nom || "",
        prenom: contact.prenom || "",
        email: contact.email || "",
        telephone: contact.telephone || "",
        rue: contact.rue || "",
        code_postal: contact.code_postal || "",
        ville: contact.ville || "",
        date_naissance: contact.date_naissance || "",
        ville_naissance: contact.ville_naissance || "",
        pays_naissance: contact.pays_naissance || "",
        numero_permis: contact.numero_permis || "",
        prefecture_permis: contact.prefecture_permis || "",
        date_delivrance_permis: contact.date_delivrance_permis || "",
        numero_carte_professionnelle: contact.numero_carte_professionnelle || "",
        prefecture_carte: contact.prefecture_carte || "",
        date_expiration_carte: contact.date_expiration_carte || "",
        formation: contact.formation || "",
        numero_certificat: certificateData?.numero_certificat || "",
      };

      // Remplacer les variables
      const content = replaceVariables(template.contenu, contactData, selectedSession || undefined);

      // Générer le PDF
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      
      // Titre
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(template.nom, margin, 25);
      
      // Numéro de certificat si présent
      if (certificateData?.numero_certificat) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`N° Certificat: ${certificateData.numero_certificat}`, margin, 32);
      }
      
      // Contenu
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(content, maxWidth);
      doc.text(lines, margin, certificateData ? 45 : 40);

      // Télécharger
      const fileName = `${template.type_document}_${contact.nom}_${contact.prenom}.pdf`;
      doc.save(fileName);

      // Sauvegarder si demandé
      if (saveToContact) {
        const pdfBlob = doc.output("blob");
        const savedDoc = await saveDocument.mutateAsync({
          contactId: contact.id,
          templateTextId: template.id,
          nom: `${template.type_document} - ${contact.nom} ${contact.prenom}`,
          pdfBlob,
          sessionId: selectedSessionId || undefined,
          metadata: {
            template_name: template.nom,
            generated_at: new Date().toISOString(),
            certificate_number: certificateData?.numero_certificat,
          },
        });

        // Associer l'URL du document au certificat
        if (certificateData && savedDoc?.file_path) {
          await updateDocumentUrl({
            certificateId: certificateData.id,
            documentUrl: savedDoc.file_path,
          });
        }
      }

      toast.success(certificateData 
        ? `Document généré avec certificat ${certificateData.numero_certificat}` 
        : "Document généré avec succès");
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur génération:", error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateFromFile = async () => {
    const template = fileTemplates.find((t) => t.id === selectedFileTemplate);
    if (!template) {
      toast.error("Veuillez sélectionner un modèle");
      return;
    }

    setIsGenerating(true);
    try {
      // Générer le certificat si demandé
      let certificateData: { id: string; numero_certificat: string; date_emission: string } | null = null;
      if (generateCertificate) {
        certificateData = await getOrCreateCertificate({
          contactId: contact.id,
          sessionId: selectedSessionId || null,
          typeAttestation: template.type_document === 'attestation_mobilite' ? 'mobilite' : 'formation',
          metadata: { template_id: template.id, template_name: template.nom },
        });
      }

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text(`Document basé sur: ${template.nom}`, margin, 25);

      // Numéro de certificat si présent
      if (certificateData?.numero_certificat) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`N° Certificat: ${certificateData.numero_certificat}`, margin, 32);
      }

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      let y = certificateData ? 50 : 45;

      // Afficher les données du contact
      const fields = [
        { label: "Civilité", value: contact.civilite },
        { label: "Nom", value: contact.nom },
        { label: "Prénom", value: contact.prenom },
        { label: "Email", value: contact.email },
        { label: "Téléphone", value: contact.telephone },
        { label: "Adresse", value: [contact.rue, contact.code_postal, contact.ville].filter(Boolean).join(", ") },
        { label: "Date de naissance", value: contact.date_naissance },
        { label: "Formation", value: contact.formation },
      ];

      fields.forEach((field) => {
        if (field.value) {
          doc.text(`${field.label}: ${field.value}`, margin, y);
          y += 8;
        }
      });

      if (selectedSession) {
        y += 10;
        doc.setFont("helvetica", "bold");
        doc.text("Session:", margin, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.text(`Nom: ${selectedSession.nom}`, margin, y);
        y += 8;
        doc.text(`Dates: ${selectedSession.date_debut} - ${selectedSession.date_fin}`, margin, y);
        y += 8;
        if (selectedSession.lieu) {
          doc.text(`Lieu: ${selectedSession.lieu}`, margin, y);
        }
      }

      const fileName = `${template.nom}_${contact.nom}_${contact.prenom}.pdf`;
      doc.save(fileName);

      if (saveToContact) {
        const pdfBlob = doc.output("blob");
        const savedDoc = await saveDocument.mutateAsync({
          contactId: contact.id,
          templateFileId: template.id,
          nom: `${template.nom} - ${contact.nom} ${contact.prenom}`,
          pdfBlob,
          sessionId: selectedSessionId || undefined,
          metadata: {
            template_name: template.nom,
            template_type: template.type_fichier,
            generated_at: new Date().toISOString(),
            certificate_number: certificateData?.numero_certificat,
          },
        });

        // Associer l'URL du document au certificat
        if (certificateData && savedDoc?.file_path) {
          await updateDocumentUrl({
            certificateId: certificateData.id,
            documentUrl: savedDoc.file_path,
          });
        }
      }

      toast.success(certificateData 
        ? `Document généré avec certificat ${certificateData.numero_certificat}` 
        : "Document généré avec succès");
      onOpenChange(false);
    } catch (error) {
      console.error("Erreur génération:", error);
      toast.error("Erreur lors de la génération du document");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (selectedTemplateType === "text") {
      handleGenerateFromText();
    } else {
      handleGenerateFromFile();
    }
  };

  const canGenerate =
    (selectedTemplateType === "text" && selectedTextTemplate) ||
    (selectedTemplateType === "file" && selectedFileTemplate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Générer un document pour {contact.prenom} {contact.nom}
          </DialogTitle>
          <DialogDescription>
            Sélectionnez un modèle et une session pour générer un document personnalisé
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6 pb-4">
            {/* Type de modèle */}
            <Tabs
              value={selectedTemplateType}
              onValueChange={(v) => setSelectedTemplateType(v as "text" | "file")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4" />
                  Modèles texte ({activeTextTemplates.length})
                </TabsTrigger>
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Modèles fichiers ({activeFileTemplates.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Sélectionner un modèle texte</Label>
                  <Select value={selectedTextTemplate} onValueChange={setSelectedTextTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un modèle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTextTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            <span>{template.nom}</span>
                            <Badge variant="outline" className="text-xs">
                              {template.type_document}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTextTemplate && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    {(() => {
                      const template = textTemplates.find((t) => t.id === selectedTextTemplate);
                      return template ? (
                        <>
                          <p className="text-sm font-medium">{template.nom}</p>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.categorie}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {template.variables?.length || 0} variables
                            </span>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="file" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label>Sélectionner un modèle fichier</Label>
                  <Select value={selectedFileTemplate} onValueChange={setSelectedFileTemplate}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un modèle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeFileTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center gap-2">
                            {template.type_fichier === "pdf" ? (
                              <FileText className="h-4 w-4 text-red-500" />
                            ) : (
                              <File className="h-4 w-4 text-blue-500" />
                            )}
                            <span>{template.nom}</span>
                            <Badge variant="outline" className="text-xs uppercase">
                              {template.type_fichier}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedFileTemplate && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    {(() => {
                      const template = fileTemplates.find((t) => t.id === selectedFileTemplate);
                      return template ? (
                        <>
                          <div className="flex items-center gap-2">
                            {template.type_fichier === "pdf" ? (
                              <FileText className="h-5 w-5 text-red-500" />
                            ) : (
                              <File className="h-5 w-5 text-blue-500" />
                            )}
                            <p className="text-sm font-medium">{template.nom}</p>
                          </div>
                          {template.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.categorie}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {template.variables?.length || 0} variables
                            </span>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Sélection de session */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Session de formation (optionnel)
              </Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une session..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune session</SelectItem>
                  {contactSessions.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      <div className="flex items-center gap-2">
                        <span>{session.nom}</span>
                        <Badge variant="outline" className="text-xs">
                          {session.formation_type}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Option de certificat */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Générer un certificat unique</p>
                  <p className="text-xs text-muted-foreground">
                    Attribue un numéro de certificat unique et non modifiable (ex: T3P-2026-000123)
                  </p>
                </div>
              </div>
              <Switch checked={generateCertificate} onCheckedChange={setGenerateCertificate} />
            </div>

            {/* Option de sauvegarde */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Sauvegarder dans le dossier contact</p>
                  <p className="text-xs text-muted-foreground">
                    Le document sera accessible depuis l'onglet Documents
                  </p>
                </div>
              </div>
              <Switch checked={saveToContact} onCheckedChange={setSaveToContact} />
            </div>

            {/* Aperçu des données */}
            <div className="space-y-2">
              <Label>Données du contact qui seront utilisées</Label>
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg text-xs">
                <div>
                  <span className="text-muted-foreground">Nom:</span> {contact.nom}
                </div>
                <div>
                  <span className="text-muted-foreground">Prénom:</span> {contact.prenom}
                </div>
                {contact.email && (
                  <div>
                    <span className="text-muted-foreground">Email:</span> {contact.email}
                  </div>
                )}
                {contact.telephone && (
                  <div>
                    <span className="text-muted-foreground">Tél:</span> {contact.telephone}
                  </div>
                )}
                {contact.formation && (
                  <div>
                    <span className="text-muted-foreground">Formation:</span> {contact.formation}
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
            {isGenerating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Générer le document
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
