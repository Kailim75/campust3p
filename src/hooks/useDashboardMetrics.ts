import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PeriodValue, getPreviousPeriod } from "./useDashboardPeriodV2";
import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";

export interface DashboardMetrics {
  // Pilotage
  encaissements: number;
  encaissementsPrev: number;
  facturesEnAttente: number;
  facturesEnAttentePrev: number;
  paiementsRetard: number;
  paiementsRetardPrev: number;
  prospectsRelance: number;
  prospectsRelancePrev: number;
  // Risk
  sessionsRisque: number;
  sessionsRisquePrev: number;
  apprenantsCritiques: number;
  apprenantsCritiquesPrev: number;
  dossiersInitialManquants: number;
  dossiersContinuManquants: number;
  nouveauxProspects: number;
  nouveauxProspectsPrev: number;
}

async function fetchMetricsForPeriod(from: Date, to: Date) {
  const fromStr = from.toISOString();
  const toStr = to.toISOString();
  const todayStr = new Date().toISOString().split("T")[0];

  const [
    paiementsRes,
    facturesRes,
    prospectsRes,
    sessionsRes,
    inscriptionsRes,
    contactsRes,
    docsRes,
    cartesRes,
    nouveauxProspectsRes,
  ] = await Promise.all([
    // Encaissements (paiements reçus dans la période)
    supabase.from("paiements")
      .select("montant, date_paiement")
      .gte("date_paiement", fromStr.split("T")[0])
      .lte("date_paiement", toStr.split("T")[0]),
    // Factures en attente
    supabase.from("factures")
      .select("id, statut, date_echeance, montant_total")
      .in("statut", ["emise", "brouillon"]),
    // Prospects à relancer
    supabase.from("prospects")
      .select("id, statut, date_prochaine_relance")
      .eq("is_active", true)
      .not("statut", "in", '("converti","perdu")'),
    // Sessions
    supabase.from("sessions")
      .select("id, places_totales, date_debut, date_fin, statut, track")
      .eq("archived", false)
      .gte("date_fin", todayStr),
    // Inscriptions for fill-rate calc + track-aware admin
    supabase.from("session_inscriptions")
      .select("id, session_id, contact_id, track"),
    // Contacts (active, not archived)
    supabase.from("contacts")
      .select("id, archived")
      .eq("archived", false),
    // CMA docs
    supabase.from("contact_documents")
      .select("contact_id, type_document"),
    // Cartes pro
    supabase.from("cartes_professionnelles")
      .select("contact_id, statut, date_expiration"),
    // New prospects in period
    supabase.from("prospects")
      .select("id")
      .gte("created_at", fromStr)
      .lte("created_at", toStr),
  ]);

  const paiements = paiementsRes.data || [];
  const factures = facturesRes.data || [];
  const prospects = prospectsRes.data || [];
  const sessions = sessionsRes.data || [];
  const inscriptions = inscriptionsRes.data || [];
  const contacts = contactsRes.data || [];
  const docs = docsRes.data || [];
  const cartes = cartesRes.data || [];

  // Encaissements sum
  const encaissements = paiements.reduce((s, p) => s + Number(p.montant || 0), 0);

  // Factures en attente
  const facturesEnAttente = factures.filter(f => f.statut === "emise" || f.statut === "brouillon").length;

  // Paiements en retard (factures émises dont échéance dépassée)
  const paiementsRetard = factures.filter(f =>
    f.statut === "emise" && f.date_echeance && f.date_echeance < todayStr
  ).length;

  // Prospects à relancer (relance due / overdue)
  const prospectsRelance = prospects.filter(p =>
    p.statut === "relance" ||
    (p.date_prochaine_relance && p.date_prochaine_relance <= todayStr)
  ).length;

  // Sessions at risk: < 50% fill and starting within 30 days
  const sessionCounts: Record<string, number> = {};
  inscriptions.forEach(i => {
    sessionCounts[i.session_id] = (sessionCounts[i.session_id] || 0) + 1;
  });
  const sessionsRisque = sessions.filter(s => {
    const filled = sessionCounts[s.id] || 0;
    const total = s.places_totales || 1;
    return (filled / total) < 0.5;
  }).length;

  // Track-aware admin dossiers
  // Build sets: which contacts have initial inscriptions, which have continuing
  const initialContactIds = new Set<string>();
  const continuingContactIds = new Set<string>();
  inscriptions.forEach(i => {
    if (i.track === "initial") initialContactIds.add(i.contact_id);
    else if (i.track === "continuing") continuingContactIds.add(i.contact_id);
  });

  // CMA docs missing for initial contacts
  const docsMap = new Map<string, Set<string>>();
  docs.forEach((d: any) => {
    if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
    docsMap.get(d.contact_id)!.add(d.type_document);
  });
  let dossiersInitialManquants = 0;
  initialContactIds.forEach(cid => {
    const contactDocs = docsMap.get(cid) || new Set();
    if (CMA_REQUIRED_DOCS.some(d => !contactDocs.has(d))) dossiersInitialManquants++;
  });

  // Carte pro missing/expired for continuing contacts
  const cartesMap = new Map<string, any[]>();
  cartes.forEach((c: any) => {
    if (!cartesMap.has(c.contact_id)) cartesMap.set(c.contact_id, []);
    cartesMap.get(c.contact_id)!.push(c);
  });
  let dossiersContinuManquants = 0;
  continuingContactIds.forEach(cid => {
    const contactCartes = cartesMap.get(cid) || [];
    const hasValid = contactCartes.some(
      (c: any) => c.statut !== "annulee" && (!c.date_expiration || c.date_expiration >= todayStr)
    );
    if (!hasValid) dossiersContinuManquants++;
  });

  // Apprenants critiques = initial missing docs + continuing missing carte
  const apprenantsCritiques = dossiersInitialManquants + dossiersContinuManquants;

  return {
    encaissements,
    facturesEnAttente,
    paiementsRetard,
    prospectsRelance,
    sessionsRisque,
    apprenantsCritiques,
    dossiersInitialManquants,
    dossiersContinuManquants,
    nouveauxProspects: (nouveauxProspectsRes.data || []).length,
  };
}

export function useDashboardMetrics(period: PeriodValue) {
  const prev = getPreviousPeriod(period);

  return useQuery({
    queryKey: ["dashboard-metrics", period.from.toISOString(), period.to.toISOString()],
    queryFn: async (): Promise<DashboardMetrics> => {
      const [current, previous] = await Promise.all([
        fetchMetricsForPeriod(period.from, period.to),
        fetchMetricsForPeriod(prev.from, prev.to),
      ]);

      return {
        encaissements: current.encaissements,
        encaissementsPrev: previous.encaissements,
        facturesEnAttente: current.facturesEnAttente,
        facturesEnAttentePrev: previous.facturesEnAttente,
        paiementsRetard: current.paiementsRetard,
        paiementsRetardPrev: previous.paiementsRetard,
        prospectsRelance: current.prospectsRelance,
        prospectsRelancePrev: previous.prospectsRelance,
        sessionsRisque: current.sessionsRisque,
        sessionsRisquePrev: previous.sessionsRisque,
        apprenantsCritiques: current.apprenantsCritiques,
        apprenantsCritiquesPrev: previous.apprenantsCritiques,
        dossiersInitialManquants: current.dossiersInitialManquants,
        dossiersContinuManquants: current.dossiersContinuManquants,
        nouveauxProspects: current.nouveauxProspects,
        nouveauxProspectsPrev: previous.nouveauxProspects,
      };
    },
    staleTime: 60_000,
  });
}
