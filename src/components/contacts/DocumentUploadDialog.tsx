import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { Upload, Loader2 } from "lucide-react";
import { useUploadDocument, documentTypes } from "@/hooks/useContactDocuments";

interface DocumentUploadDialogProps {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentUploadDialog({
  contactId,
  open,
  onOpenChange,
}: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [nom, setNom] = useState("");
  const [typeDocument, setTypeDocument] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [commentaires, setCommentaires] = useState("");

  const uploadDocument = useUploadDocument();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!nom) {
        setNom(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !nom || !typeDocument) return;

    await uploadDocument.mutateAsync({
      contactId,
      file,
      nom,
      typeDocument,
      dateExpiration: dateExpiration || undefined,
      commentaires: commentaires || undefined,
    });

    // Reset form
    setFile(null);
    setNom("");
    setTypeDocument("");
    setDateExpiration("");
    setCommentaires("");
    onOpenChange(false);
  };

  const resetForm = () => {
    setFile(null);
    setNom("");
    setTypeDocument("");
    setDateExpiration("");
    setCommentaires("");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) resetForm();
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Fichier</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="flex-1"
              />
            </div>
            {file && (
              <p className="text-xs text-muted-foreground">
                {file.name} ({(file.size / 1024).toFixed(1)} Ko)
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="nom">Nom du document</Label>
            <Input
              id="nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex: CNI Jean Dupont"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type de document</Label>
            <Select value={typeDocument} onValueChange={setTypeDocument} required>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un type" />
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

          <div className="space-y-2">
            <Label htmlFor="expiration">Date d'expiration (optionnel)</Label>
            <Input
              id="expiration"
              type="date"
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="commentaires">Commentaires (optionnel)</Label>
            <Textarea
              id="commentaires"
              value={commentaires}
              onChange={(e) => setCommentaires(e.target.value)}
              placeholder="Notes supplémentaires..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!file || !nom || !typeDocument || uploadDocument.isPending}
              className="flex-1"
            >
              {uploadDocument.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
