import { supabase } from "@/integrations/supabase/client";
import { getUserCentreId } from "@/utils/getCentreId";
import { blocFigeNouvelleFacture } from "@/lib/facture-snapshot-acheteur";
import { messageLignesNonEnregistrees } from "@/lib/factures-emises";
import { toast } from "sonner";

/**
 * Facturation express (audit du 21/07/2026, demande du directeur : « très
 * manuel, fait perdre du temps ») : crée une facture complète — numéro,
 * ligne, échéance — à partir de ce que le CRM sait déjà de l'inscription.
 *
 * Règles de gestion validées par le directeur le 21/07/2026 :
 * - prix pré-rempli = prix de la session (modifiable avant validation) ;
 * - échéance par défaut = date de début de session (à défaut : émission) ;
 * - TVA : exonération art. 261.4.4°a CGI (modèle maison, montant_tva = 0).
 */

export interface FactureExpressParams {
  contactId: string;
  sessionInscriptionId?: string | null;
  /** Montant TTC (= HT, exonération de TVA). */
  montant: number;
  /** Libellé de la ligne (nom de la session en général). */
  description: string;
  /** ISO YYYY-MM-DD ; null → date d'émission. */
  dateEcheance?: string | null;
  financement?: "personnel" | "entreprise" | "cpf" | "opco";
}

export interface FactureCreee {
  id: string;
  numero_facture: string;
  montant_total: number;
  date_emission: string;
  date_echeance: string;
  statut: string;
  contact_id: string | null;
  session_inscription_id: string | null;
  type_financement: string;
}

export async function creerFactureExpress(params: FactureExpressParams): Promise<FactureCreee> {
  const { data: numero, error: numeroError } = await supabase.rpc("generate_numero_facture");
  if (numeroError) throw numeroError;

  const centreId = await getUserCentreId();
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const echeance = params.dateEcheance || aujourdhui;

  // Facture créée directement « emise » : le déclencheur de snapshot est un
  // BEFORE UPDATE, il ne s'exécutera jamais pour elle. Coordonnées de
  // l'acheteur figées dès l'INSERT (D2 du 11/09/2026).
  const bloc = await blocFigeNouvelleFacture({
    statut: "emise",
    contactId: params.contactId,
    totaux: { montant_ht: params.montant, montant_tva: 0 },
    dateEmission: aujourdhui,
  });

  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .insert({
      centre_id: centreId,
      contact_id: params.contactId,
      session_inscription_id: params.sessionInscriptionId ?? null,
      numero_facture: numero as string,
      montant_total: params.montant,
      montant_ht: params.montant,
      montant_tva: 0,
      statut: "emise",
      type_financement: params.financement ?? "personnel",
      date_emission: aujourdhui,
      date_echeance: echeance,
      ...bloc,
    } as never)
    .select()
    .single();
  if (factureError) throw factureError;

  // montant_ht, montant_tva et montant_ttc sont GENERATED ALWAYS sur
  // facture_lignes : Postgres REFUSE l'INSERT si on leur donne une valeur (la
  // ligne n'était donc jamais créée, la facture express restait sans détail).
  // On ne pose que les colonnes de base ; la base calcule les montants.
  const { error: ligneError } = await supabase.from("facture_lignes").insert({
    facture_id: (facture as FactureCreee).id,
    description: params.description,
    quantite: 1,
    prix_unitaire_ht: params.montant,
    tva_percent: 0,
    ordre: 1,
  } as never);
  // La ligne est descriptive : son échec ne doit pas laisser croire que la
  // facture n'existe pas — on le signale mais la facture est créée. La reprise
  // n'est possible que dans les quinze minutes (garde), d'où le message explicite.
  if (ligneError) {
    console.error("facture-express: ligne non créée", ligneError);
    toast.warning(messageLignesNonEnregistrees((facture as FactureCreee).numero_facture));
  }

  return facture as FactureCreee;
}

export interface InscritSansFacture {
  sessionInscriptionId: string;
  contactId: string;
  prenom: string;
  nom: string;
}

/**
 * Les inscrits d'une session sans aucune facture — ni rattachée à leur
 * inscription, ni historique du contact jamais rattachée (même repli que
 * l'onglet Inscrits). Audit du 21/07/2026 : sans ce repli, le bouton
 * « Facturer les non-facturés » proposait de re-facturer des inscrits dont
 * la facture (payée) était simplement antérieure au rattachement par
 * inscription. Les annulées ne comptent pas : un inscrit dont la seule
 * facture est annulée est bien à re-facturer.
 */
export async function listerInscritsSansFacture(sessionId: string): Promise<InscritSansFacture[]> {
  // facturation_exoneree = repassage déjà payé (règle du 22/07/2026) : ne
  // JAMAIS proposer ces inscrits à la facturation.
  const { data: inscriptions, error } = await supabase
    .from("session_inscriptions")
    .select("id, contact_id, contact:contacts(prenom, nom, archived, deleted_at)")
    .eq("session_id", sessionId)
    .eq("facturation_exoneree", false)
    .is("deleted_at", null);
  if (error) throw error;

  const ids = (inscriptions || []).map((i) => i.id);
  if (ids.length === 0) return [];
  const contactIds = [...new Set((inscriptions || []).map((i) => i.contact_id))];

  const [liees, legacy] = await Promise.all([
    supabase
      .from("factures")
      .select("session_inscription_id")
      .in("session_inscription_id", ids)
      .is("deleted_at", null)
      .neq("statut", "annulee"),
    supabase
      .from("factures")
      .select("contact_id")
      .in("contact_id", contactIds)
      .is("session_inscription_id", null)
      .is("deleted_at", null)
      .neq("statut", "annulee"),
  ]);
  if (liees.error) throw liees.error;
  if (legacy.error) throw legacy.error;

  const deja = new Set((liees.data || []).map((f) => f.session_inscription_id));
  const contactsAvecLegacy = new Set((legacy.data || []).map((f) => f.contact_id));
  return (inscriptions || [])
    .filter((i) => !deja.has(i.id) && !contactsAvecLegacy.has(i.contact_id))
    .filter((i) => {
      const c = i.contact as { archived?: boolean; deleted_at?: string | null } | null;
      return c && !c.archived && !c.deleted_at;
    })
    .map((i) => {
      const c = i.contact as { prenom: string; nom: string };
      return { sessionInscriptionId: i.id, contactId: i.contact_id, prenom: c.prenom, nom: c.nom };
    });
}
