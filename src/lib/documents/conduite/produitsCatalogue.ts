// ═══════════════════════════════════════════════════════════════
// Catalogue produits — Accompagnement à la conduite (Taxi / VTC)
// Source de vérité front. Sert de garde-fou prix + filière.
// ═══════════════════════════════════════════════════════════════

export type FiliereConduite = "taxi" | "vtc";

export interface ProduitConduiteCatalogue {
  sku: string;
  filiere: FiliereConduite;
  intitule: string;
  contenu: string;
  prix_ttc: number;
  duree_minutes: number;
  vehicule_examen_inclus: boolean;
}

export const PRODUITS_CONDUITE_CATALOGUE: Record<string, ProduitConduiteCatalogue> = {
  "ACC-CONDUITE-TAXI": {
    sku: "ACC-CONDUITE-TAXI",
    filiere: "taxi",
    intitule: "Accompagnement à la conduite — Taxi",
    contenu:
      "2 heures d'accompagnement et de préparation à l'épreuve pratique de conduite. " +
      "Mise à disposition du véhicule le jour de l'examen incluse.",
    prix_ttc: 249,
    duree_minutes: 120,
    vehicule_examen_inclus: true,
  },
  "ACC-CONDUITE-VTC": {
    sku: "ACC-CONDUITE-VTC",
    filiere: "vtc",
    intitule: "Accompagnement à la conduite — VTC",
    contenu:
      "2 heures d'accompagnement et de préparation à l'épreuve pratique de conduite. " +
      "Mise à disposition du véhicule le jour de l'examen incluse.",
    prix_ttc: 190,
    duree_minutes: 120,
    vehicule_examen_inclus: true,
  },
};

export const ALLOWED_CONDUITE_SKUS = Object.keys(PRODUITS_CONDUITE_CATALOGUE);

export function getProduitConduiteBySku(sku: string | null | undefined): ProduitConduiteCatalogue | null {
  if (!sku) return null;
  return PRODUITS_CONDUITE_CATALOGUE[sku] ?? null;
}

export function getProduitConduiteByFiliere(filiere: FiliereConduite): ProduitConduiteCatalogue {
  return filiere === "taxi"
    ? PRODUITS_CONDUITE_CATALOGUE["ACC-CONDUITE-TAXI"]
    : PRODUITS_CONDUITE_CATALOGUE["ACC-CONDUITE-VTC"];
}

export function isConduiteSku(sku: string | null | undefined): boolean {
  return !!sku && ALLOWED_CONDUITE_SKUS.includes(sku);
}
