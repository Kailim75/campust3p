import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, FileSpreadsheet, Check, Trash2, ArrowLeftRight, AlertCircle, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useImportTransactions, parseBnpCsv, type TransactionBancaire } from "@/hooks/useTresorerie";
import { parseBankPdf, type SignSource } from "@/lib/parseBankPdf";
import { formatEuro } from "@/lib/formatFinancial";
import { cn } from "@/lib/utils";

type DraftTx = Omit<TransactionBancaire, "id" | "created_at" | "rapproche"> & {
  _key: string;
  _selected: boolean;
  _signSource?: SignSource;
  _signOverridden?: boolean;
};

const SIGN_SOURCE_LABELS: Record<SignSource, { label: string; tip: string; tone: string }> = {
  column: {
    label: "Colonne",
    tip: "Signe déduit de la colonne Débit ou Crédit du relevé",
    tone: "border-success/40 text-success bg-success/5",
  },
  "amount-column": {
    label: "Montant ±",
    tip: "Colonne Montant unique avec signe explicite",
    tone: "border-success/40 text-success bg-success/5",
  },
  explicit: {
    label: "Signe explicite",
    tip: "Signe - présent directement sur le montant (ex: -12,00 ou 12,00-)",
    tone: "border-primary/40 text-primary bg-primary/5",
  },
  keyword: {
    label: "Mots-clés",
    tip: "Signe déduit du libellé (prélèvement, virement reçu, etc.) — à vérifier",
    tone: "border-warning/40 text-warning bg-warning/5",
  },
  fallback: {
    label: "À vérifier",
    tip: "Aucun indice fiable — signe basé sur le dernier montant de la ligne",
    tone: "border-destructive/40 text-destructive bg-destructive/5",
  },
};

// Mots-clés FR — détecte une opération clairement débit ou clairement crédit dans le libellé.
// Liste alignée avec parseBankPdf.ts pour cohérence.
const DEBIT_HINTS = [
  { re: /\bd[ée]bit[ée]?\b/i, label: "débité" },
  { re: /\bpr[ée]l[èe]v(?:ement|é|e)\b|\bprlv\b/i, label: "prélèvement" },
  { re: /\bpaiement carte\b|\bachat cb\b|\bcb\s/i, label: "paiement carte" },
  { re: /\bvir(?:ement)?\s+(?:[ée]mis|sortant)\b/i, label: "virement émis" },
  { re: /\bretrait(?:\s+dab)?\b/i, label: "retrait" },
  { re: /\bch(?:e|è)que\s+[ée]mis\b|\bchq\s/i, label: "chèque émis" },
  { re: /\bagios?\b|\bfrais\b|\bcotisation\b|\bcommission\b/i, label: "frais / agios" },
];
const CREDIT_HINTS = [
  { re: /\bcr[ée]dit[ée]?\b/i, label: "crédité" },
  { re: /\bvir(?:ement)?\s+re[çc]u\b|\bvir\.?\s+re[çc]u\b/i, label: "virement reçu" },
  { re: /\bremise\b|\bversement\b|\bencaissement\b/i, label: "remise / versement" },
  { re: /\bre[çc]u de\b/i, label: "reçu de" },
  { re: /\bremboursement\b/i, label: "remboursement" },
];

interface SignSuggestion {
  expectedSign: 1 | -1;
  matchedKeyword: string;
  reason: "débit" | "crédit";
}

function suggestSignFromLibelle(libelle: string, currentMontant: number): SignSuggestion | null {
  if (!libelle || !currentMontant) return null;
  const debitHit = DEBIT_HINTS.find((h) => h.re.test(libelle));
  const creditHit = CREDIT_HINTS.find((h) => h.re.test(libelle));
  // Si les deux matchent, on n'invente rien (ambigu)
  if (debitHit && creditHit) return null;
  if (debitHit && currentMontant > 0) {
    return { expectedSign: -1, matchedKeyword: debitHit.label, reason: "débit" };
  }
  if (creditHit && currentMontant < 0) {
    return { expectedSign: 1, matchedKeyword: creditHit.label, reason: "crédit" };
  }
  return null;
}

let _idCounter = 0;
const newKey = () => `tx_${Date.now()}_${_idCounter++}`;

