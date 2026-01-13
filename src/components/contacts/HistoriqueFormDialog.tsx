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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Phone, 
  Mail, 
  FileText, 
  MessageCircle, 
  MessageSquare, 
  Users,
  Loader2 
} from "lucide-react";
import { useCreateHistorique, HistoriqueType } from "@/hooks/useContactHistorique";

interface HistoriqueFormDialogProps {
  contactId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: HistoriqueType;
}

const typeConfig: Record<HistoriqueType, { label: string; icon: React.ElementType }> = {
  appel: { label: "Appel téléphonique", icon: Phone },
  email: { label: "Email", icon: Mail },
  note: { label: "Note", icon: FileText },
  sms: { label: "SMS", icon: MessageSquare },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  reunion: { label: "Réunion", icon: Users },
};

export function HistoriqueFormDialog({
  contactId,
  open,
  onOpenChange,
  defaultType = "note",
}: HistoriqueFormDialogProps) {
  const [type, setType] = useState<HistoriqueType>(defaultType);
  const [titre, setTitre] = useState("");
  const [contenu, setContenu] = useState("");
  const [duree, setDuree] = useState("");
  
  const createHistorique = useCreateHistorique();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) return;

    await createHistorique.mutateAsync({
      contact_id: contactId,
      type,
      titre: titre.trim(),
      contenu: contenu.trim() || null,
      duree_minutes: duree ? parseInt(duree) : null,
    });

    // Reset form
    setType(defaultType);
    setTitre("");
    setContenu("");
    setDuree("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setType(defaultType);
    setTitre("");
    setContenu("");
    setDuree("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un échange</DialogTitle>
          <DialogDescription>
            Enregistrez un appel, email, note ou autre échange avec ce contact
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type d'échange</Label>
            <Select value={type} onValueChange={(v) => setType(v as HistoriqueType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(typeConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="titre">Titre / Sujet *</Label>
            <Input
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex: Appel de confirmation inscription"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contenu">Détails</Label>
            <Textarea
              id="contenu"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Notes, résumé de la conversation..."
              rows={4}
            />
          </div>

          {(type === "appel" || type === "reunion") && (
            <div className="space-y-2">
              <Label htmlFor="duree">Durée (minutes)</Label>
              <Input
                id="duree"
                type="number"
                min="1"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                placeholder="Ex: 15"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={createHistorique.isPending || !titre.trim()}>
              {createHistorique.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Ajout...
                </>
              ) : (
                "Ajouter"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
