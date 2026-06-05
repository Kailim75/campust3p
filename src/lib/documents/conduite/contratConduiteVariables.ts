// ═══════════════════════════════════════════════════════════════
// Variables builder — Contrat accompagnement conduite
// Produit un map plat compatible avec template-renderer ({{var}})
// ═══════════════════════════════════════════════════════════════

import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { FiliereConduite } from "./produitsCatalogue";
import { getProduitConduiteByFiliere } from "./produitsCatalogue";

export interface ContratConduiteVarsInput {
  contact: {
    nom?: string | null;
    prenom?: string | null;
    email?: string | null;
    telephone?: string | null;
    adresse?: string | null;
    code_postal?: string | null;
    ville?: string | null;
  } | null;
  centre: {
    raison_sociale?: string | null;
    adresse?: string | null;
    siret?: string | null;
    numero_da?: string | null;
    email?: string | null;
    telephone?: string | null;
  } | null;
  filiere: FiliereConduite;
  prix_ttc: number;
  montant_paye?: number | null;
  reste_a_payer?: number | null;
  date_conduite?: string | null;
  date_examen?: string | null;
  lieu_rdv?: string | null;
  accompagnateur?: string | null;
  conditions_annulation?: string | null;
  date_contrat?: string | null;
}

const PLACEHOLDER = "À planifier";

const fmtDate = (iso?: string | null): string => {
  if (!iso) return PLACEHOLDER;
  try {
    return format(new Date(iso), "PPP", { locale: fr });
  } catch {
    return PLACEHOLDER;
  }
};

const fmtMoney = (n: number | null | undefined): string => {
  if (n == null || !Number.isFinite(n)) return "0,00 €";
  return `${n.toFixed(2).replace(".", ",")} €`;
};

const safe = (s?: string | null) => (s && s.trim().length ? s : PLACEHOLDER);

export function buildContratConduiteVariables(input: ContratConduiteVarsInput): Record<string, string> {
  const produit = getProduitConduiteByFiliere(input.filiere);
  const filiereLabel = input.filiere === "taxi" ? "Taxi" : "VTC";

  return {
    contact_nom: safe(input.contact?.nom),
    contact_prenom: safe(input.contact?.prenom),
    contact_email: safe(input.contact?.email),
    contact_telephone: safe(input.contact?.telephone),
    contact_adresse: safe(input.contact?.adresse),
    contact_code_postal: safe(input.contact?.code_postal),
    contact_ville: safe(input.contact?.ville),

    centre_raison_sociale: safe(input.centre?.raison_sociale),
    centre_adresse: safe(input.centre?.adresse),
    centre_siret: safe(input.centre?.siret),
    centre_numero_da: safe(input.centre?.numero_da),
    centre_email: safe(input.centre?.email),
    centre_telephone: safe(input.centre?.telephone),

    produit_filiere: filiereLabel,
    produit_intitule: produit.intitule,
    produit_duree: "2 heures",
    produit_contenu: produit.contenu,
    produit_vehicule_examen: produit.vehicule_examen_inclus
      ? "Mise à disposition du véhicule le jour de l'examen incluse"
      : "Véhicule non fourni",
    produit_prix_ttc: fmtMoney(produit.prix_ttc),

    paiement_prix_ttc: fmtMoney(input.prix_ttc),
    paiement_montant_paye: fmtMoney(input.montant_paye ?? 0),
    paiement_reste_a_payer: fmtMoney(input.reste_a_payer ?? input.prix_ttc),

    seance_date_conduite: fmtDate(input.date_conduite),
    seance_date_examen: fmtDate(input.date_examen),
    seance_lieu_rdv: safe(input.lieu_rdv),
    seance_accompagnateur: safe(input.accompagnateur),

    contrat_conditions_annulation:
      input.conditions_annulation?.trim() ||
      "Toute annulation à moins de 48 heures du rendez-vous entraîne la facturation intégrale de la prestation.",
    contrat_date: fmtDate(input.date_contrat ?? new Date().toISOString()),

    signature_apprenant: "",
    signature_centre: "",
  };
}
