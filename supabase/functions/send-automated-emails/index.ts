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
  success: boolean;
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
    // ========================================
    // 1. RELANCES FACTURES IMPAYÉES
    // ========================================
    console.log("Checking for unpaid invoices...");
    
    const { data: unpaidInvoices, error: invoicesError } = await supabase
      .from("factures")
      .select(`
        id,
        numero_facture,
        montant_total,
        date_echeance,
        contact:contacts(id, nom, prenom, email)
      `)
      .in("statut", ["emise", "partiel", "impayee"])
      .not("date_echeance", "is", null)
      .lt("date_echeance", today.toISOString().split("T")[0]);

    if (invoicesError) {
      console.error("Error fetching unpaid invoices:", invoicesError);
    } else if (unpaidInvoices && unpaidInvoices.length > 0) {
      console.log(`Found ${unpaidInvoices.length} overdue invoices`);
      
      for (const invoice of unpaidInvoices) {
        const contact = invoice.contact as any;
        if (!contact?.email) continue;

        try {
          const daysOverdue = Math.floor(
            (today.getTime() - new Date(invoice.date_echeance!).getTime()) / (1000 * 60 * 60 * 24)
          );

          const emailResponse = await resend.emails.send({
            from: "T3P Formation <noreply@resend.dev>",
            to: [contact.email],
            subject: `Rappel de paiement - Facture ${invoice.numero_facture}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Rappel de paiement</h2>
                <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                <p>Nous vous rappelons que la facture <strong>${invoice.numero_facture}</strong> 
                   d'un montant de <strong>${Number(invoice.montant_total).toLocaleString("fr-FR")}€</strong> 
                   était due le <strong>${new Date(invoice.date_echeance!).toLocaleDateString("fr-FR")}</strong>.</p>
                <p style="color: #e74c3c;">Cette facture est en retard de <strong>${daysOverdue} jour(s)</strong>.</p>
                <p>Nous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.</p>
                <p>Si vous avez déjà effectué le paiement, veuillez ignorer ce message.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #888; font-size: 12px;">
                  T3P Formation - Centre de formation Taxi, VTC et VMDTR
                </p>
              </div>
            `,
          });

          results.push({
            type: "invoice_reminder",
            recipient: contact.email,
            success: true,
          });
          console.log(`Payment reminder sent to ${contact.email} for invoice ${invoice.numero_facture}`);
        } catch (emailError: any) {
          results.push({
            type: "invoice_reminder",
            recipient: contact.email,
            success: false,
            error: emailError.message,
          });
          console.error(`Failed to send reminder to ${contact.email}:`, emailError);
        }
      }
    }

    // ========================================
    // 2. RAPPELS FORMATION J-7
    // ========================================
    console.log("Checking for sessions starting in 7 days...");
    
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const j7Date = sevenDaysFromNow.toISOString().split("T")[0];

    const { data: sessionsJ7, error: sessionsJ7Error } = await supabase
      .from("sessions")
      .select(`
        id,
        nom,
        date_debut,
        date_fin,
        lieu,
        formation_type,
        session_inscriptions(
          id,
          statut,
          contact:contacts(id, nom, prenom, email)
        )
      `)
      .eq("date_debut", j7Date)
      .in("statut", ["a_venir", "complet"]);

    if (sessionsJ7Error) {
      console.error("Error fetching J-7 sessions:", sessionsJ7Error);
    } else if (sessionsJ7 && sessionsJ7.length > 0) {
      console.log(`Found ${sessionsJ7.length} sessions starting in 7 days`);
      
      for (const session of sessionsJ7) {
        const inscriptions = session.session_inscriptions as any[];
        if (!inscriptions) continue;

        for (const inscription of inscriptions) {
          if (inscription.statut !== "inscrit") continue;
          const contact = inscription.contact;
          if (!contact?.email) continue;

          try {
            await resend.emails.send({
              from: "T3P Formation <noreply@resend.dev>",
              to: [contact.email],
              subject: `Rappel J-7 : Votre formation ${session.nom} approche !`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Votre formation commence dans 7 jours !</h2>
                  <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                  <p>Nous vous rappelons que vous êtes inscrit(e) à la formation suivante :</p>
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1e40af;">${session.nom}</h3>
                    <p style="margin: 5px 0;"><strong>Type :</strong> ${session.formation_type}</p>
                    <p style="margin: 5px 0;"><strong>Du :</strong> ${new Date(session.date_debut).toLocaleDateString("fr-FR")} au ${new Date(session.date_fin).toLocaleDateString("fr-FR")}</p>
                    ${session.lieu ? `<p style="margin: 5px 0;"><strong>Lieu :</strong> ${session.lieu}</p>` : ""}
                  </div>
                  <h3>Documents à préparer :</h3>
                  <ul>
                    <li>Pièce d'identité en cours de validité</li>
                    <li>Permis de conduire</li>
                    <li>Photo d'identité (si non fournie)</li>
                  </ul>
                  <p>N'hésitez pas à nous contacter si vous avez des questions.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #888; font-size: 12px;">
                    T3P Formation - Centre de formation Taxi, VTC et VMDTR
                  </p>
                </div>
              `,
            });

            results.push({
              type: "reminder_j7",
              recipient: contact.email,
              success: true,
            });
            console.log(`J-7 reminder sent to ${contact.email} for session ${session.nom}`);
          } catch (emailError: any) {
            results.push({
              type: "reminder_j7",
              recipient: contact.email,
              success: false,
              error: emailError.message,
            });
          }
        }
      }
    }

    // ========================================
    // 3. RAPPELS FORMATION J-1
    // ========================================
    console.log("Checking for sessions starting tomorrow...");
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const j1Date = tomorrow.toISOString().split("T")[0];

    const { data: sessionsJ1, error: sessionsJ1Error } = await supabase
      .from("sessions")
      .select(`
        id,
        nom,
        date_debut,
        date_fin,
        lieu,
        formation_type,
        session_inscriptions(
          id,
          statut,
          contact:contacts(id, nom, prenom, email)
        )
      `)
      .eq("date_debut", j1Date)
      .in("statut", ["a_venir", "complet"]);

    if (sessionsJ1Error) {
      console.error("Error fetching J-1 sessions:", sessionsJ1Error);
    } else if (sessionsJ1 && sessionsJ1.length > 0) {
      console.log(`Found ${sessionsJ1.length} sessions starting tomorrow`);
      
      for (const session of sessionsJ1) {
        const inscriptions = session.session_inscriptions as any[];
        if (!inscriptions) continue;

        for (const inscription of inscriptions) {
          if (inscription.statut !== "inscrit") continue;
          const contact = inscription.contact;
          if (!contact?.email) continue;

          try {
            await resend.emails.send({
              from: "T3P Formation <noreply@resend.dev>",
              to: [contact.email],
              subject: `C'est demain ! Rappel pour votre formation ${session.nom}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #059669;">🎓 Votre formation commence demain !</h2>
                  <p>Bonjour ${contact.prenom} ${contact.nom},</p>
                  <p>Nous vous attendons <strong>demain</strong> pour le début de votre formation :</p>
                  <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669;">
                    <h3 style="margin: 0 0 10px 0; color: #047857;">${session.nom}</h3>
                    <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${new Date(session.date_debut).toLocaleDateString("fr-FR")}</p>
                    ${session.lieu ? `<p style="margin: 5px 0;"><strong>📍 Lieu :</strong> ${session.lieu}</p>` : ""}
                    <p style="margin: 5px 0;"><strong>⏰ Heure :</strong> 9h00 (merci d'arriver 15 minutes avant)</p>
                  </div>
                  <h3>Rappel des documents obligatoires :</h3>
                  <ul>
                    <li>✅ Pièce d'identité en cours de validité</li>
                    <li>✅ Permis de conduire</li>
                    <li>✅ De quoi prendre des notes</li>
                  </ul>
                  <p style="color: #059669; font-weight: bold;">Nous avons hâte de vous accueillir !</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p style="color: #888; font-size: 12px;">
                    T3P Formation - Centre de formation Taxi, VTC et VMDTR
                  </p>
                </div>
              `,
            });

            results.push({
              type: "reminder_j1",
              recipient: contact.email,
              success: true,
            });
            console.log(`J-1 reminder sent to ${contact.email} for session ${session.nom}`);
          } catch (emailError: any) {
            results.push({
              type: "reminder_j1",
              recipient: contact.email,
              success: false,
              error: emailError.message,
            });
          }
        }
      }
    }

    // ========================================
    // SUMMARY
    // ========================================
    const summary = {
      timestamp: new Date().toISOString(),
      total_emails: results.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      breakdown: {
        invoice_reminders: results.filter((r) => r.type === "invoice_reminder").length,
        j7_reminders: results.filter((r) => r.type === "reminder_j7").length,
        j1_reminders: results.filter((r) => r.type === "reminder_j1").length,
      },
      details: results,
    };

    console.log("Email automation completed:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in automated emails function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
