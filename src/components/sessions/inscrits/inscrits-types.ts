import type { FactureWithDetails } from "@/hooks/useFactures";
import type { EmailRecipient } from "@/components/email/EmailComposerModal";
import type { DocumentType } from "@/hooks/useDocumentGenerator";

export interface InscritContact {
  id: string;
  civilite?: string | null;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
  pays_naissance?: string | null;
  numero_carte_professionnelle?: string | null;
  prefecture_carte?: string | null;
  date_expiration_carte?: string | null;
  numero_permis?: string | null;
  prefecture_permis?: string | null;
  date_delivrance_permis?: string | null;
  formation?: string | null;
  custom_id?: string | null;
}

export interface InscritRow {
  id: string;
  contact_id: string;
  statut: string;
  contact?: InscritContact | null;
}

export interface ExamResult {
  theorie: "admis" | "ajourne" | null;
  pratique: "admis" | "ajourne" | null;
  departement?: string | null;
}

export interface UrgencyInfo {
  level: "red" | "yellow" | "green";
  reasons: string[];
}

export const INSCRIPTION_STATUTS = [
  { value: "valide", label: "Validé", class: "bg-success/10 text-success border-success/20" },
  { value: "encours", label: "En cours", class: "bg-warning/10 text-warning border-warning/20" },
  { value: "document", label: "Document", class: "bg-info/10 text-info border-info/20" },
  { value: "complexe", label: "Complexe", class: "bg-destructive/10 text-destructive border-destructive/20" },
  { value: "annule", label: "Annulé", class: "bg-destructive/10 text-destructive border-destructive/20" },
  { value: "report", label: "Report", class: "bg-muted text-muted-foreground border-muted" },
] as const;

export function getUrgency(
  inscrit: InscritRow,
  facture: FactureWithDetails | undefined,
  examResult: ExamResult | undefined,
  sessionDateFin: string | null | undefined
): UrgencyInfo {
  const reasons: string[] = [];

  if (inscrit.statut === "document" || inscrit.statut === "complexe") {
    reasons.push("CMA incomplet");
  }
  if (facture && facture.statut === "impayee") {
    reasons.push("Facture impayée");
  }
  if (examResult?.theorie === "ajourne") reasons.push("Théorie échouée");
  if (examResult?.pratique === "ajourne") reasons.push("Pratique échouée");
  if (!examResult?.theorie && !examResult?.pratique) {
    if (sessionDateFin && new Date(sessionDateFin) <= new Date()) {
      reasons.push("Résultats non saisis");
    }
  }

  if (reasons.length >= 2) return { level: "red", reasons };
  if (reasons.length === 1) return { level: "yellow", reasons };
  return { level: "green", reasons: ["OK"] };
}

export function mapContactInfo(contact: any) {
  return {
    id: contact.id,
    civilite: contact.civilite || undefined,
    nom: contact.nom || "",
    prenom: contact.prenom || "",
    email: contact.email || undefined,
    telephone: contact.telephone || undefined,
    rue: contact.rue || undefined,
    code_postal: contact.code_postal || undefined,
    ville: contact.ville || undefined,
    date_naissance: contact.date_naissance || undefined,
    ville_naissance: contact.ville_naissance || undefined,
    pays_naissance: contact.pays_naissance || undefined,
    numero_carte_professionnelle: contact.numero_carte_professionnelle || undefined,
    prefecture_carte: contact.prefecture_carte || undefined,
    date_expiration_carte: contact.date_expiration_carte || undefined,
    numero_permis: contact.numero_permis || undefined,
    prefecture_permis: contact.prefecture_permis || undefined,
    date_delivrance_permis: contact.date_delivrance_permis || undefined,
    formation: contact.formation || undefined,
  };
}
