import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_CONFIG = {
  FROM: "Ecole T3P Montrouge <montrouge@ecolet3p.fr>",
  REPLY_TO: "montrouge@ecolet3p.fr",
  RECIPIENT: "montrouge@ecolet3p.fr",
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("[send-daily-report] Début de la génération du rapport CRM quotidien");

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY non configurée");
    }
    const resend = new Resend(resendApiKey);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const todayISO = now.toISOString().slice(0, 10);
    const in14Days = new Date(now.getTime() + 14 * 86400000).toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
    const sevenDaysAgoDate = sevenDaysAgo.slice(0, 10);

    // ==========================================
    // 1. PROSPECTS À RELANCER
    // ==========================================
    const { data: prospectsRelance } = await supabase
      .from("prospects")
      .select("id, nom, prenom, formation_souhaitee, statut, date_prochaine_relance, last_contacted_at, telephone, email")
      .is("deleted_at", null)
      .eq("is_active", true)
      .not("statut", "eq", "converti")
      .or(`date_prochaine_relance.lte.${todayISO},date_prochaine_relance.is.null`)
      .order("date_prochaine_relance", { ascending: true, nullsFirst: false })
      .limit(20);

    // 2. PROSPECTS SANS ACTIVITÉ > 7 JOURS
    const { data: prospectsDormants } = await supabase
      .from("prospects")
      .select("id, nom, prenom, formation_souhaitee, statut, last_contacted_at, updated_at")
      .is("deleted_at", null)
      .eq("is_active", true)
      .not("statut", "eq", "converti")
      .or(`last_contacted_at.lt.${sevenDaysAgo},last_contacted_at.is.null`)
      .lt("updated_at", sevenDaysAgo)
      .order("updated_at", { ascending: true })
      .limit(20);

    // ==========================================
    // 3. SESSIONS À VENIR (14 jours)
    // ==========================================
    const { data: sessionsAVenir } = await supabase
      .from("sessions")
      .select("id, nom, formation_type, date_debut, date_fin, nb_places, statut")
      .is("deleted_at", null)
      .eq("archived", false)
      .gte("date_debut", todayISO)
      .lte("date_debut", in14Days)
      .order("date_debut", { ascending: true })
      .limit(30);

    // Compter les inscrits par session
    let sessionsWithFill: any[] = [];
    if (sessionsAVenir && sessionsAVenir.length > 0) {
      const sessionIds = sessionsAVenir.map((s) => s.id);
      const { data: inscriptionCounts } = await supabase
        .from("session_inscriptions")
        .select("session_id")
        .is("deleted_at", null)
        .in("session_id", sessionIds)
        .in("statut", ["validee", "en_attente"]);

      const countMap: Record<string, number> = {};
      inscriptionCounts?.forEach((i) => {
        countMap[i.session_id] = (countMap[i.session_id] || 0) + 1;
      });

      sessionsWithFill = sessionsAVenir.map((s) => ({
        ...s,
        nb_inscrits: countMap[s.id] || 0,
        taux_remplissage: s.nb_places ? Math.round(((countMap[s.id] || 0) / s.nb_places) * 100) : null,
      }));
    }

    const sessionsFaibleRemplissage = sessionsWithFill.filter(
      (s) => s.nb_places && s.taux_remplissage !== null && s.taux_remplissage < 50
    );

    // ==========================================
    // 4. INSCRIPTIONS NON PAYÉES / NON SOLDÉES
    // ==========================================
    const { data: facturesImpayees } = await supabase
      .from("factures")
      .select("id, numero_facture, montant_total, statut, date_echeance, contact_id, contacts(nom, prenom, formation)")
      .is("deleted_at", null)
      .in("statut", ["emise", "partiel"])
      .order("date_echeance", { ascending: true, nullsFirst: false })
      .limit(20);

    // Calculer le reste à payer pour chaque facture
    let facturesAvecSolde: any[] = [];
    if (facturesImpayees && facturesImpayees.length > 0) {
      const factureIds = facturesImpayees.map((f) => f.id);
      const { data: paiements } = await supabase
        .from("paiements")
        .select("facture_id, montant")
        .is("deleted_at", null)
        .in("facture_id", factureIds);

      const paiementMap: Record<string, number> = {};
      paiements?.forEach((p) => {
        paiementMap[p.facture_id] = (paiementMap[p.facture_id] || 0) + p.montant;
      });

      facturesAvecSolde = facturesImpayees.map((f) => ({
        ...f,
        total_paye: paiementMap[f.id] || 0,
        reste_a_payer: f.montant_total - (paiementMap[f.id] || 0),
      }));
    }

    // ==========================================
    // 5. DOCUMENTS MANQUANTS (inscrits proches d'une session)
    // ==========================================
    // Récupérer les contacts inscrits dans des sessions à venir
    let dossiersIncomplets: any[] = [];
    if (sessionsAVenir && sessionsAVenir.length > 0) {
      const sessionIds = sessionsAVenir.map((s) => s.id);
      const { data: inscrits } = await supabase
        .from("session_inscriptions")
        .select("contact_id, session_id, contacts(nom, prenom, formation), sessions(nom, date_debut)")
        .is("deleted_at", null)
        .in("session_id", sessionIds)
        .in("statut", ["validee", "en_attente"]);

      if (inscrits && inscrits.length > 0) {
        const contactIds = [...new Set(inscrits.map((i) => i.contact_id))];
        const { data: docs } = await supabase
          .from("contact_documents")
          .select("contact_id, type_document")
          .is("deleted_at", null)
          .in("contact_id", contactIds);

        const docsMap: Record<string, Set<string>> = {};
        docs?.forEach((d) => {
          if (!docsMap[d.contact_id]) docsMap[d.contact_id] = new Set();
          docsMap[d.contact_id].add(d.type_document);
        });

        const requiredDocs = ["piece_identite", "photo_identite", "permis_conduire"];

        for (const insc of inscrits) {
          const existingDocs = docsMap[insc.contact_id] || new Set();
          const missing = requiredDocs.filter((d) => !existingDocs.has(d));
          if (missing.length > 0) {
            dossiersIncomplets.push({
              contact: insc.contacts,
              session: insc.sessions,
              missing,
            });
          }
        }
        dossiersIncomplets = dossiersIncomplets.slice(0, 15);
      }
    }

    // ==========================================
    // 6. EXAMENS À VENIR (14 jours)
    // ==========================================
    const { data: examensT3P } = await supabase
      .from("examens_t3p")
      .select("id, date_examen, heure_examen, centre_examen, type_formation, statut, contacts(nom, prenom)")
      .gte("date_examen", todayISO)
      .lte("date_examen", in14Days)
      .in("statut", ["programme", "confirme", "planifie"])
      .order("date_examen", { ascending: true })
      .limit(20);

    const { data: examensPratique } = await supabase
      .from("examens_pratique")
      .select("id, date_examen, heure_examen, centre_examen, type_examen, statut, contacts(nom, prenom)")
      .gte("date_examen", todayISO)
      .lte("date_examen", in14Days)
      .in("statut", ["programme", "confirme", "planifie"])
      .order("date_examen", { ascending: true })
      .limit(20);

    // ==========================================
    // 7. ENCAISSEMENTS DES 7 DERNIERS JOURS
    // ==========================================
    const { data: encaissements } = await supabase
      .from("paiements")
      .select("id, montant, date_paiement, mode_paiement, reference, factures(numero_facture, contacts(nom, prenom))")
      .is("deleted_at", null)
      .gte("date_paiement", sevenDaysAgoDate)
      .order("date_paiement", { ascending: false })
      .limit(30);

    const totalEncaisse = encaissements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;
    const totalResteAPayer = facturesAvecSolde.reduce((sum, f) => sum + f.reste_a_payer, 0);

    // ==========================================
    // BUILD HTML REPORT
    // ==========================================
    const dateFr = now.toLocaleDateString("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const html = buildReportHtml({
      dateFr,
      prospectsRelance: prospectsRelance || [],
      prospectsDormants: prospectsDormants || [],
      sessionsWithFill,
      sessionsFaibleRemplissage,
      facturesAvecSolde,
      dossiersIncomplets,
      examensT3P: examensT3P || [],
      examensPratique: examensPratique || [],
      encaissements: encaissements || [],
      totalEncaisse,
      totalResteAPayer,
    });

    // ==========================================
    // SEND EMAIL
    // ==========================================
    const subject = `📊 Rapport CRM — ${dateFr}`;
    const emailResponse = await resend.emails.send({
      from: EMAIL_CONFIG.FROM,
      to: [EMAIL_CONFIG.RECIPIENT],
      reply_to: EMAIL_CONFIG.REPLY_TO,
      subject,
      html,
    });

    console.log("[send-daily-report] Resend response:", JSON.stringify(emailResponse));

    const emailError = (emailResponse as any)?.error;
    const resendId = emailResponse?.data?.id;

    // Log in email_logs
    await supabase.from("email_logs").insert({
      type: "daily_report",
      recipient_email: EMAIL_CONFIG.RECIPIENT,
      recipient_name: "Direction",
      subject,
      template_used: "daily_crm_report",
      status: emailError ? "error" : "sent",
      error_message: emailError ? JSON.stringify(emailError) : null,
      resend_id: resendId || null,
      metadata: {
        prospects_relance: (prospectsRelance || []).length,
        prospects_dormants: (prospectsDormants || []).length,
        sessions_a_venir: sessionsWithFill.length,
        sessions_faible_remplissage: sessionsFaibleRemplissage.length,
        factures_impayees: facturesAvecSolde.length,
        dossiers_incomplets: dossiersIncomplets.length,
        examens_t3p: (examensT3P || []).length,
        examens_pratique: (examensPratique || []).length,
        encaissements_7j: totalEncaisse,
        generation_ms: Date.now() - startTime,
      },
    });

    if (emailError) {
      throw new Error(`Resend error: ${JSON.stringify(emailError)}`);
    }

    console.log(`[send-daily-report] Rapport envoyé avec succès en ${Date.now() - startTime}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        resend_id: resendId,
        stats: {
          prospects_relance: (prospectsRelance || []).length,
          prospects_dormants: (prospectsDormants || []).length,
          sessions_a_venir: sessionsWithFill.length,
          factures_impayees: facturesAvecSolde.length,
          dossiers_incomplets: dossiersIncomplets.length,
          examens: (examensT3P || []).length + (examensPratique || []).length,
          encaissements_7j: totalEncaisse,
        },
        duration_ms: Date.now() - startTime,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[send-daily-report] ERREUR:", error.message);

    // Log l'erreur
    try {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("email_logs").insert({
        type: "daily_report",
        recipient_email: EMAIL_CONFIG.RECIPIENT,
        recipient_name: "Direction",
        subject: "Rapport CRM quotidien (ÉCHEC)",
        template_used: "daily_crm_report",
        status: "error",
        error_message: error.message,
      });
    } catch (_) { /* ignore log failure */ }

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ==========================================
// HTML TEMPLATE BUILDER
// ==========================================
function buildReportHtml(data: any): string {
  const {
    dateFr, prospectsRelance, prospectsDormants, sessionsWithFill,
    sessionsFaibleRemplissage, facturesAvecSolde, dossiersIncomplets,
    examensT3P, examensPratique, encaissements, totalEncaisse, totalResteAPayer,
  } = data;

  const kpiCards = [
    { label: "Prospects à relancer", value: prospectsRelance.length, color: "#e74c3c", icon: "🔥" },
    { label: "Sessions à venir", value: sessionsWithFill.length, color: "#3498db", icon: "📅" },
    { label: "Factures impayées", value: facturesAvecSolde.length, color: "#f39c12", icon: "💰" },
    { label: "Dossiers incomplets", value: dossiersIncomplets.length, color: "#9b59b6", icon: "📂" },
    { label: "Examens à venir", value: examensT3P.length + examensPratique.length, color: "#1abc9c", icon: "🎯" },
    { label: "Encaissé (7j)", value: formatCurrency(totalEncaisse), color: "#27ae60", icon: "✅" },
  ];

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport CRM Quotidien</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;">
<tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="680" cellpadding="0" cellspacing="0" style="max-width:680px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

<!-- HEADER -->
<tr><td style="background:linear-gradient(135deg,#1B4D3E,#2d7a5f);padding:30px 35px;">
  <p style="margin:0 0 4px 0;font-size:12px;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:2px;">Ecole T3P Montrouge</p>
  <h1 style="margin:0 0 6px 0;font-size:24px;color:#fff;font-weight:800;">📊 Rapport CRM Quotidien</h1>
  <p style="margin:0;font-size:14px;color:rgba(255,255,255,0.85);">${dateFr}</p>
</td></tr>

<!-- KPI CARDS -->
<tr><td style="padding:24px 24px 0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      ${kpiCards.map((k, i) => `
        ${i > 0 && i % 3 === 0 ? '</tr><tr style="height:12px;"><td colspan="5"></td></tr><tr>' : ''}
        ${i % 3 > 0 ? '<td width="12"></td>' : ''}
        <td style="background:${k.color}10;border:1px solid ${k.color}30;border-radius:10px;padding:16px;text-align:center;width:33%;">
          <p style="margin:0;font-size:22px;">${k.icon}</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:${k.color};">${k.value}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.5px;">${k.label}</p>
        </td>
      `).join("")}
    </tr>
  </table>
</td></tr>

<!-- SECTION: PRIORITÉS PROSPECTS -->
<tr><td style="padding:28px 28px 0;">
  ${sectionHeader("🔥 Priorités Prospects", `${prospectsRelance.length} à relancer · ${prospectsDormants.length} dormants`)}
  ${prospectsRelance.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Prospect</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Formation</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Relance</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Statut</td>
      </tr>
      ${prospectsRelance.slice(0, 10).map((p: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
          <td style="padding:8px 12px;font-size:13px;color:#333;"><strong>${p.prenom} ${p.nom}</strong></td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${p.formation_souhaitee || "—"}</td>
          <td style="padding:8px 12px;font-size:12px;color:${isOverdue(p.date_prochaine_relance) ? '#e74c3c' : '#666'};">${formatDateShort(p.date_prochaine_relance)}</td>
          <td style="padding:8px 12px;">${statusBadge(p.statut)}</td>
        </tr>
      `).join("")}
    </table>
  ` : `<p style="color:#999;font-size:13px;font-style:italic;">Aucun prospect à relancer aujourd'hui ✅</p>`}

  ${prospectsDormants.length > 0 ? `
    <p style="font-size:12px;color:#e67e22;margin:8px 0 4px;"><strong>⏳ ${prospectsDormants.length} prospect(s) sans activité depuis 7+ jours</strong></p>
    <p style="font-size:12px;color:#888;margin:0;">${prospectsDormants.slice(0, 5).map((p: any) => `${p.prenom} ${p.nom} (${p.formation_souhaitee || "—"})`).join(" · ")}</p>
  ` : ""}
