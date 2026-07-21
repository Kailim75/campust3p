import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Envoi d'une relance de paiement par email (extrait de PaiementsPage pour
 * être partagé avec la fiche session). L'appelant est responsable de la
 * confirmation utilisateur et des toasts ; ici on ne fait qu'envoyer.
 */
export interface RelancePaiementInfo {
  factureId: string;
  numeroFacture: string;
  contactId: string;
  email: string;
  prenom: string;
  nom: string;
  montantRestant: number;
  dateEcheance: string | null;
}

export async function envoyerRelancePaiement(info: RelancePaiementInfo): Promise<void> {
  const montantDu = info.montantRestant.toLocaleString("fr-FR", { minimumFractionDigits: 2 });
  const dateEcheance = info.dateEcheance
    ? format(new Date(info.dateEcheance), "dd/MM/yyyy", { locale: fr })
    : "non définie";
  const subject = `Relance paiement - Facture ${info.numeroFacture}`;
  const html = `
    <p>Bonjour ${info.prenom},</p>
    <p>Nous nous permettons de vous rappeler que la facture <strong>${info.numeroFacture}</strong> d'un montant restant dû de <strong>${montantDu}€</strong> (échéance : ${dateEcheance}) est en attente de règlement.</p>
    <p>Nous vous serions reconnaissants de bien vouloir procéder au paiement dans les meilleurs délais.</p>
    <p>Si le règlement a déjà été effectué, veuillez ne pas tenir compte de ce message.</p>
    <p>Cordialement,<br/>L'équipe Ecole T3P</p>
  `;
  const { data, error } = await supabase.functions.invoke("send-automated-emails", {
    body: {
      type: "direct_email",
      to: info.email,
      recipientName: `${info.prenom} ${info.nom}`,
      subject,
      html,
      contactId: info.contactId,
      factureId: info.factureId,
    },
  });
  if (error) throw error;
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
}
