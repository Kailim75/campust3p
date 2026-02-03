// Liste des départements pour examens et mobilité T3P (Petite Couronne Île-de-France)
export const departementsExamenT3P = [
  { code: "75", label: "75 - Paris" },
  { code: "92", label: "92 - Hauts-de-Seine" },
  { code: "93", label: "93 - Seine-Saint-Denis" },
  { code: "94", label: "94 - Val-de-Marne" },
];

// Départements disponibles pour les formations de mobilité TAXI
// Note: MOB-VTC et MOB-VMDTR n'existent pas réglementairement
export const departementsMobiliteTaxi = [
  { code: "75", label: "Paris (75)", programmeCode: "MOB-TAXI-75-v1" },
  { code: "92", label: "Hauts-de-Seine (92)", programmeCode: "MOB-TAXI-92-v1" },
  // 93 et 94 à ajouter quand les programmes seront créés
];

export function getDepartementLabel(code: string | null | undefined): string {
  if (!code) return "";
  const dept = departementsExamenT3P.find(d => d.code === code);
  return dept?.label || code;
}

export function getMobiliteProgrammeCode(departementCode: string): string | null {
  const dept = departementsMobiliteTaxi.find(d => d.code === departementCode);
  return dept?.programmeCode || null;
}
