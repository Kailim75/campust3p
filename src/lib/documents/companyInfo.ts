import type {
  CompanyInfo,
  AgrementsAutre,
} from "@/lib/pdf-generator";

/**
 * Construit le CompanyInfo à partir des données du centre de formation.
 */
/** Shape of the centre_formation row used for document generation. */
interface CentreFormationRow {
  nom_commercial?: string | null;
  nom_legal: string;
  adresse_complete: string;
  telephone: string;
  email: string;
  siret: string;
  nda: string;
  logo_url?: string | null;
  signature_cachet_url?: string | null;
  qualiopi_numero?: string | null;
  qualiopi_date_obtention?: string | null;
  qualiopi_date_expiration?: string | null;
  agrement_prefecture?: string | null;
  agrement_prefecture_date?: string | null;
  code_rncp?: string | null;
  code_rs?: string | null;
  agrements_autres?: unknown;
}

export function buildCompanyInfo(centreFormation: CentreFormationRow | null | undefined): CompanyInfo | undefined {
  if (!centreFormation) return undefined;

  let agrements_autres: AgrementsAutre[] = [];

  const rawAgrements = centreFormation.agrements_autres as unknown;
  if (Array.isArray(rawAgrements)) {
    agrements_autres = rawAgrements
      .filter((a): a is AgrementsAutre => !!a && typeof a === "object")
      .map((a) => ({
        nom: String((a as Record<string, unknown>).nom ?? ""),
        numero: String((a as Record<string, unknown>).numero ?? ""),
        date_obtention: (a as Record<string, unknown>).date_obtention as string | undefined ?? undefined,
        date_expiration: (a as Record<string, unknown>).date_expiration as string | undefined ?? undefined,
      }))
      .filter((a) => a.nom.trim() !== "" && a.numero.trim() !== "");
  } else if (rawAgrements && typeof rawAgrements === "object") {
    const maybe = rawAgrements as Record<string, unknown>;
    if (Array.isArray(maybe.agrements)) {
      agrements_autres = (maybe.agrements as AgrementsAutre[]);
    }
  }

  return {
    name: centreFormation.nom_commercial || centreFormation.nom_legal,
    address: centreFormation.adresse_complete,
    phone: centreFormation.telephone,
    email: centreFormation.email,
    siret: centreFormation.siret,
    nda: centreFormation.nda,
    logo_url: centreFormation.logo_url || undefined,
    signature_cachet_url: centreFormation.signature_cachet_url || undefined,
    qualiopi_numero: centreFormation.qualiopi_numero || undefined,
    qualiopi_date_obtention: centreFormation.qualiopi_date_obtention || undefined,
    qualiopi_date_expiration: centreFormation.qualiopi_date_expiration || undefined,
    agrement_prefecture: centreFormation.agrement_prefecture || undefined,
    agrement_prefecture_date: centreFormation.agrement_prefecture_date || undefined,
    code_rncp: centreFormation.code_rncp || undefined,
    code_rs: centreFormation.code_rs || undefined,
    agrements_autres: agrements_autres.length > 0 ? agrements_autres : undefined,
  };
}
