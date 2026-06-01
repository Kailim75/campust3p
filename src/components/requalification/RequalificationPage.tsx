import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useRequalificationContacts, type RequalificationContact } from "@/hooks/useRequalificationContacts";
import { RequalificationKPIs } from "./RequalificationKPIs";
import {
  RequalificationFilters, DEFAULT_FILTERS, type RequalificationFilterState,
} from "./RequalificationFilters";
import { RequalificationCategoryBadge } from "./RequalificationCategoryBadge";
import { RequalificationActionDialog } from "./RequalificationActionDialog";

function matchTriState(value: "all" | "yes" | "no", actual: boolean) {
  if (value === "all") return true;
  return value === "yes" ? actual : !actual;
}

function matchFormation(filter: string, formation: string | null) {
  if (filter === "all") return true;
  if (filter === "continue") return (formation ?? "").toLowerCase().includes("continue");
  return (formation ?? "").toUpperCase() === filter;
}

function applyFilters(contacts: RequalificationContact[], f: RequalificationFilterState) {
  const search = f.search.trim().toLowerCase();
  return contacts.filter((c) => {
    if (search) {
      const blob = [c.nom, c.prenom, c.email].filter(Boolean).join(" ").toLowerCase();
      if (!blob.includes(search)) return false;
    }
    if (f.category !== "all") {
      const cat = c.requalification_category ?? "non_classe";
      if (cat !== f.category) return false;
    }
    if (!matchFormation(f.formation, c.formation)) return false;
    if (!matchTriState(f.importSmartof, c.is_historical_import)) return false;
    if (!matchTriState(f.hasInscription, c.hasInscription)) return false;
    if (!matchTriState(f.hasFacture, c.hasFacture)) return false;
    if (!matchTriState(f.hasPaiement, c.hasPaiement)) return false;
    if (!matchTriState(f.hasDocument, c.hasDocument)) return false;
    if (!matchTriState(f.hasExamen, c.hasExamen)) return false;
    if (f.noProof) {
      if (c.hasExamen || c.hasDocument || c.hasFichePratique) return false;
    }
    if (f.toVerify) {
      if (c.suggestion.recommended !== "anomalie_a_verifier") return false;
    }
    return true;
  });
}

export function RequalificationPage() {
  const { data, isLoading } = useRequalificationContacts();
  const [filters, setFilters] = useState<RequalificationFilterState>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<RequalificationContact | null>(null);

  const filtered = useMemo(() => applyFilters(data ?? [], filters), [data, filters]);

  return (
    <div className="min-h-screen">
      <Header
        title="Requalification contacts"
        subtitle="Préserver l'historique SmartOF sans fausser les KPI actifs — actions manuelles uniquement"
      />

      <main className="p-3 sm:p-6 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement…
          </div>
        ) : (
          <>
            <RequalificationKPIs contacts={data ?? []} />

            <Card className="p-3">
              <RequalificationFilters value={filters} onChange={setFilters} />
            </Card>

            <Card className="p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Formation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Signaux</TableHead>
                    <TableHead>Suggestion</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{c.prenom} {c.nom}</div>
                        <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                      </TableCell>
                      <TableCell className="text-xs">{c.formation ?? "—"}</TableCell>
                      <TableCell className="text-xs">{c.statut_apprenant ?? "—"}</TableCell>
                      <TableCell>
                        <RequalificationCategoryBadge category={c.requalification_category} />
                        {c.is_historical_import && (
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {c.import_source ?? "import"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.hasInscription && <Badge variant="secondary" className="text-[10px]">INSC</Badge>}
                          {c.hasFacture && <Badge variant="secondary" className="text-[10px]">FACT</Badge>}
                          {c.hasPaiement && <Badge variant="secondary" className="text-[10px]">PAY</Badge>}
                          {c.hasDocument && <Badge variant="secondary" className="text-[10px]">DOC</Badge>}
                          {c.hasExamen && <Badge variant="secondary" className="text-[10px]">EXAM</Badge>}
                          {c.hasFichePratique && <Badge variant="secondary" className="text-[10px]">PRAT</Badge>}
                          {!c.hasInscription && !c.hasFacture && !c.hasPaiement && !c.hasDocument && !c.hasExamen && !c.hasFichePratique && (
                            <span className="text-[10px] text-muted-foreground">aucun</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <RequalificationCategoryBadge category={c.suggestion.recommended} />
                          <div className="text-[10px] text-muted-foreground mt-1">
                            {c.suggestion.confidence} — {c.suggestion.reason}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setSelected(c)}>
                          Action
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-6">
                        Aucun contact ne correspond aux filtres.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </>
        )}
      </main>

      <RequalificationActionDialog
        contact={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
      />
    </div>
  );
}
