import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for the AI agent
const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Créer un nouveau contact/stagiaire dans le CRM",
      parameters: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom de famille" },
          prenom: { type: "string", description: "Prénom" },
          email: { type: "string", description: "Adresse email" },
          telephone: { type: "string", description: "Numéro de téléphone" },
          civilite: { type: "string", enum: ["M.", "Mme", "Autre"], description: "Civilité" },
          formation: { type: "string", enum: ["Taxi", "VTC", "Taxi-VTC", "Passerelle Taxi vers VTC", "Passerelle VTC vers Taxi", "Capacitaire"], description: "Type de formation souhaitée" },
          statut: { type: "string", enum: ["Prospect", "Inscrit", "Stagiaire", "Client", "Archive"], description: "Statut du contact" },
          notes: { type: "string", description: "Notes additionnelles" }
        },
        required: ["nom", "prenom"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Rechercher des contacts dans le CRM par nom, prénom, email ou téléphone",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Terme de recherche (nom, prénom, email ou téléphone)" },
          statut: { type: "string", enum: ["Prospect", "Inscrit", "Stagiaire", "Client", "Archive"], description: "Filtrer par statut" },
          formation: { type: "string", description: "Filtrer par type de formation" },
          limit: { type: "number", description: "Nombre maximum de résultats (défaut: 10)" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_contact",
      description: "Mettre à jour un contact existant",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact à modifier" },
          updates: {
            type: "object",
            description: "Champs à mettre à jour",
            properties: {
              nom: { type: "string" },
              prenom: { type: "string" },
              email: { type: "string" },
              telephone: { type: "string" },
              statut: { type: "string", enum: ["Prospect", "Inscrit", "Stagiaire", "Client", "Archive"] },
              formation: { type: "string" },
              notes: { type: "string" }
            }
          }
        },
        required: ["contact_id", "updates"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_sessions",
      description: "Lister les sessions de formation",
      parameters: {
        type: "object",
        properties: {
          statut: { type: "string", enum: ["planifiee", "en_cours", "terminee", "annulee"], description: "Filtrer par statut" },
          formation_type: { type: "string", description: "Filtrer par type de formation" },
          date_debut_min: { type: "string", description: "Date de début minimum (YYYY-MM-DD)" },
          date_debut_max: { type: "string", description: "Date de début maximum (YYYY-MM-DD)" },
          limit: { type: "number", description: "Nombre maximum de résultats" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_session",
      description: "Créer une nouvelle session de formation",
      parameters: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom de la session" },
          formation_type: { type: "string", enum: ["Taxi", "VTC", "Taxi-VTC", "Passerelle Taxi vers VTC", "Passerelle VTC vers Taxi", "Capacitaire"], description: "Type de formation" },
          date_debut: { type: "string", description: "Date de début (YYYY-MM-DD)" },
          date_fin: { type: "string", description: "Date de fin (YYYY-MM-DD)" },
          places_max: { type: "number", description: "Nombre maximum de places" },
          lieu: { type: "string", description: "Lieu de la formation" },
          formateur_id: { type: "string", description: "ID du formateur" }
        },
        required: ["nom", "formation_type", "date_debut", "date_fin"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "enroll_contact_to_session",
      description: "Inscrire un contact à une session de formation",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact à inscrire" },
          session_id: { type: "string", description: "ID de la session" }
        },
        required: ["contact_id", "session_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_factures",
      description: "Lister les factures",
      parameters: {
        type: "object",
        properties: {
          statut: { type: "string", enum: ["brouillon", "envoyee", "payee", "partiel", "annulee", "en_retard"], description: "Filtrer par statut" },
          contact_id: { type: "string", description: "Filtrer par contact" },
          limit: { type: "number", description: "Nombre maximum de résultats" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_facture",
      description: "Créer une nouvelle facture pour un contact",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact" },
          montant_total: { type: "number", description: "Montant total TTC" },
          montant_ht: { type: "number", description: "Montant HT" },
          tva: { type: "number", description: "Montant TVA" },
          description: { type: "string", description: "Description de la facture" },
          date_echeance: { type: "string", description: "Date d'échéance (YYYY-MM-DD)" }
        },
        required: ["contact_id", "montant_total"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "register_payment",
      description: "Enregistrer un paiement pour une facture",
      parameters: {
        type: "object",
        properties: {
          facture_id: { type: "string", description: "ID de la facture" },
          montant: { type: "number", description: "Montant du paiement" },
          mode_paiement: { type: "string", enum: ["especes", "cheque", "carte", "virement", "cpf"], description: "Mode de paiement" },
          reference: { type: "string", description: "Référence du paiement" }
        },
        required: ["facture_id", "montant", "mode_paiement"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Envoyer un email à un contact",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact destinataire" },
          subject: { type: "string", description: "Sujet de l'email" },
          content: { type: "string", description: "Contenu de l'email (HTML supporté)" },
          email_type: { type: "string", enum: ["relance", "confirmation", "rappel", "information", "facture"], description: "Type d'email" }
        },
        required: ["contact_id", "subject", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_notification",
      description: "Créer une notification/rappel pour l'équipe",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Titre de la notification" },
          message: { type: "string", description: "Message détaillé" },
          type: { type: "string", enum: ["info", "warning", "urgent", "success"], description: "Type de notification" },
          link: { type: "string", description: "Lien associé (optionnel)" }
        },
        required: ["title", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_dashboard_stats",
      description: "Obtenir les statistiques du tableau de bord (contacts, sessions, CA, taux de réussite)",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", enum: ["week", "month", "quarter", "year"], description: "Période d'analyse" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_contact_historique",
      description: "Ajouter une note à l'historique d'un contact",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact" },
          type: { type: "string", enum: ["note", "appel", "email", "rdv", "document", "paiement", "autre"], description: "Type d'entrée" },
          contenu: { type: "string", description: "Contenu de la note" }
        },
        required: ["contact_id", "type", "contenu"]
      }
    }
  }
];

// Tool execution functions
async function executeCreateContact(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('contacts')
    .insert({
      nom: params.nom,
      prenom: params.prenom,
      email: params.email || null,
      telephone: params.telephone || null,
      civilite: params.civilite || null,
      formation: params.formation || null,
      statut: params.statut || 'Prospect',
      notes: params.notes || null
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, contact: data, message: `Contact ${params.prenom} ${params.nom} créé avec succès` };
}

async function executeSearchContacts(supabase: any, params: any) {
  let query = supabase.from('contacts').select('id, nom, prenom, email, telephone, statut, formation');
  
  if (params.query) {
    query = query.or(`nom.ilike.%${params.query}%,prenom.ilike.%${params.query}%,email.ilike.%${params.query}%,telephone.ilike.%${params.query}%`);
  }
  if (params.statut) {
    query = query.eq('statut', params.statut);
  }
  if (params.formation) {
    query = query.eq('formation', params.formation);
  }
  
  const { data, error } = await query.limit(params.limit || 10);
  if (error) throw error;
  return { success: true, contacts: data, count: data.length };
}

async function executeUpdateContact(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('contacts')
    .update(params.updates)
    .eq('id', params.contact_id)
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, contact: data, message: `Contact mis à jour avec succès` };
}

async function executeListSessions(supabase: any, params: any) {
  let query = supabase.from('sessions').select('id, nom, formation_type, date_debut, date_fin, statut, places_max, lieu');
  
  if (params.statut) {
    query = query.eq('statut', params.statut);
  }
  if (params.formation_type) {
    query = query.eq('formation_type', params.formation_type);
  }
  if (params.date_debut_min) {
    query = query.gte('date_debut', params.date_debut_min);
  }
  if (params.date_debut_max) {
    query = query.lte('date_debut', params.date_debut_max);
  }
  
  const { data, error } = await query.order('date_debut', { ascending: true }).limit(params.limit || 20);
  if (error) throw error;
  return { success: true, sessions: data, count: data.length };
}

async function executeCreateSession(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      nom: params.nom,
      formation_type: params.formation_type,
      date_debut: params.date_debut,
      date_fin: params.date_fin,
      places_max: params.places_max || 10,
      lieu: params.lieu || null,
      formateur_id: params.formateur_id || null,
      statut: 'planifiee'
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, session: data, message: `Session "${params.nom}" créée avec succès` };
}

async function executeEnrollContactToSession(supabase: any, params: any) {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('session_inscrits')
    .select('id')
    .eq('contact_id', params.contact_id)
    .eq('session_id', params.session_id)
    .single();
  
  if (existing) {
    return { success: false, message: "Ce contact est déjà inscrit à cette session" };
  }
  
  const { data, error } = await supabase
    .from('session_inscrits')
    .insert({
      contact_id: params.contact_id,
      session_id: params.session_id,
      statut: 'inscrit'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Update contact status
  await supabase.from('contacts').update({ statut: 'Inscrit' }).eq('id', params.contact_id);
  
  return { success: true, inscription: data, message: "Contact inscrit à la session avec succès" };
}

async function executeListFactures(supabase: any, params: any) {
  let query = supabase.from('factures').select(`
    id, numero_facture, montant_total, statut, date_emission, date_echeance,
    contacts:contact_id (nom, prenom)
  `);
  
  if (params.statut) {
    query = query.eq('statut', params.statut);
  }
  if (params.contact_id) {
    query = query.eq('contact_id', params.contact_id);
  }
  
  const { data, error } = await query.order('date_emission', { ascending: false }).limit(params.limit || 20);
  if (error) throw error;
  return { success: true, factures: data, count: data.length };
}

async function executeCreateFacture(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('factures')
    .insert({
      contact_id: params.contact_id,
      montant_total: params.montant_total,
      montant_ht: params.montant_ht || params.montant_total / 1.2,
      tva: params.tva || params.montant_total - (params.montant_total / 1.2),
      description: params.description || null,
      date_echeance: params.date_echeance || null,
      statut: 'brouillon'
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, facture: data, message: `Facture ${data.numero_facture} créée avec succès` };
}

async function executeRegisterPayment(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('paiements')
    .insert({
      facture_id: params.facture_id,
      montant: params.montant,
      mode_paiement: params.mode_paiement,
      reference: params.reference || null,
      date_paiement: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, paiement: data, message: `Paiement de ${params.montant}€ enregistré avec succès` };
}

async function executeSendEmail(supabase: any, params: any) {
  // Get contact email
  const { data: contact } = await supabase
    .from('contacts')
    .select('email, nom, prenom')
    .eq('id', params.contact_id)
    .single();
  
  if (!contact?.email) {
    return { success: false, message: "Ce contact n'a pas d'adresse email" };
  }
  
  // Get centre formation info
  const { data: centre } = await supabase
    .from('centre_formation')
    .select('nom_commercial, email')
    .single();
  
  // Send email via Resend
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  if (!RESEND_API_KEY) {
    return { success: false, message: "Configuration email manquante" };
  }
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: `${centre?.nom_commercial || 'CRM Formation'} <onboarding@resend.dev>`,
      to: [contact.email],
      subject: params.subject,
      html: params.content
    })
  });
  
  const emailResult = await response.json();
  
  // Log email
  await supabase.from('email_logs').insert({
    contact_id: params.contact_id,
    email_type: params.email_type || 'information',
    subject: params.subject,
    status: response.ok ? 'sent' : 'failed',
    metadata: emailResult
  });
  
  if (!response.ok) {
    return { success: false, message: "Erreur lors de l'envoi de l'email" };
  }
  
  return { success: true, message: `Email envoyé à ${contact.prenom} ${contact.nom}` };
}

async function executeCreateNotification(supabase: any, params: any) {
  // Get admin users
  const { data: users } = await supabase
    .from('user_roles')
    .select('user_id')
    .in('role', ['admin', 'staff']);
  
  if (!users || users.length === 0) {
    return { success: false, message: "Aucun utilisateur admin trouvé" };
  }
  
  const notifications = users.map((u: any) => ({
    user_id: u.user_id,
    type: params.type || 'info',
    title: params.title,
    message: params.message,
    link: params.link || null,
    read: false
  }));
  
  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) throw error;
  
  return { success: true, message: `Notification créée pour ${users.length} utilisateur(s)` };
}

async function executeGetDashboardStats(supabase: any, params: any) {
  const period = params.period || 'month';
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'quarter':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'year':
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Get contacts count
  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true });
  
  const { count: newContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startDate.toISOString());
  
  // Get sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, statut')
    .gte('date_debut', startDate.toISOString());
  
  // Get CA
  const { data: factures } = await supabase
    .from('factures')
    .select('montant_total, statut')
    .gte('date_emission', startDate.toISOString());
  
  const caTotal = factures?.reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0) || 0;
  const caPaye = factures?.filter((f: any) => f.statut === 'payee').reduce((sum: number, f: any) => sum + (f.montant_total || 0), 0) || 0;
  
  // Get exam success rate
  const { data: examens } = await supabase
    .from('examens_t3p')
    .select('resultat')
    .gte('date_examen', startDate.toISOString())
    .not('resultat', 'is', null);
  
  const tauxReussite = examens && examens.length > 0
    ? Math.round((examens.filter((e: any) => e.resultat === 'reussi').length / examens.length) * 100)
    : 0;
  
  return {
    success: true,
    stats: {
      periode: period,
      contacts: { total: totalContacts, nouveaux: newContacts },
      sessions: { total: sessions?.length || 0, planifiees: sessions?.filter((s: any) => s.statut === 'planifiee').length || 0 },
      chiffreAffaires: { total: caTotal, paye: caPaye },
      tauxReussite: `${tauxReussite}%`,
      examens: examens?.length || 0
    }
  };
}