</td></tr>

<!-- SECTION: SESSIONS ET REMPLISSAGE -->
<tr><td style="padding:28px 28px 0;">
  ${sectionHeader("📅 Sessions & Remplissage", `${sessionsWithFill.length} session(s) dans les 14 prochains jours`)}
  ${sessionsWithFill.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Session</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Date</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Inscrits</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Remplissage</td>
      </tr>
      ${sessionsWithFill.map((s: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
          <td style="padding:8px 12px;font-size:13px;color:#333;"><strong>${s.nom || s.formation_type}</strong></td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${formatDateShort(s.date_debut)}</td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${s.nb_inscrits}/${s.nb_places || "?"}</td>
          <td style="padding:8px 12px;">${fillBadge(s.taux_remplissage)}</td>
        </tr>
      `).join("")}
    </table>
  ` : `<p style="color:#999;font-size:13px;font-style:italic;">Aucune session programmée dans les 14 prochains jours</p>`}
  ${sessionsFaibleRemplissage.length > 0 ? `
    <p style="font-size:12px;color:#e74c3c;margin:4px 0;"><strong>⚠️ ${sessionsFaibleRemplissage.length} session(s) sous 50% de remplissage</strong></p>
  ` : ""}
</td></tr>

<!-- SECTION: DOSSIERS ET DOCUMENTS -->
<tr><td style="padding:28px 28px 0;">
  ${sectionHeader("📂 Dossiers & Documents", `${dossiersIncomplets.length} dossier(s) incomplet(s)`)}
  ${dossiersIncomplets.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Apprenant</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Session</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;">Documents manquants</td>
      </tr>
      ${dossiersIncomplets.slice(0, 10).map((d: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
          <td style="padding:8px 12px;font-size:13px;color:#333;"><strong>${d.contact?.prenom || ""} ${d.contact?.nom || ""}</strong></td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${d.session?.nom || "—"} (${formatDateShort(d.session?.date_debut)})</td>
          <td style="padding:8px 12px;font-size:12px;color:#e74c3c;">${d.missing.map(docLabel).join(", ")}</td>
        </tr>
      `).join("")}
    </table>
  ` : `<p style="color:#999;font-size:13px;font-style:italic;">Tous les dossiers sont complets ✅</p>`}
</td></tr>

<!-- SECTION: EXAMENS -->
<tr><td style="padding:28px 28px 0;">
  ${sectionHeader("🎯 Examens à venir", `${examensT3P.length} T3P · ${examensPratique.length} Pratique(s)`)}
  ${examensT3P.length > 0 ? `
    <p style="font-size:12px;font-weight:700;color:#1B4D3E;margin:0 0 6px;">Examens T3P</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">CANDIDAT</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">DATE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">CENTRE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">TYPE</td>
      </tr>
      ${examensT3P.slice(0, 10).map((e: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
          <td style="padding:8px 12px;font-size:13px;"><strong>${e.contacts?.prenom || ""} ${e.contacts?.nom || ""}</strong></td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${formatDateShort(e.date_examen)} ${e.heure_examen || ""}</td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${e.centre_examen || "—"}</td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${e.type_formation || "—"}</td>
        </tr>
      `).join("")}
    </table>
  ` : ""}
  ${examensPratique.length > 0 ? `
    <p style="font-size:12px;font-weight:700;color:#1B4D3E;margin:0 0 6px;">Examens Pratiques</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">CANDIDAT</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">DATE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">CENTRE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">TYPE</td>
      </tr>
      ${examensPratique.slice(0, 10).map((e: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
          <td style="padding:8px 12px;font-size:13px;"><strong>${e.contacts?.prenom || ""} ${e.contacts?.nom || ""}</strong></td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${formatDateShort(e.date_examen)} ${e.heure_examen || ""}</td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${e.centre_examen || "—"}</td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${e.type_examen || "—"}</td>
        </tr>
      `).join("")}
    </table>
  ` : ""}
  ${examensT3P.length === 0 && examensPratique.length === 0 ? `<p style="color:#999;font-size:13px;font-style:italic;">Aucun examen prévu dans les 14 prochains jours</p>` : ""}
</td></tr>

<!-- SECTION: ENCAISSEMENTS -->
<tr><td style="padding:28px 28px 0;">
  ${sectionHeader("💰 Encaissements & Trésorerie", `${formatCurrency(totalEncaisse)} encaissés sur 7 jours · ${formatCurrency(totalResteAPayer)} restant à encaisser`)}
  ${encaissements.length > 0 ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;overflow:hidden;margin-bottom:12px;">
      <tr style="background:#fafafa;">
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">DATE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">APPRENANT</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">FACTURE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;">MODE</td>
        <td style="padding:8px 12px;font-size:11px;color:#888;font-weight:700;text-align:right;">MONTANT</td>
      </tr>
      ${encaissements.slice(0, 10).map((p: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'};">
          <td style="padding:8px 12px;font-size:12px;color:#666;">${formatDateShort(p.date_paiement)}</td>
          <td style="padding:8px 12px;font-size:13px;"><strong>${p.factures?.contacts?.prenom || ""} ${p.factures?.contacts?.nom || ""}</strong></td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${p.factures?.numero_facture || "—"}</td>
          <td style="padding:8px 12px;font-size:12px;color:#666;">${p.mode_paiement || "—"}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:700;color:#27ae60;text-align:right;">${formatCurrency(p.montant)}</td>
        </tr>
      `).join("")}
    </table>
  ` : `<p style="color:#999;font-size:13px;font-style:italic;">Aucun encaissement sur les 7 derniers jours</p>`}
</td></tr>

<!-- FOOTER -->
<tr><td style="padding:28px 28px;background:#f8f9fa;border-top:1px solid #eee;text-align:center;">
  <p style="margin:0 0 4px;font-size:12px;color:#999;"><strong>Ecole T3P Montrouge</strong> — Centre de formation Taxi, VTC et VMDTR</p>
  <p style="margin:0;font-size:11px;color:#bbb;">Rapport généré automatiquement · ${new Date().toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}</p>
</td></tr>

</table>
</td></tr></table>
</body></html>`;
}

// ==========================================
// HELPERS
// ==========================================
function sectionHeader(title: string, subtitle: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;border-bottom:2px solid #1B4D3E;">
      <tr>
        <td style="padding-bottom:8px;">
          <h2 style="margin:0;font-size:17px;color:#1B4D3E;font-weight:800;">${title}</h2>
          <p style="margin:2px 0 0;font-size:12px;color:#888;">${subtitle}</p>
        </td>
      </tr>
    </table>`;
}

function formatDateShort(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  } catch { return d; }
}

function isOverdue(d: string | null): boolean {
  if (!d) return false;
  return new Date(d) < new Date();
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

function statusBadge(statut: string | null): string {
  const colors: Record<string, string> = {
    nouveau: "#3498db", contacte: "#f39c12", qualifie: "#27ae60",
    relance: "#e67e22", en_attente: "#9b59b6", perdu: "#e74c3c",
  };
  const c = colors[statut || ""] || "#999";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${c}18;color:${c};border:1px solid ${c}30;">${statut || "—"}</span>`;
}

function fillBadge(pct: number | null): string {
  if (pct === null) return "—";
  const c = pct >= 75 ? "#27ae60" : pct >= 50 ? "#f39c12" : "#e74c3c";
  return `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:700;background:${c}18;color:${c};border:1px solid ${c}30;">${pct}%</span>`;
}

function docLabel(type: string): string {
  const labels: Record<string, string> = {
    piece_identite: "Pièce d'identité",
    photo_identite: "Photo d'identité",
    permis_conduire: "Permis de conduire",
    justificatif_domicile: "Justificatif domicile",
    attestation_cpf: "Attestation CPF",
  };
  return labels[type] || type;
}
