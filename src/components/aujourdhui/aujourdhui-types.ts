import type { ActionCategory } from "@/lib/aujourdhui-actions";
import type { UrgencyInfo } from "@/lib/urgency-utils";
import type { Prospect } from "@/hooks/useProspects";

export type CmaFilter = "all" | "docs_manquants" | "rejete" | "en_cours";

// Keywords used to detect if an action category was already done today
export const CMA_KEYWORDS = ["CMA:", "relance docs", "Marqué comme traité"];
export const RDV_KEYWORDS = ["RDV", "Confirmation", "Marqué comme traité"];
export const RELANCE_KEYWORDS = ["Relance prospect", "Marqué comme traité"];
export const CRITIQUE_KEYWORDS = ["demande docs", "relance paiement", "Marqué comme traité"];
export const CARTE_PRO_KEYWORDS = ["Carte Pro"];

export type AutoNote = { contact_id: string; titre: string; created_at: string; id?: string };

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
