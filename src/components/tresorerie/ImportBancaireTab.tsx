import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, AlertCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useImportTransactions, parseBnpCsv, type TransactionBancaire } from "@/hooks/useTresorerie";
import { parseBankPdf } from "@/lib/parseBankPdf";
import { formatEuro } from "@/lib/formatFinancial";
import { cn } from "@/lib/utils";

export function ImportBancaireTab() {
  const [preview, setPreview] = useState<Omit<TransactionBancaire, "id" | "created_at" | "rapproche">[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const importMutation = useImportTransactions();

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

    if (isPdf) {
      (async () => {
        try {
          const txs = await parseBankPdf(file);
          if (txs.length === 0) {
            toast.error("Aucune transaction détectée dans le PDF", {
              description: "Le format du relevé n'est pas reconnu. Essayez un export CSV.",
            });
            return;
          }
          setPreview(txs);
          toast.success(`${txs.length} transactions détectées (PDF)`);
        } catch (err: any) {
          toast.error("Erreur de lecture PDF", { description: err.message });
        }
      })();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const txs = parseBnpCsv(content);
        if (txs.length === 0) {
          toast.error("Aucune transaction détectée", {
            description: "Vérifiez le format du fichier CSV (séparateur ;, dates dd/mm/yyyy)",
          });
          return;
        }
        setPreview(txs);
        toast.success(`${txs.length} transactions détectées`);
      } catch (err: any) {
        toast.error("Erreur de parsing", { description: err.message });
      }
    };
    reader.readAsText(file, "utf-8");
  }, []);

  const handleImport = async () => {
    if (preview.length === 0) return;
    try {
      await importMutation.mutateAsync(preview);
      toast.success(`${preview.length} transactions importées avec succès`);
      setPreview([]);
      setFileName(null);
    } catch (err: any) {
      toast.error("Erreur d'import", { description: err.message });
    }
  };

  const totalCredits = preview.filter((t) => t.montant > 0).reduce((s, t) => s + t.montant, 0);
  const totalDebits = preview.filter((t) => t.montant < 0).reduce((s, t) => s + Math.abs(t.montant), 0);

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importer un relevé bancaire
          </CardTitle>
          <CardDescription>
            Formats acceptés : <strong>CSV</strong> (BNP Paribas, séparateur point-virgule) ou <strong>PDF</strong> (relevé bancaire). Le système extrait automatiquement les transactions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5",
              fileName ? "border-success bg-success/5" : "border-muted-foreground/30"
            )}
          >
            <div className="flex flex-col items-center gap-2">
              {fileName ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">{preview.length} transactions</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Cliquer ou glisser un fichier CSV ou PDF
                  </span>
                </>
              )}
            </div>
            <input type="file" accept=".csv,.txt,.pdf,application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
          </label>
        </CardContent>
      </Card>

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Aperçu de l'import</CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => { setPreview([]); setFileName(null); }}>
                  <Trash2 className="h-4 w-4 mr-1" /> Annuler
                </Button>
                <Button size="sm" onClick={handleImport} disabled={importMutation.isPending}>
                  <Check className="h-4 w-4 mr-1" />
                  {importMutation.isPending ? "Import..." : `Importer ${preview.length} transactions`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="text-lg font-bold">{preview.length}</p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 text-center">
                <p className="text-xs text-muted-foreground">Entrées</p>
                <p className="text-lg font-bold text-success">{formatEuro(totalCredits)}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xs text-muted-foreground">Sorties</p>
                <p className="text-lg font-bold text-destructive">{formatEuro(totalDebits)}</p>
              </div>
            </div>

            {/* Table preview */}
            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Libellé</th>
                    <th className="text-right p-2">Montant</th>
                    <th className="text-center p-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 50).map((tx, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="p-2 whitespace-nowrap">
                        {new Date(tx.date_operation).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="p-2 max-w-[300px] truncate">{tx.libelle}</td>
                      <td className={cn("p-2 text-right font-mono whitespace-nowrap", tx.montant > 0 ? "text-success" : "text-destructive")}>
                        {tx.montant > 0 ? "+" : ""}{formatEuro(tx.montant)}
                      </td>
                      <td className="p-2 text-center">
                        <Badge variant="outline" className={cn("text-xs", tx.montant > 0 ? "border-success/30 text-success" : "border-destructive/30 text-destructive")}>
                          {tx.montant > 0 ? "Crédit" : "Débit"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.length > 50 && (
                <p className="text-xs text-center text-muted-foreground py-2">
                  ... et {preview.length - 50} autres transactions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