export function ImportBancaireTab() {
  const [drafts, setDrafts] = useState<DraftTx[]>([]);
  // Snapshot des drafts juste après parsing (avant toute correction auto/manuelle).
  // Permet de revenir à l'état initial pour comparer.
  const [originalDrafts, setOriginalDrafts] = useState<DraftTx[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [autoApplyHints, setAutoApplyHints] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = window.localStorage.getItem("tresorerie.autoApplySignHints");
    return v === null ? true : v === "1";
  });
  const importMutation = useImportTransactions();

  const setAutoApplyAndPersist = (v: boolean) => {
    setAutoApplyHints(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tresorerie.autoApplySignHints", v ? "1" : "0");
    }
  };

  // Applique les suggestions de signe basées sur les mots-clés du libellé.
  // Retourne le nouveau tableau + le nombre de corrections appliquées.
  const applyHintsToDrafts = (input: DraftTx[]): { next: DraftTx[]; corrected: number } => {
    let corrected = 0;
    const next = input.map((r) => {
      const s = suggestSignFromLibelle(r.libelle, Number(r.montant));
      if (!s) return r;
      const newMontant = s.expectedSign * Math.abs(Number(r.montant));
      corrected++;
      return {
        ...r,
        montant: newMontant,
        type_operation: newMontant > 0 ? "credit" : "debit",
        _signOverridden: true,
        _signSource: "keyword" as SignSource,
      };
    });
    return { next, corrected };
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setFileName(file.name);
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";

      const toDrafts = (txs: any[]): DraftTx[] =>
        txs.map((t) => ({ ...t, _key: newKey(), _selected: true }));

      const finalize = (rawDrafts: DraftTx[], origin: "PDF" | "CSV") => {
        if (autoApplyHints) {
          const { next, corrected } = applyHintsToDrafts(rawDrafts);
          setDrafts(next);
          if (corrected > 0) {
            toast.success(
              `${rawDrafts.length} transactions détectées (${origin}) — ${corrected} signe(s) corrigé(s) automatiquement`,
            );
          } else {
            toast.success(`${rawDrafts.length} transactions détectées (${origin}) — aucun ajustement nécessaire`);
          }
        } else {
          setDrafts(rawDrafts);
          toast.success(`${rawDrafts.length} transactions détectées (${origin}) — vérifiez avant import`);
        }
      };

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
            finalize(toDrafts(txs), "PDF");
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
          finalize(toDrafts(txs), "CSV");
        } catch (err: any) {
          toast.error("Erreur de parsing", { description: err.message });
        }
      };
      reader.readAsText(file, "utf-8");
    },
    [autoApplyHints],
  );

  // ── Edition ───────────────────────────────────────────────────────────
  const updateRow = (key: string, patch: Partial<DraftTx>) => {
    setDrafts((prev) => prev.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  };

  const deleteRow = (key: string) => {
    setDrafts((prev) => prev.filter((r) => r._key !== key));
  };

  const toggleSign = (key: string) => {
    setDrafts((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const m = -r.montant;
        return { ...r, montant: m, type_operation: m > 0 ? "credit" : "debit", _signOverridden: true };
      }),
    );
  };

  const setSelected = (key: string, value: boolean) => updateRow(key, { _selected: value });

  const allSelected = drafts.length > 0 && drafts.every((r) => r._selected);
  const someSelected = drafts.some((r) => r._selected);

  const toggleAll = () => {
    const next = !allSelected;
    setDrafts((prev) => prev.map((r) => ({ ...r, _selected: next })));
  };

  const deleteSelected = () => {
    setDrafts((prev) => prev.filter((r) => !r._selected));
  };

  // ── Validation par ligne ─────────────────────────────────────────────
  const validateRow = (r: DraftTx): string | null => {
    if (!r.date_operation || !/^\d{4}-\d{2}-\d{2}$/.test(r.date_operation)) return "Date invalide";
    if (!r.libelle || r.libelle.trim().length === 0) return "Libellé manquant";
    if (!r.montant || isNaN(Number(r.montant)) || Number(r.montant) === 0) return "Montant invalide";
    return null;
  };

  const rowErrors = useMemo(() => {
    const map = new Map<string, string>();
    drafts.forEach((r) => {
      const err = validateRow(r);
      if (err) map.set(r._key, err);
    });
    return map;
  }, [drafts]);

  const selected = drafts.filter((r) => r._selected);
  const invalidSelected = selected.filter((r) => rowErrors.has(r._key));
  const totalCredits = selected.filter((r) => r.montant > 0).reduce((s, r) => s + Number(r.montant), 0);
  const totalDebits = selected.filter((r) => r.montant < 0).reduce((s, r) => s + Math.abs(Number(r.montant)), 0);

  // ── Suggestions de signe basées sur le libellé ───────────────────────
  const suggestions = useMemo(() => {
    const map = new Map<string, SignSuggestion>();
    drafts.forEach((r) => {
      const s = suggestSignFromLibelle(r.libelle, Number(r.montant));
      if (s) map.set(r._key, s);
    });
    return map;
  }, [drafts]);

  const applySuggestion = (key: string) => {
    const s = suggestions.get(key);
    if (!s) return;
    setDrafts((prev) =>
      prev.map((r) => {
        if (r._key !== key) return r;
        const newMontant = s.expectedSign * Math.abs(Number(r.montant));
        return {
          ...r,
          montant: newMontant,
          type_operation: newMontant > 0 ? "credit" : "debit",
          _signOverridden: true,
          _signSource: "keyword",
        };
      }),
    );
  };

  const applyAllSuggestions = () => {
    if (suggestions.size === 0) return;
    setDrafts((prev) =>
      prev.map((r) => {
        const s = suggestions.get(r._key);
        if (!s) return r;
        const newMontant = s.expectedSign * Math.abs(Number(r.montant));
        return {
          ...r,
          montant: newMontant,
          type_operation: newMontant > 0 ? "credit" : "debit",
          _signOverridden: true,
          _signSource: "keyword",
        };
      }),
    );
    toast.success(`${suggestions.size} signe(s) corrigé(s) automatiquement`);
  };

  // ── Import ────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (selected.length === 0) {
      toast.error("Aucune transaction sélectionnée");
      return;
    }
    if (invalidSelected.length > 0) {
      toast.error(`${invalidSelected.length} ligne(s) invalide(s)`, {
        description: "Corrigez ou décochez les lignes en erreur avant d'importer.",
      });
      return;
    }
    try {
      const payload = selected.map(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ _key, _selected, _signSource, _signOverridden, ...rest }) => rest,
      );
      await importMutation.mutateAsync(payload);
      toast.success(`${payload.length} transactions importées avec succès`);
      setDrafts([]);
      setFileName(null);
    } catch (err: any) {
      toast.error("Erreur d'import", { description: err.message });
    }
  };

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
            Formats acceptés : <strong>CSV</strong> (BNP Paribas, séparateur point-virgule) ou <strong>PDF</strong>{" "}
            (relevé bancaire). Le système extrait automatiquement les transactions, puis vous pourrez vérifier et
            corriger chaque ligne avant validation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Toggle correction auto */}
          <label className="flex items-start gap-2 p-3 rounded-md border bg-muted/30 cursor-pointer">
            <Checkbox
              checked={autoApplyHints}
              onCheckedChange={(v) => setAutoApplyAndPersist(!!v)}
              className="mt-0.5"
            />
            <div className="flex-1 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <Wand2 className="h-3.5 w-3.5 text-warning" />
                Corriger automatiquement les signes via mots-clés à l'import
              </div>
              <p className="text-muted-foreground mt-0.5">
                Détecte « débité », « prélèvement », « virement reçu », etc. dans le libellé pour ajuster
                automatiquement débit / crédit. Vous pouvez toujours vérifier et annuler ligne par ligne avant validation.
              </p>
            </div>
          </label>
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
              "hover:border-primary hover:bg-primary/5",
              fileName ? "border-success bg-success/5" : "border-muted-foreground/30",
            )}
          >
            <div className="flex flex-col items-center gap-2">
              {fileName ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-success" />
                  <span className="text-sm font-medium">{fileName}</span>
                  <span className="text-xs text-muted-foreground">{drafts.length} transactions détectées</span>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Cliquer ou glisser un fichier CSV ou PDF</span>
                </>
              )}
            </div>
            <input
              type="file"
              accept=".csv,.txt,.pdf,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </CardContent>
      </Card>

      {/* Validation */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Vérification avant import</CardTitle>
                <CardDescription className="mt-1">
                  Modifiez date, libellé ou montant directement dans le tableau. Cliquez sur{" "}
                  <ArrowLeftRight className="inline h-3 w-3" /> pour basculer débit ↔ crédit. Décochez les lignes à
                  ignorer.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDrafts([]);
                    setFileName(null);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" /> Tout annuler
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={importMutation.isPending || selected.length === 0 || invalidSelected.length > 0}
                >
                  <Check className="h-4 w-4 mr-1" />
                  {importMutation.isPending
                    ? "Import..."
                    : `Valider ${selected.length} transaction${selected.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground">Sélectionnées</p>
                <p className="text-lg font-bold">
                  {selected.length}
                  <span className="text-sm font-normal text-muted-foreground">/{drafts.length}</span>
                </p>
              </div>
              <div className="p-3 rounded-lg bg-success/10 text-center">
                <p className="text-xs text-muted-foreground">Entrées</p>
                <p className="text-lg font-bold text-success">{formatEuro(totalCredits)}</p>
              </div>
              <div className="p-3 rounded-lg bg-destructive/10 text-center">
                <p className="text-xs text-muted-foreground">Sorties</p>
                <p className="text-lg font-bold text-destructive">{formatEuro(totalDebits)}</p>
              </div>
              <div
                className={cn(
                  "p-3 rounded-lg text-center",
                  invalidSelected.length > 0 ? "bg-destructive/10" : "bg-muted/50",
                )}
              >
                <p className="text-xs text-muted-foreground">Erreurs</p>
                <p
                  className={cn(
                    "text-lg font-bold",
                    invalidSelected.length > 0 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {invalidSelected.length}
                </p>
              </div>
            </div>

            {/* Bandeau de suggestions auto */}
            {suggestions.size > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 p-3 rounded-lg border border-warning/40 bg-warning/5">
                <div className="flex items-center gap-2 text-sm">
                  <Wand2 className="h-4 w-4 text-warning" />
                  <span>
                    <strong>{suggestions.size}</strong> ligne{suggestions.size > 1 ? "s" : ""} avec un signe
                    incohérent par rapport au libellé (mots-clés détectés)
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={applyAllSuggestions} className="h-8">
                  <Wand2 className="h-3.5 w-3.5 mr-1" /> Tout corriger
                </Button>
              </div>
            )}

            {/* Bulk actions */}
            {someSelected && (
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Button variant="ghost" size="sm" onClick={deleteSelected} className="h-7 text-xs">
                  <Trash2 className="h-3 w-3 mr-1" /> Supprimer la sélection
                </Button>
              </div>
            )}

            {/* Table */}
            <div className="max-h-[500px] overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-10">
                      <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Tout sélectionner" />
                    </th>
                    <th className="text-left p-2 w-32">Date</th>
                    <th className="text-left p-2">Libellé</th>
                    <th className="text-right p-2 w-32">Montant</th>
                    <th className="text-center p-2 w-24">Type</th>
                    <th className="text-center p-2 w-28">Origine</th>
                    <th className="p-2 w-20" />
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((r) => {
                    const error = rowErrors.get(r._key);
                    const suggestion = suggestions.get(r._key);
                    return (
                      <tr
                        key={r._key}
                        className={cn(
                          "border-t hover:bg-muted/20 transition-colors",
                          !r._selected && "opacity-50",
                          error && r._selected && "bg-destructive/5",
                        )}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={r._selected}
                            onCheckedChange={(v) => setSelected(r._key, !!v)}
                            aria-label="Sélectionner"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            type="date"
                            value={r.date_operation}
                            onChange={(e) => updateRow(r._key, { date_operation: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2">
                          <Input
                            value={r.libelle}
                            onChange={(e) => updateRow(r._key, { libelle: e.target.value })}
                            className="h-8 text-xs"
                            placeholder="Libellé"
                          />
                          {error && (
                            <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> {error}
                            </p>
                          )}
                          {suggestion && (
                            <div className="mt-1 flex items-center gap-2 text-[10px]">
                              <span className="text-warning flex items-center gap-1">
                                <Wand2 className="h-3 w-3" />
                                Mot-clé «&nbsp;{suggestion.matchedKeyword}&nbsp;» → devrait être un{" "}
                                <strong>{suggestion.reason}</strong>
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => applySuggestion(r._key)}
                                className="h-5 px-2 py-0 text-[10px]"
                              >
                                Appliquer
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="p-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={r.montant}
                            onChange={(e) => {
                              const v = parseFloat(e.target.value);
                              updateRow(r._key, {
                                montant: isNaN(v) ? 0 : v,
                                type_operation: v > 0 ? "credit" : "debit",
                              });
                            }}
                            className={cn(
                              "h-8 text-xs text-right font-mono",
                              r.montant > 0 ? "text-success" : "text-destructive",
                            )}
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            onClick={() => toggleSign(r._key)}
                            className="inline-flex items-center gap-1"
                            title="Basculer débit / crédit"
                          >
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] cursor-pointer hover:bg-muted",
                                r.montant > 0
                                  ? "border-success/40 text-success"
                                  : "border-destructive/40 text-destructive",
                              )}
                            >
                              <ArrowLeftRight className="h-2.5 w-2.5 mr-1" />
                              {r.montant > 0 ? "Crédit" : "Débit"}
                            </Badge>
                          </button>
                        </td>
                        <td className="p-2 text-center">
                          {(() => {
                            const src = r._signSource;
                            if (!src) {
                              return <span className="text-[10px] text-muted-foreground">—</span>;
                            }
                            const meta = SIGN_SOURCE_LABELS[src];
                            return (
                              <Badge
                                variant="outline"
                                className={cn("text-[10px]", meta.tone)}
                                title={
                                  r._signOverridden
                                    ? `${meta.tip} — corrigé manuellement`
                                    : meta.tip
                                }
                              >
                                {meta.label}
                                {r._signOverridden && <span className="ml-1">✎</span>}
                              </Badge>
                            );
                          })()}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteRow(r._key)}
                            className="h-7 w-7 p-0"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
