import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  DocumentTemplate,
  DocumentTemplateInsert,
  documentTypes,
  documentCategories,
  availableVariables,
  extractVariables,
  useCreateDocumentTemplate,
  useUpdateDocumentTemplate,
} from "@/hooks/useDocumentTemplates";

interface DocumentTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DocumentTemplate | null;
}

export function DocumentTemplateFormDialog({
  open,
  onOpenChange,
  template,
}: DocumentTemplateFormDialogProps) {
  const [activeTab, setActiveTab] = useState("edit");
  const createTemplate = useCreateDocumentTemplate();
  const updateTemplate = useUpdateDocumentTemplate();
  const isEditing = !!template;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<DocumentTemplateInsert>({
    defaultValues: {
      nom: "",
      type_document: "convention",
      categorie: "formation",
      contenu: "",
      variables: [],
      actif: true,
      description: "",
    },
  });

  const contenu = watch("contenu");
  const detectedVariables = extractVariables(contenu || "");

  useEffect(() => {
    if (template) {
      reset({
        nom: template.nom,
        type_document: template.type_document,
        categorie: template.categorie,
        contenu: template.contenu,
        variables: template.variables || [],
        actif: template.actif,
        description: template.description || "",
      });
    } else {
      reset({
        nom: "",
        type_document: "convention",
        categorie: "formation",
        contenu: "",
        variables: [],
        actif: true,
        description: "",
      });
    }
  }, [template, reset]);

  const onSubmit = async (data: DocumentTemplateInsert) => {
    // Mettre à jour les variables détectées
    data.variables = detectedVariables;

    if (isEditing && template) {
      await updateTemplate.mutateAsync({ id: template.id, ...data });
    } else {
      await createTemplate.mutateAsync(data);
    }
    onOpenChange(false);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[name="contenu"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentValue = contenu || "";
      const newValue = currentValue.substring(0, start) + `{{${variable}}}` + currentValue.substring(end);
      setValue("contenu", newValue);
      // Remettre le focus
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    } else {
      setValue("contenu", (contenu || "") + `{{${variable}}}`);
    }
    toast.success(`Variable {{${variable}}} ajoutée`);
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(`{{${variable}}}`);
    toast.success(`Variable copiée : {{${variable}}}`);
  };

  const isLoading = createTemplate.isPending || updateTemplate.isPending;

  // Grouper les variables par catégorie
  const variablesByCategory = availableVariables.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, typeof availableVariables[number][]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? "Modifier le modèle" : "Nouveau modèle de document"}
          </DialogTitle>
          <DialogDescription>
            Créez un modèle personnalisable avec des variables dynamiques
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="edit">Édition</TabsTrigger>
              <TabsTrigger value="variables">Variables disponibles</TabsTrigger>
            </TabsList>

            <TabsContent value="edit" className="flex-1 overflow-auto">
              <div className="space-y-4 p-1">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom du modèle *</Label>
                    <Input
                      id="nom"
                      {...register("nom", { required: true })}
                      placeholder="Ex: Convention de formation VTC"
                    />
                    {errors.nom && (
                      <p className="text-sm text-destructive">Le nom est requis</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Type de document</Label>
                    <Select
                      value={watch("type_document")}
                      onValueChange={(v) => setValue("type_document", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <Select
                      value={watch("categorie")}
                      onValueChange={(v) => setValue("categorie", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {documentCategories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between space-x-2 pt-6">
                    <Label htmlFor="actif">Actif</Label>
                    <Switch
                      id="actif"
                      checked={watch("actif")}
                      onCheckedChange={(v) => setValue("actif", v)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    {...register("description")}
                    placeholder="Description optionnelle du modèle"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="contenu">Contenu du modèle *</Label>
                    {detectedVariables.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {detectedVariables.length} variable(s) détectée(s)
                      </span>
                    )}
                  </div>
                  <Textarea
                    id="contenu"
                    {...register("contenu", { required: true })}
                    placeholder="Saisissez le contenu du document. Utilisez {{variable}} pour les champs dynamiques."
                    className="min-h-[300px] font-mono text-sm"
                  />
                  {errors.contenu && (
                    <p className="text-sm text-destructive">Le contenu est requis</p>
                  )}
                </div>

                {detectedVariables.length > 0 && (
                  <div className="space-y-2">
                    <Label>Variables utilisées</Label>
                    <div className="flex flex-wrap gap-1">
                      {detectedVariables.map((v) => (
                        <Badge key={v} variant="secondary">
                          {`{{${v}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="variables" className="flex-1 overflow-auto">
              <ScrollArea className="h-[400px] p-1">
                <div className="space-y-6">
                  <p className="text-sm text-muted-foreground">
                    Cliquez sur une variable pour l'insérer dans le contenu, ou copiez-la dans le presse-papiers.
                  </p>

                  {Object.entries(variablesByCategory).map(([category, variables]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="font-medium text-sm">{category}</h4>
                      <div className="grid grid-cols-2 gap-2">
                        {variables.map((v) => (
                          <div
                            key={v.key}
                            className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                {`{{${v.key}}}`}
                              </code>
                              <p className="text-xs text-muted-foreground mt-1">
                                {v.label}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => insertVariable(v.key)}
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => copyVariable(v.key)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Enregistrer" : "Créer le modèle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
