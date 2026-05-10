import { describe, expect, it } from "vitest";
import { getTrackFromFormationType, resolveFormationTrack } from "../formation-track";

describe("formation-track", () => {
  it("classe uniquement la formation continue comme parcours continuing", () => {
    expect(getTrackFromFormationType("Formation continue VTC")).toBe("continuing");
    expect(getTrackFromFormationType("Recyclage Taxi")).toBe("continuing");
    expect(getTrackFromFormationType("Renouvellement carte pro VMDTR")).toBe("continuing");
  });

  it("garde initiale, passerelle et mobilite dans le parcours initial-style", () => {
    expect(getTrackFromFormationType("Formation initiale TAXI")).toBe("initial");
    expect(getTrackFromFormationType("Passerelle Taxi vers VTC")).toBe("initial");
    expect(getTrackFromFormationType("Mobilite Taxi 75")).toBe("initial");
  });

  it("corrige les anciennes donnees qui marquaient mobilite/passerelle comme continuing", () => {
    expect(resolveFormationTrack("continuing", "Mobilité Taxi")).toBe("initial");
    expect(resolveFormationTrack("continuing", "Passerelle Taxi vers VTC")).toBe("initial");
    expect(resolveFormationTrack("initial", "Formation continue Taxi")).toBe("continuing");
  });
});
