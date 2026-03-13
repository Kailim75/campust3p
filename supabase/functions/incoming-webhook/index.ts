import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Vérifier l'authentification : X-API-KEY header ou x-webhook-secret (legacy)
  const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
  const DRIVEFLOW_API_KEY = Deno.env.get('DRIVEFLOW_API_KEY');
  const providedApiKey = req.headers.get('X-API-KEY') || req.headers.get('x-api-key');
  const providedSecret = req.headers.get('x-webhook-secret') || new URL(req.url).searchParams.get('secret');

  const isAuthenticated = 
    (DRIVEFLOW_API_KEY && providedApiKey === DRIVEFLOW_API_KEY) ||
    (WEBHOOK_SECRET && providedSecret === WEBHOOK_SECRET);

  if ((DRIVEFLOW_API_KEY || WEBHOOK_SECRET) && !isAuthenticated) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();
    const { event, data } = body;

    if (!event) {
      return new Response(JSON.stringify({ error: 'Missing "event" field' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let result: any = { received: true };

    switch (event) {
      // ─── Webhook plateforme conduite : student.created ───
      case 'student.created': {
        const { first_name, last_name, email: studentEmail, phone, activity_type, centre_id: payload_centre_id } = data || {};
        if (!first_name || !last_name || typeof first_name !== 'string' || typeof last_name !== 'string') {
          return new Response(JSON.stringify({ success: false, error: 'data.first_name and data.last_name are required and must be non-empty strings' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get centre_id from payload or fallback to first centre
        let centreId = payload_centre_id;
        if (!centreId) {
          const { data: firstCentre } = await supabase
            .from('centres')
            .select('id')
            .limit(1)
            .single();
          centreId = firstCentre?.id;
        }

        if (!centreId) {
          return new Response(JSON.stringify({ success: false, error: 'No centre_id available' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Insérer dans la table contacts du CRM
        const { data: newStudent, error: studentError } = await supabase
          .from('contacts')
          .insert({
            prenom: String(first_name).substring(0, 100),
            nom: String(last_name).substring(0, 100),
            email: studentEmail ? String(studentEmail).substring(0, 255) : null,
            telephone: phone ? String(phone).substring(0, 20) : null,
            source: 'webhook',
            origine: 'site_web',
            statut: 'En formation théorique',
            statut_apprenant: 'actif',
            formation: activity_type || null,
            centre_id: centreId,
            commentaires: activity_type ? `Activité: ${String(activity_type).substring(0, 100)}` : null,
          })
          .select('id')
          .single();

        if (studentError) throw studentError;

        // Initialiser la progression côté conduite pour affichage immédiat dans l'onglet Élèves
        if (newStudent?.id) {
          const { error: progressionError } = await supabase
            .from('progression_conduite')
            .upsert({
              apprenant_id: newStudent.id,
              niveau_actuel: 'debutant',
              heures_preventive_realisees: 0,
              heures_ville_realisees: 0,
              accompagnement_examen_fait: false,
            }, { onConflict: 'apprenant_id' });

          if (progressionError) {
            console.error('Progression init error:', progressionError);
          }
        }

        // Historique
        if (newStudent) {
          await supabase.from('contact_historique').insert({
            contact_id: newStudent.id,
            type: 'formulaire',
            titre: 'Élève créé via webhook conduite',
            contenu: `Import automatique depuis plateforme conduite (${activity_type || 'non précisé'})`,
            date_echange: new Date().toISOString(),
          });
        }

        result = { contact_id: newStudent?.id };
        break;
      }

      // ─── Formulaire de contact depuis le site web ───
      case 'contact_form': {
        const { nom, prenom, email, telephone, message, formation, source } = data;
        if (!nom || !prenom) {
          return new Response(JSON.stringify({ error: 'nom and prenom are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Créer le contact dans le CRM
        const { data: contact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            nom: String(nom).substring(0, 100),
            prenom: String(prenom).substring(0, 100),
            email: email ? String(email).substring(0, 255) : null,
            telephone: telephone ? String(telephone).substring(0, 20) : null,
            formation: formation || null,
            source: source || 'site_web',
            origine: 'site_web',
            statut: 'En attente de validation',
            commentaires: message ? String(message).substring(0, 2000) : null,
          })
          .select('id')
          .single();

        if (contactError) throw contactError;

        // Ajouter un historique
        if (contact) {
          await supabase.from('contact_historique').insert({
            contact_id: contact.id,
            type: 'formulaire',
            titre: 'Formulaire de contact site web',
            contenu: message ? String(message).substring(0, 2000) : 'Contact créé depuis le site web',
            date_echange: new Date().toISOString(),
          });
        }

        result = { contact_id: contact?.id };
        break;
      }

      // ─── Notification de paiement ───
      case 'payment_received': {
        const { contact_id, montant, methode, reference, facture_id } = data;
        if (!contact_id || !montant) {
          return new Response(JSON.stringify({ error: 'contact_id and montant are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Enregistrer le paiement
        const { data: paiement, error: paiementError } = await supabase
          .from('paiements')
          .insert({
            facture_id: facture_id || null,
            montant: Number(montant),
            methode_paiement: methode || 'alma',
            reference_paiement: reference || null,
            date_paiement: new Date().toISOString().split('T')[0],
          })
          .select('id')
          .single();

        if (paiementError) throw paiementError;

        // Historique
        await supabase.from('contact_historique').insert({
          contact_id,
          type: 'paiement',
          titre: `Paiement reçu : ${Number(montant).toFixed(2)} €`,
          contenu: `Paiement par ${methode || 'Alma'} - Réf: ${reference || 'N/A'}`,
          date_echange: new Date().toISOString(),
        });

        result = { paiement_id: paiement?.id };
        break;
      }

      // ─── Inscription depuis le site web ───
      case 'inscription': {
        const { nom, prenom, email, telephone, formation, session_id, commentaires } = data;
        if (!nom || !prenom || !email) {
          return new Response(JSON.stringify({ error: 'nom, prenom and email are required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Chercher si le contact existe déjà
        const { data: existing } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', String(email).substring(0, 255))
          .limit(1)
          .single();

        let contactId = existing?.id;

        if (!contactId) {
          const { data: newContact, error: createError } = await supabase
            .from('contacts')
            .insert({
              nom: String(nom).substring(0, 100),
              prenom: String(prenom).substring(0, 100),
              email: String(email).substring(0, 255),
              telephone: telephone ? String(telephone).substring(0, 20) : null,
              formation: formation || null,
              source: 'site_web',
              origine: 'site_web',
              statut: 'En attente de validation',
            })
            .select('id')
            .single();

          if (createError) throw createError;
          contactId = newContact?.id;
        }

        // Si une session est spécifiée, créer l'inscription
        if (session_id && contactId) {
          await supabase.from('session_inscrits').insert({
            session_id,
            contact_id: contactId,
            statut: 'en_attente',
          });
        }

        // Historique
        if (contactId) {
          await supabase.from('contact_historique').insert({
            contact_id: contactId,
            type: 'inscription',
            titre: 'Demande d\'inscription depuis le site web',
            contenu: commentaires ? String(commentaires).substring(0, 2000) : `Inscription formation ${formation || 'non précisée'}`,
            date_echange: new Date().toISOString(),
          });
        }

        result = { contact_id: contactId };
        break;
      }

      // ─── Callback Alma (webhook de paiement) ───
      case 'alma_payment_callback': {
        const { payment_id, status } = data;
        console.log(`Alma callback: payment ${payment_id} - status ${status}`);
        result = { acknowledged: true, payment_id, status };
        break;
      }

      // ─── Événement générique ───
      default: {
        console.log(`Webhook received unknown event: ${event}`, data);
        result = { acknowledged: true, event };
        break;
      }
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
