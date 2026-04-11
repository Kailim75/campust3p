/**
 * useDashboardData — Centralized data layer for the main dashboard.
 * 
 * PURPOSE: Load all shared data ONCE and derive metrics from it.
 * This replaces ~36 individual queries with ~10 batched queries.
 * 
 * IMPORTANT:
 * - DO NOT modify useBlockageDiagnostic — it's shared with the Alertes page.
 * - DO NOT modify useDashboardPeriodV2 — it controls the period selector.
 * - All queries filter deleted_at IS NULL where applicable.
 * - centre_id filtering via getUserCentreId() for multi-tenant safety.
 * - Brouillons (drafts) are excluded from "Factures en attente" KPI.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCentreContext } from "@/contexts/CentreContext";
import { getUserCentreId } from "@/utils/getCentreId";
import { CMA_REQUIRED_DOCS } from "@/lib/cma-constants";
import { PeriodValue, getPreviousPeriod } from "./useDashboardPeriodV2";
import {
  isToday,
  isPast,
  parseISO,
  differenceInDays,
  addDays,
  format,
} from "date-fns";

// ─── Raw data types ───

interface RawProspect {
  id: string;
  statut: string | null;
  date_prochaine_relance: string | null;
  telephone: string | null;
  nom: string | null;
  prenom: string | null;
  is_active: boolean;
  created_at: string;
}

interface RawFacture {
  id: string;
  statut: string;
  date_echeance: string | null;
  montant_total: number;
  numero_facture: string;
  contact_id: string | null;
  date_emission: string | null;
  contact: { nom: string; prenom: string } | null;
}

interface RawPaiement {
  montant: number;
  date_paiement: string;
  facture_id: string;
}

interface RawSession {
  id: string;
  nom: string;
  places_totales: number | null;
  date_debut: string | null;
  date_fin: string | null;
  statut: string;
  track: string | null;
  formation_type: string | null;
  archived: boolean;
}

interface RawInscription {
  id: string;
  session_id: string;
  contact_id: string;
  track: string | null;
  date_inscription: string;
  statut_paiement: string | null;
  montant_formation: number | null;
  contact: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string | null;
    centre_id: string | null;
  } | null;
}

interface RawDoc {
  contact_id: string;
  type_document: string;
}

interface RawCarte {
  contact_id: string;
  statut: string;
  date_expiration: string | null;
}

// ─── Derived types ───

export interface DashboardMetrics {
  // Pilotage
  encaissements: number;
  encaissementsPrev: number;
  facturesEnAttente: number;
  facturesEnAttentePrev: number;
  facturesEnAttenteMontant: number;
  facturesEnAttenteAgeDays: number;
  paiementsRetard: number;
  paiementsRetardPrev: number;
  paiementsRetardMontant: number;
  paiementsRetardAgeDays: number;
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
  // NEW — Strategic KPIs
  caFacture: number;
  caFacturePrev: number;
  inscriptionsCount: number;
  inscriptionsCountPrev: number;
  panierMoyen: number;
  panierMoyenPrev: number;
  resteAEncaisser: number;
  tauxRemplissageGlobal: number;
  tauxRemplissageGlobalPrev: number;
  // Qualiopi
  qualiopiTotal: number;
  qualiopiValide: number;
  // RM-7 — Executive KPIs
  tauxConversion: number;
  tauxConversionPrev: number;
  totalProspects: number;
  totalConvertis: number;
  caPrevisionnel: number;
  paiementsPaye: number;
  paiementsPartiel: number;
  paiementsNonPaye: number;
}

export interface ActionItem {
  id: string;
  type: "prospect" | "facture" | "apprenant";
  label: string;
  reason: string;
  entityId: string;
  section: string;
  track?: "initial" | "continuing";
  retardDays?: number;
  montant?: number;
  telephone?: string;
  urgency: number;
}

export interface UpcomingSession {
  id: string;
  nom: string;
  date_debut: string;
  formation_type: string;
  track: string | null;
  inscrits: number;
  places_totales: number;
  isRisk: boolean;
  fillPercent: number;
}

export interface TopFacture {
  id: string;
  numero_facture: string;
  montant_total: number;
  ageDays: number;
  contactName?: string;
}

export interface FormationBreakdown {
  formation_type: string;
  inscriptions: number;
  caFacture: number;
  encaisse: number;
  places: number;
  inscrits: number;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  todayActions: ActionItem[];
  todayActionCount: number;
  upcomingSessions: UpcomingSession[];
  topFactures: TopFacture[];
  formationBreakdown: FormationBreakdown[];
}

// ─── Centralized fetch ───

async function fetchAllDashboardData(
  period: PeriodValue,
  centreIdFromContext: string | null
): Promise<DashboardData> {
  const centreId = centreIdFromContext || await getUserCentreId();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const prev = getPreviousPeriod(period);
  const fromStr = period.from.toISOString().split("T")[0];
  const toStr = period.to.toISOString().split("T")[0];
  const prevFromStr = prev.from.toISOString().split("T")[0];
  const prevToStr = prev.to.toISOString().split("T")[0];
  const in7days = format(addDays(today, 7), "yyyy-MM-dd");

  const currentPeriodStart = period.from;
  const currentPeriodEnd = period.to;
  const previousPeriodStart = prev.from;
  const previousPeriodEnd = prev.to;
  const isWithinTimestampPeriod = (value: string | null | undefined, start: Date, end: Date) => {
    if (!value) return false;
    const date = new Date(value);
    return date >= start && date <= end;
  };

  // ─── 12 batched queries ───
  const [
    prospectsRes,
    facturesRes,
    paiementsRes,
    sessionsRes,
    inscriptionsRes,
    contactsRes,
    docsRes,
    cartesRes,
    prevPaiementsRes,
    qualiopiItemsRes,
    qualiopiValidationsRes,
    allProspectsRes,
  ] = await Promise.all([
    // 1. Prospects (active, not converted/lost)
    supabase
      .from("prospects")
      .select("id, statut, date_prochaine_relance, telephone, nom, prenom, is_active, created_at")
      .eq("centre_id", centreId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .not("statut", "in", '("converti","perdu")')
      .order("date_prochaine_relance", { ascending: true }),

    // 2. Factures (active, not deleted, not cancelled) — with contact name for finance panel
    // IMPORTANT: We do NOT filter to "emise" only here — we need broader data
    // for paiementsRetard calc. We filter brouillons in the metric computation.
    supabase
      .from("factures")
      .select("id, statut, date_echeance, montant_total, numero_facture, contact_id, date_emission, contact:contacts(nom, prenom)")
      .eq("centre_id", centreId)
      .is("deleted_at", null)
      .not("statut", "eq", "annulee"),

    // 3. Paiements (active, not deleted)
    supabase
      .from("paiements")
      .select("montant, date_paiement, facture_id")
      .is("deleted_at", null),

    // 4. Sessions (active, not archived, not deleted)
    supabase
      .from("sessions")
      .select("id, nom, places_totales, date_debut, date_fin, statut, track, formation_type, archived")
      .eq("centre_id", centreId)
      .eq("archived", false)
      .is("deleted_at", null),

    // 5. Inscriptions with contact info (active, not deleted)
    supabase
      .from("session_inscriptions")
      .select("id, session_id, contact_id, track, date_inscription, statut_paiement, montant_formation, contact:contacts(id, nom, prenom, telephone, centre_id)")
      .is("deleted_at", null),

    // 6. Contacts (not archived)
    supabase
      .from("contacts")
      .select("id, archived")
      .eq("centre_id", centreId)
      .eq("archived", false),

    // 7. Contact documents (active)
    supabase
      .from("contact_documents")
      .select("contact_id, type_document")
      .is("deleted_at", null),

    // 8. Cartes professionnelles
    supabase
      .from("cartes_professionnelles")
      .select("contact_id, statut, date_expiration"),

    // 9. Previous period paiements (for encaissements delta)
    supabase
      .from("paiements")
      .select("montant, date_paiement")
      .is("deleted_at", null)
      .gte("date_paiement", prevFromStr)
      .lte("date_paiement", prevToStr),

    // 10. Qualiopi compliance items (obligatoire only)
    supabase
      .from("compliance_checklist_items")
      .select("id")
      .eq("categorie", "qualiopi")
      .eq("criticite", "obligatoire")
      .eq("actif", true),

    // 11. Qualiopi compliance validations (valide)
    supabase
      .from("compliance_validations")
      .select("item_id, statut")
      .eq("centre_id", centreId),

    // 12. All prospects (including converted/lost) for conversion rate and acquisition
    supabase
      .from("prospects")
      .select("id, statut, created_at")
      .eq("centre_id", centreId)
      .is("deleted_at", null),
  ]);

  // ─── Raw data extraction with null safety ───
  const prospects = (prospectsRes.data || []) as RawProspect[];
  const factures = (facturesRes.data || []) as RawFacture[];
  const sessions = (sessionsRes.data || []) as RawSession[];
  const contacts = (contactsRes.data || []) as { id: string; archived: boolean }[];
  const contactIds = new Set(contacts.map((contact) => contact.id));
  const sessionIds = new Set(sessions.map((session) => session.id));
  const allPaiements = (paiementsRes.data || []) as RawPaiement[];
  const centreFactureIds = new Set(factures.map((facture) => facture.id));
  const paiements = allPaiements.filter((paiement) =>
    centreFactureIds.has(paiement.facture_id)
  );
  const inscriptions = ((inscriptionsRes.data || []) as unknown as RawInscription[]).filter(
    (inscription) =>
      sessionIds.has(inscription.session_id) ||
      inscription.contact?.centre_id === centreId ||
      contactIds.has(inscription.contact_id)
  );
  const docs = ((docsRes.data || []) as RawDoc[]).filter((doc) =>
    contactIds.has(doc.contact_id)
  );
  const cartes = ((cartesRes.data || []) as RawCarte[]).filter((carte) =>
    contactIds.has(carte.contact_id)
  );

  // ─── Shared lookup maps ───
  const inscriptionCounts: Record<string, number> = {};
  inscriptions.forEach((i) => {
    inscriptionCounts[i.session_id] = (inscriptionCounts[i.session_id] || 0) + 1;
  });

  const docsMap = new Map<string, Set<string>>();
  docs.forEach((d) => {
    if (!docsMap.has(d.contact_id)) docsMap.set(d.contact_id, new Set());
    docsMap.get(d.contact_id)!.add(d.type_document);
  });

  const cartesMap = new Map<string, RawCarte[]>();
  cartes.forEach((c) => {
    if (!cartesMap.has(c.contact_id)) cartesMap.set(c.contact_id, []);
    cartesMap.get(c.contact_id)!.push(c);
  });

  const previousSnapshotDate = prevToStr;
  const previousInscriptionCounts: Record<string, number> = {};
  inscriptions
    .filter((inscription) => inscription.date_inscription <= previousSnapshotDate)
    .forEach((inscription) => {
      previousInscriptionCounts[inscription.session_id] = (previousInscriptionCounts[inscription.session_id] || 0) + 1;
    });

  // ═══════════════════════════════════════════
  // METRICS COMPUTATION
  // ═══════════════════════════════════════════

  // ── Encaissements (current period) ──
  const encaissements = paiements
    .filter((p) => p.date_paiement >= fromStr && p.date_paiement <= toStr)
    .reduce((s, p) => s + Number(p.montant || 0), 0);

  const encaissementsPrev = ((prevPaiementsRes.data || []) as RawPaiement[])
    .filter((paiement) => centreFactureIds.has(paiement.facture_id))
    .reduce((s: number, p: RawPaiement) => s + Number(p.montant || 0), 0);

  // ── Factures en attente ──
  // BUGFIX: Exclude brouillons (drafts) — only count "emise" status
  // BUGFIX: Exclude montant_total = 0 (empty invoices that skew the KPI)
  const facturesEnAttenteList = factures.filter(
    (f) => f.statut === "emise" && Number(f.montant_total || 0) > 0
  );
  const facturesEnAttente = facturesEnAttenteList.length;
  const facturesEnAttenteMontant = facturesEnAttenteList.reduce(
    (s, f) => s + Number(f.montant_total || 0),
    0
  );

  // Oldest overdue invoice age
  let facturesEnAttenteAgeDays = 0;
  facturesEnAttenteList.forEach((f) => {
    if (f.date_echeance) {
      const age = Math.floor(
        (today.getTime() - new Date(f.date_echeance).getTime()) / 86400000
      );
      if (age > facturesEnAttenteAgeDays) facturesEnAttenteAgeDays = age;
    }
  });

  // Previous period: count factures en attente that existed then
  const facturesEnAttentePrev = factures.filter(
    (facture) =>
      facture.statut === "emise" &&
      Number(facture.montant_total || 0) > 0 &&
      !!facture.date_emission &&
      facture.date_emission <= previousSnapshotDate
  ).length;

  // ── Paiements en retard ──
  // Only "emise" invoices past their due date, with non-zero amount
  const paiementsRetardList = factures.filter(
    (f) =>
      f.statut === "emise" &&
      f.date_echeance != null &&
      f.date_echeance < todayStr &&
      Number(f.montant_total || 0) > 0
  );
  const paiementsRetard = paiementsRetardList.length;
  const paiementsRetardMontant = paiementsRetardList.reduce(
    (s, f) => s + Number(f.montant_total || 0),
    0
  );
  let paiementsRetardAgeDays = 0;
  paiementsRetardList.forEach((f) => {
    const age = Math.floor(
      (today.getTime() - new Date(f.date_echeance!).getTime()) / 86400000
    );
    if (age > paiementsRetardAgeDays) paiementsRetardAgeDays = age;
  });
  const paiementsRetardPrev = factures.filter(
    (facture) =>
      facture.statut === "emise" &&
      !!facture.date_echeance &&
      facture.date_echeance < previousSnapshotDate &&
      Number(facture.montant_total || 0) > 0 &&
      (facture.date_emission ? facture.date_emission <= previousSnapshotDate : true)
  ).length;

  // ── Prospects à relancer ──
  const prospectsRelance = prospects.filter(
    (p) =>
      p.statut === "relance" ||
      (p.date_prochaine_relance && p.date_prochaine_relance <= todayStr)
  ).length;
  const prospectsRelancePrev = prospects.filter(
    (prospect) =>
      prospect.created_at <= `${previousSnapshotDate}T23:59:59` &&
      (
        prospect.statut === "relance" ||
        (prospect.date_prochaine_relance && prospect.date_prochaine_relance <= previousSnapshotDate)
      )
  ).length;

  // ── Sessions à risque (fill < 50%) ──
  const activeSessions = sessions.filter(
    (s) => s.date_fin && s.date_fin >= todayStr
  );
  const activeSessionIds = new Set(activeSessions.map((session) => session.id));
  const activePrevSessions = sessions.filter(
    (session) =>
      !!session.date_debut &&
      session.date_debut <= previousSnapshotDate &&
      (!session.date_fin || session.date_fin >= previousSnapshotDate)
  );
  const activePrevSessionIds = new Set(activePrevSessions.map((session) => session.id));
  const sessionsRisque = activeSessions.filter((s) => {
    const filled = inscriptionCounts[s.id] || 0;
    const total = s.places_totales || 1;
    return filled / total < 0.5;
  }).length;
  const sessionsRisquePrev = activePrevSessions.filter((session) => {
    const filled = previousInscriptionCounts[session.id] || 0;
    const total = session.places_totales || 1;
    return filled / total < 0.5;
  }).length;

  // ── Apprenants critiques (missing CMA docs or carte pro) ──
  const initialContactIds = new Set<string>();
  const continuingContactIds = new Set<string>();
  inscriptions.forEach((i) => {
    if (i.track === "initial") initialContactIds.add(i.contact_id);
    else if (i.track === "continuing") continuingContactIds.add(i.contact_id);
  });

  let dossiersInitialManquants = 0;
  initialContactIds.forEach((cid) => {
    const contactDocs = docsMap.get(cid) || new Set();
    if (CMA_REQUIRED_DOCS.some((d) => !contactDocs.has(d)))
      dossiersInitialManquants++;
  });

  let dossiersContinuManquants = 0;
  continuingContactIds.forEach((cid) => {
    const contactCartes = cartesMap.get(cid) || [];
    const hasValid = contactCartes.some(
      (c) =>
        c.statut !== "annulee" &&
        (!c.date_expiration || c.date_expiration >= todayStr)
    );
    if (!hasValid) dossiersContinuManquants++;
  });

  const apprenantsCritiques = dossiersInitialManquants + dossiersContinuManquants;

  const prevInitialContactIds = new Set<string>();
  const prevContinuingContactIds = new Set<string>();
  inscriptions
    .filter(
      (inscription) =>
        inscription.date_inscription <= previousSnapshotDate &&
        activePrevSessionIds.has(inscription.session_id)
    )
    .forEach((inscription) => {
      if (inscription.track === "initial") prevInitialContactIds.add(inscription.contact_id);
      else if (inscription.track === "continuing") prevContinuingContactIds.add(inscription.contact_id);
    });

  let dossiersInitialManquantsPrev = 0;
  prevInitialContactIds.forEach((contactId) => {
    const contactDocs = docsMap.get(contactId) || new Set();
    if (CMA_REQUIRED_DOCS.some((documentType) => !contactDocs.has(documentType))) {
      dossiersInitialManquantsPrev++;
    }
  });

  let dossiersContinuManquantsPrev = 0;
  prevContinuingContactIds.forEach((contactId) => {
    const contactCartes = cartesMap.get(contactId) || [];
    const hasValid = contactCartes.some(
      (carte) =>
        carte.statut !== "annulee" &&
        (!carte.date_expiration || carte.date_expiration >= previousSnapshotDate)
    );
    if (!hasValid) dossiersContinuManquantsPrev++;
  });

  const apprenantsCritiquesPrev = dossiersInitialManquantsPrev + dossiersContinuManquantsPrev;

  // ── Nouveaux prospects (current period) ──
  const allProspects = (allProspectsRes.data || []) as { id: string; statut: string | null; created_at: string }[];
  const nouveauxProspects = allProspects.filter((prospect) =>
    isWithinTimestampPeriod(prospect.created_at, currentPeriodStart, currentPeriodEnd)
  ).length;
  const nouveauxProspectsPrev = allProspects.filter((prospect) =>
    isWithinTimestampPeriod(prospect.created_at, previousPeriodStart, previousPeriodEnd)
  ).length;

  // ═══════════════════════════════════════════
  // NEW STRATEGIC KPIs
  // ═══════════════════════════════════════════

  // ── CA Facturé (period) — total des factures émises ──
  const facturesPeriod = factures.filter(
    (f) => f.statut !== "brouillon" && f.date_emission && f.date_emission >= fromStr && f.date_emission <= toStr && Number(f.montant_total || 0) > 0
  );
  const caFacture = facturesPeriod.reduce((s, f) => s + Number(f.montant_total || 0), 0);

  // CA Facturé previous (approximation from previous paiements query period)
  const facturesPrev = factures.filter(
    (f) => f.statut !== "brouillon" && f.date_emission && f.date_emission >= prevFromStr && f.date_emission <= prevToStr && Number(f.montant_total || 0) > 0
  );
  const caFacturePrev = facturesPrev.reduce((s, f) => s + Number(f.montant_total || 0), 0);

  // ── Inscriptions count (period) ──
  const inscriptionsCount = inscriptions.filter(
    (i) => i.date_inscription >= fromStr && i.date_inscription <= toStr
  ).length;
  const inscriptionsCountPrev = inscriptions.filter(
    (i) => i.date_inscription >= prevFromStr && i.date_inscription <= prevToStr
  ).length;

  // ── Panier moyen = CA facturé / inscriptions (period) ──
  const panierMoyen = inscriptionsCount > 0 ? Math.round(caFacture / inscriptionsCount) : 0;
  const panierMoyenPrev = inscriptionsCountPrev > 0 ? Math.round(caFacturePrev / inscriptionsCountPrev) : 0;

  // ── Reste à encaisser = factures émises non soldées ──
  const totalPaiementsParFacture = new Map<string, number>();
  paiements.forEach((p) => {
    totalPaiementsParFacture.set(p.facture_id, (totalPaiementsParFacture.get(p.facture_id) || 0) + Number(p.montant || 0));
  });
  const resteAEncaisser = factures
    .filter((f) => (f.statut === "emise" || f.statut === "partiel") && Number(f.montant_total || 0) > 0)
    .reduce((s, f) => {
      const paye = totalPaiementsParFacture.get(f.id) || 0;
      return s + Math.max(0, Number(f.montant_total) - paye);
    }, 0);

  // ── Taux de remplissage global (sessions actives) ──
  const sessionsAvecCapacite = activeSessions.filter((s) => (s.places_totales || 0) > 0);
  const totalPlaces = sessionsAvecCapacite.reduce((s, se) => s + (se.places_totales || 0), 0);
  const totalInscrits = sessionsAvecCapacite.reduce((s, se) => s + (inscriptionCounts[se.id] || 0), 0);
  const tauxRemplissageGlobal = totalPlaces > 0 ? Math.round((totalInscrits / totalPlaces) * 100) : 0;
  const prevSessionsAvecCapacite = activePrevSessions.filter((session) => (session.places_totales || 0) > 0);
  const totalPlacesPrev = prevSessionsAvecCapacite.reduce((sum, session) => sum + (session.places_totales || 0), 0);
  const totalInscritsPrev = prevSessionsAvecCapacite.reduce(
    (sum, session) => sum + (previousInscriptionCounts[session.id] || 0),
    0
  );
  const tauxRemplissageGlobalPrev = totalPlacesPrev > 0
    ? Math.round((totalInscritsPrev / totalPlacesPrev) * 100)
    : 0;

  // ═══════════════════════════════════════════
  // FORMATION BREAKDOWN
  // ═══════════════════════════════════════════

  const fbMap = new Map<string, FormationBreakdown>();
  // From sessions + inscriptions
  sessions.forEach((s) => {
    const ft = s.formation_type || "Non défini";
    if (!fbMap.has(ft)) fbMap.set(ft, { formation_type: ft, inscriptions: 0, caFacture: 0, encaisse: 0, places: 0, inscrits: 0 });
    const entry = fbMap.get(ft)!;
    entry.places += s.places_totales || 0;
    entry.inscrits += inscriptionCounts[s.id] || 0;
  });
  // Count inscriptions per formation from session data
  inscriptions.forEach((i) => {
    const session = sessions.find((s) => s.id === i.session_id);
    const ft = session?.formation_type || "Non défini";
    if (!fbMap.has(ft)) fbMap.set(ft, { formation_type: ft, inscriptions: 0, caFacture: 0, encaisse: 0, places: 0, inscrits: 0 });
    fbMap.get(ft)!.inscriptions++;
  });
  // CA per formation from factures (via session_inscriptions link not available here, approximate from inscriptions)
  // Note: We don't have facture→session_type link in this query, so we skip CA breakdown for now
  const formationBreakdown = Array.from(fbMap.values()).sort((a, b) => b.inscriptions - a.inscriptions);

  // ═══════════════════════════════════════════
  // TODAY ACTIONS
  // ═══════════════════════════════════════════

  const todayActions: ActionItem[] = [];

  // Prospects to follow up
  prospects.forEach((p) => {
    const isDue =
      p.date_prochaine_relance &&
      (isToday(parseISO(p.date_prochaine_relance)) ||
        isPast(parseISO(p.date_prochaine_relance)));
    if (isDue || p.statut === "relance") {
      const retardDays = p.date_prochaine_relance
        ? Math.max(0, differenceInDays(today, parseISO(p.date_prochaine_relance)))
        : 0;
      todayActions.push({
        id: `prospect-${p.id}`,
        type: "prospect",
        label: `${p.prenom || ""} ${p.nom || ""}`.trim(),
        reason:
          retardDays > 0 && !isToday(parseISO(p.date_prochaine_relance!))
            ? `En retard de ${retardDays}j`
            : "Relance prévue aujourd'hui",
        entityId: p.id,
        section: "prospects",
        retardDays,
        telephone: p.telephone || undefined,
        urgency: retardDays > 0 ? 100 - retardDays : 200,
      });
    }
  });

  // Overdue invoices
  factures
    .filter(
      (f) =>
        f.statut === "emise" &&
        Number(f.montant_total || 0) > 0
    )
    .forEach((f) => {
      const isLate = f.date_echeance && f.date_echeance < todayStr;
      const retardDays = isLate
        ? Math.max(0, differenceInDays(today, new Date(f.date_echeance!)))
        : 0;
      todayActions.push({
        id: `facture-${f.id}`,
        type: "facture",
        label: f.numero_facture,
        reason: isLate
          ? `Échéance dépassée de ${retardDays}j`
          : "En attente de paiement",
        entityId: f.id,
        section: "finances",
        retardDays,
        montant: f.montant_total,
        urgency: isLate ? 50 - retardDays : 300,
      });
    });

  // Apprenants with missing docs
  const seenContacts = new Set<string>();
  inscriptions.forEach((insc) => {
    const cid = insc.contact_id;
    if (seenContacts.has(cid)) return;
    const contact = insc.contact;
    if (!contact) return;

    if (insc.track === "initial") {
      const contactDocs = docsMap.get(cid) || new Set();
      const missing = CMA_REQUIRED_DOCS.filter((d) => !contactDocs.has(d));
      if (missing.length > 0) {
        seenContacts.add(cid);
        todayActions.push({
          id: `apprenant-${cid}`,
          type: "apprenant",
          label: `${contact.prenom || ""} ${contact.nom || ""}`.trim(),
          reason: `${missing.length} doc(s) CMA manquant(s)`,
          entityId: cid,
          section: "contacts",
          track: "initial",
          telephone: contact.telephone || undefined,
          urgency: 150,
        });
      }
    } else if (insc.track === "continuing") {
      const contactCartes = cartesMap.get(cid) || [];
      const hasValid = contactCartes.some(
        (c) =>
          c.statut !== "annulee" &&
          (!c.date_expiration || c.date_expiration >= todayStr)
      );
      if (!hasValid) {
        seenContacts.add(cid);
        todayActions.push({
          id: `apprenant-${cid}`,
          type: "apprenant",
          label: `${contact.prenom || ""} ${contact.nom || ""}`.trim(),
          reason: "Carte pro manquante/expirée",
          entityId: cid,
          section: "contacts",
          track: "continuing",
          telephone: contact.telephone || undefined,
          urgency: 160,
        });
      }
    }
  });

  // Sort by urgency (lower = more urgent), limit to 10
  todayActions.sort((a, b) => a.urgency - b.urgency);
  const limitedActions = todayActions.slice(0, 15);

  // Today action count (quick summary for header badge)
  const todayActionCount = limitedActions.length;

  // ═══════════════════════════════════════════
  // UPCOMING SESSIONS (next 7 days)
  // ═══════════════════════════════════════════

  const upcomingSessions: UpcomingSession[] = sessions
    .filter(
      (s) =>
        s.date_debut &&
        s.date_debut >= todayStr &&
        s.date_debut <= in7days
    )
    .sort((a, b) => (a.date_debut || "").localeCompare(b.date_debut || ""))
    .slice(0, 10)
    .map((s) => {
      const inscrits = inscriptionCounts[s.id] || 0;
      const total = s.places_totales || 0;
      const fillPercent = total > 0 ? Math.round((inscrits / total) * 100) : 0;
      return {
        id: s.id,
        nom: s.nom,
        date_debut: s.date_debut!,
        formation_type: s.formation_type || "",
        track: s.track,
        inscrits,
        places_totales: total,
        isRisk: total > 0 ? fillPercent < 50 : false,
        fillPercent,
      };
    });

  // ═══════════════════════════════════════════
  // TOP FACTURES (for fallback widget)
  // ═══════════════════════════════════════════

  const topFactures: TopFacture[] = factures
    .filter((f) => f.statut === "emise" && Number(f.montant_total || 0) > 0)
    .sort((a, b) => Number(b.montant_total) - Number(a.montant_total))
    .slice(0, 5)
    .map((f) => ({
      id: f.id,
      numero_facture: f.numero_facture,
      montant_total: f.montant_total,
      ageDays: f.date_echeance
        ? Math.max(0, differenceInDays(today, new Date(f.date_echeance)))
        : 0,
      contactName: f.contact ? `${f.contact.prenom || ""} ${f.contact.nom || ""}`.trim() : undefined,
    }));

  // ═══════════════════════════════════════════
  // QUALIOPI COMPLIANCE
  // ═══════════════════════════════════════════

  const qualiopiItems = (qualiopiItemsRes.data || []) as Array<{ id: string }>;
  const qualiopiValidations = (qualiopiValidationsRes.data || []) as Array<{
    item_id: string;
    statut: string;
  }>;
  const qualiopiItemIds = new Set(qualiopiItems.map((i) => i.id));
  const qualiopiTotal = qualiopiItems.length;
  const qualiopiValide = qualiopiValidations.filter(
    (v) => qualiopiItemIds.has(v.item_id) && v.statut === "valide"
  ).length;

  // ═══════════════════════════════════════════
  // RM-7 — EXECUTIVE KPIs
  // ═══════════════════════════════════════════

  const totalProspects = allProspects.filter((prospect) =>
    isWithinTimestampPeriod(prospect.created_at, currentPeriodStart, currentPeriodEnd)
  ).length;
  const totalConvertis = allProspects.filter(
    (prospect) =>
      prospect.statut === "converti" &&
      isWithinTimestampPeriod(prospect.created_at, currentPeriodStart, currentPeriodEnd)
  ).length;
  const tauxConversion = totalProspects > 0 ? Math.round((totalConvertis / totalProspects) * 100) : 0;

  const prevProspects = allProspects.filter((prospect) =>
    isWithinTimestampPeriod(prospect.created_at, previousPeriodStart, previousPeriodEnd)
  );
  const prevConvertis = prevProspects.filter((prospect) => prospect.statut === "converti").length;
  const tauxConversionPrev = prevProspects.length > 0
    ? Math.round((prevConvertis / prevProspects.length) * 100)
    : 0;

  // CA Prévisionnel = sum of montant_formation for active inscriptions on active sessions
  const activeInscriptions = inscriptions.filter((inscription) =>
    activeSessionIds.has(inscription.session_id)
  );
  const caPrevisionnel = activeInscriptions
    .filter((i) => i.montant_formation && Number(i.montant_formation) > 0)
    .reduce((s, i) => s + Number(i.montant_formation || 0), 0);

  // Payment status breakdown
  const paiementsPaye = activeInscriptions.filter((inscription) => inscription.statut_paiement === "paye").length;
  const paiementsPartiel = activeInscriptions.filter((inscription) => inscription.statut_paiement === "partiel").length;
  const paiementsNonPaye = activeInscriptions.filter(
    (inscription) => !inscription.statut_paiement || inscription.statut_paiement === "non_paye"
  ).length;

  // ═══════════════════════════════════════════

  return {
    metrics: {
      encaissements,
      encaissementsPrev,
      facturesEnAttente,
      facturesEnAttentePrev,
      facturesEnAttenteMontant,
      facturesEnAttenteAgeDays,
      paiementsRetard,
      paiementsRetardPrev,
      paiementsRetardMontant,
      paiementsRetardAgeDays,
      prospectsRelance,
      prospectsRelancePrev,
      sessionsRisque,
      sessionsRisquePrev,
      apprenantsCritiques,
      apprenantsCritiquesPrev,
      dossiersInitialManquants,
      dossiersContinuManquants,
      nouveauxProspects,
      nouveauxProspectsPrev,
      caFacture,
      caFacturePrev,
      inscriptionsCount,
      inscriptionsCountPrev,
      panierMoyen,
      panierMoyenPrev,
      resteAEncaisser,
      tauxRemplissageGlobal,
      tauxRemplissageGlobalPrev,
      qualiopiTotal,
      qualiopiValide,
      tauxConversion,
      tauxConversionPrev,
      totalProspects,
      totalConvertis,
      caPrevisionnel,
      paiementsPaye,
      paiementsPartiel,
      paiementsNonPaye,
    },
    todayActions: limitedActions,
    todayActionCount,
    upcomingSessions,
    topFactures,
    formationBreakdown,
  };
}

// ─── Main hook ───

export function useDashboardData(period: PeriodValue) {
  const { centreId } = useCentreContext();

  return useQuery({
    queryKey: [
      "dashboard-data-v2",
      centreId ?? "no-centre",
      period.from.toISOString(),
      period.to.toISOString(),
    ],
    queryFn: () => fetchAllDashboardData(period, centreId),
    enabled: centreId !== null,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}
