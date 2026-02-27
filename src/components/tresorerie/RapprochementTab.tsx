import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useTransactionsBancaires,
  useRapprocherTransaction,
  useUnrapprochTransaction,
} from "@/hooks/useTresorerie";
import { formatEuro } from "@/lib/formatFinancial";
import { cn } from "@/lib/utils";
import { Link2, Unlink, Search, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function RapprochementTab() {
  const [filter, setFilter] = useState<"all" | "rapproche" | "non_rapproche">("non_rapproche");
  const [search, setSearch] = useState("");
  const { data: transactions, isLoading } = useTransactionsBancaires(
    filter === "all" ? undefined : { rapproche: filter === "rapproche" }
  );
  const rapprocher = useRapprocherTransaction();
  const unrapprocher = useUnrapprochTransaction();

  const filtered = useMemo(() => {
    if (!transactions) return [];
    if (!search) return transactions;
    const s = search.toLowerCase();
    return transactions.filter(
      (t) => t.libelle.toLowerCase().includes(s) || formatEuro(t.montant).includes(s)
    );
  }, [transactions, search]);

  const handleAutoRapprochement = async () => {
    if (!transactions) return;
    const nonRapprochees = transactions.filter((t) => !t.rapproche);
    if (nonRapprochees.length === 0) {
      toast.info("Toutes les transactions sont déjà rapprochées");
      return;
    }

    // Fetch paiements for matching
    const { data: paiements } = await supabase
      .from("paiements")
      .select("id, montant, date_paiement, facture_id")
      .order("date_paiement", { ascending: false });

    if (!paiements?.length) {
      toast.info("Aucun paiement trouvé pour le rapprochement automatique");
      return;
    }

    let matched = 0;
    const usedPaiementIds = new Set<string>();

    for (const tx of nonRapprochees) {
      if (tx.montant <= 0) continue; // Only match credits

      const match = paiements.find(
        (p) =>
          !usedPaiementIds.has(p.id) &&
          Math.abs(Number(p.montant) - tx.montant) < 0.01 &&
          Math.abs(new Date(p.date_paiement).getTime() - new Date(tx.date_operation).getTime()) < 7 * 86400000
      );

      if (match) {
        try {
          await rapprocher.mutateAsync({
            transactionId: tx.id,
            paiementId: match.id,
            factureId: match.facture_id || undefined,
          });
          usedPaiementIds.add(match.id);
          matched++;
        } catch {
          // skip silently
        }
      }
    }

    if (matched > 0) {
      toast.success(`${matched} transaction(s) rapprochée(s) automatiquement`);
    } else {
      toast.info("Aucune correspondance trouvée automatiquement");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            <SelectItem value="non_rapproche">Non rapprochées</SelectItem>
            <SelectItem value="rapproche">Rapprochées</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAutoRapprochement} variant="outline">
          <Link2 className="h-4 w-4 mr-2" />
          Rapprochement auto
        </Button>
      </div>

      {/* Transactions list */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>Aucune transaction à afficher</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((tx) => (
            <Card key={tx.id} className={cn("transition-all", tx.rapproche && "border-success/30 bg-success/5")}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Status */}
                  <div className={cn("p-2 rounded-lg", tx.rapproche ? "bg-success/10" : "bg-warning/10")}>
                    {tx.rapproche ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <Clock className="h-5 w-5 text-warning" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tx.libelle}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.date_operation).toLocaleDateString("fr-FR")}
                      {tx.banque && ` · ${tx.banque}`}
                    </p>
                  </div>

                  {/* Amount */}
                  <div className="text-right">
                    <p className={cn("font-mono font-bold", tx.montant > 0 ? "text-success" : "text-destructive")}>
                      {tx.montant > 0 ? "+" : ""}
                      {formatEuro(tx.montant)}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {tx.rapproche ? "Rapproché" : "En attente"}
                    </Badge>
                  </div>

                  {/* Actions */}
                  {tx.rapproche ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => unrapprocher.mutate(tx.id)}
                      className="text-muted-foreground"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
