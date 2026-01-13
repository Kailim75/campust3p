import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Mail, Check } from "lucide-react";
import { toast } from "sonner";
import { type EmailTemplate, replaceTemplateVariables } from "@/hooks/useEmailTemplates";

interface EmailTemplatePreviewDialogProps {
  template: EmailTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Valeurs de test par défaut
const defaultTestValues: Record<string, string> = {
  civilite: "Monsieur",
  nom: "DUPONT",
  prenom: "Jean",
  email: "jean.dupont@email.com",
  telephone: "06 12 34 56 78",
  formation_type: "VTC",
  date_debut: "15/02/2026",
  date_fin: "28/02/2026",
  lieu: "123 Avenue de la Formation, 75001 Paris",
  formateur: "M. Martin",
  numero_facture: "FAC-2026-0001",
  montant: "1 500",
  montant_restant: "750",
  date_echeance: "01/03/2026",
  type_carte: "VTC",
  date_expiration: "15/06/2026",
  type_formation: "Formation continue VTC",
  liste_documents: "- Pièce d'identité\n- Justificatif de domicile\n- Photo d'identité",
  nouvelle_date: "01/03/2026",
};

export function EmailTemplatePreviewDialog({
  template,
  open,
  onOpenChange,
}: EmailTemplatePreviewDialogProps) {
  const [testValues, setTestValues] = useState<Record<string, string>>(defaultTestValues);
  const [copied, setCopied] = useState(false);

  if (!template) return null;

  const previewSubject = replaceTemplateVariables(template.sujet, testValues);
  const previewContent = replaceTemplateVariables(template.contenu, testValues);

  const handleCopy = () => {
    navigator.clipboard.writeText(`Sujet: ${previewSubject}\n\n${previewContent}`);
    setCopied(true);
    toast.success("Contenu copié");
    setTimeout(() => setCopied(false), 2000);
  };

  const updateTestValue = (key: string, value: string) => {
    setTestValues((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {template.nom}
          </DialogTitle>
          <DialogDescription>
            Prévisualisation du modèle avec les variables remplacées
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="preview" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
            <TabsTrigger value="variables">Variables de test</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="border rounded-lg overflow-hidden">
              {/* En-tête email */}
              <div className="bg-muted/50 p-4 border-b space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16">De :</span>
                  <span className="font-medium">formation@votrecentre.fr</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16">À :</span>
                  <span className="font-medium">{testValues.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-16">Sujet :</span>
                  <span className="font-semibold">{previewSubject}</span>
                </div>
              </div>

              {/* Corps email */}
              <ScrollArea className="h-[350px]">
                <div className="p-6 whitespace-pre-wrap text-sm leading-relaxed">
                  {previewContent}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="variables" className="mt-4">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Modifiez les valeurs pour tester le rendu du modèle
                </p>
                
                {template.variables.map((variable) => (
                  <div key={variable} className="grid grid-cols-3 gap-2 items-center">
                    <Label className="text-sm font-mono">
                      <Badge variant="secondary" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    </Label>
                    <Input
                      className="col-span-2"
                      value={testValues[variable] || ""}
                      onChange={(e) => updateTestValue(variable, e.target.value)}
                      placeholder={`Valeur pour ${variable}`}
                    />
                  </div>
                ))}

                {template.variables.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Ce modèle ne contient pas de variables
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copier le contenu
              </>
            )}
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
