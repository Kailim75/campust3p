import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TransactionBancaire {
  id: string;
  date_operation: string;
  date_valeur: string | null;
  libelle: string;
  montant: number;
  type_operation: string;
  categorie: string | null;
  reference_bancaire: string | null;
  banque: string;
  compte: string | null;
  rapproche: boolean;
  facture_id: string | null;
  paiement_id: string | null;
  charge_id: string | null;
  notes: string | null;
  import_batch_id: string | null;
  created_at: string;
}

export interface TresorerieSolde {
  id: string;
  date_solde: string;
  solde_reel: number;
  solde_previsionnel: number | null;
  banque: string;
  compte: string | null;
  notes: string | null;
  created_at: string;
}

export interface TresorerieAlerte {
  id: string;
  type_alerte: string;
  titre: string;
  description: string | null;
  montant_seuil: number | null;
  statut: string;
  date_alerte: string;
  created_at: string;
}

// Fetch transactions
export function useTransactionsBancaires(filters?: { rapproche?: boolean; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: ["transactions_bancaires", filters],
    queryFn: async () => {
      let query = supabase
        .from("transactions_bancaires")
        .select("*")
        .order("date_operation", { ascending: false });

      if (filters?.rapproche !== undefined) {
        query = query.eq("rapproche", filters.rapproche);
      }
      if (filters?.dateFrom) {
        query = query.gte("date_operation", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("date_operation", filters.dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as TransactionBancaire[];
    },
  });
}

// Import transactions from CSV
export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactions: Omit<TransactionBancaire, "id" | "created_at" | "rapproche">[]) => {
      const batchId = `import_${Date.now()}`;
      const rows = transactions.map((t) => ({
        ...t,
        import_batch_id: batchId,
        rapproche: false,
      }));

      const { data, error } = await supabase
        .from("transactions_bancaires")
        .insert(rows)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions_bancaires"] });
    },
  });
}

// Rapprocher une transaction avec une facture/paiement/charge
export function useRapprocherTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionId,
      factureId,
      paiementId,
      chargeId,
    }: {
      transactionId: string;
      factureId?: string;
      paiementId?: string;
      chargeId?: string;
    }) => {
      const { error } = await supabase
        .from("transactions_bancaires")
        .update({
          rapproche: true,
          facture_id: factureId || null,
          paiement_id: paiementId || null,
          charge_id: chargeId || null,
        })
        .eq("id", transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions_bancaires"] });
      queryClient.invalidateQueries({ queryKey: ["tresorerie_stats"] });
    },
  });
}

// Dé-rapprocher
export function useUnrapprochTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionId: string) => {
      const { error } = await supabase
        .from("transactions_bancaires")
        .update({
          rapproche: false,
          facture_id: null,
          paiement_id: null,
          charge_id: null,
        })
        .eq("id", transactionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions_bancaires"] });
    },
  });
}

// Delete transaction
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions_bancaires").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions_bancaires"] });
    },
  });
}

// Soldes
export function useTresorerieSoldes() {
  return useQuery({
    queryKey: ["tresorerie_soldes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tresorerie_soldes")
        .select("*")
        .order("date_solde", { ascending: false })
        .limit(90);

      if (error) throw error;
      return data as TresorerieSolde[];
    },
  });
}

export function useUpsertSolde() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (solde: Omit<TresorerieSolde, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("tresorerie_soldes")
        .insert(solde)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tresorerie_soldes"] });
    },
  });
}

// Alertes
export function useTresorerieAlertes() {
  return useQuery({
    queryKey: ["tresorerie_alertes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tresorerie_alertes")
        .select("*")
        .order("date_alerte", { ascending: false });

      if (error) throw error;
      return data as TresorerieAlerte[];
    },
  });
}

