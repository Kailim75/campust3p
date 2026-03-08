import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Euro } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface PaiementsTabProps {
  contactId: string;
}

export function PaiementsTab({ contactId }: PaiementsTabProps) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ montant: "", mode: "cb", reference: "" });

  // Get factures + paiements for this contact
  const { data: factures, isLoading: facturesLoading } = useQuery({
    queryKey: ["apprenant-factures", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select("id, montant_total, statut, type_financement")
        .eq("contact_id", contactId)
        .is("deleted_at", null);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: paiements, isLoading: paiementsLoading } = useQuery({
    queryKey: ["apprenant-paiements", contactId],
    queryFn: async () => {
      // Get paiements linked to factures of this contact
      const { data: factureIds } = await supabase
        .from("factures")
        .select("id")
        .eq("contact_id", contactId);

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

  if (facturesLoading || paiementsLoading) return <Skeleton className="h-[200px] rounded-xl" />;

  return (
    <div className="space-y-5">
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

      {/* Add payment */}
      <div className="flex justify-end">
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

      {/* Payments table */}
      <Card className="overflow-hidden">
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
    </div>
  );
}
