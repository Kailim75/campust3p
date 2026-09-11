import { supabase } from "@/integrations/supabase/client";

/**
 * Coordonnées figées de l'acheteur, posées DÈS LA CRÉATION d'une facture qui
 * naît déjà émise (décision D2 du 11/09/2026).
 *
 * Pourquoi ce module existe
 * ─────────────────────────
 * `snapshot_facture_on_emission` (migration 20260519123424) est un déclencheur
 * BEFORE **UPDATE** : il ne s'exécute que lorsqu'un brouillon PASSE à « emise ».
 * Or cinq chemins de production INSÈRENT directement une facture au statut
 * « emise » — facture libre, facturation express, conversion d'un devis,
 * versement sans facture, et le formulaire de facture créé avec « Émise ».
 * Ces factures naissent donc avec buyer_* et montant_ht à NULL, et
 * `clientImprimeFacture` retombe sur la fiche contact / entreprise VIVANTE :
 * un déménagement, une fusion de doublons ou un changement de raison sociale
 * modifie le PDF d'une facture déjà émise.
 *
 * Une fois la garde appliquée, ces colonnes sont FIGÉES : plus aucune écriture
 * ne pourra les remplir (BuyerSnapshotEditDialog est déjà restreint au
 * brouillon). Le remplissage doit donc se faire dans l'INSERT lui-même.
 *
 * La forme reproduit exactement celle du déclencheur (types.ts, table
 * factures) : `buyer_address_snapshot` est un jsonb
 * { line1, postal_code, city, country }, `buyer_type` vaut 'b2b' pour une
 * entreprise cliente et 'b2c' pour un apprenant, SIRET et TVA
 * intracommunautaire ne sont posés que pour une entreprise.
 *
 * Le déclencheur reste utile : il complète en COALESCE ce qui serait resté
 * NULL lors d'une émission ultérieure, et n'écrase jamais ce bloc.
 */

export interface FicheContactAcheteur {
  prenom?: string | null;
  nom?: string | null;
  email?: string | null;
  email_facturation?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
}

export interface FichePartenaireAcheteur {
  company_name?: string | null;
  email?: string | null;
  email_facturation?: string | null;
  address?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  siret?: string | null;
  tva_intracom?: string | null;
}

export interface AdresseFigee {
  line1: string | null;
  postal_code: string | null;
  city: string | null;
  country: string;
}

export interface CoordonneesFigeesAcheteur {
  buyer_type: "b2b" | "b2c";
  buyer_name_snapshot: string;
  buyer_address_snapshot: AdresseFigee;
  buyer_email_facturation: string | null;
  buyer_country: string;
  buyer_siret?: string | null;
  buyer_tva_intracom?: string | null;
}

const texte = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
};

/**
 * Bloc figé d'un acheteur ENTREPRISE (facture à un partenaire client).
 * `null` si la fiche n'a même pas de raison sociale : mieux vaut le repli sur
 * la fiche qu'un nom figé vide, que plus rien ne pourrait corriger.
 */
export function coordonneesFigeesPartenaire(
  partenaire: FichePartenaireAcheteur | null | undefined,
): CoordonneesFigeesAcheteur | null {
  const nom = texte(partenaire?.company_name);
  if (!partenaire || !nom) return null;
  return {
    buyer_type: "b2b",
    buyer_name_snapshot: nom,
    buyer_address_snapshot: {
      line1: texte(partenaire.address),
      postal_code: texte(partenaire.code_postal),
      city: texte(partenaire.ville),
      country: "FR",
    },
    buyer_email_facturation: texte(partenaire.email_facturation) ?? texte(partenaire.email),
    buyer_country: "FR",
    buyer_siret: texte(partenaire.siret),
    buyer_tva_intracom: texte(partenaire.tva_intracom),
  };
}

/**
 * Bloc figé d'un acheteur PARTICULIER (facture à un apprenant). Le nom figé est
 * « Prénom Nom », comme `TRIM(CONCAT_WS(' ', prenom, nom))` du déclencheur.
 */
export function coordonneesFigeesContact(
  contact: FicheContactAcheteur | null | undefined,
): CoordonneesFigeesAcheteur | null {
  if (!contact) return null;
  const nom = [texte(contact.prenom), texte(contact.nom)].filter(Boolean).join(" ").trim();
  if (!nom) return null;
  return {
    buyer_type: "b2c",
    buyer_name_snapshot: nom,
    buyer_address_snapshot: {
      line1: texte(contact.rue),
      postal_code: texte(contact.code_postal),
      city: texte(contact.ville),
      country: "FR",
    },
    // Le déclencheur fige `contacts.email` : même source, pour que les deux
    // chemins d'émission produisent le même e-mail de facturation.
    buyer_email_facturation: texte(contact.email),
    buyer_country: "FR",
  };
}

