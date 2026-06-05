// ═══════════════════════════════════════════════════════════════
// Validator — Contrat accompagnement conduite
// Vérifie cohérence prix vs catalogue et exige justification le cas échéant.
// ═══════════════════════════════════════════════════════════════

import { getProduitConduiteByFiliere, type FiliereConduite } from "./produitsCatalogue";

export interface ContratConduiteInput {
  filiere: FiliereConduite;
  prix_ttc: number;
  justification_prix?: string | null;
}

export interface ValidationResult {
  ok: boolean;
  priceAlert: boolean;
  expectedPrice: number;
  errors: string[];
  warnings: string[];
}

export function validateContratConduite(input: ContratConduiteInput): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const produit = getProduitConduiteByFiliere(input.filiere);
  const expectedPrice = produit.prix_ttc;
  const priceAlert = Number(input.prix_ttc) !== expectedPrice;

  if (!Number.isFinite(input.prix_ttc) || input.prix_ttc <= 0) {
    errors.push("Le prix TTC doit être un nombre positif.");
  }

  if (priceAlert) {
    warnings.push(
      `Prix saisi ${input.prix_ttc} € ≠ prix catalogue ${expectedPrice} € (${produit.intitule}).`
    );
    const justif = (input.justification_prix ?? "").trim();
    if (justif.length < 5) {
      errors.push("Une justification (≥ 5 caractères) est obligatoire en cas d'écart de prix.");
    }
  }

  return {
    ok: errors.length === 0,
    priceAlert,
    expectedPrice,
    errors,
    warnings,
  };
}
