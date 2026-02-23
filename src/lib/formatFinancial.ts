/**
 * Format a number as French currency: "1 250,00 €"
 * Negative values get "−" prefix (Unicode minus) and are not wrapped in this function.
 */
export function formatEuro(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = value < 0 ? "−" : "";
  return `${sign}${formatted} €`;
}

/** Short format without decimals for charts */
export function formatEuroShort(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs >= 1000
    ? `${(abs / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`
    : abs.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const sign = value < 0 ? "−" : "";
  return `${sign}${formatted} €`;
}

/** Percentage format */
export function formatPct(value: number): string {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

/** Compute delta % between current and previous */
export function computeDelta(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Category labels for charges */
export const CHARGE_CATEGORIES: Record<string, string> = {
  loyer: "Loyer",
  salaires: "Salaires",
  charges_sociales: "Charges sociales",
  formateurs_vacataires: "Formateurs vacataires",
  materiel_pedagogique: "Matériel pédagogique",
  logiciels_abonnements: "Logiciels & abonnements",
  marketing_publicite: "Marketing & publicité",
  comptabilite_juridique: "Comptabilité & juridique",
  assurances: "Assurances",
  telephone_internet: "Téléphone & Internet",
  fournitures_bureau: "Fournitures de bureau",
  deplacement: "Déplacements",
  entretien_locaux: "Entretien des locaux",
  taxes_impots: "Taxes & impôts",
  autre: "Autre",
};

export const CHARGE_CATEGORY_ICONS: Record<string, string> = {
  loyer: "🏠",
  salaires: "👤",
  charges_sociales: "📋",
  formateurs_vacataires: "🎓",
  materiel_pedagogique: "📚",
  logiciels_abonnements: "💻",
  marketing_publicite: "📣",
  comptabilite_juridique: "⚖️",
  assurances: "🛡️",
  telephone_internet: "📞",
  fournitures_bureau: "🖊️",
  deplacement: "🚗",
  entretien_locaux: "🧹",
  taxes_impots: "🏛️",
  autre: "📎",
};

export const MODE_VERSEMENT_LABELS: Record<string, string> = {
  especes: "Espèces",
  cb: "CB",
  virement: "Virement",
  alma: "Alma",
  cpf: "CPF",
};

export const FORMATION_LABELS: Record<string, string> = {
  TAXI: "Taxi initial",
  VTC: "VTC",
  VMDTR: "VMDTR",
  "ACC VTC": "ACC VTC",
  "ACC VTC 75": "ACC VTC 75",
  "Formation continue Taxi": "Recyclage Taxi",
  "Formation continue VTC": "Recyclage VTC",
  "Mobilité Taxi": "Mobilité Taxi",
};
