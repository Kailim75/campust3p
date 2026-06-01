import { describe, it, expect } from "vitest";
import {
  estOperationnellementActif,
  isHistoricalImport,
  isTerminated,
} from "@/lib/apprenant-active";

describe("estOperationnellementActif", () => {
  const base = {
    deleted_at: null,
    archived: false,
    is_historical_import: false,
    requalification_category: null,
    statut_apprenant: "actif",
    statut: "Client",
    hasActiveInscription: false,
  };

  it("contact actif avec inscription active → true", () => {
    expect(estOperationnellementActif({ ...base, hasActiveInscription: true })).toBe(true);
  });

  it("contact SmartOF historique (flag) → false", () => {
    expect(
      estOperationnellementActif({
        ...base,
        is_historical_import: true,
        hasActiveInscription: true,
        statut: "En formation théorique",
      }),
    ).toBe(false);
  });

  it("contact SmartOF historique (catégorie) → false", () => {
    expect(
      estOperationnellementActif({
        ...base,
        requalification_category: "apprenant_historique_smartof",
        hasActiveInscription: true,
      }),
    ).toBe(false);
  });

  it("contact archived → false", () => {
    expect(
      estOperationnellementActif({ ...base, archived: true, hasActiveInscription: true }),
    ).toBe(false);
  });

  it("contact supprimé → false", () => {
    expect(
      estOperationnellementActif({
        ...base,
        deleted_at: "2024-01-01T00:00:00Z",
        hasActiveInscription: true,
      }),
    ).toBe(false);
  });

  it("contact diplômé → false", () => {
    expect(
      estOperationnellementActif({
        ...base,
        statut_apprenant: "diplome",
        hasActiveInscription: true,
      }),
    ).toBe(false);
  });

  it("contact abandon → false", () => {
    expect(
      estOperationnellementActif({
        ...base,
        statut_apprenant: "abandon",
        hasActiveInscription: true,
      }),
    ).toBe(false);
  });

  it("contact Client sans inscription → false (Client n'est pas un statut de parcours)", () => {
    expect(estOperationnellementActif({ ...base, statut: "Client" })).toBe(false);
  });

  it("contact En formation théorique sans inscription → true (statut de parcours)", () => {
    expect(estOperationnellementActif({ ...base, statut: "En formation théorique" })).toBe(true);
  });

  it("contact En formation pratique sans inscription → true", () => {
    expect(estOperationnellementActif({ ...base, statut: "En formation pratique" })).toBe(true);
  });

  it("contact Examen pratique programmé sans inscription → true", () => {
    expect(estOperationnellementActif({ ...base, statut: "Examen pratique programmé" })).toBe(true);
  });

  it("SmartOF + { inclureHistorique: true } + inscription active → true", () => {
    expect(
      estOperationnellementActif(
        { ...base, is_historical_import: true, hasActiveInscription: true },
        { inclureHistorique: true },
      ),
    ).toBe(true);
  });

  it("isHistoricalImport détecte le flag", () => {
    expect(isHistoricalImport({ is_historical_import: true })).toBe(true);
  });

  it("isHistoricalImport détecte la catégorie", () => {
    expect(
      isHistoricalImport({ requalification_category: "apprenant_historique_smartof" }),
    ).toBe(true);
  });

  it("isTerminated détecte les statuts terminés", () => {
    expect(isTerminated({ statut_apprenant: "diplome" })).toBe(true);
    expect(isTerminated({ statut_apprenant: "abandon" })).toBe(true);
    expect(isTerminated({ statut_apprenant: "archive" })).toBe(true);
    expect(isTerminated({ statut_apprenant: "actif" })).toBe(false);
  });
});
