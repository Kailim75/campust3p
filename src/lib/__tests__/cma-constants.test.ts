import { describe, expect, it } from "vitest";
import {
  countReceivedCmaDocs,
  getCmaRequiredDocsForTrack,
  getMissingCmaDocs,
  hasCmaDocument,
} from "../cma-constants";

describe("cma-constants", () => {
  it("garde le dossier complet pour le parcours initial", () => {
    expect(getCmaRequiredDocsForTrack("initial")).toEqual([
      "cni",
      "permis_b",
      "attestation_domicile",
      "photo",
      "signature",
    ]);
  });

  it("limite la formation continue au dossier renouvellement carte pro", () => {
    expect(getCmaRequiredDocsForTrack("continuing")).toEqual([
      "cni",
      "permis_b",
      "carte_professionnelle",
    ]);
  });

  it("reconnait les anciens types de documents comme equivalents", () => {
    const uploaded = new Set(["piece_identite", "permis_conduire", "carte_pro"]);

    expect(hasCmaDocument(uploaded, "cni")).toBe(true);
    expect(hasCmaDocument(uploaded, "permis_b")).toBe(true);
    expect(hasCmaDocument(uploaded, "carte_professionnelle")).toBe(true);
    expect(countReceivedCmaDocs(uploaded, "continuing")).toBe(3);
    expect(getMissingCmaDocs(uploaded, "continuing")).toEqual([]);
  });
});