// Stats agrégées
export function useTresorerieStats() {
  return useQuery({
    queryKey: ["tresorerie_stats"],
    queryFn: async () => {
      // Transactions du mois en cours
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      const { data: txs, error } = await supabase
        .from("transactions_bancaires")
        .select("montant, type_operation, rapproche, date_operation")
        .gte("date_operation", firstOfMonth);

      if (error) throw error;

      const allTxs = txs || [];
      const totalCredits = allTxs.filter((t) => t.montant > 0).reduce((s, t) => s + Number(t.montant), 0);
      const totalDebits = allTxs.filter((t) => t.montant < 0).reduce((s, t) => s + Math.abs(Number(t.montant)), 0);
      const nbRapproche = allTxs.filter((t) => t.rapproche).length;
      const nbNonRapproche = allTxs.filter((t) => !t.rapproche).length;
      const tauxRapprochement = allTxs.length > 0 ? Math.round((nbRapproche / allTxs.length) * 100) : 0;

      // Dernier solde
      const { data: soldes } = await supabase
        .from("tresorerie_soldes")
        .select("solde_reel, date_solde")
        .order("date_solde", { ascending: false })
        .limit(1);

      const dernierSolde = soldes?.[0]?.solde_reel || 0;
      const dateDernierSolde = soldes?.[0]?.date_solde || null;

      return {
        totalCredits,
        totalDebits,
        soldeNet: totalCredits - totalDebits,
        nbRapproche,
        nbNonRapproche,
        tauxRapprochement,
        dernierSolde: Number(dernierSolde),
        dateDernierSolde,
        nbTransactions: allTxs.length,
      };
    },
  });
}

// Parse CSV BNP format
export function parseBnpCsv(csvContent: string): Omit<TransactionBancaire, "id" | "created_at" | "rapproche">[] {
  const lines = csvContent.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].split(";").map((h) => h.trim().replace(/"/g, "").toLowerCase());

  // Try to detect columns
  const dateIdx = header.findIndex((h) => h.includes("date") && h.includes("opé"));
  const dateValIdx = header.findIndex((h) => h.includes("date") && h.includes("val"));
  const libelleIdx = header.findIndex((h) => h.includes("libellé") || h.includes("libelle") || h.includes("label"));
  const montantIdx = header.findIndex((h) => h.includes("montant") || h.includes("débit") || h.includes("credit"));
  const debitIdx = header.findIndex((h) => h.includes("débit") || h.includes("debit"));
  const creditIdx = header.findIndex((h) => h.includes("crédit") || h.includes("credit"));

  const transactions: Omit<TransactionBancaire, "id" | "created_at" | "rapproche">[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.trim().replace(/"/g, ""));
    if (cols.length < 3) continue;

    // Parse date (dd/mm/yyyy → yyyy-mm-dd)
    const rawDate = cols[dateIdx >= 0 ? dateIdx : 0];
    const dateParts = rawDate.split("/");
    const dateOp = dateParts.length === 3
      ? `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`
      : rawDate;

    const rawDateVal = dateValIdx >= 0 ? cols[dateValIdx] : null;
    let dateVal: string | null = null;
    if (rawDateVal) {
      const dvParts = rawDateVal.split("/");
      dateVal = dvParts.length === 3
        ? `${dvParts[2]}-${dvParts[1].padStart(2, "0")}-${dvParts[0].padStart(2, "0")}`
        : rawDateVal;
    }

    const libelle = cols[libelleIdx >= 0 ? libelleIdx : 1] || "Transaction";

    let montant = 0;
    if (debitIdx >= 0 && creditIdx >= 0) {
      const debit = parseFloat((cols[debitIdx] || "0").replace(",", ".").replace(/\s/g, ""));
      const credit = parseFloat((cols[creditIdx] || "0").replace(",", ".").replace(/\s/g, ""));
      montant = credit ? credit : debit ? -Math.abs(debit) : 0;
    } else {
      montant = parseFloat((cols[montantIdx >= 0 ? montantIdx : 2] || "0").replace(",", ".").replace(/\s/g, ""));
    }

    if (isNaN(montant) || montant === 0) continue;

    transactions.push({
      date_operation: dateOp,
      date_valeur: dateVal,
      libelle,
      montant,
      type_operation: montant > 0 ? "credit" : "debit",
      categorie: null,
      reference_bancaire: null,
      banque: "BNP",
      compte: null,
      facture_id: null,
      paiement_id: null,
      charge_id: null,
      notes: null,
      import_batch_id: null,
      
    });
  }

  return transactions;
}
