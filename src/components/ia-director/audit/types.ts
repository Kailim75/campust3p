// ═══════════════════════════════════════════════════════════════
// IA Director — Audit Types
// ═══════════════════════════════════════════════════════════════

export type AnomalySeverity = "critical" | "high" | "medium" | "low";
export type AnomalyCategory = "prospects" | "sessions" | "administratif" | "paiements" | "qualite_data" | "documents" | "conformite";
export type AnomalyStatus = "open" | "in_progress" | "resolved" | "ignored";

export type PlaybookActionType =
  | "create_task"
  | "send_email"
  | "send_sms"
  | "open_filtered_view"
  | "bulk_update"
  | "schedule_session_suggestion"
  | "schedule_campaign";

export interface Playbook {
  label: string;
  action_type: PlaybookActionType;
  confirmation_required: boolean;
  payload?: Record<string, unknown>;
}

export interface Anomaly {
  id: string;
  category: AnomalyCategory;
  severity: AnomalySeverity;
  status: AnomalyStatus;
  title: string;
  description: string;
  detection_rule: string;
  affected_count: number;
  affected_records: string[]; // IDs
  impact_estime_euros: number;
  urgence_score: number;      // 0-100
  confidence_score: number;   // 0-100
  priority_score: number;     // calculated
  playbooks: Playbook[];
}

/** Used by audit rules — status defaults to "open" in runRules */
export type AnomalyDraft = Omit<Anomaly, "status"> & { status?: AnomalyStatus };

export interface AuditResult {
  mode: "quick" | "deep";
  timestamp: string;
  anomalies: Anomaly[];
  total_impact_euros: number;
  scores_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface AuditContext {
  contacts: any[];
  prospects: any[];
  sessions: any[];
  inscriptions: any[];
  factures: any[];
  paiements: any[];
  historique: any[];
  scorings: any[];
  centreConfig?: {
    prix_formation_moyen: number;
    taux_remplissage_historique: number;
  };
}

export interface ActionLog {
  id: string;
  centre_id: string | null;
  anomaly_id: string;
  anomaly_title: string | null;
  action_type: string;
  entity_ids: string[];
  payload: Record<string, unknown>;
  status: string;
  result: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
}
