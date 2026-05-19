import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, ShieldAlert, FileWarning, Pencil } from "lucide-react";
import { useInvoiceCompliance, complianceTone } from "@/hooks/useInvoiceCompliance";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { BuyerSnapshotEditDialog } from "./BuyerSnapshotEditDialog";

interface Props {
  factureId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  numeroFacture?: string;
}

export function InvoiceComplianceDrawer({ factureId, open, onOpenChange, numeroFacture }: Props) {
  const { data, isLoading } = useInvoiceCompliance(open ? factureId : null);
  const [editorOpen, setEditorOpen] = useState(false);

  const { data: statutRow } = useQuery({
    queryKey: ["facture-statut-mini", factureId],
    enabled: open && !!factureId,
    queryFn: async () => {
      const { data } = await supabase.from("factures").select("statut").eq("id", factureId!).single();
      return data;
    },
  });
  const isDraft = statutRow?.statut === "brouillon";

  const tone = complianceTone(data?.score);
  const blocking = data?.issues.filter((i) => i.severity === "bloquant") ?? [];
  const warnings = data?.issues.filter((i) => i.severity === "avertissement") ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileWarning className="h-5 w-5" />
            Conformité e-invoicing
          </SheetTitle>
          <SheetDescription>
            {numeroFacture ? `Facture ${numeroFacture} • ` : ""}
            Réforme française de la facturation électronique 2026/2027
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Analyse en cours…</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Score de conformité</p>
                <span
                  className={cn(
                    "text-2xl font-bold",
                    tone === "success" && "text-success",
                    tone === "warning" && "text-warning",
                    tone === "destructive" && "text-destructive",
                  )}
                >
                  {data.score}/100
                </span>
              </div>
              <Progress value={data.score} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {data.got}/{data.max} points de contrôle validés
              </p>
            </div>

            {/* Bloquants */}
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ShieldAlert className="h-4 w-4 text-destructive" />
                Bloquants
                <Badge variant="destructive" className="ml-auto">{blocking.length}</Badge>
              </h3>
              {blocking.length === 0 ? (
                <p className="rounded-md border border-success/20 bg-success/5 p-3 text-xs text-success flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> Aucun bloquant — la facture est transmissible.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {blocking.map((i) => (
                    <li key={i.code} className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2.5 text-xs">
                      <ShieldAlert className="h-3.5 w-3.5 text-destructive mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{i.label}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{i.code}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Avertissements */}
            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Avertissements
                <Badge variant="secondary" className="ml-auto">{warnings.length}</Badge>
              </h3>
              {warnings.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun avertissement.</p>
              ) : (
                <ul className="space-y-1.5">
                  {warnings.map((i) => (
                    <li key={i.code} className="flex items-start gap-2 rounded-md border border-warning/20 bg-warning/5 p-2.5 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">{i.label}</p>
                        <p className="text-[10px] opacity-60 mt-0.5">{i.code}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p className="font-medium mb-1">À propos de la réforme 2026/2027</p>
              <p>
                À compter de 2026 (réception) puis 2027 (émission), toute facture B2B française devra
                transiter par une Plateforme de Dématérialisation Partenaire (PDP). Les champs
                manquants ci-dessus seront alors rejetés par la plateforme.
              </p>
            </div>

            {isDraft && (
              <Button
                variant="default"
                className="w-full"
                onClick={() => setEditorOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Corriger les données acheteur
              </Button>
            )}
            {!isDraft && statutRow && (
              <p className="text-[11px] text-center text-muted-foreground italic">
                Facture émise — les snapshots acheteur sont figés (réglementaire).
              </p>
            )}
          </div>
        )}
      </SheetContent>

      <BuyerSnapshotEditDialog
        factureId={factureId}
        open={editorOpen}
        onOpenChange={setEditorOpen}
      />
    </Sheet>
  );
}
