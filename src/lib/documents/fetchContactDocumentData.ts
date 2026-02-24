import { supabase } from "@/integrations/supabase/client";

export type ContactDocumentData = {
  id: string;
  civilite?: string | null;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
  rue?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  date_naissance?: string | null;
  ville_naissance?: string | null;
  pays_naissance?: string | null;
  numero_permis?: string | null;
  prefecture_permis?: string | null;
  date_delivrance_permis?: string | null;
  numero_carte_professionnelle?: string | null;
  prefecture_carte?: string | null;
  date_expiration_carte?: string | null;
  formation?: string | null;
};

/**
 * Normalise un type de formation vers un type de carte pro (taxi, vtc, vmdtr).
 */
function formationToCarteType(formation: string | null | undefined): string | null {
  if (!formation) return null;
  const f = formation.toLowerCase();
  if (f.includes("taxi")) return "taxi";
  if (f.includes("vtc")) return "vtc";
  if (f.includes("vmdtr")) return "vmdtr";
  return null;
}

/**
 * Enrichit les données du contact avec la carte pro correspondant au type de formation.
 * Si une carte pro dédiée existe dans cartes_professionnelles, elle remplace les champs legacy du contact.
 */
async function enrichWithCartePro(
  contact: ContactDocumentData,
  formationType?: string | null
): Promise<ContactDocumentData> {
  const carteType = formationToCarteType(formationType || contact.formation);
  if (!carteType) return contact;

  const { data: cartes } = await supabase
    .from("cartes_professionnelles")
    .select("numero_carte, prefecture, date_obtention, date_expiration")
    .eq("contact_id", contact.id)
    .eq("type_carte", carteType)
    .neq("statut", "annulee")
    .order("date_obtention", { ascending: false, nullsFirst: false })
    .limit(1);

  if (cartes && cartes.length > 0) {
    const carte = cartes[0];
    return {
      ...contact,
      numero_carte_professionnelle: carte.numero_carte || contact.numero_carte_professionnelle,
      prefecture_carte: carte.prefecture || contact.prefecture_carte,
      date_expiration_carte: carte.date_expiration || contact.date_expiration_carte,
    };
  }

  return contact;
}

const CONTACT_FIELDS = [
  "id", "civilite", "nom", "prenom", "email", "telephone",
  "rue", "code_postal", "ville", "date_naissance", "ville_naissance", "pays_naissance",
  "numero_permis", "prefecture_permis", "date_delivrance_permis",
  "numero_carte_professionnelle", "prefecture_carte", "date_expiration_carte",
  "formation",
].join(",");

/**
 * Les objets contact passés par certaines listes sont partiels (optimisation SELECT).
 * Pour générer des DOCX fiables, on recharge ici les champs nécessaires.
 * @param formationType - si fourni, cherche la carte pro correspondant à ce type de formation
 */
export async function fetchContactDocumentData(
  contactId: string,
  formationType?: string | null
): Promise<ContactDocumentData> {
  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .eq("id", contactId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("Contact introuvable");

  const contact = data as unknown as ContactDocumentData;
  return enrichWithCartePro(contact, formationType);
}

export async function fetchContactsDocumentData(
  contactIds: string[],
  formationType?: string | null
): Promise<Record<string, ContactDocumentData>> {
  const ids = Array.from(new Set(contactIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from("contacts")
    .select(CONTACT_FIELDS)
    .in("id", ids);

  if (error) throw error;

  const map: Record<string, ContactDocumentData> = {};
  for (const row of data ?? []) {
    const c = row as unknown as ContactDocumentData;
    if (c?.id) {
      map[c.id] = await enrichWithCartePro(c, formationType);
    }
  }
  return map;
}
