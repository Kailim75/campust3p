import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ContactCombobox } from "@/components/ui/contact-combobox";
import { Loader2, FileText, Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useContacts, useCreateContact } from "@/hooks/useContacts";
import { useCreateFacture, useGenerateNumeroFacture, FinancementType } from "@/hooks/useFactures";
import { useCreateFactureLignes } from "@/hooks/useFactureLignes";
import { useProduitsServices, PRODUIT_TYPE_LABELS } from "@/hooks/useProduitsServices";
import { usePartners, useCreatePartner } from "@/hooks/usePartners";

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
  const { data: partners = [] } = usePartners();
  const { data: nextNumero } = useGenerateNumeroFacture();
  const { data: produits = [] } = useProduitsServices({ statut: "actif" });
  const createFacture = useCreateFacture();
  const createLignes = useCreateFactureLignes();
  const createPartner = useCreatePartner();
  const createContact = useCreateContact();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type de client
  const [clientType, setClientType] = useState<"particulier" | "entreprise">(
    defaultContactId ? "particulier" : "particulier"
  );
  const [contactId, setContactId] = useState(defaultContactId || "");
  const [partnerId, setPartnerId] = useState("");

  // Création rapide entreprise
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [newPartner, setNewPartner] = useState({
    company_name: "", email: "", siret: "", address: "", code_postal: "", ville: "",
    contact_name: "", phone: "", tva_intracom: "",
  });

  // Création rapide contact (particulier)
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContact, setNewContact] = useState({
    prenom: "", nom: "", email: "", telephone: "",
    rue: "", code_postal: "", ville: "",
  });

  // Ligne
  const [produitId, setProduitId] = useState<string>("");
  const [libelle, setLibelle] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [tva, setTva] = useState("20");
  const [financement, setFinancement] = useState<FinancementType>("entreprise");
  const [commentaires, setCommentaires] = useState("");

  // Filtre les partenaires de type entreprise (ou tous si aucun typage)
  const partnersClients = partners.filter(
    (p) => !p.type_partenaire || p.type_partenaire === "entreprise" || p.type_partenaire === "autre"
  );

  const resetForm = () => {
    setClientType("particulier");
    setContactId(defaultContactId || "");
    setPartnerId("");
    setShowNewPartner(false);
    setNewPartner({ company_name: "", email: "", siret: "", address: "", code_postal: "", ville: "", contact_name: "", phone: "", tva_intracom: "" });
    setShowNewContact(false);
    setNewContact({ prenom: "", nom: "", email: "", telephone: "", rue: "", code_postal: "", ville: "" });
    setProduitId("");
    setLibelle("");
    setQuantite("1");
    setPrixUnitaire("");
    setTva("20");
    setFinancement("entreprise");
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

  const handleCreatePartner = async () => {
    if (!newPartner.company_name.trim()) {
      toast.error("Raison sociale requise");
      return;
    }
    try {
      const created: any = await createPartner.mutateAsync({
        company_name: newPartner.company_name.trim(),
        email: newPartner.email.trim() || null,
        address: newPartner.address.trim() || null,
        contact_name: newPartner.contact_name.trim() || null,
        phone: newPartner.phone.trim() || null,
        type_partenaire: "entreprise",
        statut_partenaire: "actif",
        is_active: true,
        ...(newPartner.siret ? { siret: newPartner.siret.trim() } : {}),
        ...(newPartner.tva_intracom ? { tva_intracom: newPartner.tva_intracom.trim() } : {}),
        ...(newPartner.code_postal ? { code_postal: newPartner.code_postal.trim() } : {}),
        ...(newPartner.ville ? { ville: newPartner.ville.trim() } : {}),
      } as any);
      setPartnerId(created.id);
      setShowNewPartner(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (clientType === "particulier" && !contactId) {
      toast.error("Sélectionnez un contact"); return;
    }
    if (clientType === "entreprise" && !partnerId) {
      toast.error("Sélectionnez une entreprise cliente"); return;
    }
    if (!libelle.trim()) { toast.error("Libellé requis"); return; }
    if (qte <= 0) { toast.error("Quantité invalide"); return; }
    if (pu <= 0) { toast.error("Prix unitaire invalide"); return; }

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0];

      const newFacture = await createFacture.mutateAsync({
        contact_id: clientType === "particulier" ? contactId : (null as any),
        ...(clientType === "entreprise" ? { client_partner_id: partnerId } : {}),
        numero_facture: nextNumero || `FAC-${Date.now()}`,
        montant_total: Number(totalTTC.toFixed(2)),
        type_financement: financement,
        statut: "emise",
        date_emission: today,
        commentaires: commentaires || null,
      } as any);

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
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facture libre (hors parcours de formation)
          </DialogTitle>
          <DialogDescription>
            Pour facturer une location de salle, prestation ou produit du catalogue, à un particulier ou une entreprise.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {nextNumero && (
            <div className="p-2.5 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">N° facture</p>
              <p className="font-mono font-semibold text-sm">{nextNumero}</p>
            </div>
          )}

          {/* Type de client */}
          <Tabs value={clientType} onValueChange={(v) => setClientType(v as any)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="particulier">Particulier (apprenant/contact)</TabsTrigger>
              <TabsTrigger value="entreprise"><Building2 className="h-4 w-4 mr-1" />Entreprise</TabsTrigger>
            </TabsList>

            <TabsContent value="particulier" className="space-y-1.5 pt-3">
              <Label>Client *</Label>
              <ContactCombobox
                options={contacts.map(c => ({ value: c.id, label: `${c.prenom} ${c.nom}` }))}
                value={contactId}
                onValueChange={setContactId}
                placeholder="Rechercher un contact..."
                searchPlaceholder="Rechercher..."
                emptyMessage="Aucun contact."
              />
            </TabsContent>

            <TabsContent value="entreprise" className="space-y-2 pt-3">
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  <Label>Entreprise cliente *</Label>
                  <Select value={partnerId} onValueChange={setPartnerId}>
                    <SelectTrigger><SelectValue placeholder="Choisir une entreprise…" /></SelectTrigger>
                    <SelectContent>
                      {partnersClients.length === 0 && (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          Aucune entreprise. Cliquez sur « + Nouvelle ».
                        </div>
                      )}
                      {partnersClients.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.company_name}{p.email ? ` · ${p.email}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewPartner(s => !s)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {showNewPartner ? "Annuler" : "Nouvelle"}
                </Button>
              </div>

              {showNewPartner && (
                <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground">Création rapide d'une entreprise cliente</p>
                  <Input placeholder="Raison sociale *" value={newPartner.company_name}
                    onChange={e => setNewPartner({ ...newPartner, company_name: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="SIRET" value={newPartner.siret}
                      onChange={e => setNewPartner({ ...newPartner, siret: e.target.value })} />
                    <Input placeholder="N° TVA intracom" value={newPartner.tva_intracom}
                      onChange={e => setNewPartner({ ...newPartner, tva_intracom: e.target.value })} />
                  </div>
                  <Input placeholder="Adresse" value={newPartner.address}
                    onChange={e => setNewPartner({ ...newPartner, address: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Code postal" value={newPartner.code_postal}
                      onChange={e => setNewPartner({ ...newPartner, code_postal: e.target.value })} />
                    <Input placeholder="Ville" value={newPartner.ville}
                      onChange={e => setNewPartner({ ...newPartner, ville: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Contact (nom)" value={newPartner.contact_name}
                      onChange={e => setNewPartner({ ...newPartner, contact_name: e.target.value })} />
                    <Input placeholder="Téléphone" value={newPartner.phone}
                      onChange={e => setNewPartner({ ...newPartner, phone: e.target.value })} />
                  </div>
                  <Input type="email" placeholder="Email facturation" value={newPartner.email}
                    onChange={e => setNewPartner({ ...newPartner, email: e.target.value })} />
                  <Button type="button" size="sm" onClick={handleCreatePartner} disabled={createPartner.isPending}>
                    {createPartner.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Créer l'entreprise
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Ligne facture */}
          <div className="space-y-1.5">
            <Label>Produit / Service du catalogue</Label>
            <Select value={produitId} onValueChange={handleProduitChange}>
              <SelectTrigger><SelectValue placeholder="Choisir dans le catalogue ou saisie libre…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__libre__">— Saisie libre —</SelectItem>
                {produits.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nom} · {PRODUIT_TYPE_LABELS[p.type]} · {p.prix_ht}€ HT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
