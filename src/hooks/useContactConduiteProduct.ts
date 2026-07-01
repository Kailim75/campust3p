// ═══════════════════════════════════════════════════════════════
// useContactConduiteProduct — Auto-détection du produit conduite
// sélectionné pour un apprenant, via ses factures.
// ═══════════════════════════════════════════════════════════════

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ALLOWED_CONDUITE_SKUS,
  getProduitConduiteBySku,
  type FiliereConduite,
  type ProduitConduiteCatalogue,
} from "@/lib/documents/conduite/produitsCatalogue";

export interface DetectedConduiteProduct {
  filiere: FiliereConduite;
  produit: ProduitConduiteCatalogue;
  facture_id: string;
  facture_ligne_id: string;
  facture_numero: string | null;
  prix_ttc: number;
  montant_paye: number;
  reste_a_payer: number;
}

/**
 * Cherche la ligne de facture la plus récente rattachée au contact
 * dont le SKU appartient au catalogue conduite (ACC-CONDUITE-*).
 */
export function useContactConduiteProduct(contactId: string | null | undefined) {
  return useQuery<DetectedConduiteProduct | null>({
    queryKey: ["contact-conduite-product", contactId],
    enabled: !!contactId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!contactId) return null;

      const { data, error } = await (supabase as any)
        .from("facture_lignes")
        .select(
          `id, code_produit, montant_ttc,
           facture:factures!inner(
             id, numero_facture, contact_id, deleted_at, statut,
             montant_total, total_paye, reste_a_payer, created_at
           )`
        )
        .in("code_produit", ALLOWED_CONDUITE_SKUS)
        .eq("facture.contact_id", contactId)
        .is("facture.deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.warn("[useContactConduiteProduct] query error", error);
        return null;
      }

      const row = (data ?? []).find((r: any) => r.facture) as any;
      if (!row) return null;

      const produit = getProduitConduiteBySku(row.code_produit);
      if (!produit) return null;

      const prix_ttc = Number(row.montant_ttc ?? produit.prix_ttc) || produit.prix_ttc;
      const montant_total = Number(row.facture?.montant_total ?? prix_ttc) || prix_ttc;
      const total_paye = Number(row.facture?.total_paye ?? 0) || 0;
      const ratio = montant_total > 0 ? prix_ttc / montant_total : 1;
      const montant_paye = Math.min(prix_ttc, Math.round(total_paye * ratio * 100) / 100);
      const reste_a_payer = Math.max(0, Math.round((prix_ttc - montant_paye) * 100) / 100);

      return {
        filiere: produit.filiere,
        produit,
        facture_id: row.facture.id,
        facture_ligne_id: row.id,
        facture_numero: row.facture.numero_facture ?? null,
        prix_ttc,
        montant_paye,
        reste_a_payer,
      };
    },
  });
}
