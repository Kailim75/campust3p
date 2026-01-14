import { useState, useEffect } from "react";
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
import { useContacts } from "@/hooks/useContacts";
import { useCreateSignatureRequest, SignatureRequestInsert } from "@/hooks/useSignatures";
import { toast } from "sonner";
import { FileSignature, User, Calendar, FileText } from "lucide-react";
import { format, addDays } from "date-fns";

interface SignatureFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedContactId?: string;
}

const DOCUMENT_TYPES = [
  { value: "convention", label: "Convention de formation" },
  { value: "contrat", label: "Contrat de formation" },
  { value: "reglement", label: "Règlement intérieur" },
  { value: "attestation", label: "Attestation de présence" },
  { value: "autre", label: "Autre document" },
];

export function SignatureFormDialog({
  open,
  onOpenChange,
  preselectedContactId,
}: SignatureFormDialogProps) {
  const [contactId, setContactId] = useState(preselectedContactId || "");
  const [typeDocument, setTypeDocument] = useState("convention");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [dateExpiration, setDateExpiration] = useState(
    format(addDays(new Date(), 7), "yyyy-MM-dd")
  );

  const { data: contacts = [] } = useContacts();
  const createSignature = useCreateSignatureRequest();

  useEffect(() => {
    if (preselectedContactId) {
      setContactId(preselectedContactId);
    }
  }, [preselectedContactId]);

  useEffect(() => {
    // Auto-fill title based on document type
    const docType = DOCUMENT_TYPES.find((d) => d.value === typeDocument);
    if (docType && !titre) {
      setTitre(docType.label);
    }
  }, [typeDocument]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactId || !titre) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    try {
      const data: SignatureRequestInsert = {
        contact_id: contactId,
        type_document: typeDocument,
        titre,
        description: description || null,
        date_expiration: dateExpiration || null,
      };

      await createSignature.mutateAsync(data);
      toast.success("Demande de signature créée");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Erreur lors de la création");
    }
  };

  const resetForm = () => {
    setContactId(preselectedContactId || "");
    setTypeDocument("convention");
    setTitre("");
    setDescription("");
    setDateExpiration(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Nouvelle demande de signature
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Contact */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact *
            </Label>
            <Select value={contactId} onValueChange={setContactId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un contact" />
              </SelectTrigger>
              <SelectContent>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.prenom} {contact.nom}
                    {contact.email && ` (${contact.email})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type de document */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Type de document
            </Label>
            <Select value={typeDocument} onValueChange={setTypeDocument}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Titre */}
          <div className="space-y-2">
            <Label>Titre du document *</Label>
            <Input
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Convention de formation TAXI"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Description / Instructions</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Instructions pour le signataire..."
              rows={3}
            />
          </div>

          {/* Date d'expiration */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date d'expiration
            </Label>
            <Input
              type="date"
              value={dateExpiration}
              onChange={(e) => setDateExpiration(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={createSignature.isPending}>
              {createSignature.isPending ? "Création..." : "Créer la demande"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
