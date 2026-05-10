import type { ActionCategory } from "@/lib/aujourdhui-actions";
import type { UrgencyInfo } from "@/lib/urgency-utils";
import type { Prospect } from "@/hooks/useProspects";
import type { CrmQualityItem, CrmQualitySummary } from "@/lib/crm-quality";

export type CmaFilter = "all" | "docs_manquants" | "rejete" | "en_cours";

// Keywords used to detect if an action category was already done today
export const CMA_KEYWORDS = ["CMA:", "Carte Pro", "relance docs", "Marqué comme traité"];
export const RDV_KEYWORDS = ["RDV", "Confirmation", "Marqué comme traité"];
export const RELANCE_KEYWORDS = ["Relance prospect", "Marqué comme traité"];
export const CRITIQUE_KEYWORDS = ["demande docs", "relance paiement", "Marqué comme traité"];
export const CARTE_PRO_KEYWORDS = ["Carte Pro"];
export const CRM_QUALITY_KEYWORDS = ["Qualité CRM", "Marqué comme traité"];

export type AutoNote = { contact_id: string; titre: string; created_at: string; id?: string };

export interface SessionPrepContact {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  track?: "initial" | "continuing";
  requiredDocCount?: number;
  dossierShortLabel?: string;
  missingDocs: string[];
  statutPaiement: string | null;
}

export interface SessionPrepItem {
  id: string;
  nom: string;
  date_debut: string;
  date_fin: string;
  heure_debut: string | null;
  heure_fin: string | null;
  lieu: string | null;
  addressLabel: string | null;
  daysUntil: number;
  timingLabel: string;
  inscriptionCount: number;
  placesTotales: number;
  readinessScore: number;
  severity: "ready" | "warning" | "critical";
  setupIssues: string[];
  missingDocsContacts: SessionPrepContact[];
  unpaidContacts: SessionPrepContact[];
  missingContactContacts: SessionPrepContact[];
}

export type { CrmQualityItem, CrmQualitySummary };

export interface BlocSharedProps {
  todayNotes: AutoNote[];
  recentNotes: AutoNote[];
  openContact: (id: string) => void;
  markDone: (contactId: string, blocLabel: string) => void;
}

export interface BlocProspectSharedProps {
  todayNotes: AutoNote[];
  recentNotes: AutoNote[];
  openProspect: (p: Prospect) => void;
  markDone: (contactId: string, blocLabel: string) => void;
}
