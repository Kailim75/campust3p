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
import { Switch } from "@/components/ui/switch";
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
  Loader2,
  Bell
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
  const [alerteActive, setAlerteActive] = useState(false);
  const [dateRappel, setDateRappel] = useState("");
  const [heureRappel, setHeureRappel] = useState("09:00");
  const [rappelDescription, setRappelDescription] = useState("");
  
  const createHistorique = useCreateHistorique();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titre.trim()) return;

    let dateRappelFull: string | null = null;
    if (alerteActive && dateRappel) {
      dateRappelFull = `${dateRappel}T${heureRappel}:00`;
    }

    await createHistorique.mutateAsync({
      contact_id: contactId,
      type,
      titre: titre.trim(),
      contenu: contenu.trim() || null,
      duree_minutes: duree ? parseInt(duree) : null,
      alerte_active: alerteActive,
      date_rappel: dateRappelFull,
      rappel_description: rappelDescription.trim() || null,
    });

    // Reset form
    setType(defaultType);
    setTitre("");
    setContenu("");
    setDuree("");
    setAlerteActive(false);
    setDateRappel("");
    setHeureRappel("09:00");
    setRappelDescription("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setType(defaultType);
    setTitre("");
    setContenu("");
    setDuree("");
    setAlerteActive(false);
    setDateRappel("");
    setHeureRappel("09:00");
    setRappelDescription("");
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
              rows={3}
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

          {/* Section Alerte/Rappel */}
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                <Label htmlFor="alerte" className="font-medium">Créer un rappel</Label>
              </div>
              <Switch
                id="alerte"
                checked={alerteActive}
                onCheckedChange={setAlerteActive}
              />
            </div>

            {alerteActive && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="dateRappel" className="text-xs">Date *</Label>
                    <Input
                      id="dateRappel"
                      type="date"
                      value={dateRappel}
                      onChange={(e) => setDateRappel(e.target.value)}
                      required={alerteActive}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heureRappel" className="text-xs">Heure</Label>
                    <Input
                      id="heureRappel"
                      type="time"
                      value={heureRappel}
                      onChange={(e) => setHeureRappel(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rappelDescription" className="text-xs">Note de rappel</Label>
                  <Input
                    id="rappelDescription"
                    value={rappelDescription}
                    onChange={(e) => setRappelDescription(e.target.value)}
                    placeholder="Ex: Rappeler pour confirmation RDV"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={createHistorique.isPending || !titre.trim() || (alerteActive && !dateRappel)}
            >
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
