/**
 * Typed projections for session_inscriptions with embedded contact join.
 * Matches the select query in useSessionInscriptions().
 */

export interface InscriptionContact {
  id: string;
  civilite: string | null;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  rue: string | null;
  code_postal: string | null;
  ville: string | null;
  date_naissance: string | null;
  ville_naissance: string | null;
  pays_naissance: string | null;
  numero_carte_professionnelle: string | null;
  prefecture_carte: string | null;
  date_expiration_carte: string | null;
  numero_permis: string | null;
  prefecture_permis: string | null;
  date_delivrance_permis: string | null;
  formation: string | null;
}

/** A single inscription row returned by useSessionInscriptions, with the joined contact. */
export interface InscriptionWithContact {
  id: string;
  session_id: string;
  contact_id: string;
  statut: string;
  date_inscription: string | null;
  track: string | null;
  deleted_at: string | null;
  contacts: InscriptionContact | null;
}

/** Extract email recipients from inscriptions with contacts */
export interface SessionEmailRecipient {
  id: string;
  email: string;
  prenom: string;
  nom: string;
}

export function extractRecipientsFromInscriptions(
  inscriptions: InscriptionWithContact[] | undefined | null
): SessionEmailRecipient[] {
  if (!inscriptions) return [];
  return inscriptions
    .filter((i) => i.contacts?.email)
    .map((i) => ({
      id: i.contact_id,
      email: i.contacts!.email!,
      prenom: i.contacts!.prenom || "",
      nom: i.contacts!.nom || "",
    }));
}
