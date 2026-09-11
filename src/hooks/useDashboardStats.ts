import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, subMonths, format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import {
  estFactureComptee,
  filtreFacturesComptees,
  resteAEncaisserParFacture,
  sommeFactures,
  sommePaiementsFactures,
} from "@/lib/montants";

export interface MonthlyCA {
  mois: string;
  moisLabel: string;
  ca: number;
  paye: number;
}

/** Lignes minimales attendues des requêtes ci-dessous (le reste est ignoré). */
interface FactureLigne {
  id?: string | null;
  montant_total?: number | string | null;
  statut?: string | null;
}

interface PaiementLigne {
  montant?: number | string | null;
  facture_id?: string | null;
}

export interface FormationStats {
  formation: string;
  count: number;
  ca: number;
}

export interface InscriptionTrend {
  mois: string;
  moisLabel: string;
  inscriptions: number;
}

/**
 * CA émis et encaissé, mois par mois, sur les 12 derniers mois.
 *
 * Le « payé » d'un mois ne retient que les versements RATTACHÉS à une facture
 * comptée : un versement encaissé sur un brouillon ou sur une annulée n'est pas
 * du chiffre d'affaires, et le compter faisait passer la courbe « payé »
 * au-dessus de la courbe « facturé ». Fonction pure, donc testable seule.
 */
export function buildMonthlyCA(
  factures: ReadonlyArray<FactureLigne & { date_emission?: string | null }>,
  paiements: ReadonlyArray<PaiementLigne & { date_paiement: string }>,
  now: Date,
): MonthlyCA[] {
  const months: MonthlyCA[] = [];

  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(now, i));
    const mois = format(monthStart, "yyyy-MM");
    const moisLabel = format(monthStart, "MMM yy", { locale: fr });

    const facturesDuMois = factures.filter(
      (f) => f.date_emission && format(parseISO(f.date_emission), "yyyy-MM") === mois,
    );
    const paiementsDuMois = paiements.filter(
      (p) => format(parseISO(p.date_paiement), "yyyy-MM") === mois,
    );

    months.push({
      mois,
      moisLabel,
      // CA émis ce mois (basé sur date_emission)
      ca: sommeFactures(facturesDuMois),
      // Encaissé ce mois : versements du mois rattachés aux factures comptées,
      // quel que soit le mois d'émission de la facture réglée.
      paye: sommePaiementsFactures(factures, paiementsDuMois),
    });
  }

  return months;
}

// CA mensuel sur les 12 derniers mois
export function useMonthlyCA() {
  return useQuery({
    queryKey: ["dashboard", "monthly-ca"],
    queryFn: async () => {
      // Récupérer les factures avec leur date d'émission
      const { data: factures, error } = await filtreFacturesComptees(
        supabase
          .from("factures")
          .select("id, montant_total, date_emission, statut")
          // Une facture en corbeille ne doit plus peser dans ce total.
          .is("deleted_at", null),
      );

      if (error) throw error;

      // Récupérer les paiements avec leur date et leur facture de rattachement
      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant, date_paiement, facture_id")
        .is("deleted_at", null);

      if (paiementsError) throw paiementsError;

      return buildMonthlyCA(factures || [], paiements || [], new Date());
    },
  });
}

/**
 * Une relation imbriquée PostgREST arrive tantôt en objet, tantôt en tableau
 * selon la cardinalité inférée : on tolère les deux plutôt que de caster.
 */
type Relation<T> = T | T[] | null | undefined;

const premier = <T,>(r: Relation<T>): T | undefined =>
  (Array.isArray(r) ? r[0] : r) ?? undefined;

type FactureFormation = FactureLigne & {
  session_inscription?: Relation<{ sessions?: Relation<{ formation_type?: string | null }> }>;
};

/**
 * CA par type de formation. Le total de chaque groupe passe par `sommeFactures`,
 * qui applique le prédicat partagé : un brouillon ne gonfle plus le CA d'une
 * formation. Fonction pure, donc testable seule.
 */
export function caParFormation(
  factures: ReadonlyArray<FactureFormation>,
): Record<string, number> {
  const groupes = new Map<string, FactureFormation[]>();

  for (const f of factures) {
    const formation = premier(premier(f.session_inscription)?.sessions)?.formation_type || "Autre";
    const liste = groupes.get(formation);
    if (liste) liste.push(f);
    else groupes.set(formation, [f]);
  }

  const parFormation: Record<string, number> = {};
  for (const [formation, liste] of groupes) parFormation[formation] = sommeFactures(liste);
  return parFormation;
}

// Répartition par type de formation
export function useFormationStats() {
  return useQuery({
    queryKey: ["dashboard", "formation-stats"],
    queryFn: async () => {
      // Récupérer les inscriptions avec leur session
      const { data: inscriptions, error } = await supabase
        .from("session_inscriptions")
        .select(`
          id,
          sessions (
            formation_type,
            prix
          )
        `)
        .is("deleted_at", null);

      if (error) throw error;

      // Récupérer les factures pour le CA
      const { data: factures, error: facturesError } = await filtreFacturesComptees(
        supabase.from("factures").select(`
          montant_total,
          statut,
          session_inscription:session_inscriptions (
            sessions (
              formation_type
            )
          )
        `).is("deleted_at", null),
      );

      if (facturesError) throw facturesError;

      // Compter par formation
      const stats: Record<string, FormationStats> = {};

      (inscriptions || []).forEach((insc: any) => {
        const formation = insc.sessions?.formation_type || "Non défini";
        if (!stats[formation]) {
          stats[formation] = { formation, count: 0, ca: 0 };
        }
        stats[formation].count += 1;
      });

      // Ajouter le CA par formation
      Object.entries(caParFormation(factures || [])).forEach(([formation, ca]) => {
        if (!stats[formation]) {
          stats[formation] = { formation, count: 0, ca: 0 };
        }
        stats[formation].ca += ca;
      });

      return Object.values(stats).sort((a, b) => b.count - a.count);
    },
  });
}

