import { describe, it, expect } from "vitest";
import { countActiveEnrollmentsBySession } from "../enrollment-counts";

describe("countActiveEnrollmentsBySession", () => {
  it("retourne un objet vide pour un tableau vide", () => {
    expect(countActiveEnrollmentsBySession([])).toEqual({});
  });

  it("compte les inscriptions actives par session", () => {
    const inscriptions = [
      { session_id: "s1" },
      { session_id: "s1" },
      { session_id: "s2" },
    ];
    expect(countActiveEnrollmentsBySession(inscriptions)).toEqual({ s1: 2, s2: 1 });
  });

  it("ignore les inscriptions soft-deleted", () => {
    const inscriptions = [
      { session_id: "s1" },
      { session_id: "s1", deleted_at: "2025-01-01T00:00:00Z" },
      { session_id: "s2" },
    ];
    expect(countActiveEnrollmentsBySession(inscriptions)).toEqual({ s1: 1, s2: 1 });
  });

  it("ignore les entrées sans session_id", () => {
    const inscriptions = [
      { session_id: "s1" },
      { session_id: "" as string },
    ];
    expect(countActiveEnrollmentsBySession(inscriptions)).toEqual({ s1: 1 });
  });
});
