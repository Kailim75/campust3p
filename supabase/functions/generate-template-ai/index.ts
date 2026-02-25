import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DOCUMENT_TYPES: Record<string, { label: string; prompt: string }> = {
  programme: {
    label: "Programme de formation",
    prompt: `Génère un programme de formation professionnelle pour un centre de formation Taxi/VTC (T3P Campus).
Le document doit être conforme au Référentiel National Qualité (Qualiopi) et inclure obligatoirement :
- Objectifs opérationnels (RNQ Critère 1)
- Public visé et prérequis
- Durée en heures
- Modalités pédagogiques (cours, pratique, mise en situation)
- Moyens techniques
- Modalités d'évaluation (positionnement, formative, sommative)
- Accessibilité handicap
- Attestation délivrée
- Modalités de suivi (émargement)`,
  },
  contrat: {
    label: "Contrat de formation",
    prompt: `Génère un contrat de formation professionnelle (personne physique) conforme aux articles L.6353-3 à L.6353-7 du Code du travail.
Il doit inclure obligatoirement :
- Identification des parties (organisme + stagiaire)
- Objet et nature de la formation
- Durée et dates
- Prix et modalités de paiement
- Délai de rétractation de 10 jours (L.6353-6)
- Conditions de résiliation et force majeure
- Clause RGPD (Art. 13)
- Espace signature des deux parties
- Mention "TVA non applicable — art. 293 B du CGI"`,
  },
  convention: {
    label: "Convention de formation",
    prompt: `Génère une convention de formation professionnelle (tripartite : organisme / entreprise / stagiaire) conforme à l'article L.6353-1 du Code du travail.
Inclure :
- Identification complète des parties (organisme, entreprise, stagiaire)
- Objectifs et programme
- Durée, dates, horaires, lieu
- Effectif
- Prix et modalités de règlement
- Référence au NDA de l'organisme
- Espace signature des parties`,
  },
  attestation: {
    label: "Attestation de fin de formation",
    prompt: `Génère une attestation de fin de formation professionnelle conforme au Code du travail L.6353-1 et au RNQ Critère 5.
Inclure :
- Identité complète du stagiaire
- Intitulé de la formation
- Dates et durée
- Objectifs atteints / compétences acquises
- Résultats de l'évaluation
- Identification de l'organisme (SIRET, NDA)
- Signature et cachet`,
  },
  invoice: {
    label: "Facture",
    prompt: `Génère une facture professionnelle pour un centre de formation.
Design moderne avec :
- En-tête avec infos organisme
- Zone destinataire
- Tableau des prestations (désignation, quantité, P.U. HT, montant)
- Totaux (HT, TTC)
- Mention "TVA non applicable — art. 293 B du CGI"
- Conditions de règlement et pénalités de retard
- Indemnité forfaitaire de recouvrement : 40 €`,
  },
  convocation: {
    label: "Convocation session",
    prompt: `Génère une convocation de session de formation professionnelle.
Inclure :
- En-tête organisme
- Destinataire (stagiaire)
- Tableau récapitulatif (formation, session, dates, durée, horaires, lieu)
- Documents à apporter
- Formule de politesse
- Signature du responsable`,
  },
  emargement: {
    label: "Feuille d'émargement",
    prompt: `Génère une feuille d'émargement conforme au RNQ Critère 5, Indicateur 19.
Inclure :
- Intitulé de la formation et session
- Date et horaires (matin / après-midi)
- Formateur / intervenant
- Lieu
- Tableau avec colonnes : N°, Nom Prénom, Signature Matin, Signature Après-midi
- Au moins 10 lignes vides
- Signature du formateur en bas
- Identification organisme (SIRET, NDA)`,
  },
  bulletin_inscription: {
    label: "Bulletin d'inscription",
    prompt: `Génère un bulletin d'inscription pour une formation professionnelle.
Inclure :
- Champs identité stagiaire (civilité, nom, prénom, date naissance, adresse, email, téléphone)
- Formation choisie (intitulé, dates, durée, lieu)
- Engagement et déclaration sur l'honneur
- Espace signature et date`,
  },
  evaluation_chaud: {
    label: "Évaluation à chaud",
    prompt: `Génère un questionnaire d'évaluation à chaud (fin de formation) conforme au RNQ Critère 7, Indicateur 30.
Inclure :
- Identité du stagiaire et de la formation
- Grille de notation (1 à 5) sur : atteinte objectifs, qualité animation, supports pédagogiques, organisation/locaux, satisfaction globale
- Question NPS (recommanderiez-vous ?)
- Espace commentaires et suggestions d'amélioration`,
  },
  positionnement: {
    label: "Test de positionnement",
    prompt: `Génère un test de positionnement (diagnostic d'entrée en formation) conforme au RNQ Critère 2, Indicateur 8.
Inclure :
- Identification du stagiaire et de la formation
- 5 à 10 questions à choix multiples sur les connaissances préalables
- Espace pour le score et le niveau évalué
- Commentaires du formateur`,
  },
  reglement_interieur: {
    label: "Règlement intérieur",
    prompt: `Génère un règlement intérieur conforme aux articles L.6352-3 et R.6352-1 à R.6352-15 du Code du travail.
Inclure au minimum 8 articles :
- Objet et champ d'application
- Hygiène et sécurité
- Discipline (horaires, absences)
- Sanctions disciplinaires
- Représentation des stagiaires
- Procédure disciplinaire (droit de la défense)
- Réclamations
- Entrée en vigueur`,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { document_type, custom_instructions, centre_info, variation_hint } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const docConfig = DOCUMENT_TYPES[document_type];
    if (!docConfig) {
      return new Response(
        JSON.stringify({ error: `Type de document inconnu: ${document_type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const centreInfo = centre_info
      ? `\nInformations du centre de formation à utiliser :
- Nom : ${centre_info.nom || "{{centre_nom}}"}
- SIRET : ${centre_info.siret || "{{centre_siret}}"}
- NDA : ${centre_info.nda || "{{centre_nda}}"}
- Adresse : ${centre_info.adresse || "{{centre_adresse}}"}
- Responsable : ${centre_info.responsable || "{{responsable_nom}}"}`
      : "";

    const customNote = custom_instructions
      ? `\n\nInstructions supplémentaires de l'utilisateur : ${custom_instructions}`
      : "";

    const variationNote = variation_hint
      ? `\n\nIMPORTANT VARIATION : ${variation_hint} Utilise un style visuel radicalement différent (couleurs, disposition, typographie, bordures, icônes unicode, mise en page).`
      : "";

    const systemPrompt = `Tu es un expert en création de documents professionnels pour les centres de formation professionnelle en France.
Tu génères exclusivement du HTML avec du CSS inline moderne et élégant.

RÈGLES DE DESIGN OBLIGATOIRES :
- Utilise font-family: 'Segoe UI', system-ui, -apple-system, sans-serif
- Palette de couleurs professionnelle : bleu foncé (#1e3a5f) pour les titres, gris (#374151) pour le texte, accents bleus (#2563eb)
- Marges et padding généreux pour un rendu A4 aéré
- Tableaux avec bordures fines (#e5e7eb), en-têtes avec fond bleu foncé (#1e3a5f) et texte blanc
- En-tête de document avec une bande de couleur en haut
- Sections bien séparées avec des bordures ou fonds alternés subtils
- Typographie : titres en 24px bold, sous-titres en 18px semibold, corps en 14px
- Utilise des box-shadow subtils pour les encadrés importants
- Le document doit être prêt pour impression A4 (max-width: 800px, margin auto)

RÈGLES DE VARIABLES :
- Utilise des variables moustache {{variable}} pour toutes les données dynamiques
- Variables obligatoires : {{centre_nom}}, {{centre_siret}}, {{centre_nda}}
- Variables courantes : {{nom}}, {{prenom}}, {{email}}, {{telephone}}, {{date_naissance}}
- Variables session : {{session_nom}}, {{session_date_debut}}, {{session_date_fin}}, {{duree_heures}}, {{intitule_formation}}
- Variables financières : {{prix_total}}, {{numero_facture}}, {{modalites_paiement}}
- Variables organisme : {{centre_adresse}}, {{responsable_nom}}

IMPORTANT : Retourne UNIQUEMENT le HTML, sans balises \`\`\`html ni explications. Commence directement par <div>.`;

    const userPrompt = `${docConfig.prompt}${centreInfo}${customNote}${variationNote}

Génère le template HTML complet maintenant.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requêtes atteinte, réessayez dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans les paramètres." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erreur du service IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let html = data.choices?.[0]?.message?.content || "";

    // Clean up any markdown code fences
    html = html.replace(/^```html?\s*/i, "").replace(/\s*```$/i, "").trim();

    return new Response(
      JSON.stringify({ html, document_type, label: docConfig.label }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-template-ai error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
