import { describe, it, expect } from "vitest";
import { buildContratConduiteVariables } from "../contratConduiteVariables";

describe("buildContratConduiteVariables", () => {
  it("rend les variables Taxi avec placeholders pour champs vides", () => {
    const vars = buildContratConduiteVariables({
      contact: { nom: "Doe", prenom: "John" },
      centre: { raison_sociale: "Ecole T3P" },
      filiere: "taxi",
      prix_ttc: 249,
    });
    expect(vars.contact_nom).toBe("Doe");
    expect(vars.produit_filiere).toBe("Taxi");
    expect(vars.produit_prix_ttc).toMatch(/249/);
    expect(vars.seance_date_examen).toBe("À planifier");
    expect(vars.seance_lieu_rdv).toBe("À planifier");
  });

  it("rend correctement filière VTC", () => {
    const vars = buildContratConduiteVariables({
      contact: null,
      centre: null,
      filiere: "vtc",
      prix_ttc: 190,
    });
    expect(vars.produit_filiere).toBe("VTC");
    expect(vars.produit_prix_ttc).toMatch(/190/);
  });
});
