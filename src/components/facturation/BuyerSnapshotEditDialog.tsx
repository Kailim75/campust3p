import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldAlert, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  factureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BuyerForm {
  buyer_type: "b2c" | "b2b" | "public";
  buyer_name_snapshot: string;
  buyer_siren: string;
  buyer_siret: string;
  buyer_tva_intracom: string;
  buyer_country: string;
  buyer_email_facturation: string;
  buyer_address_line1: string;
  buyer_address_postal_code: string;
  buyer_address_city: string;
  buyer_routing_code: string;
}

const empty: BuyerForm = {
  buyer_type: "b2c",
  buyer_name_snapshot: "",
  buyer_siren: "",
  buyer_siret: "",
  buyer_tva_intracom: "",
  buyer_country: "FR",
  buyer_email_facturation: "",
  buyer_address_line1: "",
  buyer_address_postal_code: "",
  buyer_address_city: "",
  buyer_routing_code: "",
};

/**
 * Sprint 6 — buyer snapshot editor for DRAFT invoices.
 * Lets users complete missing e-invoicing fields (SIRET/SIREN/address/email/TVA)
 * directly on the facture, without altering the linked contact or partner.
 * Editing is blocked once the facture is emitted (snapshots become immutable).
 */
export function BuyerSnapshotEditDialog({ factureId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState<BuyerForm>(empty);

  const { data: facture, isLoading } = useQuery({
    queryKey: ["facture-buyer-snapshot", factureId],
    enabled: open && !!factureId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("factures")
        .select(
          "id, numero_facture, statut, buyer_type, buyer_name_snapshot, buyer_siren, buyer_siret, buyer_tva_intracom, buyer_country, buyer_email_facturation, buyer_address_snapshot, buyer_routing_code",
        )
        .eq("id", factureId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!facture) return;
    const addr = (facture.buyer_address_snapshot as any) || {};
    setForm({
      buyer_type: (facture.buyer_type as any) || "b2c",
      buyer_name_snapshot: facture.buyer_name_snapshot ?? "",
      buyer_siren: facture.buyer_siren ?? "",
      buyer_siret: facture.buyer_siret ?? "",
      buyer_tva_intracom: facture.buyer_tva_intracom ?? "",
      buyer_country: facture.buyer_country ?? "FR",
      buyer_email_facturation: facture.buyer_email_facturation ?? "",
      buyer_address_line1: addr.line1 ?? addr.address ?? "",
      buyer_address_postal_code: addr.postal_code ?? addr.code_postal ?? "",
      buyer_address_city: addr.city ?? addr.ville ?? "",
      buyer_routing_code: facture.buyer_routing_code ?? "",
    });
  }, [facture]);

  const isDraft = facture?.statut === "brouillon";

  const save = useMutation({
    mutationFn: async () => {
      if (!factureId) throw new Error("no id");
      const payload: Record<string, any> = {
        buyer_type: form.buyer_type,
        buyer_name_snapshot: form.buyer_name_snapshot.trim() || null,
        buyer_siren: form.buyer_siren.replace(/\s/g, "") || null,
        buyer_siret: form.buyer_siret.replace(/\s/g, "") || null,
        buyer_tva_intracom: form.buyer_tva_intracom.trim().toUpperCase() || null,
        buyer_country: (form.buyer_country || "FR").toUpperCase(),
        buyer_email_facturation: form.buyer_email_facturation.trim().toLowerCase() || null,
        buyer_routing_code: form.buyer_routing_code.trim() || null,
        buyer_address_snapshot: {
          line1: form.buyer_address_line1.trim(),
          postal_code: form.buyer_address_postal_code.trim(),
          city: form.buyer_address_city.trim(),
          country: (form.buyer_country || "FR").toUpperCase(),
        },
      };
      const { error } = await supabase.from("factures").update(payload).eq("id", factureId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Données acheteur mises à jour");
      qc.invalidateQueries({ queryKey: ["facture-buyer-snapshot", factureId] });
      qc.invalidateQueries({ queryKey: ["invoice-compliance", factureId] });
      qc.invalidateQueries({ queryKey: ["invoice-compliance-batch"] });
      qc.invalidateQueries({ queryKey: ["factures"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "Échec de la mise à jour"),
  });

  const set = <K extends keyof BuyerForm>(k: K, v: BuyerForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Corriger les données acheteur</DialogTitle>
          <DialogDescription>
            {facture?.numero_facture ? `Facture ${facture.numero_facture} • ` : ""}
            Champs requis par la réforme e-invoicing 2026/2027. Les modifications restent
            attachées uniquement à cette facture (contact et partner non modifiés).
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> Chargement…
          </div>
        ) : !isDraft ? (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Cette facture est déjà émise. Les snapshots acheteur sont figés et ne peuvent plus être
              modifiés (conformité réglementaire). Émettez un avoir si une correction est nécessaire.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type d'acheteur</Label>
                <Select value={form.buyer_type} onValueChange={(v) => set("buyer_type", v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2c">B2C — Particulier</SelectItem>
                    <SelectItem value="b2b">B2B — Entreprise</SelectItem>
                    <SelectItem value="public">Secteur public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Pays (ISO 2)</Label>
                <Input value={form.buyer_country} maxLength={2}
                  onChange={(e) => set("buyer_country", e.target.value.toUpperCase())} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Nom / Raison sociale *</Label>
              <Input value={form.buyer_name_snapshot}
                onChange={(e) => set("buyer_name_snapshot", e.target.value)}
                placeholder="Ex. SARL Dupont ou Jean Dupont" />
            </div>

            {form.buyer_type !== "b2c" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>SIREN (9 chiffres)</Label>
                  <Input value={form.buyer_siren} maxLength={11}
                    onChange={(e) => set("buyer_siren", e.target.value.replace(/[^\d\s]/g, ""))}
                    placeholder="123 456 789" />
                </div>
                <div className="space-y-1.5">
                  <Label>SIRET (14 chiffres)</Label>
                  <Input value={form.buyer_siret} maxLength={17}
                    onChange={(e) => set("buyer_siret", e.target.value.replace(/[^\d\s]/g, ""))}
                    placeholder="123 456 789 00012" />
                </div>
              </div>
            )}

            {form.buyer_type === "b2b" && (
              <div className="space-y-1.5">
                <Label>N° TVA intracommunautaire</Label>
                <Input value={form.buyer_tva_intracom}
                  onChange={(e) => set("buyer_tva_intracom", e.target.value.toUpperCase())}
                  placeholder="FR12345678901" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Email de facturation</Label>
              <Input type="email" value={form.buyer_email_facturation}
                onChange={(e) => set("buyer_email_facturation", e.target.value)}
                placeholder="facturation@client.fr" />
            </div>

            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={form.buyer_address_line1}
                onChange={(e) => set("buyer_address_line1", e.target.value)}
                placeholder="N° + voie" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Code postal</Label>
                <Input value={form.buyer_address_postal_code}
                  onChange={(e) => set("buyer_address_postal_code", e.target.value)} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Ville</Label>
                <Input value={form.buyer_address_city}
                  onChange={(e) => set("buyer_address_city", e.target.value)} />
              </div>
            </div>

            {form.buyer_type === "public" && (
              <div className="space-y-1.5">
                <Label>Code service (Chorus Pro)</Label>
                <Input value={form.buyer_routing_code}
                  onChange={(e) => set("buyer_routing_code", e.target.value)}
                  placeholder="Code SIRET du service destinataire" />
              </div>
            )}

            <Alert>
              <AlertDescription className="text-xs">
                À l'émission, ces données seront figées sur la facture. Le score de conformité
                sera recalculé automatiquement.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!isDraft || save.isPending || !form.buyer_name_snapshot.trim()}
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
