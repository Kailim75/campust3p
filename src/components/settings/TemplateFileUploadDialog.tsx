import { useState, useRef } from "react";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileText, File, X, Loader2, Info } from "lucide-react";
import { useUploadTemplateFile, extractVariablesFromText } from "@/hooks/useDocumentTemplateFiles";
import { availableVariables, documentCategories } from "@/hooks/useDocumentTemplates";

interface TemplateFileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateFileUploadDialog({ open, onOpenChange }: TemplateFileUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [categorie, setCategorie] = useState("formation");
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadTemplate = useUploadTemplateFile();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const extension = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!extension || !["pdf", "docx"].includes(extension)) {
        return;
      }
      setFile(selectedFile);
      if (!nom) {
        setNom(selectedFile.name.replace(/\.(pdf|docx)$/i, ""));
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const extension = droppedFile.name.split(".").pop()?.toLowerCase();
      if (extension && ["pdf", "docx"].includes(extension)) {
        setFile(droppedFile);
        if (!nom) {
          setNom(droppedFile.name.replace(/\.(pdf|docx)$/i, ""));
        }
      }
    }
  };

  const toggleVariable = (variable: string) => {
    setSelectedVariables((prev) =>
      prev.includes(variable)
        ? prev.filter((v) => v !== variable)
        : [...prev, variable]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !nom.trim()) return;

    await uploadTemplate.mutateAsync({
      file,
      nom: nom.trim(),
      description: description.trim() || undefined,
      categorie,
      variables: selectedVariables,
    });

    // Reset form
    setFile(null);
    setNom("");
    setDescription("");
    setCategorie("formation");
    setSelectedVariables([]);
    onOpenChange(false);
  };

  const groupedVariables = availableVariables.reduce((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {} as Record<string, typeof availableVariables[number][]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importer un modèle de document
          </DialogTitle>
          <DialogDescription>
            Uploadez un fichier PDF ou DOCX contenant des variables dynamiques {"{{variable}}"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4 pb-4">
              {/* Zone de dépôt de fichier */}
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  file ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    {file.name.endsWith(".pdf") ? (
                      <FileText className="h-10 w-10 text-red-500" />
                    ) : (
                      <File className="h-10 w-10 text-blue-500" />
                    )}
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} Ko
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Glissez-déposez un fichier PDF ou DOCX, ou cliquez pour sélectionner
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Formats acceptés : PDF, DOCX
                    </p>
                  </>
                )}
              </div>

              {/* Informations du modèle */}
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom du modèle *</Label>
                  <Input
                    id="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    placeholder="Ex: Convention de formation VTC"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categorie">Catégorie</Label>
                  <Select value={categorie} onValueChange={setCategorie}>
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

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description du modèle..."
                    rows={2}
                  />
                </div>
              </div>

              {/* Variables disponibles */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Variables utilisées dans ce modèle</Label>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    Cliquez pour sélectionner
                  </div>
                </div>
                
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground mb-2">
                  Dans votre document, utilisez la syntaxe <code className="bg-muted px-1 rounded">{"{{variable}}"}</code> 
                  pour insérer des données dynamiques. Ex: <code className="bg-muted px-1 rounded">{"{{nom}}"}</code>
                </div>

                {Object.entries(groupedVariables).map(([category, vars]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">{category}</p>
                    <div className="flex flex-wrap gap-1">
                      {vars.map((v) => (
                        <Badge
                          key={v.key}
                          variant={selectedVariables.includes(v.key) ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => toggleVariable(v.key)}
                        >
                          {`{{${v.key}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}

                {selectedVariables.length > 0 && (
                  <div className="mt-3 p-2 bg-primary/5 rounded border border-primary/20">
                    <p className="text-xs font-medium mb-1">Variables sélectionnées :</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedVariables.map((v) => `{{${v}}}`).join(", ")}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={!file || !nom.trim() || uploadTemplate.isPending}>
              {uploadTemplate.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Importer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
