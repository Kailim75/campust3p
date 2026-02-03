import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const RESEND_API_KEY = (Deno.env.get("RESEND_API_KEY") ?? "").trim();
const resend = new Resend(RESEND_API_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EnqueteEmailRequest {
  to: string;
  name: string;
  enqueteUrl: string;
  type: "satisfaction" | "reclamation";
  sessionName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const keyLen = RESEND_API_KEY.length;
    const keyPrefix = RESEND_API_KEY.slice(0, 4);
    console.log(`[send-enquete-email] RESEND_API_KEY len=${keyLen} prefix=${keyPrefix}`);

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({
          error: {
            message: "RESEND_API_KEY manquante (configuration email)",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Resend keys normally start with "re_". If not, it's almost certainly the wrong secret.
    if (!RESEND_API_KEY.startsWith("re_")) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              "RESEND_API_KEY invalide (format inattendu). Générez une nouvelle clé API Resend et remplacez le secret.",
          },
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { to, name, enqueteUrl, type, sessionName }: EnqueteEmailRequest =
      await req.json();

    console.log(`Sending ${type} enquete email to ${to}`);

    const isSatisfaction = type === "satisfaction";

    const subject = isSatisfaction
      ? "Donnez-nous votre avis sur votre formation"
      : "Formulaire de réclamation - Centre de formation";

    const sessionInfo = sessionName ? ` pour la session "${sessionName}"` : "";

    const htmlContent = isSatisfaction
      ? `
         <!DOCTYPE html>
         <html>
         <head>
           <meta charset="utf-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
         </head>
         <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
           <div style="background: linear-gradient(135deg, #2563eb, #3b82f6); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
             <h1 style="color: white; margin: 0; font-size: 24px;">Votre avis nous intéresse !</h1>
           </div>

           <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
             <p style="font-size: 16px;">Bonjour <strong>${name}</strong>,</p>

             <p>Nous espérons que votre formation${sessionInfo} s'est bien déroulée.</p>

             <p>Afin d'améliorer continuellement la qualité de nos formations, nous vous invitons à prendre quelques minutes pour remplir notre questionnaire de satisfaction.</p>

             <div style="text-align: center; margin: 30px 0;">
               <a href="${enqueteUrl}" style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                 Donner mon avis
               </a>
             </div>

             <p style="color: #6b7280; font-size: 14px;">Ce lien est personnel et valable pendant 30 jours.</p>

             <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

             <p style="color: #6b7280; font-size: 13px;">
               Votre retour est précieux et nous aide à améliorer nos formations.<br>
               Merci pour votre confiance.
             </p>
           </div>
         </body>
         </html>
       `
      : `
         <!DOCTYPE html>
         <html>
         <head>
           <meta charset="utf-8">
           <meta name="viewport" content="width=device-width, initial-scale=1.0">
         </head>
         <body style="font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
           <div style="background: linear-gradient(135deg, #dc2626, #ef4444); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
             <h1 style="color: white; margin: 0; font-size: 24px;">Formulaire de réclamation</h1>
           </div>

           <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
             <p style="font-size: 16px;">Bonjour <strong>${name}</strong>,</p>

             <p>Vous avez demandé à effectuer une réclamation concernant nos services.</p>

             <p>Nous prenons très au sérieux vos retours et nous nous engageons à traiter votre demande dans les meilleurs délais.</p>

             <div style="text-align: center; margin: 30px 0;">
               <a href="${enqueteUrl}" style="display: inline-block; background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                 Remplir ma réclamation
               </a>
             </div>

             <p style="color: #6b7280; font-size: 14px;">Ce lien est personnel et valable pendant 30 jours.</p>

             <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">

             <p style="color: #6b7280; font-size: 13px;">
               Votre réclamation sera traitée avec la plus grande attention.<br>
               Merci pour votre confiance.
             </p>
           </div>
         </body>
         </html>
       `;

    const emailResponse = await resend.emails.send({
      from: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
      to: [to],
      subject,
      html: htmlContent,
    });

    console.log("Resend response:", emailResponse);

    // IMPORTANT: Resend can return 200 with an `error` payload. We convert that into a non-2xx response
    // so the frontend can correctly detect and display the failure.
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

