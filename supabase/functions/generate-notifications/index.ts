import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationToCreate {
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const notifications: NotificationToCreate[] = [];

    // Get all admin/staff users to notify
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "staff"]);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      throw rolesError;
    }

    const userIds = [...new Set(userRoles?.map(r => r.user_id) || [])];
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users to notify", notifications: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check for T3P exams in 7 days
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const { data: upcomingExamsT3P, error: examsT3PError } = await supabase
      .from("examens_t3p")
      .select(`
        id,
        contact_id,
        type_formation,
        date_examen,
        contacts (nom, prenom)
      `)
      .eq("statut", "planifie")
      .gte("date_examen", today.toISOString().split("T")[0])
      .lte("date_examen", sevenDaysFromNow.toISOString().split("T")[0]);

    if (!examsT3PError && upcomingExamsT3P) {
      for (const exam of upcomingExamsT3P) {
        const contact = exam.contacts as any;
        const daysUntil = Math.ceil((new Date(exam.date_examen).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        for (const userId of userIds) {
          // Check if notification already exists for today
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "exam_t3p")
            .like("link", `%${exam.id}%`)
            .gte("created_at", today.toISOString().split("T")[0]);

          if (!existing || existing.length === 0) {
            notifications.push({
              user_id: userId,
              type: "exam_t3p",
              title: `Examen T3P dans ${daysUntil}j`,
              message: `${contact?.prenom} ${contact?.nom} - ${exam.type_formation.toUpperCase()}`,
              link: `/?section=contacts&id=${exam.contact_id}&tab=examens`,
              metadata: { exam_id: exam.id, days_until: daysUntil },
            });
          }
        }
      }
    }

    // 2. Check for practical exams in 7 days
    const { data: upcomingExamsPratique, error: examsPratiqueError } = await supabase
      .from("examens_pratique")
      .select(`
        id,
        contact_id,
        type_examen,
        date_examen,
        contacts (nom, prenom)
      `)
      .eq("statut", "planifie")
      .gte("date_examen", today.toISOString().split("T")[0])
      .lte("date_examen", sevenDaysFromNow.toISOString().split("T")[0]);

    if (!examsPratiqueError && upcomingExamsPratique) {
      for (const exam of upcomingExamsPratique) {
        const contact = exam.contacts as any;
        const daysUntil = Math.ceil((new Date(exam.date_examen).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        for (const userId of userIds) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "exam_pratique")
            .like("link", `%${exam.id}%`)
            .gte("created_at", today.toISOString().split("T")[0]);

          if (!existing || existing.length === 0) {
            notifications.push({
              user_id: userId,
              type: "exam_pratique",
              title: `Examen pratique dans ${daysUntil}j`,
              message: `${contact?.prenom} ${contact?.nom} - ${exam.type_examen}`,
              link: `/?section=contacts&id=${exam.contact_id}&tab=examens`,
              metadata: { exam_id: exam.id, days_until: daysUntil },
            });
          }
        }
      }
    }

    // 3. Check for overdue payments
    const { data: overdueInvoices, error: invoicesError } = await supabase
      .from("factures")
      .select(`
        id,
        numero_facture,
        montant_total,
        date_echeance,
        contact:contacts (id, nom, prenom)
      `)
      .in("statut", ["emise", "partiel", "impayee"])
      .lt("date_echeance", today.toISOString().split("T")[0]);

    if (!invoicesError && overdueInvoices) {
      for (const facture of overdueInvoices) {
        const contact = facture.contact as any;
        const daysOverdue = Math.ceil((today.getTime() - new Date(facture.date_echeance!).getTime()) / (1000 * 60 * 60 * 24));
        
        for (const userId of userIds) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "payment")
            .like("link", `%${facture.id}%`)
            .gte("created_at", today.toISOString().split("T")[0]);

          if (!existing || existing.length === 0) {
            notifications.push({
              user_id: userId,
              type: "payment",
              title: `Paiement en retard (${daysOverdue}j)`,
              message: `${contact?.prenom} ${contact?.nom} - ${facture.montant_total}€`,
              link: `/?section=paiements&factureId=${facture.id}`,
              metadata: { facture_id: facture.id, days_overdue: daysOverdue },
            });
          }
        }
      }
    }

    // 4. Check for expiring professional cards (30 days)
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const { data: expiringCards, error: cardsError } = await supabase
      .from("contacts")
      .select("id, nom, prenom, date_expiration_carte")
      .eq("archived", false)
      .not("date_expiration_carte", "is", null)
      .gte("date_expiration_carte", today.toISOString().split("T")[0])
      .lte("date_expiration_carte", thirtyDaysFromNow.toISOString().split("T")[0]);

    if (!cardsError && expiringCards) {
      for (const contact of expiringCards) {
        const daysUntil = Math.ceil((new Date(contact.date_expiration_carte!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        for (const userId of userIds) {
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", userId)
            .eq("type", "alert")
            .like("link", `%${contact.id}%`)
            .gte("created_at", today.toISOString().split("T")[0]);

          if (!existing || existing.length === 0) {
            notifications.push({
              user_id: userId,
              type: "alert",
              title: `Carte pro expire dans ${daysUntil}j`,
              message: `${contact.prenom} ${contact.nom}`,
              link: `/?section=contacts&id=${contact.id}`,
              metadata: { contact_id: contact.id, days_until: daysUntil },
            });
          }
        }
      }
    }

    // Insert all notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }
    }

    console.log(`Generated ${notifications.length} notifications`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_created: notifications.length,
        breakdown: {
          exams_t3p: notifications.filter(n => n.type === "exam_t3p").length,
          exams_pratique: notifications.filter(n => n.type === "exam_pratique").length,
          payments: notifications.filter(n => n.type === "payment").length,
          alerts: notifications.filter(n => n.type === "alert").length,
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error in generate-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});