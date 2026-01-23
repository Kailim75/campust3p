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
 * Les objets contact passés par certaines listes sont partiels (optimisation SELECT).
 * Pour générer des DOCX fiables, on recharge ici les champs nécessaires.
 */
export async function fetchContactDocumentData(contactId: string): Promise<ContactDocumentData> {
  const { data, error } = await supabase
    .from("contacts")
    .select(
      [
        "id",
        "civilite",
        "nom",
        "prenom",
        "email",
        "telephone",
        "rue",
        "code_postal",
        "ville",
        "date_naissance",
        "ville_naissance",
        "pays_naissance",
        "numero_permis",
        "prefecture_permis",
        "date_delivrance_permis",
        "numero_carte_professionnelle",
        "prefecture_carte",
        "date_expiration_carte",
        "formation",
      ].join(",")
    )
    .eq("id", contactId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Contact introuvable");
  }

  // Supabase typing can infer a broader union; cast via unknown.
  return data as unknown as ContactDocumentData;
}

export async function fetchContactsDocumentData(
  contactIds: string[]
): Promise<Record<string, ContactDocumentData>> {
  const ids = Array.from(new Set(contactIds.filter(Boolean)));
  if (ids.length === 0) return {};

  const { data, error } = await supabase
    .from("contacts")
    .select(
      [
        "id",
        "civilite",
        "nom",
        "prenom",
        "email",
        "telephone",
        "rue",
        "code_postal",
        "ville",
        "date_naissance",
        "ville_naissance",
        "pays_naissance",
        "numero_permis",
        "prefecture_permis",
        "date_delivrance_permis",
        "numero_carte_professionnelle",
        "prefecture_carte",
        "date_expiration_carte",
        "formation",
      ].join(",")
    )
    .in("id", ids);

  if (error) throw error;

  const map: Record<string, ContactDocumentData> = {};
  for (const row of data ?? []) {
    const c = row as unknown as ContactDocumentData;
    if (c?.id) map[c.id] = c;
  }
  return map;
}
