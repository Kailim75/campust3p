import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useUpdateFacture, FinancementType, FactureStatut } from "@/hooks/useFactures";
import { useFactureLignes, useUpdateFactureLigne } from "@/hooks/useFactureLignes";
import { useQueryClient } from "@tanstack/react-query";

interface EditFactureLibreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facture: {
    id: string;
    numero_facture?: string;
    montant_total: number;
    type_financement?: string;
    statut: string;
    commentaires?: string | null;
  } | null;
  contactId: string;
}

const financementOptions: { value: FinancementType; label: string }[] = [
  { value: "personnel", label: "Personnel" },
  { value: "entreprise", label: "Entreprise" },
  { value: "cpf", label: "CPF" },
  { value: "opco", label: "OPCO" },
];

const statutOptions: { value: FactureStatut; label: string }[] = [
  { value: "brouillon", label: "Brouillon" },
  { value: "emise", label: "Émise" },
  { value: "payee", label: "Payée" },
  { value: "partiel", label: "Partiel" },
  { value: "impayee", label: "Impayée" },
  { value: "annulee", label: "Annulée" },
];

export function EditFactureLibreDialog({ open, onOpenChange, facture, contactId }: EditFactureLibreDialogProps) {
  const queryClient = useQueryClient();
  const updateFacture = useUpdateFacture();
  const updateLigne = useUpdateFactureLigne();
  const { data: lignes } = useFactureLignes(facture?.id || null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [montant, setMontant] = useState("");
  const [libelle, setLibelle] = useState("");
  const [financement, setFinancement] = useState<FinancementType>("personnel");
  const [statut, setStatut] = useState<FactureStatut>("emise");
  const [commentaires, setCommentaires] = useState("");

  useEffect(() => {
    if (facture && open) {
      setMontant(String(facture.montant_total || ""));
      setFinancement((facture.type_financement as FinancementType) || "personnel");
      setStatut((facture.statut as FactureStatut) || "emise");
      setCommentaires(facture.commentaires || "");
    }
  }, [facture, open]);

  useEffect(() => {
    if (lignes && lignes.length > 0 && open) {
      setLibelle(lignes[0].description || "");
    }
  }, [lignes, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facture) return;
    if (!montant || parseFloat(montant) <= 0) { toast.error("Montant invalide"); return; }

    setIsSubmitting(true);
    try {
      const montantTotal = parseFloat(montant);

      await updateFacture.mutateAsync({
        id: facture.id,
        montant_total: montantTotal,
        type_financement: financement,
        statut,
        commentaires: commentaires || null,
      });

      // Update first ligne if exists
      if (lignes && lignes.length > 0) {
        await updateLigne.mutateAsync({
          id: lignes[0].id,
          factureId: facture.id,
          description: libelle,
          prix_unitaire_ht: montantTotal,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["apprenant-factures", contactId] });
      queryClient.invalidateQueries({ queryKey: ["apprenant-paiements", contactId] });
      toast.success("Facture mise à jour");
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Erreur lors de la mise à jour");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Modifier la facture
            {facture?.numero_facture && (
              <Badge variant="outline" className="font-mono text-xs">{facture.numero_facture}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label>Statut</Label>
            <Select value={statut} onValueChange={v => setStatut(v as FactureStatut)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {statutOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Commentaires</Label>
            <Textarea value={commentaires} onChange={e => setCommentaires(e.target.value)} placeholder="Notes internes..." rows={2} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
