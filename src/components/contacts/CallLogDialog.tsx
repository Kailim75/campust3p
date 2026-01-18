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
import { Phone, Loader2, Bell, PhoneOff, PhoneMissed, Check } from "lucide-react";
import { useCreateHistorique } from "@/hooks/useContactHistorique";
import { Badge } from "@/components/ui/badge";

interface CallLogDialogProps {
  contactId: string;
  contactName: string;
  phoneNumber: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CallResult = "repondu" | "pas_repondu" | "messagerie" | "rappeler";

const resultConfig: Record<CallResult, { label: string; icon: React.ElementType; color: string }> = {
  repondu: { label: "Répondu", icon: Check, color: "bg-success/10 text-success border-success/20" },
  pas_repondu: { label: "Pas de réponse", icon: PhoneOff, color: "bg-muted text-muted-foreground" },
  messagerie: { label: "Messagerie", icon: PhoneMissed, color: "bg-warning/10 text-warning border-warning/20" },
  rappeler: { label: "À rappeler", icon: Phone, color: "bg-info/10 text-info border-info/20" },
};

export function CallLogDialog({
  contactId,
  contactName,
  phoneNumber,
  open,
  onOpenChange,
}: CallLogDialogProps) {
  const [result, setResult] = useState<CallResult>("repondu");
  const [duree, setDuree] = useState("");
  const [contenu, setContenu] = useState("");
  const [alerteActive, setAlerteActive] = useState(false);
  const [dateRappel, setDateRappel] = useState("");
  const [heureRappel, setHeureRappel] = useState("09:00");
  const [rappelDescription, setRappelDescription] = useState("");

  const createHistorique = useCreateHistorique();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const titre = `Appel ${resultConfig[result].label.toLowerCase()} - ${contactName}`;

    let dateRappelFull: string | null = null;
    if ((alerteActive || result === "rappeler") && dateRappel) {
      dateRappelFull = `${dateRappel}T${heureRappel}:00`;
    }

    await createHistorique.mutateAsync({
      contact_id: contactId,
      type: "appel",
      titre,
      contenu: contenu.trim() || `Résultat: ${resultConfig[result].label}`,
      duree_minutes: duree ? parseInt(duree) : null,
      alerte_active: alerteActive || result === "rappeler",
      date_rappel: dateRappelFull,
      rappel_description: rappelDescription.trim() || (result === "rappeler" ? "Rappeler ce contact" : null),
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setResult("repondu");
    setDuree("");
    setContenu("");
    setAlerteActive(false);
    setDateRappel("");
    setHeureRappel("09:00");
    setRappelDescription("");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSkip = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Logger l'appel
          </DialogTitle>
          <DialogDescription>
            Enregistrez le résultat de votre appel avec <strong>{contactName}</strong>
            <br />
            <span className="text-xs text-muted-foreground">{phoneNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Résultat de l'appel - Badges cliquables */}
          <div className="space-y-2">
            <Label>Résultat de l'appel</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(resultConfig).map(([key, config]) => {
                const Icon = config.icon;
                const isSelected = result === key;
                return (
                  <Badge
                    key={key}
                    variant="outline"
                    className={`cursor-pointer py-2 px-3 transition-all ${
                      isSelected 
                        ? config.color + " ring-2 ring-offset-1" 
                        : "hover:bg-muted"
                    }`}
                    onClick={() => setResult(key as CallResult)}
                  >
                    <Icon className="h-3.5 w-3.5 mr-1.5" />
                    {config.label}
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Durée - visible seulement si répondu */}
          {result === "repondu" && (
            <div className="space-y-2">
              <Label htmlFor="duree">Durée (minutes)</Label>
              <Input
                id="duree"
                type="number"
                min="1"
                value={duree}
                onChange={(e) => setDuree(e.target.value)}
                placeholder="Ex: 5"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="contenu">Notes (optionnel)</Label>
            <Textarea
              id="contenu"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Résumé de la conversation, points importants..."
              rows={3}
            />
          </div>

          {/* Section Rappel - auto-activée si "À rappeler" */}
          <div className="p-3 border rounded-lg bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-warning" />
                <Label htmlFor="alerte" className="font-medium">Programmer un rappel</Label>
              </div>
              <Switch
                id="alerte"
                checked={alerteActive || result === "rappeler"}
                onCheckedChange={setAlerteActive}
              />
            </div>

            {(alerteActive || result === "rappeler") && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="dateRappel" className="text-xs">Date *</Label>
                    <Input
                      id="dateRappel"
                      type="date"
                      value={dateRappel}
                      onChange={(e) => setDateRappel(e.target.value)}
                      required={alerteActive || result === "rappeler"}
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
                    placeholder="Ex: Rappeler pour confirmation"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button type="button" variant="ghost" onClick={handleSkip} className="sm:mr-auto">
              Passer
            </Button>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createHistorique.isPending || ((alerteActive || result === "rappeler") && !dateRappel)}
            >
              {createHistorique.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
