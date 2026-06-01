/**
 * PaiementsListTab — Liste pure des paiements reçus.
 *
 * Lecture seule. Affiche tous les paiements (jointure facture + contact) avec
 * filtres simples (mode, période). Aucune modification de données. Permet
 * d'exporter en CSV.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Download, Euro, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type ModePaiement = "cb" | "virement" | "cheque" | "especes" | "cpf" | "alma";

const modeLabels: Record<ModePaiement | string, string> = {
  cb: "CB",
  virement: "Virement",
  cheque: "Chèque",
  especes: "Espèces",
  cpf: "CPF",
  alma: "Alma",
};

interface PaiementRow {
  id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: string;
  reference: string | null;
  facture: {
    id: string;
    numero_facture: string | null;
    statut: string;
    contact: { nom: string | null; prenom: string | null } | null;
  } | null;
}

export function PaiementsListTab() {
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("all");

  const { data: paiements = [], isLoading } = useQuery({
    queryKey: ["paiements-list-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paiements")
        .select(
          `id, montant, date_paiement, mode_paiement, reference,
           facture:factures!paiements_facture_id_fkey (
             id, numero_facture, statut,
             contact:contacts!factures_contact_id_fkey (nom, prenom)
           )`
        )
        .is("deleted_at", null)
        .order("date_paiement", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data || []) as unknown as PaiementRow[];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paiements.filter((p) => {
      if (modeFilter !== "all" && p.mode_paiement !== modeFilter) return false;
      if (p.facture?.statut === "annulee") return false; // garde-fou : exclure annulées
      if (!q) return true;
      const numero = p.facture?.numero_facture?.toLowerCase() || "";
      const nom = `${p.facture?.contact?.prenom || ""} ${p.facture?.contact?.nom || ""}`.toLowerCase();
      const ref = (p.reference || "").toLowerCase();
      return numero.includes(q) || nom.includes(q) || ref.includes(q);
    });
  }, [paiements, search, modeFilter]);

  const totalAffiche = filtered.reduce((s, p) => s + Number(p.montant || 0), 0);

  const handleExport = () => {
    if (filtered.length === 0) {
      toast.error("Aucun paiement à exporter");
      return;
    }
    const headers = ["Date", "Facture", "Client", "Mode", "Référence", "Montant"];
    const rows = filtered.map((p) => [
      p.date_paiement ? format(new Date(p.date_paiement), "dd/MM/yyyy") : "",
      p.facture?.numero_facture || "",
      `${p.facture?.contact?.prenom || ""} ${p.facture?.contact?.nom || ""}`.trim(),
      modeLabels[p.mode_paiement] || p.mode_paiement,
      p.reference || "",
      Number(p.montant).toFixed(2),
    ]);
    const csv =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `paiements_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filtered.length} paiement(s) exporté(s)`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher facture, client, référence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={modeFilter} onValueChange={setModeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les modes</SelectItem>
            <SelectItem value="cb">CB</SelectItem>
            <SelectItem value="virement">Virement</SelectItem>
            <SelectItem value="cheque">Chèque</SelectItem>
            <SelectItem value="especes">Espèces</SelectItem>
            <SelectItem value="cpf">CPF</SelectItem>
            <SelectItem value="alma">Alma</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-1.5" /> Exporter CSV
        </Button>
      </div>

      {/* Total affiché */}
      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border">
        <Euro className="h-5 w-5 text-success" />
        <div>
          <p className="text-xs text-muted-foreground">Total des {filtered.length} paiement(s) affiché(s)</p>
          <p className="text-lg font-display font-semibold text-success">
            {totalAffiche.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
          </p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Euro}
          title="Aucun paiement"
          description="Aucun paiement ne correspond aux filtres actifs."
        />
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm">
                    {p.date_paiement
                      ? format(new Date(p.date_paiement), "dd MMM yyyy", { locale: fr })
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {p.facture?.numero_facture || "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {`${p.facture?.contact?.prenom || ""} ${p.facture?.contact?.nom || ""}`.trim() || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {modeLabels[p.mode_paiement] || p.mode_paiement}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {p.reference || "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-success">
                    {Number(p.montant).toLocaleString("fr-FR", { minimumFractionDigits: 2 })}€
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Lecture seule. Les paiements liés à une facture annulée sont exclus. Limite d'affichage : 1000 lignes les plus récentes.
      </p>
    </div>
  );
}
