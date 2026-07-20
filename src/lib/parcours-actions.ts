import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { ExamenSource } from "./parcours-examen";

/**
 * Actions du parcours d'examen, déclenchables depuis le hub « Aujourd'hui »
 * comme depuis la fiche apprenant : enregistrer un résultat, marquer une
 * convocation CMA reçue, marquer une boîte mail consultée.
 *
 * Chaque action horodate le fait correspondant — c'est ce qui fait sortir le
 * candidat du bloc, puisque l'étape est calculée (cf. parcours-examen.ts).
 */

export type ResultatSaisi = "admis" | "ajourne" | "absent";

const STATUT_PAR_RESULTAT: Record<ResultatSaisi, string> = {
  admis: "reussi",
  ajourne: "echoue",
  absent: "absent",
};

const aujourdhuiISO = () => new Date().toISOString().slice(0, 10);

/** Enregistre le résultat d'un examen et horodate sa réception. */
export async function enregistrerResultat(params: {
  examenId: string;
  source: ExamenSource;
  resultat: ResultatSaisi;
  /** Ne pas écraser une date de réception déjà saisie. */
  dateResultatRecu?: string | null;
}): Promise<void> {
  const table = params.source === "t3p" ? "examens_t3p" : "examens_pratique";
  const { error } = await supabase
    .from(table)
    .update({
      resultat: params.resultat,
      statut: STATUT_PAR_RESULTAT[params.resultat],
      date_resultat_recu: params.dateResultatRecu || aujourdhuiISO(),
    } as never)
    .eq("id", params.examenId);
  if (error) throw error;
}

/** Marque la convocation CMA à l'épreuve pratique comme reçue. */
export async function marquerConvocationRecue(examenId: string): Promise<void> {
  const { error } = await supabase
    .from("examens_t3p")
    .update({ date_convocation_pratique_recue: aujourdhuiISO() } as never)
    .eq("id", examenId);
  if (error) throw error;
}

/** Marque la boîte mail interne du candidat comme consultée à l'instant. */
export async function marquerBoiteConsultee(contactId: string): Promise<void> {
  const { error } = await supabase
    .from("contacts")
    .update({ email_interne_consulte_le: new Date().toISOString() })
    .eq("id", contactId);
  if (error) throw error;
}

/** Rafraîchit toutes les vues qui dépendent du parcours d'examen. */
export function invalidateParcours(queryClient: QueryClient, contactId?: string): void {
  queryClient.invalidateQueries({ queryKey: ["aujourdhui-inbox"] });
  queryClient.invalidateQueries({ queryKey: ["session-parcours-summary"] });
  if (contactId) {
    queryClient.invalidateQueries({ queryKey: ["apprenant-parcours", contactId] });
    queryClient.invalidateQueries({ queryKey: ["apprenant-examens", contactId] });
  }
}
