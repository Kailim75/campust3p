import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Edit, Save, X, Wallet, ArrowRightLeft, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useContactFinancement,
  useUpdateFinancement,
  typePayeurLabels,
  typePayeurBadgeClass,
  type TypePayeur,
  type InscriptionFinancement,
} from "@/hooks/useInscriptionFinancement";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FinancementSectionProps {
  contactId: string;
}

function FinancementCard({ inscription, onEdit }: { inscription: InscriptionFinancement; onEdit: () => void }) {
  const fmtE = (n: number) => n.toLocaleString("fr-FR") + "€";
  const typePayeur = (inscription.type_payeur || "apprenant") as TypePayeur;
  const hasTiers = typePayeur !== "apprenant";

  return (
    <Card className="p-4 space-y-3">
      {/* Header: session + badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{inscription.session?.nom || "Session"}</p>
          <p className="text-xs text-muted-foreground">
            {inscription.session?.formation_type || "—"}
            {inscription.session?.date_debut && ` · ${new Date(inscription.session.date_debut).toLocaleDateString("fr-FR")}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Badge variant="outline" className={cn("text-[10px]", typePayeurBadgeClass[typePayeur])}>
            {typePayeurLabels[typePayeur]}
          </Badge>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onEdit} title="Modifier le financement">
            <Edit className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Montants */}
      <div className={cn("grid gap-2", hasTiers ? "grid-cols-3" : "grid-cols-1")}>
        <div className="text-center p-2 rounded-lg bg-muted/40">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Formation</p>
          <p className="text-sm font-bold">{fmtE(inscription.montant_formation)}</p>
        </div>
        {hasTiers && (
          <>
            <div className="text-center p-2 rounded-lg bg-primary/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pris en charge</p>
              <p className="text-sm font-bold text-primary">{fmtE(inscription.montant_pris_en_charge)}</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-warning/5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reste à charge</p>
              <p className="text-sm font-bold text-warning">{fmtE(inscription.reste_a_charge)}</p>
            </div>
          </>
        )}
      </div>

      {/* Payeur tiers */}
      {hasTiers && inscription.payeur_partner && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          <span>Financé par <span className="font-medium text-foreground">{inscription.payeur_partner.company_name}</span></span>
        </div>
      )}
    </Card>
  );
}

