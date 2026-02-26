import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildEmailHtml } from "../_shared/email-template.ts";

const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const resend = new Resend(RESEND_API_KEY);

const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
} as const;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EnqueteEmailRequest {
  to: string;
  name: string;
  enqueteUrl: string;
  type: "satisfaction" | "reclamation";
  sessionName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyLen = RESEND_API_KEY.length;
    const keyPrefix = RESEND_API_KEY.slice(0, 4);
    console.log(`[send-enquete-email] RESEND_API_KEY len=${keyLen} prefix=${keyPrefix}`);

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: { message: "RESEND_API_KEY manquante (configuration email)" } }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!RESEND_API_KEY.startsWith("re_")) {
      return new Response(
        JSON.stringify({ error: { message: "RESEND_API_KEY invalide (format inattendu)." } }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { to, name, enqueteUrl, type, sessionName }: EnqueteEmailRequest = await req.json();

    console.log(`Sending ${type} enquete email to ${to}`);

    const isSatisfaction = type === "satisfaction";
    const sessionInfo = sessionName ? ` pour la session « ${sessionName} »` : "";

    const subject = isSatisfaction
      ? "Donnez-nous votre avis sur votre formation"
      : "Formulaire de réclamation - Centre de formation";

    const htmlContent = buildEmailHtml({
      title: isSatisfaction ? "⭐ Enquête de satisfaction" : "📋 Formulaire de réclamation",
      accentColor: isSatisfaction ? "#2563eb" : "#dc2626",
      recipientName: name,
      bodyHtml: isSatisfaction
        ? `
          <p style="margin: 0 0 12px 0;">Nous espérons que votre formation${sessionInfo} s'est bien déroulée.</p>
          <p style="margin: 0 0 12px 0;">Afin d'améliorer continuellement la qualité de nos formations, nous vous invitons à prendre quelques minutes pour remplir notre questionnaire de satisfaction.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="${enqueteUrl}" 
                   style="background: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                  ⭐ Donner mon avis
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">Ce lien est personnel et valable pendant 30 jours.</p>
          <p style="margin: 0; color: #888; font-size: 13px;">Votre retour est précieux et nous aide à améliorer nos formations. Merci pour votre confiance.</p>
        `
        : `
          <p style="margin: 0 0 12px 0;">Vous avez demandé à effectuer une réclamation concernant nos services.</p>
          <p style="margin: 0 0 12px 0;">Nous prenons très au sérieux vos retours et nous nous engageons à traiter votre demande dans les meilleurs délais.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
            <tr>
              <td align="center">
                <a href="${enqueteUrl}" 
                   style="background: #dc2626; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 15px;">
                  📋 Remplir ma réclamation
                </a>
              </td>
            </tr>
          </table>
          <p style="margin: 0 0 8px 0; color: #888; font-size: 13px;">Ce lien est personnel et valable pendant 30 jours.</p>
          <p style="margin: 0; color: #888; font-size: 13px;">Votre réclamation sera traitée avec la plus grande attention. Merci pour votre confiance.</p>
        `,
    });

    const emailResponse = await resend.emails.send({
      from: EMAIL_CONFIG.FROM,
      to: [to],
      subject,
      html: htmlContent,
      reply_to: EMAIL_CONFIG.REPLY_TO,
    });

    console.log("Resend response:", emailResponse);

    if ((emailResponse as any)?.error) {
      return new Response(JSON.stringify(emailResponse), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-enquete-email function:", error);
    return new Response(JSON.stringify({ error: { message: error?.message ?? String(error) } }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
