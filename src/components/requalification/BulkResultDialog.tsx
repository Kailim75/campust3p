import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { downloadCSV, resultsToCSV } from "@/lib/requalification/bulkSelection";
import type { BulkMarkSmartOFResult } from "@/hooks/useRequalificationActions";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  result: BulkMarkSmartOFResult | null;
}

export function BulkResultDialog({ open, onOpenChange, result }: Props) {
  if (!result) return null;

  const exportCSV = () => {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    downloadCSV(`smartof-bulk-${ts}.csv`, resultsToCSV(result.rows));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Résultat de l'action groupée</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold text-emerald-700">{result.processed}</div>
            <div className="text-xs text-muted-foreground">Traités</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold text-muted-foreground">{result.skipped}</div>
            <div className="text-xs text-muted-foreground">Ignorés</div>
          </div>
          <div className="rounded-md border p-3">
            <div className="text-2xl font-bold text-destructive">{result.failed}</div>
            <div className="text-xs text-muted-foreground">Échecs</div>
          </div>
        </div>

        {result.failed > 0 && (
          <div className="mt-4">
            <div className="text-xs font-medium mb-1 text-destructive">Erreurs détaillées</div>
            <div className="rounded-md border max-h-48 overflow-y-auto text-xs">
              {result.rows
                .filter((r) => r.status === "error")
                .map((r) => (
                  <div key={r.contactId} className="px-3 py-1.5 border-b last:border-0">
                    <div className="font-medium">{r.nom} <span className="text-muted-foreground">{r.email ?? ""}</span></div>
                    <div className="text-destructive">{r.message}</div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" /> Exporter CSV
          </Button>
          <Button onClick={() => onOpenChange(false)}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
