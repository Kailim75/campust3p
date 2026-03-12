import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContactCombobox } from "@/components/ui/contact-combobox";
import { Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useContacts } from "@/hooks/useContacts";
import { useCreateFacture, useGenerateNumeroFacture, FinancementType } from "@/hooks/useFactures";
import { useCreateFactureLignes } from "@/hooks/useFactureLignes";

interface FactureLibreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultContactId?: string;
}

const financementOptions: { value: FinancementType; label: string }[] = [
  { value: "personnel", label: "Personnel" },
  { value: "entreprise", label: "Entreprise" },
  { value: "cpf", label: "CPF" },
  { value: "opco", label: "OPCO" },
];

export function FactureLibreDialog({ open, onOpenChange, defaultContactId }: FactureLibreDialogProps) {
  const { data: contacts = [] } = useContacts();
  const { data: nextNumero } = useGenerateNumeroFacture();
  const createFacture = useCreateFacture();
  const createLignes = useCreateFactureLignes();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactId, setContactId] = useState(defaultContactId || "");
  const [libelle, setLibelle] = useState("Forfait accompagnement administratif");
  const [montant, setMontant] = useState("");
  const [financement, setFinancement] = useState<FinancementType>("personnel");
  const [commentaires, setCommentaires] = useState("");

  const resetForm = () => {
    setContactId(defaultContactId || "");
    setLibelle("Forfait accompagnement administratif");
    setMontant("");
    setFinancement("personnel");
    setCommentaires("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) { toast.error("Sélectionnez un contact"); return; }
    if (!montant || parseFloat(montant) <= 0) { toast.error("Montant invalide"); return; }
    if (!libelle.trim()) { toast.error("Libellé requis"); return; }

    setIsSubmitting(true);
    try {
      const montantTotal = parseFloat(montant);
      const today = new Date().toISOString().split("T")[0];

      const newFacture = await createFacture.mutateAsync({
        contact_id: contactId,
        numero_facture: nextNumero || `FAC-${Date.now()}`,
        montant_total: montantTotal,
        type_financement: financement,
        statut: "emise",
        date_emission: today,
        commentaires: commentaires || null,
      });

      await createLignes.mutateAsync([{
        facture_id: newFacture.id,
        catalogue_formation_id: null,
        description: libelle,
        quantite: 1,
        prix_unitaire_ht: montantTotal,
        tva_percent: 0,
        ordre: 0,
      }]);

      toast.success("Facture libre créée");
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la création");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facture libre (forfait)
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {nextNumero && (
            <div className="p-2.5 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">N° facture</p>
              <p className="font-mono font-semibold text-sm">{nextNumero}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Contact *</Label>
            <ContactCombobox
              options={contacts.map(c => ({ value: c.id, label: `${c.prenom} ${c.nom}` }))}
              value={contactId}
              onValueChange={setContactId}
              placeholder="Rechercher un contact..."
              searchPlaceholder="Rechercher..."
              emptyMessage="Aucun contact."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Libellé *</Label>
            <Input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex: Forfait accompagnement administratif" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Montant HT (€) *</Label>
              <Input type="number" step="0.01" min="0" value={montant} onChange={e => setMontant(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Financement</Label>
              <Select value={financement} onValueChange={v => setFinancement(v as FinancementType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {financementOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Commentaires</Label>
            <Textarea value={commentaires} onChange={e => setCommentaires(e.target.value)} placeholder="Notes internes..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Créer la facture
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
