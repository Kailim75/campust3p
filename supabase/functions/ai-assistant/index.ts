import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handlePreflight } from "../_shared/cors.ts";

// Simple in-memory cache for dashboard stats (5 minute TTL)
const statsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): any | null {
  const entry = statsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    statsCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: any): void {
  statsCache.set(key, { data, timestamp: Date.now() });
}

// Actions that require confirmation before execution
const SENSITIVE_ACTIONS = [
  'create_facture',
  'register_payment',
  'update_contact',
  'create_session',
  'enroll_contact_to_session',
  'send_email'
];

// Enum values from the database
const CIVILITE_VALUES = ["Monsieur", "Madame"];
const CONTACT_STATUT_VALUES = ["En attente de validation", "Client", "Bravo", "En formation théorique", "Examen T3P programmé", "T3P obtenu", "En formation pratique", "Examen pratique programmé", "Abandonné"];
const FORMATION_TYPE_VALUES = ["TAXI", "VTC", "VMDTR", "ACC VTC", "ACC VTC 75", "Formation continue Taxi", "Formation continue VTC", "Mobilité Taxi"];

// Tool definitions for the AI agent
const TOOLS = [
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Créer un nouveau contact/stagiaire dans le CRM. IMPORTANT: utiliser les valeurs exactes des enums.",
      parameters: {
        type: "object",
        properties: {
          nom: { type: "string", description: "Nom de famille" },
          prenom: { type: "string", description: "Prénom" },
          email: { type: "string", description: "Adresse email" },
          telephone: { type: "string", description: "Numéro de téléphone" },
          civilite: { type: "string", enum: CIVILITE_VALUES, description: "Civilité (Monsieur ou Madame)" },
          formation: { type: "string", enum: FORMATION_TYPE_VALUES, description: "Type de formation: TAXI, VTC, VMDTR, ACC VTC, ACC VTC 75, Formation continue Taxi, Formation continue VTC, Mobilité Taxi" },
          statut: { type: "string", enum: CONTACT_STATUT_VALUES, description: "Statut du contact. Par défaut: 'En attente de validation'" },
          notes: { type: "string", description: "Notes additionnelles (stocké dans commentaires)" }
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
          statut: { type: "string", enum: CONTACT_STATUT_VALUES, description: "Filtrer par statut" },
          formation: { type: "string", enum: FORMATION_TYPE_VALUES, description: "Filtrer par type de formation" },
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
              statut: { type: "string", enum: CONTACT_STATUT_VALUES },
              formation: { type: "string", enum: FORMATION_TYPE_VALUES },
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
          statut: { type: "string", enum: ["a_venir", "en_cours", "terminee", "annulee", "complet"], description: "Filtrer par statut" },
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
          formation_type: { type: "string", enum: FORMATION_TYPE_VALUES, description: "Type de formation: TAXI, VTC, VMDTR, etc." },
          date_debut: { type: "string", description: "Date de début (YYYY-MM-DD)" },
          date_fin: { type: "string", description: "Date de fin (YYYY-MM-DD)" },
          places_totales: { type: "number", description: "Nombre maximum de places" },
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
  },
  // BIM Tools
  {
    type: "function",
    function: {
      name: "list_bim_projets",
      description: "Lister les projets BIM pédagogiques disponibles",
      parameters: {
        type: "object",
        properties: {
          statut: { type: "string", enum: ["brouillon", "actif", "archive"], description: "Filtrer par statut" },
          type_formation: { type: "string", enum: ["taxi", "vtc", "commun"], description: "Filtrer par type de formation" },
          limit: { type: "number", description: "Nombre maximum de résultats" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_bim_projet",
      description: "Créer un nouveau projet BIM pédagogique",
      parameters: {
        type: "object",
        properties: {
          code: { type: "string", description: "Code unique du projet (ex: BIM-TAXI-001)" },
          titre: { type: "string", description: "Titre du projet" },
          description: { type: "string", description: "Description du projet" },
          type_formation: { type: "string", enum: ["taxi", "vtc", "commun"], description: "Type de formation ciblée" },
          competences_cibles: { type: "array", items: { type: "string" }, description: "Liste des compétences T3P ciblées (REGLEMENTATION, SECURITE_ROUTIERE, etc.)" },
          seuil_validation_pct: { type: "number", description: "Seuil de validation en % (défaut: 70)" },
          duree_estimee_min: { type: "number", description: "Durée estimée en minutes" }
        },
        required: ["code", "titre"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_bim_progression",
      description: "Obtenir la progression BIM d'un apprenant sur un projet",
      parameters: {
        type: "object",
        properties: {
          contact_id: { type: "string", description: "ID du contact/apprenant" },
          projet_id: { type: "string", description: "ID du projet BIM (optionnel - si omis, retourne toutes les progressions)" }
        },
        required: ["contact_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_bim_scenes",
      description: "Lister les scènes 3D d'un projet BIM",
      parameters: {
        type: "object",
        properties: {
          projet_id: { type: "string", description: "ID du projet BIM" }
        },
        required: ["projet_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_bim_stats",
      description: "Obtenir les statistiques globales BIM (projets, apprenants, taux de réussite)",
      parameters: {
        type: "object",
        properties: {
          periode: { type: "string", enum: ["week", "month", "quarter", "year"], description: "Période d'analyse" }
        }
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
      statut: params.statut || 'En attente de validation',
      commentaires: params.notes || null
    })
    .select()
    .single();
  
  if (error) {
    console.error('Tool create_contact error:', error);
    throw error;
  }
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
  let query = supabase.from('sessions').select('id, nom, formation_type, date_debut, date_fin, statut, places_totales, lieu');
  
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
      places_totales: params.places_totales || 10,
      lieu: params.lieu || null,
      formateur_id: params.formateur_id || null,
      // NOTE: 'statut' is a session_status enum. Valid values: a_venir, en_cours, terminee, annulee, complet
      statut: 'a_venir'
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, session: data, message: `Session "${params.nom}" créée avec succès` };
}

async function executeEnrollContactToSession(supabase: any, params: any) {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from('session_inscriptions')
    .select('id')
    .eq('contact_id', params.contact_id)
    .eq('session_id', params.session_id)
    .single();
  
  if (existing) {
    return { success: false, message: "Ce contact est déjà inscrit à cette session" };
  }
  
  const { data, error } = await supabase
    .from('session_inscriptions')
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
      commentaires: params.description || null,
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
  
  // Configuration email centralisée - VERROUILLÉE sur montrouge@ecolet3p.fr
  const FROM_ADDRESS = "Ecole T3P Montrouge <montrouge@ecolet3p.fr>";
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [contact.email],
      subject: params.subject,
      html: params.content,
      reply_to: "montrouge@ecolet3p.fr"
    })
  });
  
  const emailResult = await response.json();
  
  // Log email
  await supabase.from('email_logs').insert({
    contact_id: params.contact_id,
    type: params.email_type || 'information',
    subject: params.subject,
    status: response.ok ? 'sent' : 'failed',
    recipient_email: contact.email,
    recipient_name: `${contact.prenom} ${contact.nom}`,
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
  const cacheKey = `dashboard-stats-${period}`;
  
  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    console.log('Returning cached dashboard stats');
    return { ...cached, fromCache: true };
  }
  
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
  
  const result = {
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
  
  // Cache the result
  setCache(cacheKey, result);
  
  return result;
}

async function executeAddContactHistorique(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('contact_historique')
    .insert({
      contact_id: params.contact_id,
      type: params.type,
      titre: `Note IA - ${params.type}`,
      contenu: params.contenu,
      date_echange: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, historique: data, message: "Note ajoutée à l'historique du contact" };
}

// BIM Tool execution functions
async function executeListBimProjets(supabase: any, params: any) {
  let query = supabase
    .from('bim_projets')
    .select('id, code, titre, description, type_formation, statut, duree_estimee_min, seuil_validation_pct, competences_cibles, created_at');
  
  if (params.statut) {
    query = query.eq('statut', params.statut);
  }
  if (params.type_formation) {
    query = query.eq('type_formation', params.type_formation);
  }
  
  const { data, error } = await query.order('created_at', { ascending: false }).limit(params.limit || 20);
  if (error) throw error;
  return { success: true, projets: data, count: data.length };
}

async function executeCreateBimProjet(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('bim_projets')
    .insert({
      code: params.code,
      titre: params.titre,
      description: params.description || null,
      type_formation: params.type_formation || 'commun',
      competences_cibles: params.competences_cibles || [],
      seuil_validation_pct: params.seuil_validation_pct || 70,
      duree_estimee_min: params.duree_estimee_min || 30,
      statut: 'brouillon'
    })
    .select()
    .single();
  
  if (error) throw error;
  return { success: true, projet: data, message: `Projet BIM "${params.titre}" créé avec succès` };
}

async function executeGetBimProgression(supabase: any, params: any) {
  let query = supabase
    .from('bim_progressions')
    .select(`
      id, statut, progression_pct, scenes_completees, scenes_total, 
      temps_total_sec, score_moyen_pct, meilleur_score_pct, started_at, completed_at,
      bim_projets:projet_id (code, titre, type_formation)
    `)
    .eq('contact_id', params.contact_id);
  
  if (params.projet_id) {
    query = query.eq('projet_id', params.projet_id);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  
  if (!data || data.length === 0) {
    return { success: true, message: "Aucune progression BIM trouvée pour cet apprenant", progressions: [] };
  }
  
  return { 
    success: true, 
    progressions: data,
    summary: {
      total_projets: data.length,
      valides: data.filter((p: any) => p.statut === 'valide').length,
      en_cours: data.filter((p: any) => p.statut === 'en_cours').length,
      score_moyen: data.length > 0 
        ? Math.round(data.reduce((sum: number, p: any) => sum + (p.score_moyen_pct || 0), 0) / data.length)
        : 0
    }
  };
}

async function executeListBimScenes(supabase: any, params: any) {
  const { data, error } = await supabase
    .from('bim_scenes')
    .select('id, titre, description, ordre, fichier_3d_format, duree_estimee_min, actif')
    .eq('projet_id', params.projet_id)
    .order('ordre', { ascending: true });
  
  if (error) throw error;
  return { success: true, scenes: data, count: data.length };
}

async function executeGetBimStats(supabase: any, params: any) {
  const period = params.periode || 'month';
  const cacheKey = `bim-stats-${period}`;
  
  const cached = getCached(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }
  
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
  
  // Get BIM projects count
  const { count: totalProjets } = await supabase
    .from('bim_projets')
    .select('*', { count: 'exact', head: true });
  
  const { count: projetsActifs } = await supabase
    .from('bim_projets')
    .select('*', { count: 'exact', head: true })
    .eq('statut', 'actif');
  
  // Get scenes count
  const { count: totalScenes } = await supabase
    .from('bim_scenes')
    .select('*', { count: 'exact', head: true });
  
  // Get evaluations in period
  const { data: evaluations } = await supabase
    .from('bim_evaluations')
    .select('score_pct, reussi')
    .gte('completed_at', startDate.toISOString());
  
  const tauxReussite = evaluations && evaluations.length > 0
    ? Math.round((evaluations.filter((e: any) => e.reussi).length / evaluations.length) * 100)
    : 0;
  
  const scoreMoyen = evaluations && evaluations.length > 0
    ? Math.round(evaluations.reduce((sum: number, e: any) => sum + (e.score_pct || 0), 0) / evaluations.length)
    : 0;
  
  // Get unique learners
  const { data: progressions } = await supabase
    .from('bim_progressions')
    .select('contact_id')
    .gte('created_at', startDate.toISOString());
  
  const uniqueLearners = new Set(progressions?.map((p: any) => p.contact_id) || []);
  
  const result = {
    success: true,
    stats: {
      periode: period,
      projets: { total: totalProjets, actifs: projetsActifs },
      scenes: { total: totalScenes },
      evaluations: { 
        total: evaluations?.length || 0, 
        tauxReussite: `${tauxReussite}%`,
        scoreMoyen: `${scoreMoyen}%`
      },
      apprenants: { actifs: uniqueLearners.size }
    }
  };
  
  setCache(cacheKey, result);
  return result;
}

// Log action to audit table
async function logActionToAudit(supabase: any, userId: string | null, actionType: string, actionName: string, params: any, result: any, success: boolean) {
  try {
    await supabase.from('ai_actions_audit').insert({
      user_id: userId,
      action_type: actionType,
      action_name: actionName,
      parameters: params,
      result: result,
      success: success,
      executed_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log audit:', error);
  }
}

// Main tool executor
async function executeTool(supabase: any, toolName: string, params: any, userId: string | null) {
  console.log(`Executing tool: ${toolName}`, params);
  
  let result: any;
  try {
    switch (toolName) {
      case 'create_contact':
        result = await executeCreateContact(supabase, params);
        break;
      case 'search_contacts':
        result = await executeSearchContacts(supabase, params);
        break;
      case 'update_contact':
        result = await executeUpdateContact(supabase, params);
        break;
      case 'list_sessions':
        result = await executeListSessions(supabase, params);
        break;
      case 'create_session':
        result = await executeCreateSession(supabase, params);
        break;
      case 'enroll_contact_to_session':
        result = await executeEnrollContactToSession(supabase, params);
        break;
      case 'list_factures':
        result = await executeListFactures(supabase, params);
        break;
      case 'create_facture':
        result = await executeCreateFacture(supabase, params);
        break;
      case 'register_payment':
        result = await executeRegisterPayment(supabase, params);
        break;
      case 'send_email':
        result = await executeSendEmail(supabase, params);
        break;
      case 'create_notification':
        result = await executeCreateNotification(supabase, params);
        break;
      case 'get_dashboard_stats':
        result = await executeGetDashboardStats(supabase, params);
        break;
      case 'add_contact_historique':
        result = await executeAddContactHistorique(supabase, params);
        break;
      // BIM tools
      case 'list_bim_projets':
        result = await executeListBimProjets(supabase, params);
        break;
      case 'create_bim_projet':
        result = await executeCreateBimProjet(supabase, params);
        break;
      case 'get_bim_progression':
        result = await executeGetBimProgression(supabase, params);
        break;
      case 'list_bim_scenes':
        result = await executeListBimScenes(supabase, params);
        break;
      case 'get_bim_stats':
        result = await executeGetBimStats(supabase, params);
        break;
      default:
        result = { success: false, error: `Unknown tool: ${toolName}` };
    }
    
    // Log to audit for non-read operations
    const readOnlyActions = ['search_contacts', 'list_sessions', 'list_factures', 'get_dashboard_stats', 'list_bim_projets', 'get_bim_progression', 'list_bim_scenes', 'get_bim_stats'];
    if (!readOnlyActions.includes(toolName)) {
      await logActionToAudit(supabase, userId, 'execute', toolName, params, result, result.success);
    }
    
    return result;
  } catch (error: any) {
    await logActionToAudit(supabase, userId, 'execute', toolName, params, { error: error.message }, false);
    throw error;
  }
}

serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ========== SECURITY: Verify JWT authentication ==========
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing or invalid authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user's JWT token
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await authClient.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use verified user ID instead of client-provided userId
    const verifiedUserId = user.id;

    // Use service role for database operations (needed for full access)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ========== SECURITY: Verify user has admin or staff role ==========
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', verifiedUserId)
      .in('role', ['admin', 'staff'])
      .limit(1)
      .maybeSingle();

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Réservé au personnel autorisé' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message, action, conversationHistory, confirmedActions, pendingAction } = await req.json();

    if (!message && !pendingAction) {
      throw new Error("Message is required");
    }

    // Handle confirmed pending action
    if (pendingAction && confirmedActions?.includes(pendingAction.tool)) {
      console.log('Executing confirmed pending action:', pendingAction);
      const result = await executeTool(supabase, pendingAction.tool, pendingAction.params, verifiedUserId);
      
      return new Response(
        JSON.stringify({
          response: result.message || "Action exécutée avec succès",
          toolResults: [{ tool: pendingAction.tool, result }],
          success: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Build messages array - Enhanced prompt for better comprehension
    const messages: any[] = [
      {
        role: 'system',
        content: `Assistant CRM T3P Campus (formations TAXI/VTC/VMDTR). ${systemContext}
Tu gères contacts, sessions, factures, paiements et emails. Utilise les outils disponibles pour exécuter les actions. Réponds en français, sois précis et concis.`
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

    // Call AI with tools - Using balanced model for better comprehension + speed
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
        tool_choice: 'auto',
        max_tokens: 768,
        temperature: 0.2
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
    const pendingConfirmations: any[] = [];

    // Process tool calls if any
    while (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log('Processing tool calls:', assistantMessage.tool_calls.length);
      
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolParams = JSON.parse(toolCall.function.arguments || '{}');
        
        // Check if this is a sensitive action that requires confirmation
        const isConfirmed = confirmedActions?.includes(toolName);
        
        if (SENSITIVE_ACTIONS.includes(toolName) && !isConfirmed) {
          // Add to pending confirmations instead of executing
          pendingConfirmations.push({
            tool: toolName,
            params: toolParams,
            tool_call_id: toolCall.id
          });
          
          // Add a mock response for the tool
          messages.push(assistantMessage);
          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({ 
              success: false, 
              pending_confirmation: true,
              message: `Action "${toolName}" en attente de confirmation utilisateur` 
            })
          });
        } else {
          // Execute the tool
          try {
            const result = await executeTool(supabase, toolName, toolParams, verifiedUserId);
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
            toolResults.push({ tool: toolName, result: { success: false, error: error.message } });
            messages.push(assistantMessage);
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ success: false, error: error.message })
            });
          }
        }
      }

      // If there are pending confirmations, break the loop and ask for confirmation
      if (pendingConfirmations.length > 0) {
        break;
      }

      // Get AI response after tool execution - Using balanced model
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
          tool_choice: 'auto',
          max_tokens: 768,
          temperature: 0.2
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error after tool:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ 
            error: "Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.",
            toolResults,
            success: false 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (response.status === 402) {
          return new Response(JSON.stringify({ 
            error: "Crédits IA épuisés. Veuillez ajouter des crédits à votre workspace.",
            toolResults,
            success: false 
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`AI gateway error after tool execution: ${response.status}`);
      }

      data = await response.json();
      assistantMessage = data.choices?.[0]?.message;
    }

    const finalResponse = assistantMessage?.content || "Je n'ai pas pu générer de réponse.";

    // Log the interaction
    // Log the interaction using verified user ID
    await supabase.from('ai_assistant_logs').insert({
      user_id: verifiedUserId,
      user_message: message,
      assistant_response: finalResponse,
      action: action || 'agent'
    });

    return new Response(
      JSON.stringify({ 
        response: finalResponse,
        toolResults,
        pendingConfirmations,
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
