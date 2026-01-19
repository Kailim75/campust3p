import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Authentication check
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
  
  // Verify JWT
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
      // Handle signature request
      const { data: signatureRequest, error: fetchError } = await supabase
        .from("signature_requests")
        .select(`
          id,
          titre,
          description,
          type_document,
          date_expiration,
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
        ? `Ce lien expire le ${new Date(signatureRequest.date_expiration).toLocaleDateString("fr-FR")}.`
        : "";

      const emailResponse = await resend.emails.send({
        from: "Drop Academy Montrouge <dropacademymontrouge@gmail.com>",
        to: [contact.email],
        subject: `Document à signer : ${signatureRequest.titre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">📝 Document à signer</h2>
            <p>Bonjour ${contact.prenom} ${contact.nom},</p>
            <p>Vous avez un document à signer électroniquement :</p>
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">${signatureRequest.titre}</h3>
              <p style="margin: 5px 0;"><strong>Type :</strong> ${signatureRequest.type_document}</p>
              ${signatureRequest.description ? `<p style="margin: 5px 0;">${signatureRequest.description}</p>` : ""}
            </div>
            <p>Cliquez sur le bouton ci-dessous pour signer le document :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signingLink}" 
                 style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ✍️ Signer le document
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">${expirationText}</p>
            <p style="color: #666; font-size: 14px;">Ou copiez ce lien dans votre navigateur :<br>
              <a href="${signingLink}" style="color: #2563eb;">${signingLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              T3P Formation - Centre de formation Taxi, VTC et VMDTR
            </p>
          </div>
        `,
      });

      // Update signature request status
      await supabase
        .from("signature_requests")
        .update({
          statut: "envoye",
          date_envoi: new Date().toISOString(),
        })
        .eq("id", signatureRequestId);

      // Log email
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
        JSON.stringify({ 
          success: true, 
          message: "Email envoyé avec succès",
          resendId: emailResponse.data?.id 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (type === "contrat_location" && contratLocationId) {
      // Handle contrat location
      const { data: contrat, error: fetchError } = await supabase
        .from("contrats_location")
        .select(`
          id,
          numero_contrat,
          type_contrat,
          objet_location,
          date_debut,
          date_fin,
          montant_mensuel,
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

      const emailResponse = await resend.emails.send({
        from: "Drop Academy Montrouge <dropacademymontrouge@gmail.com>",
        to: [contact.email],
        subject: `Contrat à signer : ${contrat.numero_contrat}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #059669;">📄 Contrat à signer</h2>
            <p>Bonjour ${contact.prenom} ${contact.nom},</p>
            <p>Veuillez trouver ci-dessous les détails de votre contrat de location à signer :</p>
            <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
              <h3 style="margin: 0 0 10px 0; color: #047857;">${typeContratLabel}</h3>
              <p style="margin: 5px 0;"><strong>N° Contrat :</strong> ${contrat.numero_contrat}</p>
              <p style="margin: 5px 0;"><strong>Objet :</strong> ${contrat.objet_location}</p>
              ${vehicule ? `<p style="margin: 5px 0;"><strong>Véhicule :</strong> ${vehicule.marque} ${vehicule.modele} (${vehicule.immatriculation})</p>` : ""}
              <p style="margin: 5px 0;"><strong>Période :</strong> du ${new Date(contrat.date_debut).toLocaleDateString("fr-FR")} au ${new Date(contrat.date_fin).toLocaleDateString("fr-FR")}</p>
              <p style="margin: 5px 0;"><strong>Montant mensuel :</strong> ${Number(contrat.montant_mensuel).toLocaleString("fr-FR")}€</p>
            </div>
            <p>Cliquez sur le bouton ci-dessous pour consulter et signer le contrat :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${signingLink}" 
                 style="background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ✍️ Signer le contrat
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Ou copiez ce lien dans votre navigateur :<br>
              <a href="${signingLink}" style="color: #059669;">${signingLink}</a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #888; font-size: 12px;">
              T3P Formation - Centre de formation Taxi, VTC et VMDTR
            </p>
          </div>
        `,
      });

      // Update contrat status
      await supabase
        .from("contrats_location")
        .update({
          statut: "envoye",
          date_envoi: new Date().toISOString(),
        })
        .eq("id", contratLocationId);

      // Log email
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
        JSON.stringify({ 
          success: true, 
          message: "Email envoyé avec succès",
          resendId: emailResponse.data?.id 
        }),
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