/** Une entreprise cliente l'emporte sur le contact, comme dans le déclencheur. */
export function coordonneesFigeesAcheteur(fiches: {
  partenaire?: FichePartenaireAcheteur | null;
  contact?: FicheContactAcheteur | null;
}): CoordonneesFigeesAcheteur | null {
  return coordonneesFigeesPartenaire(fiches.partenaire) ?? coordonneesFigeesContact(fiches.contact);
}

// ─── Totaux HT / TVA figés à l'émission ──────────────────────────────────────

export interface LignePourTotaux {
  quantite?: number | null;
  prix_unitaire_ht?: number | null;
  tva_percent?: number | null;
}

/**
 * Totaux que le déclencheur d'émission aurait calculés depuis `facture_lignes`.
 *
 * Reproduit à l'identique les colonnes GENERATED de la table (migration
 * 20260114000721) : montant_ht = Σ quantité × prix unitaire HT,
 * montant_tva = Σ quantité × prix unitaire HT × TVA / 100. Une facture créée
 * directement « emise » a ses lignes écrites APRÈS elle : sans ce calcul,
 * montant_ht resterait NULL pour toujours, et generate-facturx déclarerait
 * LineTotalAmount = 0 face à un GrandTotal non nul.
 */
export function totauxFigesDepuisLignes(lignes: LignePourTotaux[]): {
  montant_ht: number;
  montant_tva: number;
} {
  let ht = 0;
  let tva = 0;
  for (const ligne of lignes) {
    const quantite = Number(ligne.quantite ?? 0) || 0;
    const prix = Number(ligne.prix_unitaire_ht ?? 0) || 0;
    const taux = Number(ligne.tva_percent ?? 0) || 0;
    ht += quantite * prix;
    tva += (quantite * prix * taux) / 100;
  }
  return { montant_ht: ht, montant_tva: tva };
}

// ─── Lecture des fiches ──────────────────────────────────────────────────────

/**
 * Relit la fiche de l'acheteur pour figer ses coordonnées dans l'INSERT.
 *
 * `null` en cas d'échec de lecture ou de fiche introuvable : la facture est
 * alors créée sans coordonnées figées, exactement comme avant ce lot — une
 * erreur de lecture ne doit pas empêcher la facturation. Le défaut est signalé
 * en console pour être vu en recette.
 */
export async function lireCoordonneesFigeesAcheteur(cible: {
  contactId?: string | null;
  partnerId?: string | null;
}): Promise<CoordonneesFigeesAcheteur | null> {
  try {
    if (cible.partnerId) {
      const { data, error } = await supabase
        .from("partners")
        .select("company_name, email, email_facturation, address, code_postal, ville, siret, tva_intracom")
        .eq("id", cible.partnerId)
        .maybeSingle();
      if (error) throw error;
      return coordonneesFigeesPartenaire(data as FichePartenaireAcheteur | null);
    }
    if (cible.contactId) {
      const { data, error } = await supabase
        .from("contacts")
        .select("prenom, nom, email, rue, code_postal, ville")
        .eq("id", cible.contactId)
        .maybeSingle();
      if (error) throw error;
      return coordonneesFigeesContact(data as FicheContactAcheteur | null);
    }
  } catch (error) {
    console.error("Coordonnées figées de l'acheteur non lues :", error);
  }
  return null;
}

/**
 * Bloc à fusionner dans l'INSERT d'une facture. Vide pour un brouillon : rien
 * ne change pour lui, ses coordonnées seront figées par le déclencheur au
 * moment de l'émission.
 */
export async function blocFigeNouvelleFacture(params: {
  statut: string;
  contactId?: string | null;
  partnerId?: string | null;
  lignes?: LignePourTotaux[];
  /** Totaux déjà connus de l'appelant (facturation express, versement seul). */
  totaux?: { montant_ht: number; montant_tva: number };
}): Promise<Record<string, unknown>> {
  if (params.statut === "brouillon") return {};

  const figees = await lireCoordonneesFigeesAcheteur({
    contactId: params.contactId,
    partnerId: params.partnerId,
  });
  const totaux = params.totaux ?? (params.lignes ? totauxFigesDepuisLignes(params.lignes) : undefined);

  return {
    ...(figees ?? {}),
    ...(totaux ? { montant_ht: totaux.montant_ht, montant_tva: totaux.montant_tva } : {}),
  };
}
