import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Pencil, Printer, Mail, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { FactureLibreDialog } from "@/components/paiements/FactureLibreDialog";
import { EditFactureLibreDialog } from "@/components/paiements/EditFactureLibreDialog";
import { generateFacturePDF, type FactureInfo, type ContactInfo } from "@/lib/pdf-generator";
import { extractPayerInfo } from "@/lib/facture-payer-utils";
import { useCentreFormation } from "@/hooks/useCentreFormation";
import { centreToCompanyInfo } from "@/lib/centre-to-company";
import { useEmailComposer } from "@/hooks/useEmailComposer";
import { EmailComposerModal } from "@/components/email/EmailComposerModal";
import { formatPhoneForWhatsApp } from "@/lib/phone-utils";
import { FinancementSection } from "./FinancementSection";

interface PaiementsTabProps {
  contactId: string;
}

const statutColors: Record<string, string> = {
  brouillon: "bg-muted text-muted-foreground",
  emise: "bg-primary/15 text-primary",
  payee: "bg-success/15 text-success",
  partiel: "bg-warning/15 text-warning",
  impayee: "bg-destructive/15 text-destructive",
  annulee: "bg-muted text-muted-foreground",
};

export function PaiementsTab({ contactId }: PaiementsTabProps) {
  const queryClient = useQueryClient();
  const { centreFormation } = useCentreFormation();
  const { composerProps, openComposer } = useEmailComposer();
  const [showForm, setShowForm] = useState(false);
  const [showFactureLibre, setShowFactureLibre] = useState(false);
  const [editingFacture, setEditingFacture] = useState<any>(null);
  const [formData, setFormData] = useState({ montant: "", mode: "cb", reference: "" });

  const { data: factures, isLoading: facturesLoading } = useQuery({
    queryKey: ["apprenant-factures", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("id, numero_facture, montant_total, statut, type_financement, date_emission, commentaires")
        .eq("contact_id", contactId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: contact } = useQuery({
    queryKey: ["contact-info", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("nom, prenom, email, telephone, rue, code_postal, ville")
        .eq("id", contactId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: paiements, isLoading: paiementsLoading } = useQuery({
    queryKey: ["apprenant-paiements", contactId],
    queryFn: async () => {
      const { data: factureIds } = await supabase
        .from("factures")
        .select("id")
        .eq("contact_id", contactId)
        .is("deleted_at", null);

      if (!factureIds || factureIds.length === 0) return [];

      const { data, error } = await supabase
        .from("paiements")
        .select("*")
        .in("facture_id", factureIds.map((f) => f.id))
        .is("deleted_at", null)
        .order("date_paiement", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const montantTotal = (factures || []).reduce((s, f) => s + Number(f.montant_total || 0), 0);
  const montantPaye = (paiements || []).reduce((s, p) => s + Number(p.montant || 0), 0);
  const restant = montantTotal - montantPaye;

  const addPaiement = useMutation({
    mutationFn: async () => {
      const factureId = factures?.[0]?.id;
      if (!factureId) throw new Error("Aucune facture");
      const { error } = await supabase.from("paiements").insert({
        facture_id: factureId,
        montant: parseFloat(formData.montant),
        mode_paiement: formData.mode as any,
        reference: formData.reference || null,
        date_paiement: new Date().toISOString().split("T")[0],
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apprenant-paiements", contactId] });
      queryClient.invalidateQueries({ queryKey: ["apprenant-factures", contactId] });
      toast.success("Versement ajouté");
      setShowForm(false);
      setFormData({ montant: "", mode: "cb", reference: "" });
    },
    onError: () => toast.error("Erreur lors de l'ajout du versement"),
  });

  const handlePrintFacture = (f: any) => {
    if (!contact) { toast.error("Informations contact manquantes"); return; }
    const company = centreToCompanyInfo(centreFormation);
    const factureInfo: FactureInfo = {
      numero_facture: f.numero_facture || "",
      montant_total: Number(f.montant_total),
      total_paye: (paiements || [])
        .filter((p: any) => p.facture_id === f.id)
        .reduce((s: number, p: any) => s + Number(p.montant || 0), 0),
      statut: f.statut,
      type_financement: f.type_financement || "personnel",
      date_emission: f.date_emission,
      commentaires: f.commentaires,
    };
    const contactInfo: ContactInfo = {
      nom: contact.nom,
      prenom: contact.prenom,
      email: contact.email || "",
      telephone: contact.telephone || "",
      rue: contact.rue || "",
      code_postal: contact.code_postal || "",
      ville: contact.ville || "",
    };
    const doc = generateFacturePDF(factureInfo, contactInfo, undefined, company);
    doc.save(`facture-${f.numero_facture || "sans-numero"}.pdf`);
    toast.success("Facture téléchargée");
  };

  const buildFacturePdfBase64 = (f: any): { base64: string; filename: string } | null => {
    if (!contact) return null;
    const company = centreToCompanyInfo(centreFormation);
    const factureInfo: FactureInfo = {
      numero_facture: f.numero_facture || "",
      montant_total: Number(f.montant_total),
      total_paye: (paiements || []).filter((p: any) => p.facture_id === f.id).reduce((s: number, p: any) => s + Number(p.montant || 0), 0),
      statut: f.statut,
      type_financement: f.type_financement || "personnel",
      date_emission: f.date_emission,
      commentaires: f.commentaires,
    };
    const contactInfo: ContactInfo = {
      nom: contact.nom, prenom: contact.prenom, email: contact.email || "", telephone: contact.telephone || "",
      rue: contact.rue || "", code_postal: contact.code_postal || "", ville: contact.ville || "",
    };
    const doc = generateFacturePDF(factureInfo, contactInfo, undefined, company);
    const base64 = doc.output("datauristring").split(",")[1];
    const filename = `facture-${f.numero_facture || "sans-numero"}.pdf`;
    return { base64, filename };
  };

  const handleEmailFacture = (f: any) => {
    if (!contact?.email) { toast.error("Aucun email pour ce contact"); return; }
    const pdf = buildFacturePdfBase64(f);
    if (!pdf) { toast.error("Informations contact manquantes"); return; }
    openComposer({
      recipients: [{ id: contactId, email: contact.email, prenom: contact.prenom, nom: contact.nom }],
      defaultSubject: `Facture ${f.numero_facture || ""}`,
      defaultBody: `Bonjour ${contact.prenom},\n\nVeuillez trouver ci-joint votre facture ${f.numero_facture || ""} d'un montant de ${Number(f.montant_total).toLocaleString("fr-FR")}€.\n\nCordialement`,
      attachments: [{ filename: pdf.filename, content: pdf.base64, contentType: "application/pdf" }],
    });
  };

  const handleWhatsAppFacture = (f: any) => {
    if (!contact?.telephone) { toast.error("Aucun numéro de téléphone pour ce contact"); return; }
    const phone = formatPhoneForWhatsApp(contact.telephone);
    if (!phone) { toast.error("Numéro de téléphone invalide"); return; }
    const waNumber = phone.replace(/^\+/, "");
    const msg = encodeURIComponent(`Bonjour ${contact.prenom}, voici votre facture ${f.numero_facture || ""} d'un montant de ${Number(f.montant_total).toLocaleString("fr-FR")}€. N'hésitez pas à nous contacter pour toute question.`);
    window.open(`https://wa.me/${waNumber}?text=${msg}`, "_blank");
  };

  if (facturesLoading || paiementsLoading) return <Skeleton className="h-[200px] rounded-xl" />;

  return (
    <div className="space-y-5">
      {/* Financement Section */}
      <div>
        <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Financement</h3>
        <FinancementSection contactId={contactId} />
      </div>

      {/* Separator */}
      <div className="border-t" />

      {/* Summary header */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Montant total</p>
          <p className="text-lg font-display font-bold text-foreground">{montantTotal.toLocaleString("fr-FR")}€</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Payé</p>
          <p className="text-lg font-display font-bold text-success">{montantPaye.toLocaleString("fr-FR")}€</p>
        </Card>
        <Card className="p-3 text-center">
          <p className="text-xs text-muted-foreground">Restant</p>
          <p className={cn("text-lg font-display font-bold", restant > 0 ? "text-destructive" : "text-success")}>
            {restant.toLocaleString("fr-FR")}€
          </p>
          <Badge variant="outline" className={cn("text-[10px] mt-1", restant > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success")}>
            {restant > 0 ? "Impayé" : "Soldé"}
          </Badge>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="outline" onClick={() => setShowFactureLibre(true)}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Facture forfait
        </Button>
        <Button size="sm" variant="outline" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un versement
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-3 border-primary/20">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Montant (€)</Label>
              <Input type="number" className="h-9" value={formData.montant} onChange={(e) => setFormData((p) => ({ ...p, montant: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Mode</Label>
              <Select value={formData.mode} onValueChange={(v) => setFormData((p) => ({ ...p, mode: v }))}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="cb">CB</SelectItem>
                  <SelectItem value="virement">Virement</SelectItem>
                  <SelectItem value="alma">Alma</SelectItem>
                  <SelectItem value="cpf">CPF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Référence</Label>
              <Input className="h-9" value={formData.reference} onChange={(e) => setFormData((p) => ({ ...p, reference: e.target.value }))} placeholder="Réf. Alma/CPF" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={!formData.montant || addPaiement.isPending} onClick={() => addPaiement.mutate()}>
              {addPaiement.isPending ? "..." : "Enregistrer"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      {/* Factures list */}
      {factures && factures.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30">
            <p className="text-sm font-medium text-foreground">Factures</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Financement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {factures.map((f: any) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setEditingFacture(f)}>
                  <TableCell className="text-sm font-mono">{f.numero_facture || "—"}</TableCell>
                  <TableCell className="text-sm">
                    {f.date_emission ? format(parseISO(f.date_emission), "dd/MM/yyyy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{Number(f.montant_total).toLocaleString("fr-FR")}€</TableCell>
                  <TableCell className="text-sm capitalize">{f.type_financement || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", statutColors[f.statut] || "")}>
                      {f.statut}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-0.5">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handlePrintFacture(f); }} title="Télécharger PDF">
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleEmailFacture(f); }} title="Envoyer par email">
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleWhatsAppFacture(f); }} title="Envoyer par WhatsApp">
                        <MessageCircle className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); setEditingFacture(f); }} title="Modifier">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Payments table */}
      <Card className="overflow-hidden">
        <div className="px-4 py-2.5 border-b bg-muted/30">
          <p className="text-sm font-medium text-foreground">Versements</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Référence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!paiements || paiements.length === 0) ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Aucun versement
                </TableCell>
              </TableRow>
            ) : (
              paiements.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {p.date_paiement ? format(parseISO(p.date_paiement), "dd/MM/yyyy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{Number(p.montant).toLocaleString("fr-FR")}€</TableCell>
                  <TableCell className="text-sm capitalize">{p.mode_paiement}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.reference || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <FactureLibreDialog open={showFactureLibre} onOpenChange={setShowFactureLibre} defaultContactId={contactId} />
      <EditFactureLibreDialog
        open={!!editingFacture}
        onOpenChange={(v) => { if (!v) setEditingFacture(null); }}
        facture={editingFacture}
        contactId={contactId}
      />
      <EmailComposerModal {...composerProps} />
    </div>
  );
}