function EditFinancementForm({
  inscription,
  onClose,
}: {
  inscription: InscriptionFinancement;
  onClose: () => void;
}) {
  const updateMutation = useUpdateFinancement();
  const [typePayeur, setTypePayeur] = useState<TypePayeur>((inscription.type_payeur || "apprenant") as TypePayeur);
  const [partnerId, setPartnerId] = useState<string>(inscription.payeur_partner_id || "");
  const [montantFormation, setMontantFormation] = useState(inscription.montant_formation || inscription.session?.prix || 0);
  const [montantPrisEnCharge, setMontantPrisEnCharge] = useState(inscription.montant_pris_en_charge || 0);

  const showTiersFields = typePayeur !== "apprenant";
  const resteACharge = Math.max(0, montantFormation - montantPrisEnCharge);

  // Fetch partners of type entreprise for the dropdown
  const { data: partners } = useQuery({
    queryKey: ["partners-entreprises"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, company_name")
        .eq("is_active", true)
        .order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const handleSave = () => {
    if (showTiersFields && !partnerId) {
      return;
    }

    updateMutation.mutate(
      {
        inscription_id: inscription.id,
        type_payeur: typePayeur,
        payeur_partner_id: showTiersFields ? partnerId : null,
        montant_formation: montantFormation,
        montant_pris_en_charge: showTiersFields ? montantPrisEnCharge : 0,
      },
      { onSuccess: onClose }
    );
  };

  return (
    <Card className="p-4 space-y-4 border-primary/30">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{inscription.session?.nom || "Session"}</p>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label className="text-xs">Type de payeur</Label>
          <Select value={typePayeur} onValueChange={(v) => setTypePayeur(v as TypePayeur)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="apprenant">Autofinancé</SelectItem>
              <SelectItem value="entreprise">Entreprise (100%)</SelectItem>
              <SelectItem value="mixte">Financement mixte</SelectItem>
              <SelectItem value="opco">OPCO</SelectItem>
              <SelectItem value="autre">Autre financeur</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Montant formation (€)</Label>
          <Input
            type="number"
            className="h-9"
            value={montantFormation}
            onChange={(e) => setMontantFormation(Math.max(0, parseFloat(e.target.value) || 0))}
            min={0}
          />
        </div>

        {showTiersFields && (
          <>
            <div>
              <Label className="text-xs">Montant pris en charge (€)</Label>
              <Input
                type="number"
                className="h-9"
                value={montantPrisEnCharge}
                onChange={(e) => setMontantPrisEnCharge(Math.min(montantFormation, Math.max(0, parseFloat(e.target.value) || 0)))}
                min={0}
                max={montantFormation}
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Entreprise / Financeur</Label>
              <Select value={partnerId} onValueChange={setPartnerId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  {(partners || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.company_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showTiersFields && !partnerId && (
                <p className="text-[10px] text-destructive mt-1">Financeur obligatoire</p>
              )}
            </div>

            {/* Reste à charge preview */}
            <div className="col-span-2 flex items-center gap-2 p-2 rounded-lg bg-muted/40">
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-[10px] text-muted-foreground">Reste à charge apprenant</p>
                <p className={cn("text-sm font-bold", resteACharge > 0 ? "text-warning" : "text-success")}>
                  {resteACharge.toLocaleString("fr-FR")}€
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={updateMutation.isPending || (showTiersFields && !partnerId)}
        >
          <Save className="h-3.5 w-3.5 mr-1" />
          {updateMutation.isPending ? "..." : "Enregistrer"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Annuler</Button>
      </div>
    </Card>
  );
}

export function FinancementSection({ contactId }: FinancementSectionProps) {
  const { data: inscriptions, isLoading } = useContactFinancement(contactId);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (isLoading) return <Skeleton className="h-32 rounded-xl" />;

  if (!inscriptions || inscriptions.length === 0) {
    return (
      <Card className="p-4 text-center text-sm text-muted-foreground">
        <Wallet className="h-5 w-5 mx-auto mb-2 text-muted-foreground/50" />
        Aucune inscription — le financement sera configuré lors de l'inscription à une session
      </Card>
    );
  }

  // Aggregate summary
  const totalFormation = inscriptions.reduce((s, i) => s + (i.montant_formation || 0), 0);
  const totalPrisEnCharge = inscriptions.reduce((s, i) => s + (i.montant_pris_en_charge || 0), 0);
  const totalResteACharge = inscriptions.reduce((s, i) => s + (i.reste_a_charge || 0), 0);
  const hasTiers = inscriptions.some((i) => i.type_payeur !== "apprenant");

  return (
    <div className="space-y-3">
      {/* Aggregate KPIs when multiple inscriptions */}
      {inscriptions.length > 1 && (
        <div className={cn("grid gap-2", hasTiers ? "grid-cols-3" : "grid-cols-1")}>
          <Card className="p-2.5 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total formations</p>
            <p className="text-sm font-bold">{totalFormation.toLocaleString("fr-FR")}€</p>
          </Card>
          {hasTiers && (
            <>
              <Card className="p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pris en charge</p>
                <p className="text-sm font-bold text-primary">{totalPrisEnCharge.toLocaleString("fr-FR")}€</p>
              </Card>
              <Card className="p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Reste à charge</p>
                <p className={cn("text-sm font-bold", totalResteACharge > 0 ? "text-warning" : "text-success")}>
                  {totalResteACharge.toLocaleString("fr-FR")}€
                </p>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Per-inscription cards */}
      {inscriptions.map((inscription) =>
        editingId === inscription.id ? (
          <EditFinancementForm
            key={inscription.id}
            inscription={inscription}
            onClose={() => setEditingId(null)}
          />
        ) : (
          <FinancementCard
            key={inscription.id}
            inscription={inscription}
            onEdit={() => setEditingId(inscription.id)}
          />
        )
      )}

      {/* Info tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-help">
              <Info className="h-3 w-3" />
              Source de vérité : dossier d'inscription
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-xs">
            Les informations de financement sont centralisées sur le dossier d'inscription et servent de référence pour les factures et devis.
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
