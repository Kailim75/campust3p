import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Download, Search, ArrowUpDown } from "lucide-react";
import { formatEuro, MODE_VERSEMENT_LABELS, FORMATION_LABELS } from "@/lib/formatFinancial";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { PeriodRange } from "@/hooks/useFinancialData";
import { useVersementsEnriched, useParametresFinanciers } from "@/hooks/useFinancialData";

interface Props {
  range: PeriodRange;
}

type SortKey = "date_encaissement" | "contactNom" | "formation" | "montant" | "mode";

export function RevenusTab({ range }: Props) {
  const { data: versements = [], isLoading } = useVersementsEnriched(range);
  const { data: params } = useParametresFinanciers();
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");
  const [formationFilter, setFormationFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date_encaissement");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filtered = useMemo(() => {
    let list = versements;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v => v.contactNom.toLowerCase().includes(q));
    }
    if (modeFilter !== "all") list = list.filter(v => v.mode === modeFilter);
    if (formationFilter !== "all") list = list.filter(v => v.formation === formationFilter);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "montant") cmp = Number(a.montant) - Number(b.montant);
      else cmp = String((a as any)[sortKey]).localeCompare(String((b as any)[sortKey]));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [versements, search, modeFilter, formationFilter, sortKey, sortDir]);

  const total = filtered.reduce((s, v) => s + Number(v.montant), 0);

  // Metrics
  const metrics = useMemo(() => {
    if (versements.length === 0) return [];
    const totalAll = versements.reduce((s, v) => s + Number(v.montant), 0);
    const ticketMoyen = totalAll / versements.length;
    
    const byFormation: Record<string, { sum: number; count: number }> = {};
    versements.forEach(v => {
      const f = v.formation || "Autre";
      if (!byFormation[f]) byFormation[f] = { sum: 0, count: 0 };
      byFormation[f].sum += Number(v.montant);
      byFormation[f].count++;
    });

    const m = [{ label: "Ticket moyen global", value: formatEuro(ticketMoyen) }];
    ["TAXI", "VTC", "VMDTR"].forEach(f => {
      if (byFormation[f]) {
        m.push({ label: `Ticket moyen ${f}`, value: formatEuro(byFormation[f].sum / byFormation[f].count) });
      }
    });
    return m;
  }, [versements]);

  const handleExportCSV = () => {
    const headers = ["Date", "Apprenant", "Formation", "Montant", "Mode", "Référence"];
    const rows = filtered.map(v => [
      v.date_encaissement,
      v.contactNom,
      FORMATION_LABELS[v.formation] || v.formation,
      Number(v.montant).toFixed(2).replace(".", ","),
      MODE_VERSEMENT_LABELS[v.mode] || v.mode,
      v.reference || "",
    ]);
    const csv = [headers.join(";"), ...rows.map(r => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenus_${range.start}_${range.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>;
  }

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button onClick={() => toggleSort(field)} className="flex items-center gap-1 hover:text-foreground transition-colors">
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Metrics */}
      {metrics.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(m => (
            <Card key={m.label} className="p-4">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-lg font-bold font-display mt-1">{m.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher un apprenant..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modes</SelectItem>
            {Object.entries(MODE_VERSEMENT_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={formationFilter} onValueChange={setFormationFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Formation" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes formations</SelectItem>
            {Object.entries(FORMATION_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="ml-auto">
          <Download className="h-4 w-4 mr-2" /> Exporter CSV
        </Button>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><SortHeader label="Date" field="date_encaissement" /></TableHead>
              <TableHead><SortHeader label="Apprenant" field="contactNom" /></TableHead>
              <TableHead><SortHeader label="Formation" field="formation" /></TableHead>
              <TableHead className="text-right"><SortHeader label="Montant" field="montant" /></TableHead>
              <TableHead><SortHeader label="Mode" field="mode" /></TableHead>
              <TableHead>Référence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  Aucun versement sur cette période
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(v => (
                <TableRow key={v.id}>
                  <TableCell className="text-sm">{format(new Date(v.date_encaissement), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="font-medium text-sm">{v.contactNom}</TableCell>
                  <TableCell className="text-sm">{FORMATION_LABELS[v.formation] || v.formation}</TableCell>
                  <TableCell className="text-right font-medium text-sm">{formatEuro(Number(v.montant))}</TableCell>
                  <TableCell className="text-sm">{MODE_VERSEMENT_LABELS[v.mode] || v.mode}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{v.reference || "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {filtered.length > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/50 sticky bottom-0">
                <TableCell colSpan={3} className="font-bold">TOTAL</TableCell>
                <TableCell className="text-right font-bold">{formatEuro(total)}</TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </Card>
    </div>
  );
}