async function executeAddContactHistorique(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('contact_historique')
    .insert({
      contact_id: params.contact_id,
      type: params.type,
      contenu: params.contenu
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, historique: data, message: "Note ajoutée à l'historique du contact" };
}

// Main tool executor
async function executeTool(supabase: any, toolName: string, params: any) {
  console.log(`Executing tool: ${toolName}`, params);
  
  switch (toolName) {
    case 'create_contact':
      return await executeCreateContact(supabase, params);
    case 'search_contacts':
      return await executeSearchContacts(supabase, params);
    case 'update_contact':
      return await executeUpdateContact(supabase, params);
    case 'list_sessions':
      return await executeListSessions(supabase, params);
    case 'create_session':
      return await executeCreateSession(supabase, params);
    case 'enroll_contact_to_session':
      return await executeEnrollContactToSession(supabase, params);
    case 'list_factures':
      return await executeListFactures(supabase, params);
    case 'create_facture':
      return await executeCreateFacture(supabase, params);
    case 'register_payment':
      return await executeRegisterPayment(supabase, params);
    case 'send_email':
      return await executeSendEmail(supabase, params);
    case 'create_notification':
      return await executeCreateNotification(supabase, params);
    case 'get_dashboard_stats':
      return await executeGetDashboardStats(supabase, params);
    case 'add_contact_historique':
      return await executeAddContactHistorique(supabase, params);
    default:
      return { success: false, error: `Unknown tool: ${toolName}` };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { message, action, userId, conversationHistory } = await req.json();

    if (!message) {
      throw new Error("Message is required");
    }

    // Build context
    let systemContext = '';
    
    // Get centre formation info
    const { data: centre } = await supabase
      .from('centre_formation')
      .select('*')
      .single();

    systemContext = `
Informations du centre de formation :
- Nom : ${centre?.nom_commercial || 'N/A'}
- Email : ${centre?.email || 'N/A'}
- Téléphone : ${centre?.telephone || 'N/A'}
- Adresse : ${centre?.adresse_complete || 'N/A'}
`;

    // Build messages array
    const messages: any[] = [
      {
        role: 'system',
        content: `Tu es un assistant IA expert en gestion de centres de formation Taxi/VTC en France.

Tu as accès à des outils pour exécuter des actions concrètes dans le CRM :
- Gestion des contacts (créer, rechercher, modifier)
- Planification des sessions de formation
- Facturation et enregistrement des paiements
- Envoi d'emails aux contacts
- Création de notifications et rappels
- Consultation des statistiques

${systemContext}

Instructions importantes :
- Utilise les outils disponibles pour exécuter les actions demandées
- Confirme toujours les actions effectuées avec un résumé clair
- Si tu as besoin de plus d'informations pour une action, demande-les
- Pour les recherches, commence par chercher le contact/session avant d'agir
- Réponds en français de manière professionnelle et concise`
      }
    ];

    // Add conversation history if provided
    if (conversationHistory && Array.isArray(conversationHistory)) {
      for (const msg of conversationHistory) {
        messages.push({ role: msg.role, content: msg.content });
      }
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    // Call AI with tools
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages,
        tools: TOOLS,
        tool_choice: 'auto'
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.",
          success: false 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Crédits IA épuisés. Veuillez ajouter des crédits à votre workspace.",
          success: false 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    let data = await response.json();
    let assistantMessage = data.choices?.[0]?.message;
    const toolResults: any[] = [];

    // Process tool calls if any
    while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('Processing tool calls:', assistantMessage.tool_calls.length);
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolParams = JSON.parse(toolCall.function.arguments || '{}');
        
        try {
          const result = await executeTool(supabase, toolName, toolParams);
          toolResults.push({ tool: toolName, result });
          
          // Add tool result to messages
          messages.push(assistantMessage);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result)
          });
        } catch (error: any) {
          console.error(`Tool ${toolName} error:`, error);
          messages.push(assistantMessage);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ success: false, error: error.message })
          });
        }
      }

      // Get AI response after tool execution
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-3-flash-preview',
          messages,
          tools: TOOLS,
          tool_choice: 'auto'
        }),
      });

      if (!response.ok) {
        throw new Error(`AI gateway error after tool execution: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices?.[0]?.message;
    }

    const finalResponse = assistantMessage?.content || "Je n'ai pas pu générer de réponse.";

    // Log the interaction
    if (userId) {
      await supabase.from('ai_assistant_logs').insert({
        user_id: userId,
        user_message: message,
        assistant_response: finalResponse,
        action: action || 'agent',
        metadata: { toolResults }
      });
    }

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        toolResults,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
