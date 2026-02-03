import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailResult {
  type: string;
  recipient: string;
  recipientName?: string;
  contactId?: string;
  examenId?: string;
  subject?: string;
  success: boolean;
  resendId?: string;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const results: EmailResult[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    console.log("Starting exam reminders job...");

    // Calculate target dates
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const j7Date = sevenDaysFromNow.toISOString().split("T")[0];

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const j1Date = tomorrow.toISOString().split("T")[0];

    // ========================================
    // 1. RAPPELS EXAMEN T3P J-7 (théoriques)
    // ========================================
    console.log("Checking for T3P exams in 7 days...");
    
    const { data: examensT3PJ7, error: examensT3PError } = await supabase
      .from("examens_t3p")
      .select(`
        id,
        date_examen,
        heure_examen,
        centre_examen,
        type_formation,
        numero_tentative,
        contact:contacts(id, nom, prenom, email)
      `)
      .eq("date_examen", j7Date)
      .eq("statut", "planifie");

    if (examensT3PError) {
      console.error("Error fetching T3P exams:", examensT3PError);
    } else if (examensT3PJ7 && examensT3PJ7.length > 0) {
      console.log(`Found ${examensT3PJ7.length} T3P exams in 7 days`);
      
      for (const examen of examensT3PJ7) {
        const contact = examen.contact as any;
        if (!contact?.email) continue;

        const emailSubject = `Rappel : Votre examen T3P ${examen.type_formation} dans 7 jours`;

        try {
          const emailResponse = await resend.emails.send({
            from: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
            to: [contact.email],
            subject: emailSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">📝 Rappel Examen T3P - J-7</h2>
                <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                <p>Votre examen T3P approche ! Voici les détails :</p>
                <div style="background: #faf5ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                  <h3 style="margin: 0 0 10px 0; color: #6d28d9;">Examen T3P - ${examen.type_formation}</h3>
                  <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(examen.date_examen).toLocaleDateString("fr-FR")}</p>
                  ${examen.heure_examen ? `<p style="margin: 5px 0;"><strong>⏰ Heure :</strong> ${examen.heure_examen}</p>` : ""}
                  ${examen.centre_examen ? `<p style="margin: 5px 0;"><strong>📍 Centre :</strong> ${examen.centre_examen}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>🔢 Tentative :</strong> ${examen.numero_tentative || 1}/3</p>
                </div>
                <h3>Documents obligatoires :</h3>
                <ul>
                  <li>✅ Pièce d'identité en cours de validité</li>
                  <li>✅ Convocation à l'examen</li>
                  <li>✅ Attestation de formation</li>
                </ul>
                <p>Pensez à réviser et à vous présenter à l'heure !</p>
                <p style="color: #7c3aed; font-weight: bold;">Bon courage pour votre examen !</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">
                  T3P Formation - Centre de formation Taxi, VTC et VMDTR
                </p>
              </div>
            `,
          });

          // Log email to database
          await supabase.from("email_logs").insert({
            type: "exam_reminder_t3p_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            examen_id: examen.id,
            subject: emailSubject,
            template_used: "exam_reminder_t3p_j7",
            status: "sent",
            resend_id: emailResponse.data?.id,
          });

          results.push({
            type: "exam_reminder_t3p_j7",
            recipient: contact.email,
            recipientName: `${contact.prenom} ${contact.nom}`,
            contactId: contact.id,
            examenId: examen.id,
            subject: emailSubject,
            success: true,
            resendId: emailResponse.data?.id,
          });
          console.log(`T3P J-7 reminder sent to ${contact.email}`);
        } catch (emailError: any) {
          await supabase.from("email_logs").insert({
            type: "exam_reminder_t3p_j7",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            examen_id: examen.id,
            subject: emailSubject,
            template_used: "exam_reminder_t3p_j7",
            status: "failed",
            error_message: emailError.message,
          });

          results.push({
            type: "exam_reminder_t3p_j7",
            recipient: contact.email,
            success: false,
            error: emailError.message,
          });
          console.error(`Failed to send T3P reminder to ${contact.email}:`, emailError);
        }
      }
    }

    // ========================================
    // 2. RAPPELS EXAMEN PRATIQUE J-1
    // ========================================
    console.log("Checking for practical exams tomorrow...");
    
    const { data: examensPratiquesJ1, error: examensPratiquesError } = await supabase
      .from("examens_pratique")
      .select(`
        id,
        date_examen,
        heure_examen,
        lieu_examen,
        type_examen,
        numero_tentative,
        contact:contacts(id, nom, prenom, email)
      `)
      .eq("date_examen", j1Date)
      .in("statut", ["inscrit", "planifie"]);

    if (examensPratiquesError) {
      console.error("Error fetching practical exams:", examensPratiquesError);
    } else if (examensPratiquesJ1 && examensPratiquesJ1.length > 0) {
      console.log(`Found ${examensPratiquesJ1.length} practical exams tomorrow`);
      
      for (const examen of examensPratiquesJ1) {
        const contact = examen.contact as any;
        if (!contact?.email) continue;

        const emailSubject = `Rappel : Examen pratique demain - ${examen.type_examen}`;

        try {
          const emailResponse = await resend.emails.send({
            from: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
            to: [contact.email],
            subject: emailSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #059669;">🚗 Rappel Examen Pratique - Demain !</h2>
                <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                <p><strong>Votre examen pratique est prévu demain !</strong></p>
                <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
                  <h3 style="margin: 0 0 10px 0; color: #047857;">Examen Pratique - ${examen.type_examen}</h3>
                  <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(examen.date_examen).toLocaleDateString("fr-FR")}</p>
                  ${examen.heure_examen ? `<p style="margin: 5px 0;"><strong>⏰ Heure :</strong> ${examen.heure_examen}</p>` : ""}
                  ${examen.lieu_examen ? `<p style="margin: 5px 0;"><strong>📍 Lieu :</strong> ${examen.lieu_examen}</p>` : ""}
                  <p style="margin: 5px 0;"><strong>🔢 Tentative :</strong> ${examen.numero_tentative || 1}/3</p>
                </div>
                <h3>Rappel des éléments à prévoir :</h3>
                <ul>
                  <li>✅ Véhicule conforme aux normes</li>
                  <li>✅ Pièce d'identité en cours de validité</li>
                  <li>✅ Permis de conduire</li>
                  <li>✅ Attestation de formation</li>
                  <li>✅ Convocation à l'examen</li>
                </ul>
                <p style="color: #059669; font-weight: bold;">Présentez-vous 15 minutes avant l'heure prévue. Bonne chance !</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">
                  T3P Formation - Centre de formation Taxi, VTC et VMDTR
                </p>
              </div>
            `,
          });

          await supabase.from("email_logs").insert({
            type: "exam_reminder_pratique_j1",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            examen_id: examen.id,
            subject: emailSubject,
            template_used: "exam_reminder_pratique_j1",
            status: "sent",
            resend_id: emailResponse.data?.id,
          });

          results.push({
            type: "exam_reminder_pratique_j1",
            recipient: contact.email,
            recipientName: `${contact.prenom} ${contact.nom}`,
            contactId: contact.id,
            examenId: examen.id,
            subject: emailSubject,
            success: true,
            resendId: emailResponse.data?.id,
          });
          console.log(`Practical J-1 reminder sent to ${contact.email}`);
        } catch (emailError: any) {
          await supabase.from("email_logs").insert({
            type: "exam_reminder_pratique_j1",
            recipient_email: contact.email,
            recipient_name: `${contact.prenom} ${contact.nom}`,
            contact_id: contact.id,
            examen_id: examen.id,
            subject: emailSubject,
            template_used: "exam_reminder_pratique_j1",
            status: "failed",
            error_message: emailError.message,
          });

          results.push({
            type: "exam_reminder_pratique_j1",
            recipient: contact.email,
            success: false,
            error: emailError.message,
          });
          console.error(`Failed to send practical reminder to ${contact.email}:`, emailError);
        }
      }
    }

    // Summary
    const summary = {
      success: true,
      timestamp: new Date().toISOString(),
      totals: {
        sent: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total: results.length,
      },
      byType: {
        exam_t3p_j7: results.filter(r => r.type === "exam_reminder_t3p_j7").length,
        exam_pratique_j1: results.filter(r => r.type === "exam_reminder_pratique_j1").length,
      },
      results,
    };

    console.log("Exam reminders job completed:", summary.totals);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-exam-reminders:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
