// Process pending payment reminder queue
// Sends emails for due relances and schedules the next one if needed
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { buildEmailHtml, formatDateFr } from "../_shared/email-template.ts";
import { getFromAddress, EMAIL_CONFIG } from "../_shared/email-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

function replaceVars(content: string, vars: Record<string, string>): string {
  let r = content;
  for (const [k, v] of Object.entries(vars)) {
    r = r.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), v ?? "");
  }
  return r;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

  // Fetch due relances
  const { data: queue, error: qErr } = await supabase
    .from("relance_paiement_queue")
    .select("*")
    .eq("statut", "pending")
    .lte("scheduled_at", new Date().toISOString())
    .limit(50);

  if (qErr) {
    console.error("Queue fetch error:", qErr);
    return new Response(JSON.stringify({ error: qErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results: any[] = [];

  for (const item of queue ?? []) {
    try {
      // Load config, facture, contact, template
      const [{ data: config }, { data: facture }, { data: contact }] = await Promise.all([
        supabase.from("relance_paiement_config").select("*").eq("centre_id", item.centre_id).maybeSingle(),
        supabase.from("factures").select("*").eq("id", item.facture_id).maybeSingle(),
        supabase.from("contacts").select("*").eq("id", item.contact_id).maybeSingle(),
      ]);

      if (!config || !config.actif) {
        await supabase.from("relance_paiement_queue").update({
          statut: "cancelled", error_message: "Config inactive", updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        results.push({ id: item.id, skipped: "config_inactive" });
        continue;
      }

      // If facture is now paid, cancel
      if (!facture || facture.statut === "payee") {
        await supabase.from("relance_paiement_queue").update({
          statut: "cancelled", error_message: "Facture payée ou inexistante", updated_at: new Date().toISOString(),
        }).eq("id", item.id);
        results.push({ id: item.id, skipped: "facture_paid" });
        continue;
      }

      // Get template
      let template;
      if (config.template_email_id) {
        const { data } = await supabase.from("email_templates").select("*").eq("id", config.template_email_id).maybeSingle();
        template = data;
      }
      if (!template) {
        const { data } = await supabase.from("email_templates")
          .select("*").eq("nom", "Relance paiement - Process officiel").maybeSingle();
        template = data;
      }
      if (!template) throw new Error("Template de relance introuvable");

      // Build variables
      const dateEch = facture.date_echeance ? new Date(facture.date_echeance) : null;
      const joursRetard = dateEch ? Math.max(0, Math.floor((Date.now() - dateEch.getTime()) / 86400000)) : 0;
      const baseUrl = Deno.env.get("PUBLIC_APP_URL") || "https://campust3p.lovable.app";

      // Generate tracking token + wrapped link
      const trackingToken = crypto.randomUUID().replace(/-/g, "");
      const targetUrl = `${baseUrl}/factures/${facture.id}`;
      const b64url = (s: string) =>
        btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
      const trackedLink = `${SUPABASE_URL}/functions/v1/track-link?t=${trackingToken}&u=${b64url(targetUrl)}`;

      // Persist token on queue row before send (so a click during send still maps)
      await supabase
        .from("relance_paiement_queue")
        .update({ tracking_token: trackingToken })
        .eq("id", item.id);

      const vars: Record<string, string> = {
        civilite: contact?.civilite || "",
        nom: `${contact?.prenom || ""} ${contact?.nom || ""}`.trim(),
        formation: facture.formation_intitule || "votre formation",
        numero_facture: facture.numero_facture || "",
        montant_du: String(facture.montant_total ?? ""),
        date_echeance: dateEch ? formatDateFr(dateEch.toISOString()) : "—",
        jours_retard: String(joursRetard),
        lien_recapitulatif: trackedLink,
      };

      const sujet = replaceVars(template.sujet, vars);
      const contenu = replaceVars(template.contenu, vars);
      const html = buildEmailHtml({
        title: `🔔 Relance n°${item.numero_relance}`,
        bodyHtml: contenu.split("\n").map(l => `<p style="margin:0 0 10px 0;">${l}</p>`).join(""),
        recipientName: `${contact?.prenom || ""} ${contact?.nom || ""}`.trim(),
      });

      // Send
      if (!resend) throw new Error("RESEND_API_KEY non configuré");
      const sendRes = await resend.emails.send({
        from: getFromAddress(),
        to: [item.email_destinataire],
        replyTo: EMAIL_CONFIG.REPLY_TO,
        subject: sujet,
        html,
      });

      if ((sendRes as any).error) throw new Error(JSON.stringify((sendRes as any).error));

      await supabase.from("relance_paiement_queue").update({
        statut: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", item.id);

      // Schedule next relance if under max
      if (item.numero_relance < config.nb_relances_max) {
        const nextAt = new Date(Date.now() + config.intervalle_jours * 86400000).toISOString();
        await supabase.from("relance_paiement_queue").insert({
          facture_id: item.facture_id,
          contact_id: item.contact_id,
          centre_id: item.centre_id,
          numero_relance: item.numero_relance + 1,
          scheduled_at: nextAt,
          email_destinataire: item.email_destinataire,
          metadata: item.metadata,
        });
      }

      // Log in contact_historique
      await supabase.from("contact_historique").insert({
        contact_id: item.contact_id,
        type: "email",
        titre: `Relance paiement n°${item.numero_relance} envoyée`,
        contenu: `Email envoyé à ${item.email_destinataire} pour la facture ${facture.numero_facture}`,
      });

      results.push({ id: item.id, sent: true, numero: item.numero_relance });
    } catch (e: any) {
      console.error("Error processing relance", item.id, e);
      await supabase.from("relance_paiement_queue").update({
        statut: "failed", error_message: e.message?.slice(0, 500), updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      results.push({ id: item.id, error: e.message });
    }
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
