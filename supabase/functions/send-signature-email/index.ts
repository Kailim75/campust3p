import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildEmailHtml, formatDateFr } from "../_shared/email-template.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendSignatureEmailRequest {
  signatureRequestId?: string;
  contratLocationId?: string;
  type: "signature_request" | "contrat_location";
  baseUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const { data: { user }, error: userError } = await authClient.auth.getUser();
  
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Invalid token' }), 
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body: SendSignatureEmailRequest = await req.json();
    const { signatureRequestId, contratLocationId, type, baseUrl } = body;

    console.log("Processing signature email request:", body);

    if (type === "signature_request" && signatureRequestId) {
      const { data: signatureRequest, error: fetchError } = await supabase
        .from("signature_requests")
        .select(`
          id, titre, description, type_document, date_expiration,
          contact:contacts(id, nom, prenom, email)
        `)
        .eq("id", signatureRequestId)
        .single();

      if (fetchError || !signatureRequest) {
        throw new Error("Signature request not found");
      }

      const contact = signatureRequest.contact as any;
      if (!contact?.email) {
        throw new Error("Contact email not found");
      }

      const signingLink = `${baseUrl}/signature/${signatureRequest.id}`;
      const expirationText = signatureRequest.date_expiration 
        ? `Ce lien expire le <strong>${formatDateFr(signatureRequest.date_expiration)}</strong>.`
        : "";

      const htmlContent = buildEmailHtml({
        title: "✍️ Document à signer",
        accentColor: "#2563eb",
        recipientName: `${contact.prenom} ${contact.nom}`,
        bodyHtml: `
          <p style="margin: 0 0 12px 0;">Vous avez un document à signer électroniquement :</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
            <tr>
              <td style="background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px; padding: 18px 20px;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #1e40af;">${signatureRequest.titre}</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>Type :</strong> ${signatureRequest.type_document}</p>
                ${signatureRequest.description ? `<p style="margin: 0; font-size: 13px; color: #555;">${signatureRequest.description}</p>` : ""}
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 16px 0;">Cliquez sur le bouton ci-dessous pour signer le document :</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
            <tr>
              <td align="center">
                <a href="${signingLink}" 
                   style="background: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                  ✍️ Signer le document
                </a>
              </td>
            </tr>
          </table>
          ${expirationText ? `<p style="margin: 12px 0 0 0; color: #888; font-size: 13px;">${expirationText}</p>` : ""}
          <p style="margin: 12px 0 0 0; color: #888; font-size: 12px;">
            Ou copiez ce lien dans votre navigateur :<br>
            <a href="${signingLink}" style="color: #2563eb; word-break: break-all;">${signingLink}</a>
          </p>
        `,
      });

      const emailResponse = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: [contact.email],
        subject: `Document à signer : ${signatureRequest.titre}`,
        reply_to: EMAIL_CONFIG.REPLY_TO,
        html: htmlContent,
      });

      await supabase
        .from("signature_requests")
        .update({ statut: "envoye", date_envoi: new Date().toISOString() })
        .eq("id", signatureRequestId);

      await supabase.from("email_logs").insert({
        type: "signature_request",
        recipient_email: contact.email,
        recipient_name: `${contact.prenom} ${contact.nom}`,
        contact_id: contact.id,
        subject: `Document à signer : ${signatureRequest.titre}`,
        template_used: "signature_request",
        status: "sent",
        resend_id: emailResponse.data?.id,
        metadata: { signature_request_id: signatureRequestId },
      });

      console.log(`Signature email sent to ${contact.email}`);

      return new Response(
        JSON.stringify({ success: true, message: "Email envoyé avec succès", resendId: emailResponse.data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (type === "contrat_location" && contratLocationId) {
      const { data: contrat, error: fetchError } = await supabase
        .from("contrats_location")
        .select(`
          id, numero_contrat, type_contrat, objet_location,
          date_debut, date_fin, montant_mensuel,
          contact:contacts(id, nom, prenom, email),
          vehicule:vehicules(immatriculation, marque, modele)
        `)
        .eq("id", contratLocationId)
        .single();

      if (fetchError || !contrat) {
        throw new Error("Contrat not found");
      }

      const contact = contrat.contact as any;
      const vehicule = contrat.vehicule as any;
      if (!contact?.email) {
        throw new Error("Contact email not found");
      }

      const signingLink = `${baseUrl}/contrat-signature/${contrat.id}`;

      const typeContratLabels: Record<string, string> = {
        vehicule: "Location de véhicule",
        materiel: "Location de matériel",
        autre: "Contrat de location",
      };
      const typeContratLabel = typeContratLabels[contrat.type_contrat as string] || "Contrat";

      const htmlContent = buildEmailHtml({
        title: "📄 Contrat à signer",
        accentColor: "#059669",
        recipientName: `${contact.prenom} ${contact.nom}`,
        bodyHtml: `
          <p style="margin: 0 0 12px 0;">Veuillez trouver ci-dessous les détails de votre contrat de location à signer :</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
            <tr>
              <td style="background-color: #ecfdf5; border-left: 4px solid #059669; border-radius: 6px; padding: 18px 20px;">
                <p style="margin: 0 0 6px 0; font-weight: 700; color: #047857;">${typeContratLabel}</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>N° Contrat :</strong> ${contrat.numero_contrat}</p>
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>Objet :</strong> ${contrat.objet_location}</p>
                ${vehicule ? `<p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>Véhicule :</strong> ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})</p>` : ""}
                <p style="margin: 0 0 4px 0; font-size: 13px; color: #555;"><strong>📅 Période :</strong> du ${formatDateFr(contrat.date_debut)} au ${formatDateFr(contrat.date_fin)}</p>
                <p style="margin: 0; font-size: 13px; color: #555;"><strong>💰 Montant mensuel :</strong> ${Number(contrat.montant_mensuel).toLocaleString("fr-FR")}€</p>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 16px 0;">Cliquez sur le bouton ci-dessous pour consulter et signer le contrat :</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
            <tr>
              <td align="center">
                <a href="${signingLink}" 
                   style="background: #059669; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                  ✍️ Signer le contrat
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 12px 0 0 0; color: #888; font-size: 12px;">
            Ou copiez ce lien dans votre navigateur :<br>
            <a href="${signingLink}" style="color: #059669; word-break: break-all;">${signingLink}</a>
          </p>
        `,
      });

      const emailResponse = await resend.emails.send({
        from: EMAIL_CONFIG.FROM,
        to: [contact.email],
        subject: `Contrat à signer : ${contrat.numero_contrat}`,
        reply_to: EMAIL_CONFIG.REPLY_TO,
        html: htmlContent,
      });

      await supabase
        .from("contrats_location")
        .update({ statut: "envoye", date_envoi: new Date().toISOString() })
        .eq("id", contratLocationId);

      await supabase.from("email_logs").insert({
        type: "contrat_location",
        recipient_email: contact.email,
        recipient_name: `${contact.prenom} ${contact.nom}`,
        contact_id: contact.id,
        subject: `Contrat à signer : ${contrat.numero_contrat}`,
        template_used: "contrat_location",
        status: "sent",
        resend_id: emailResponse.data?.id,
        metadata: { contrat_id: contratLocationId },
      });

      console.log(`Contract email sent to ${contact.email}`);

      return new Response(
        JSON.stringify({ success: true, message: "Email envoyé avec succès", resendId: emailResponse.data?.id }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    throw new Error("Invalid request parameters");

  } catch (error: any) {
    console.error("Error sending signature email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
