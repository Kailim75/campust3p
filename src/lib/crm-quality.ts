import type { Prospect } from "@/hooks/useProspects";

export type CrmQualitySource = "contact" | "prospect";
export type CrmQualitySeverity = "critical" | "warning" | "info";
export type CrmQualityIssueType =
  | "duplicate"
  | "missing_channel"
  | "missing_phone"
  | "missing_email"
  | "missing_formation"
  | "prospect_without_next_action";

export interface CrmQualityRecord {
  id: string;
  source: CrmQualitySource;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  formation: string | null;
  prospect?: Prospect;
}

export interface CrmQualityItem {
  id: string;
  type: CrmQualityIssueType;
  severity: CrmQualitySeverity;
  title: string;
  description: string;
  actionLabel: string;
  ownerId: string;
  ownerSource: CrmQualitySource;
  ownerProspect?: Prospect;
  records: CrmQualityRecord[];
}

export interface CrmQualitySummary {
  score: number;
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  duplicateGroups: number;
}

interface ContactLike {
  id: string;
  nom: string | null;
  prenom: string | null;
  email: string | null;
  telephone: string | null;
  formation?: string | null;
  statut?: string | null;
  statut_apprenant?: string | null;
}

export function computeCrmQuality({
  contacts,
  prospects,
}: {
  contacts: ContactLike[];
  prospects: Prospect[];
}): { items: CrmQualityItem[]; summary: CrmQualitySummary } {
  const contactRecords: CrmQualityRecord[] = contacts.map((contact) => ({
    id: contact.id,
    source: "contact",
    prenom: contact.prenom || "",
    nom: contact.nom || "",
    email: cleanNullable(contact.email),
    telephone: cleanNullable(contact.telephone),
    formation: cleanNullable(contact.formation),
  }));

  const prospectRecords: CrmQualityRecord[] = prospects.map((prospect) => ({
    id: prospect.id,
    source: "prospect",
    prenom: prospect.prenom || "",
    nom: prospect.nom || "",
    email: cleanNullable(prospect.email),
    telephone: cleanNullable(prospect.telephone),
    formation: cleanNullable(prospect.formation_souhaitee),
    prospect,
  }));

  const allRecords = [...contactRecords, ...prospectRecords];
  const items: CrmQualityItem[] = [
    ...buildDuplicateIssues(allRecords),
    ...buildMissingDataIssues(contactRecords, prospectRecords),
    ...buildProspectActionIssues(prospects),
  ];

  const sorted = items
    .sort((a, b) => {
      const severityDiff = severityWeight(a.severity) - severityWeight(b.severity);
      if (severityDiff !== 0) return severityDiff;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 20);

  return {
    items: sorted,
    summary: buildSummary(items),
  };
}

function buildDuplicateIssues(records: CrmQualityRecord[]): CrmQualityItem[] {
  const groups = new Map<string, CrmQualityRecord[]>();

  records.forEach((record) => {
    const email = normalizeEmail(record.email);
    const phone = normalizePhone(record.telephone);
    const name = normalizeName(record.prenom, record.nom);

    if (email) addToGroup(groups, `email:${email}`, record);
    if (phone) addToGroup(groups, `phone:${phone}`, record);
    if (!email && !phone && name) addToGroup(groups, `name:${name}`, record);
  });

  return Array.from(groups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => {
      const owner = group[0];
      const matchLabel = key.startsWith("email:")
        ? "même email"
        : key.startsWith("phone:")
          ? "même téléphone"
          : "même nom";

      return {
        id: `duplicate-${key}`,
        type: "duplicate" as const,
        severity: key.startsWith("name:") ? "warning" as const : "critical" as const,
        title: `Doublon possible (${matchLabel})`,
        description: group.map((record) => formatRecordName(record)).join(" / "),
        actionLabel: "Examiner",
        ownerId: owner.id,
        ownerSource: owner.source,
        ownerProspect: owner.prospect,
        records: group,
      };
    });
}

function buildMissingDataIssues(
  contacts: CrmQualityRecord[],
  prospects: CrmQualityRecord[],
): CrmQualityItem[] {
  const items: CrmQualityItem[] = [];
  const addMissing = (
    record: CrmQualityRecord,
    type: CrmQualityIssueType,
    severity: CrmQualitySeverity,
    title: string,
    description: string,
  ) => {
    items.push({
      id: `${type}-${record.source}-${record.id}`,
      type,
      severity,
      title,
      description,
      actionLabel: "Compléter",
      ownerId: record.id,
      ownerSource: record.source,
      ownerProspect: record.prospect,
      records: [record],
    });
  };

  [...contacts, ...prospects].forEach((record) => {
    if (!record.email && !record.telephone) {
      addMissing(
        record,
        "missing_channel",
        record.source === "contact" ? "critical" : "warning",
        "Fiche injoignable",
        `${formatRecordName(record)} n'a ni email ni téléphone.`,
      );
      return;
    }

    if (!record.telephone) {
      addMissing(record, "missing_phone", "info", "Téléphone manquant", `${formatRecordName(record)} n'a pas de numéro renseigné.`);
    }

    if (!record.email) {
      addMissing(record, "missing_email", "info", "Email manquant", `${formatRecordName(record)} n'a pas d'email renseigné.`);
    }
  });

  [...contacts, ...prospects].forEach((record) => {
    if (!record.formation) {
      addMissing(
        record,
        "missing_formation",
        record.source === "prospect" ? "warning" : "info",
        "Formation non renseignée",
        `${formatRecordName(record)} n'a pas de formation associée.`,
      );
    }
  });

  return items;
}

function buildProspectActionIssues(prospects: Prospect[]): CrmQualityItem[] {
  return prospects
    .filter((prospect) => prospect.statut !== "converti" && prospect.statut !== "perdu")
    .filter((prospect) => !prospect.next_action_at && !prospect.date_prochaine_relance)
    .map((prospect) => {
      const record: CrmQualityRecord = {
        id: prospect.id,
        source: "prospect",
        prenom: prospect.prenom || "",
        nom: prospect.nom || "",
        email: prospect.email,
        telephone: prospect.telephone,
        formation: prospect.formation_souhaitee,
        prospect,
      };
      const isHot = prospect.priorite === "urgente" || prospect.priorite === "haute" || prospect.statut === "relance";

      return {
        id: `prospect-without-next-action-${prospect.id}`,
        type: "prospect_without_next_action" as const,
        severity: isHot ? "critical" as const : "warning" as const,
        title: "Prospect sans prochaine action",
        description: `${formatRecordName(record)} n'a aucune relance planifiée.`,
        actionLabel: "Planifier",
        ownerId: prospect.id,
        ownerSource: "prospect" as const,
        ownerProspect: prospect,
        records: [record],
      };
    });
}

function buildSummary(items: CrmQualityItem[]): CrmQualitySummary {
  const criticalCount = items.filter((item) => item.severity === "critical").length;
  const warningCount = items.filter((item) => item.severity === "warning").length;
  const infoCount = items.filter((item) => item.severity === "info").length;
  const score = Math.max(0, 100 - criticalCount * 8 - warningCount * 4 - infoCount);

  return {
    score,
    totalIssues: items.length,
    criticalCount,
    warningCount,
    infoCount,
    duplicateGroups: items.filter((item) => item.type === "duplicate").length,
  };
}

function addToGroup(groups: Map<string, CrmQualityRecord[]>, key: string, record: CrmQualityRecord) {
  const group = groups.get(key) || [];
  if (!group.some((item) => item.id === record.id && item.source === record.source)) {
    group.push(record);
  }
  groups.set(key, group);
}

function cleanNullable(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned || null;
}

function normalizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function normalizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return `33${digits.slice(1)}`;
  if (digits.startsWith("33")) return digits;
  return digits;
}

function normalizeName(prenom?: string | null, nom?: string | null) {
  const value = `${prenom || ""} ${nom || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return value.length >= 5 ? value : null;
}

function formatRecordName(record: CrmQualityRecord) {
  const name = `${record.prenom} ${record.nom}`.trim();
  return name || "Fiche sans nom";
}

function severityWeight(severity: CrmQualitySeverity) {
  if (severity === "critical") return 0;
  if (severity === "warning") return 1;
  return 2;
}
