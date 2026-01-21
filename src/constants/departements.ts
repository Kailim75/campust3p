// Liste des départements principaux pour inscription examen T3P (Petite Couronne)
export const departementsExamenT3P = [
  { code: "75", label: "75 - Paris" },
  { code: "92", label: "92 - Hauts-de-Seine" },
  { code: "93", label: "93 - Seine-Saint-Denis" },
  { code: "94", label: "94 - Val-de-Marne" },
];

export function getDepartementLabel(code: string | null | undefined): string {
  if (!code) return "";
  const dept = departementsExamenT3P.find(d => d.code === code);
  // Pour les départements non listés, afficher juste le code
  return dept?.label || code;
}
