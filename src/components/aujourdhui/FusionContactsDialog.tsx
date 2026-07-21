import { useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { GitMerge, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { CrmQualityRecord } from "@/lib/crm-quality";

interface FusionContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Les deux fiches contact du doublon. */
  records: [CrmQualityRecord, CrmQualityRecord];
}

/** Appel typé de la RPC merge_contacts (types régénérés après migration). */
const appelerFusion = supabase.rpc.bind(supabase) as unknown as (
  fn: "merge_contacts",
  args: { p_garder: string; p_fusionner: string },
) => Promise<{ error: { message: string } | null }>;

/**
 * Fusion de deux fiches contact en doublon (chantier A de l'audit du 21/07).
 * L'utilisateur choisit la fiche à CONSERVER ; l'autre est vidée dans elle
 * (historique, documents, factures, examens réassignés par la RPC atomique
 * merge_contacts) puis archivée en corbeille. Marquer un doublon « traité »
 * ne le fait pas disparaître — la fusion, si.
 */
export function FusionContactsDialog({ open, onOpenChange, records }: FusionContactsDialogProps) {
  const queryClient = useQueryClient();
  const [garderId, setGarderId] = useState<string>(records[0].id);
  const [enCours, setEnCours] = useState(false);

  const fusionner = records.find((r) => r.id !== garderId);

  const lancerFusion = async () => {
    if (!fusionner) return;
    setEnCours(true);
    const { error } = await appelerFusion("merge_contacts", {
      p_garder: garderId,
      p_fusionner: fusionner.id,
    });
    setEnCours(false);
    if (error) {
      toast.error("Fusion impossible", { description: error.message });
      return;
    }
    toast.success("Fiches fusionnées", {
      description: `${fusionner.prenom} ${fusionner.nom} a été fusionné et archivé.`,
    });
    // Une fusion touche potentiellement toutes les vues : invalidation globale.
    queryClient.invalidateQueries();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4 text-primary" />
            Fusionner les fiches en doublon
          </DialogTitle>
          <DialogDescription>
            Choisissez la fiche à <strong>conserver</strong>. L'autre lui
            transfère tout son contenu (historique, documents, factures,
            examens) puis part à la corbeille.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={garderId} onValueChange={setGarderId} className="gap-2">
          {records.map((r) => (
            <Label
              key={r.id}
              htmlFor={`garder-${r.id}`}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                garderId === r.id ? "border-primary bg-primary/5" : "hover:bg-muted/30",
              )}
            >
              <RadioGroupItem value={r.id} id={`garder-${r.id}`} className="mt-0.5" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">
                  {r.prenom} {r.nom}
                  {garderId === r.id && (
                    <span className="ml-2 text-[11px] font-normal text-primary">— conservée</span>
                  )}
                </span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {r.email || "email manquant"} · {r.telephone || "téléphone manquant"}
                  {r.formation ? ` · ${r.formation}` : ""}
                </span>
              </span>
            </Label>
          ))}
        </RadioGroup>

        <p className="flex items-start gap-2 text-[11px] text-muted-foreground bg-warning/5 border border-warning/20 rounded-md px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
          Vérifiez qu'il s'agit bien de la même personne : deux personnes
          partageant un téléphone (couple, famille) ne doivent PAS être
          fusionnées. La fiche archivée reste récupérable via la corbeille,
          mais les transferts ne sont pas automatiquement réversibles.
        </p>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={enCours}>
            Annuler
          </Button>
          <Button onClick={lancerFusion} disabled={enCours || !fusionner}>
            <GitMerge className="h-3.5 w-3.5 mr-1.5" />
            {enCours ? "Fusion…" : "Fusionner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
