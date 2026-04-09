/**
 * RM-2: Convention de nommage automatique des sessions
 * Format: [Type Formation] – [Mois Année] – [(Jour/Soir)]
 */

const FORMATION_TYPE_LABELS: Record<string, string> = {
  TAXI: "Formation Initiale Taxi",
  VTC: "Formation Initiale VTC",
  VMDTR: "Formation Initiale VMDTR",
  T3P: "Formation T3P",
  "Formation continue Taxi": "Formation Continue Taxi",
  "Formation continue VTC": "Formation Continue VTC",
  "Mobilité Taxi": "Mobilité Taxi",
  "ACC VTC": "Accompagnement VTC",
  "ACC VTC 75": "Accompagnement VTC 75",
};

const MOIS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export function generateSessionName(
  formationType: string,
  dateDebut: string,
  horaireType: "jour" | "soir" = "jour",
  catalogueIntitule?: string | null,
): string {
  const label = FORMATION_TYPE_LABELS[formationType] || formationType;

  let moisAnnee = "";
  if (dateDebut) {
    const d = new Date(dateDebut);
    if (!isNaN(d.getTime())) {
      moisAnnee = `${MOIS_FR[d.getMonth()]} ${d.getFullYear()}`;
    }
  }

  // If we have a catalogue intitule that's more specific, detect track keywords
  let finalLabel = label;
  if (catalogueIntitule) {
    const lower = catalogueIntitule.toLowerCase();
    if (lower.includes("passerelle")) {
      finalLabel = `Passerelle ${formationType}`;
    } else if (lower.includes("continue")) {
      finalLabel = `Formation Continue ${formationType}`;
    } else if (lower.includes("mobilité") || lower.includes("mobilite")) {
      finalLabel = `Mobilité ${formationType}`;
    }
  }

  const parts = [finalLabel];
  if (moisAnnee) parts.push(moisAnnee);
  if (horaireType === "soir") parts.push("(Soir)");

  return parts.join(" – ");
}
