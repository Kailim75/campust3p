import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateContact } from "@/hooks/useContacts";
import { useCreateProspect } from "@/hooks/useProspects";
import { toast } from "sonner";

type QuickCreateType = "contact" | "prospect";

interface QuickCreateProps {
  type: QuickCreateType;
  /** Pre-fill the lastname (e.g. typed search term in a combobox) */
  defaultNom?: string;
  /** Pre-fill the firstname (e.g. parsed from search term) */
  defaultPrenom?: string;
  /** Triggered after creation; receives the new entity id + readable label */
  onCreated?: (entity: { id: string; label: string }) => void;
  /** Override the default trigger button (e.g. a combobox empty-state row) */
  trigger?: React.ReactNode;
  /** Compact mode for narrow placements (like inside a combobox) */
  compact?: boolean;
}

/**
 * Inline mini-form to create a contact or a prospect from any selector.
 * Three essential fields only — full record can be completed later from the dedicated page.
 * Reuses the canonical mutation hooks so triggers, RLS and audit stay consistent.
 */
export function QuickCreate({
  type,
  defaultNom = "",
  defaultPrenom = "",
  onCreated,
  trigger,
  compact = false,
}: QuickCreateProps) {
  const [open, setOpen] = useState(false);
  const [prenom, setPrenom] = useState(defaultPrenom);
  const [nom, setNom] = useState(defaultNom);
  const [contact, setContact] = useState(""); // email or phone

  const createContact = useCreateContact();
  const createProspect = useCreateProspect();
  const isPending = createContact.isPending || createProspect.isPending;

  const reset = () => {
    setPrenom(defaultPrenom);
    setNom(defaultNom);
    setContact("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!nom.trim() || !prenom.trim()) {
      toast.error("Nom et prénom sont obligatoires");
      return;
    }

    const isEmail = contact.includes("@");
    const payload = {
      nom: nom.trim(),
      prenom: prenom.trim(),
      ...(isEmail ? { email: contact.trim() } : {}),
      ...(!isEmail && contact.trim() ? { telephone: contact.trim() } : {}),
    };

    try {
      if (type === "contact") {
        const created = await createContact.mutateAsync(payload as any);
        toast.success(`Apprenant ${created.prenom} ${created.nom} créé`);
        onCreated?.({ id: created.id, label: `${created.prenom} ${created.nom}` });
      } else {
        const created = await createProspect.mutateAsync(payload as any);
        onCreated?.({ id: created.id, label: `${created.prenom} ${created.nom}` });
      }
      reset();
      setOpen(false);
    } catch {
      // toast déjà géré dans les hooks
    }
  };

  const label = type === "contact" ? "apprenant" : "prospect";

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button
            type="button"
            variant="outline"
            size={compact ? "sm" : "default"}
            className="gap-2"
          >
            <Plus className="h-3.5 w-3.5" />
            Créer un {label}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 p-4"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <h4 className="font-semibold text-sm capitalize">Nouveau {label}</h4>
            <p className="text-xs text-muted-foreground">
              Création express. Vous pourrez compléter la fiche plus tard.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="qc-prenom" className="text-xs">Prénom *</Label>
              <Input
                id="qc-prenom"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                autoFocus
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qc-nom" className="text-xs">Nom *</Label>
              <Input
                id="qc-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="qc-contact" className="text-xs">
              Email ou téléphone
            </Label>
            <Input
              id="qc-contact"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="jean@exemple.fr ou 0612345678"
              className="h-8 text-sm"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="flex-1"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Créer"
              )}
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
}
