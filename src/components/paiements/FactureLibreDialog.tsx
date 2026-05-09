import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { useProduitsServices, PRODUIT_TYPE_LABELS } from "@/hooks/useProduitsServices";

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
  const { data: produits = [] } = useProduitsServices({ statut: "actif" });
  const createFacture = useCreateFacture();
  const createLignes = useCreateFactureLignes();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contactId, setContactId] = useState(defaultContactId || "");
  const [produitId, setProduitId] = useState<string>("");
  const [libelle, setLibelle] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [tva, setTva] = useState("20");
  const [financement, setFinancement] = useState<FinancementType>("personnel");
  const [commentaires, setCommentaires] = useState("");

  const resetForm = () => {
    setContactId(defaultContactId || "");
    setProduitId("");
    setLibelle("");
    setQuantite("1");
    setPrixUnitaire("");
    setTva("20");
    setFinancement("personnel");
    setCommentaires("");
  };

  const handleProduitChange = (id: string) => {
    setProduitId(id);
    if (id === "__libre__" || !id) {
      setLibelle("");
      setPrixUnitaire("");
      return;
    }
    const p = produits.find((x) => x.id === id);
    if (p) {
      const unite = p.unite ? ` (${p.unite})` : "";
      setLibelle(`${p.nom}${unite}`);
      setPrixUnitaire(String(p.prix_ht));
      setTva(String(p.tva_percent ?? 20));
    }
  };

  const qte = parseFloat(quantite) || 0;
  const pu = parseFloat(prixUnitaire) || 0;
  const tvaPct = parseFloat(tva) || 0;
  const totalHT = qte * pu;
  const totalTTC = totalHT * (1 + tvaPct / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactId) { toast.error("Sélectionnez un contact"); return; }
    if (!libelle.trim()) { toast.error("Libellé requis"); return; }
    if (qte <= 0) { toast.error("Quantité invalide"); return; }
    if (pu <= 0) { toast.error("Prix unitaire invalide"); return; }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const newFacture = await createFacture.mutateAsync({
        contact_id: contactId,
        numero_facture: nextNumero || `FAC-${Date.now()}`,
        montant_total: Number(totalTTC.toFixed(2)),
        type_financement: financement,
        statut: "emise",
        date_emission: today,
        commentaires: commentaires || null,
      });

      await createLignes.mutateAsync([{
        facture_id: newFacture.id,
        catalogue_formation_id: null,
        produit_service_id: produitId && produitId !== "__libre__" ? produitId : null,
        description: libelle,
        quantite: qte,
        prix_unitaire_ht: pu,
        tva_percent: tvaPct,
        ordre: 0,
      } as any]);

      toast.success("Facture créée");
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facture libre (hors parcours de formation)
          </DialogTitle>
          <DialogDescription>
            Pour facturer une location de salle, prestation ou produit du catalogue sans rattacher à une session.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {nextNumero && (
            <div className="p-2.5 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">N° facture</p>
              <p className="font-mono font-semibold text-sm">{nextNumero}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Client *</Label>
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
            <Label>Produit / Service du catalogue</Label>
            <Select value={produitId} onValueChange={handleProduitChange}>
              <SelectTrigger><SelectValue placeholder="Choisir dans le catalogue ou saisir libre…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__libre__">— Saisie libre —</SelectItem>
                {produits.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom} · {PRODUIT_TYPE_LABELS[p.type]} · {p.prix_ht}€ HT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {produits.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Aucun produit actif. Ajoutez-en dans Catalogue &gt; Produits &amp; Services.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Libellé *</Label>
            <Input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex: Location salle de formation – journée" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Quantité *</Label>
              <Input type="number" step="0.01" min="0" value={quantite} onChange={e => setQuantite(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Prix unitaire HT *</Label>
              <Input type="number" step="0.01" min="0" value={prixUnitaire} onChange={e => setPrixUnitaire(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>TVA (%)</Label>
              <Select value={tva} onValueChange={setTva}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (exonéré)</SelectItem>
                  <SelectItem value="5.5">5,5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center p-2.5 bg-muted/50 rounded-lg text-sm">
            <span>Total HT : <strong>{totalHT.toFixed(2)} €</strong></span>
            <span>Total TTC : <strong>{totalTTC.toFixed(2)} €</strong></span>
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