// Évolution des inscriptions sur 6 mois
export function useInscriptionTrend() {
  return useQuery({
    queryKey: ["dashboard", "inscription-trend"],
    queryFn: async () => {
      const now = new Date();
      const months: InscriptionTrend[] = [];

      const { data: inscriptions, error } = await supabase
        .from("session_inscriptions")
        .select("date_inscription")
        .is("deleted_at", null);

      if (error) throw error;

      // Générer les 6 derniers mois
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const mois = format(monthStart, "yyyy-MM");
        const moisLabel = format(monthStart, "MMMM", { locale: fr });

        const count = (inscriptions || []).filter(
          (insc) => format(parseISO(insc.date_inscription), "yyyy-MM") === mois
        ).length;

        months.push({
          mois,
          moisLabel,
          inscriptions: count,
        });
      }

      return months;
    },
  });
}

/**
 * Synthèse financière globale : facturé, encaissé, restant dû.
 *
 * `totalPaye` ne retient que les versements rattachés aux factures comptées —
 * sommer TOUS les paiements faisait dépasser l'encaissé au-dessus du facturé et
 * gonflait mécaniquement le taux de recouvrement. Le restant dû est calculé
 * FACTURE PAR FACTURE : un trop-perçu sur l'une ne doit pas masquer l'impayé
 * d'une autre.
 *
 * `enAttente` garde sa liste blanche (émise/partielle) : elle ne totalise pas
 * « l'argent dû » mais sélectionne un ÉTAT — une facture impayée ou payée n'est
 * pas « en attente ». Fonction pure, donc testable seule.
 */
export function resumeFinancier(
  factures: ReadonlyArray<FactureLigne>,
  paiements: ReadonlyArray<PaiementLigne>,
) {
  const totalFacture = sommeFactures(factures);
  const totalPaye = sommePaiementsFactures(factures, paiements);
  const totalImpaye = resteAEncaisserParFacture(factures, paiements);

  const enAttente = sommeFactures(
    factures.filter((f) => f.statut === "emise" || f.statut === "partiel"),
  );

  return {
    totalFacture,
    totalPaye,
    totalImpaye,
    enAttente,
    tauxRecouvrement: totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 100) : 0,
  };
}

// Stats financières globales
export function useFinancialSummary() {
  return useQuery({
    queryKey: ["dashboard", "financial-summary"],
    queryFn: async () => {
      const { data: factures, error } = await filtreFacturesComptees(
        supabase
          .from("factures")
          .select("id, montant_total, statut")
          // Une facture en corbeille ne doit plus peser dans ce total.
          .is("deleted_at", null),
      );

      if (error) throw error;

      const { data: paiements, error: paiementsError } = await supabase
        .from("paiements")
        .select("montant, facture_id")
        .is("deleted_at", null);

      if (paiementsError) throw paiementsError;

      return resumeFinancier(factures || [], paiements || []);
    },
  });
}

// Taux de conversion prospects -> clients
export function useConversionRate() {
  return useQuery({
    queryKey: ["dashboard", "conversion-rate"],
    queryFn: async () => {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("statut, created_at")
        .eq("archived", false);

      if (error) throw error;

      const total = contacts?.length || 0;
      
      // Prospects = en attente de validation
      const prospects = contacts?.filter((c) => 
        c.statut === "En attente de validation"
      ).length || 0;
      
      // Clients = Client ou Bravo (formations terminées)
      const clients = contacts?.filter((c) => 
        c.statut === "Client" || c.statut === "Bravo"
      ).length || 0;

      // Calcul du taux de conversion (clients / total contacts)
      const tauxConversion = total > 0 ? Math.round((clients / total) * 100) : 0;

      return {
        total,
        prospects,
        clients,
        tauxConversion,
      };
    },
  });
}

export interface CAParSource {
  source: string;
  ca: number;
  count: number;
}

type FactureSource = FactureLigne & { contact?: Relation<{ source?: string | null }> };

/**
 * CA par source de lead. `ca` et `count` reposent sur la MÊME assiette : compter
 * une facture dont le montant est écarté afficherait « 3 factures / 0 € ».
 * Fonction pure, donc testable seule.
 */
export function caParSource(factures: ReadonlyArray<FactureSource>): CAParSource[] {
  const groupes = new Map<string, FactureSource[]>();

  for (const f of factures) {
    const source = premier(f.contact)?.source || "Non défini";
    const liste = groupes.get(source);
    if (liste) liste.push(f);
    else groupes.set(source, [f]);
  }

  return [...groupes.entries()]
    .map(([source, liste]) => ({
      source,
      ca: sommeFactures(liste),
      count: liste.filter(estFactureComptee).length,
    }))
    .sort((a, b) => b.ca - a.ca);
}

// CA par source de lead
export function useCAParSource() {
  return useQuery({
    queryKey: ["dashboard", "ca-par-source"],
    queryFn: async () => {
      // Récupérer les factures avec les contacts et leur source
      const { data: factures, error } = await filtreFacturesComptees(
        supabase.from("factures").select(`
          montant_total,
          statut,
          contact:contacts (
            source
          )
        `)
          // Une facture en corbeille ne doit plus peser dans ce total.
          .is("deleted_at", null),
      );

      if (error) throw error;

      return caParSource(factures || []);
    },
  });
}
