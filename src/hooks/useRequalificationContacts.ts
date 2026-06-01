import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { classify, type ClassifierResult } from "@/lib/requalification/classifier";
import type { RequalificationCategory } from "@/lib/requalification/categories";

export interface RequalificationContact {
  id: string;
  centre_id: string | null;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  formation: string | null;
  statut_apprenant: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  is_historical_import: boolean;
  import_source: string | null;
  imported_at: string | null;
  requalification_category: RequalificationCategory | null;
  // Signals
  hasInscription: boolean;
  hasFacture: boolean;
  hasPaiement: boolean;
  hasDocument: boolean;
  hasExamen: boolean;
  hasFichePratique: boolean;
  suggestion: ClassifierResult;
}

export function useRequalificationContacts() {
  return useQuery({
    queryKey: ["requalification", "contacts"],
    queryFn: async (): Promise<RequalificationContact[]> => {
      const [
        contactsRes,
        inscriptionsRes,
        facturesRes,
        paiementsRes,
        documentsRes,
        examensRes,
        fichesRes,
      ] = await Promise.all([
        supabase
          .from("contacts")
          .select(
            "id,centre_id,nom,prenom,email,telephone,formation,statut_apprenant,archived,created_at,updated_at,is_historical_import,import_source,imported_at,requalification_category",
          )
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        supabase
          .from("session_inscriptions")
          .select("contact_id")
          .eq("statut", "inscrit")
          .is("deleted_at", null),
        supabase.from("factures").select("contact_id").is("deleted_at", null),
        supabase
          .from("paiements")
          .select("factures!inner(contact_id)")
          .is("deleted_at", null),
        supabase.from("contact_documents").select("contact_id").is("deleted_at", null),
        supabase.from("examens_t3p").select("contact_id"),
        supabase.from("fiches_pratique").select("contact_id"),
      ]);

      if (contactsRes.error) throw contactsRes.error;

      const inscriptionSet = new Set((inscriptionsRes.data ?? []).map((r: any) => r.contact_id));
      const factureSet = new Set((facturesRes.data ?? []).map((r: any) => r.contact_id));
      const paiementSet = new Set(
        (paiementsRes.data ?? [])
          .map((r: any) => r.factures?.contact_id)
          .filter(Boolean),
      );
      const documentSet = new Set((documentsRes.data ?? []).map((r: any) => r.contact_id));
      const examenSet = new Set((examensRes.data ?? []).map((r: any) => r.contact_id));
      const ficheSet = new Set((fichesRes.data ?? []).map((r: any) => r.contact_id));

      return (contactsRes.data ?? []).map((c: any): RequalificationContact => {
        const signals = {
          hasInscription: inscriptionSet.has(c.id),
          hasFacture: factureSet.has(c.id),
          hasPaiement: paiementSet.has(c.id),
          hasDocument: documentSet.has(c.id),
          hasExamen: examenSet.has(c.id),
          hasFichePratique: ficheSet.has(c.id),
        };
        const suggestion = classify({
          is_historical_import: c.is_historical_import ?? false,
          requalification_category: c.requalification_category ?? null,
          statut_apprenant: c.statut_apprenant ?? null,
          formation: c.formation ?? null,
          email: c.email ?? null,
          telephone: c.telephone ?? null,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          ...signals,
        });
        return { ...c, ...signals, suggestion } as RequalificationContact;
      });
    },
    staleTime: 30_000,
  });
}
