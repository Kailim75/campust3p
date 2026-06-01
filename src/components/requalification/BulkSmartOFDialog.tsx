import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertTriangle } from "lucide-react";
import type { RequalificationContact } from "@/hooks/useRequalificationContacts";
import {
  BULK_MAX,
  computeBulkCounts,
  filterEligibleForSmartOF,
} from "@/lib/requalification/bulkSelection";
import {
  useBulkMarkAsSmartOFHistory,
  type BulkMarkSmartOFResult,
} from "@/hooks/useRequalificationActions";

const REASON_PRESETS = [
  "Import historique SmartOF — apprenant déjà formé avant migration CRM",
  "Apprenant antérieur à l'utilisation complète du CRM",
  "Nettoyage base : exclusion des KPI actifs sans modification statut",
  "Autre (préciser dans le commentaire)",
];

const CONFIRMATION_TEXT =
  "Je confirme que ces contacts correspondent à des apprenants importés de SmartOF ayant déjà effectué leur formation.";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contacts: RequalificationContact[];
  onCompleted: (res: BulkMarkSmartOFResult) => void;
}

export function BulkSmartOFDialog({ open, onOpenChange, contacts, onCompleted }: Props) {
  const [reason, setReason] = useState<string>(REASON_PRESETS[0]);
  const [comment, setComment] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const mutation = useBulkMarkAsSmartOFHistory();

  const { eligible, skipped } = useMemo(
    () => filterEligibleForSmartOF(contacts),
    [contacts],
  );
  const counts = useMemo(() => computeBulkCounts(eligible), [eligible]);
  const preview = eligible.slice(0, 10);

  const tooMany = eligible.length > BULK_MAX;
  const disabled =
    mutation.isPending ||
    eligible.length === 0 ||
    tooMany ||
    !reason.trim() ||
    comment.trim().length < 10 ||
    !confirmed;

  const handleConfirm = async () => {
    const res = await mutation.mutateAsync({
      contacts: eligible,
      comment,
      reason,
    });
    // Push skipped from pre-filter into result rows already done in hook
    onCompleted(res);
    reset();
    onOpenChange(false);
  };

  const reset = () => {
    setReason(REASON_PRESETS[0]);
    setComment("");
    setConfirmed(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Marquer comme historique SmartOF</DialogTitle>
          <DialogDescription>
            Action réversible. Ne modifie pas statut_apprenant ni aucune donnée
            financière, document ou examen. Une ligne de journal est créée par contact.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {tooMany && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="h-4 w-4 mt-0.5" />
              <div>
                Trop de contacts sélectionnés ({eligible.length}). Maximum {BULK_MAX}
                {" "}par action. Réduisez la sélection.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-md border p-3 bg-muted/30">
            <Stat label="Sélectionnés (éligibles)" value={counts.total} highlight />
            <Stat label="Ignorés (déjà SmartOF)" value={skipped.length} />
            <Stat label="Avec facture" value={counts.withFacture} warn={counts.withFacture > 0} />
            <Stat label="Avec paiement" value={counts.withPaiement} warn={counts.withPaiement > 0} />
            <Stat label="Avec document" value={counts.withDocument} warn={counts.withDocument > 0} />
            <Stat label="Avec examen" value={counts.withExamen} warn={counts.withExamen > 0} />
            <Stat label="Sans email" value={counts.withoutEmail} />
            <Stat label="Sans téléphone" value={counts.withoutPhone} />
            <Stat label="Sans formation" value={counts.withoutFormation} />
          </div>

          {(counts.withFacture > 0 || counts.withPaiement > 0 || counts.withExamen > 0) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-800 text-xs">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                Certains contacts ont des signaux d'activité (facture, paiement ou examen).
                Vérifiez attentivement avant de les marquer comme historique.
              </div>
            </div>
          )}

          <div>
            <div className="text-xs font-medium mb-1">10 premiers contacts concernés</div>
            <div className="rounded-md border max-h-40 overflow-y-auto text-xs">
              {preview.length === 0 ? (
                <div className="p-3 text-muted-foreground">Aucun contact éligible.</div>
              ) : (
                preview.map((c) => (
                  <div key={c.id} className="flex justify-between border-b last:border-0 px-3 py-1.5">
                    <span>{c.prenom} {c.nom}</span>
                    <span className="text-muted-foreground">{c.email ?? "—"}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Raison <span className="text-destructive">*</span></Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REASON_PRESETS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Commentaire <span className="text-destructive">*</span>
              <span className="text-xs text-muted-foreground ml-2">
                (min. 10 caractères — {comment.trim().length}/10)
              </span>
            </Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Justifiez l'action groupée (source des données, période, etc.)…"
              rows={3}
              maxLength={2000}
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer text-xs">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v === true)}
              className="mt-0.5"
            />
            <span>{CONFIRMATION_TEXT}</span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={disabled}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Confirmer ({eligible.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label, value, highlight, warn,
}: { label: string; value: number; highlight?: boolean; warn?: boolean }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          highlight ? "font-bold text-base" :
          warn ? "font-semibold text-amber-700" : "font-medium"
        }
      >
        {value}
      </span>
    </div>
  );
}
