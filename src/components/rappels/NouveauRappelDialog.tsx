import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactCombobox, type ComboboxOption } from "@/components/ui/contact-combobox";
import { useCreerRappelLibre } from "@/hooks/useRappels";
import { addDays, format } from "date-fns";

/**
 * « Rappelle-moi de le relancer lundi ». Le rappel est stocké dans
 * `contact_historique` (date_rappel + alerte_active), le même mécanisme que
 * les rappels posés depuis une fiche apprenant : il apparaît donc aussi
 * dans la timeline du contact.
 */
interface NouveauRappelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Contact présélectionné quand le rappel est créé depuis une ligne. */
  contactIdInitial?: string;
}

const DEMAIN = () => format(addDays(new Date(), 1), "yyyy-MM-dd");

export function NouveauRappelDialog({ open, onOpenChange, contactIdInitial }: NouveauRappelDialogProps) {
  const [contactId, setContactId] = useState(contactIdInitial ?? "");
  const [date, setDate] = useState(DEMAIN);
  const [description, setDescription] = useState("");
  const creer = useCreerRappelLibre();

  // Chargée seulement à l'ouverture : la liste sert uniquement au choix.
  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["rappels", "contacts-choix"],
    enabled: open,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, nom, prenom, email")
        .eq("archived", false)
        .is("deleted_at", null)
        .order("nom");
      if (error) throw error;
      return data || [];
    },
  });

  const options = useMemo<ComboboxOption[]>(
    () =>
      contacts.map((c) => ({
        value: c.id,
        label: `${c.prenom ?? ""} ${c.nom ?? ""}`.trim() || "Sans nom",
        sublabel: c.email ?? undefined,
      })),
    [contacts]
  );

  const valide = contactId && date && description.trim().length > 0;

  const fermer = () => {
    onOpenChange(false);
    setContactId(contactIdInitial ?? "");
    setDate(DEMAIN());
    setDescription("");
  };

  const enregistrer = async () => {
    if (!valide) return;
    await creer.mutateAsync({ contactId, dateRappel: date, description: description.trim() });
    fermer();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : fermer())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau rappel</DialogTitle>
          <DialogDescription>
            Il apparaîtra dans cette liste à la date choisie, et dans l'historique de l'apprenant.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Apprenant</Label>
            <ContactCombobox
              options={options}
              value={contactId}
              onValueChange={setContactId}
              placeholder={isLoading ? "Chargement…" : "Choisir un apprenant"}
              searchPlaceholder="Rechercher un nom…"
              emptyMessage="Aucun apprenant trouvé."
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rappel-date">Me le rappeler le</Label>
            <Input
              id="rappel-date"
              type="date"
              value={date}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rappel-objet">Quoi faire</Label>
            <Textarea
              id="rappel-objet"
              placeholder="Ex : rappeler pour le solde de 300 € réglé en espèces"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={fermer}>
            Annuler
          </Button>
          <Button onClick={enregistrer} disabled={!valide || creer.isPending}>
            {creer.isPending ? "Création…" : "Créer le rappel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
