import type {
  CompanyInfo,
  AgrementsAutre,
} from "@/lib/pdf-generator";

/**
 * Construit le CompanyInfo à partir des données du centre de formation.
 */
export function buildCompanyInfo(centreFormation: any): CompanyInfo | undefined {
  if (!centreFormation) return undefined;

  let agrements_autres: AgrementsAutre[] = [];

  const rawAgrements = centreFormation.agrements_autres as unknown;
  if (Array.isArray(rawAgrements)) {
    agrements_autres = rawAgrements
      .filter((a): a is AgrementsAutre => !!a && typeof a === "object")
      .map((a: any) => ({
        nom: String(a.nom ?? ""),
        numero: String(a.numero ?? ""),
        date_obtention: a.date_obtention ?? undefined,
        date_expiration: a.date_expiration ?? undefined,
      }))
      .filter((a) => a.nom.trim() !== "" && a.numero.trim() !== "");
  } else if (rawAgrements && typeof rawAgrements === "object") {
    const maybe = rawAgrements as any;
    if (Array.isArray(maybe.agrements)) {
      agrements_autres = maybe.agrements as AgrementsAutre[];
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
