export interface HelpArticle {
  id: string;
  title: string;
  category: "demarrage" | "prospects" | "sessions" | "documents" | "finances" | "qualiopi" | "communication";
  /** Routes (pathname segments) où cet article est suggéré en premier */
  contextPaths: string[];
  /** Mots-clés pour la recherche */
  keywords: string[];
  /** Contenu markdown */
  body: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "premiers-pas",
    title: "Premiers pas dans le CRM",
    category: "demarrage",
    contextPaths: ["/", "/dashboard", "/aujourdhui"],
    keywords: ["debuter", "demarrer", "commencer", "tour", "onboarding"],
    body: `# Premiers pas

Bienvenue dans votre CRM T3P. Voici les 3 zones à connaître :

1. **Aujourd'hui** — toutes vos actions du jour, triées par priorité (impayés, relances, signatures, examens à venir).
2. **Sessions** — vos sessions de formation, leur taux de remplissage et les documents associés.
3. **Apprenants** — la fiche complète de chaque stagiaire (suivi, examens, paiements, documents).

> Astuce : appuyez sur **Cmd/Ctrl + K** pour ouvrir la palette de commandes et naviguer instantanément.

## Le bouton "Créer"
En haut à droite, le bouton **+ Créer** centralise la création d'apprenant, de prospect, de session ou de paiement.

## Les raccourcis clavier
Appuyez sur **?** depuis n'importe quelle page pour voir la liste complète.`,
  },
  {
    id: "conversion-prospect",
    title: "Convertir un prospect en apprenant",
    category: "prospects",
    contextPaths: ["/prospects", "/pipeline"],
    keywords: ["prospect", "conversion", "convertir", "inscrire", "apprenant"],
    body: `# Conversion prospect → apprenant

## Étapes
1. Ouvrez la fiche prospect.
2. Cliquez sur **Convertir en apprenant**.
3. Sélectionnez le **parcours** : *Initial* (CMA/5 documents) ou *Formation continue* (Carte Pro).
4. Choisissez la **session** d'inscription (filtrée selon le parcours).
5. Validez : l'apprenant est créé, inscrit, et les documents requis sont pré-générés.

## Détection de doublon
Pendant la saisie email/téléphone, le système recherche automatiquement les doublons (apprenants ou prospects existants). Si une correspondance est trouvée, vous pouvez **fusionner** plutôt que de créer un doublon.

## Statut après conversion
Le prospect passe en *converti* et reste consultable dans l'historique. Sa fiche apprenant hérite de tout l'historique de relances.`,
  },
  {
    id: "generation-documents",
    title: "Générer et envoyer les documents d'une session",
    category: "documents",
    contextPaths: ["/sessions", "/contacts"],
    keywords: ["document", "contrat", "convention", "programme", "convocation", "generer", "envoyer"],
    body: `# Génération de documents

## Depuis la fiche session
Onglet **Documents** → bouton **Envoyer en masse**. Les documents générés dépendent du parcours :

- **Initial** : 5 documents obligatoires (Programme, Règlement, Contrat OU Convention, Convocation, Livret d'accueil)
- **Formation continue** : Programme + Convocation + Contrat/Convention

## Contrat vs Convention
Détection automatique selon le payeur :
- Si l'apprenant paie lui-même → **Contrat** (B2C, 18 articles, délai de rétractation 10 jours)
- Si un tiers paie (employeur, OPCO) → **Convention** (B2B)

Vous pouvez forcer le choix depuis la matrice d'inscription de la session.

## Signature électronique
Les documents nécessitant une signature génèrent automatiquement une demande de signature. L'apprenant reçoit un lien email sécurisé valable 90 jours.

## Suivi des envois
Menu **Communications** → onglet **Monitoring envois** pour voir qui a reçu quoi.`,
  },
  {
    id: "signatures-suivi",
    title: "Suivi des signatures électroniques",
    category: "documents",
    contextPaths: ["/communications", "/sessions"],
    keywords: ["signature", "signer", "electronique", "qui a signe", "suivi"],
    body: `# Suivi des signatures

## Où voir qui a signé ?
**Communications** → onglet **Signatures** → vue **"Suivi par session"** (par défaut).

Vous y voyez :
- Le nombre de signatures **envoyées / signées / en attente / refusées / expirées** par session
- Une barre de progression par session
- Le détail par contact (date d'envoi, date de signature)

## Actions rapides
- **Relancer** : renvoie l'email de demande de signature
- **Copier le lien** : pour transmettre via WhatsApp/SMS
- **Voir** : ouvre le document signé

## Statuts
- *Envoyé* — lien généré et email envoyé
- *Signé* — l'apprenant a signé (PDF cacheté disponible)
- *Refusé* — l'apprenant a explicitement refusé
- *Expiré* — token de plus de 90 jours

## Astuce
Les liens de signature peuvent être ouverts plusieurs fois. L'apprenant peut signer plusieurs documents successifs depuis la même session.`,
  },
  {
    id: "cloture-session",
    title: "Clôturer une session (Qualiopi)",
    category: "qualiopi",
    contextPaths: ["/sessions", "/qualite"],
    keywords: ["cloture", "fin session", "qualiopi", "attestation", "audit", "fermer"],
    body: `# Clôture de session — assistant Qualiopi

À la fin d'une session, lancez **Clôturer la session** depuis la fiche session.

## Les 3 étapes
1. **Attestations** — génération automatique des attestations de fin de formation pour chaque apprenant *présent*.
2. **Enquêtes de satisfaction** — envoi des questionnaires (apprenants + financeurs si Convention).
3. **Audit pack** — ZIP complet pour l'audit Qualiopi : feuilles d'émargement, attestations, programme signé, convocation, contrats.

## Pré-requis
- Émargements complétés pour toutes les demi-journées
- Tous les documents obligatoires signés
- Aucun apprenant en statut *en attente*

Si un blocage existe, l'assistant vous indique précisément quoi corriger.

## Après clôture
Les apprenants passent automatiquement en statut *diplômé* ou *abandon* selon leur présence et résultats d'examen.`,
  },
  {
    id: "encaissement",
    title: "Enregistrer un encaissement",
    category: "finances",
    contextPaths: ["/finances", "/paiements"],
    keywords: ["paiement", "encaisser", "encaissement", "versement", "facture", "regler"],
    body: `# Encaissements

## Depuis la facture
1. Ouvrir la facture concernée.
2. Cliquer **Ajouter un encaissement**.
3. Renseigner montant, date, mode (CB, virement, Alma, espèces, chèque).
4. Valider.

Le statut de la facture passe automatiquement à *Partiel* ou *Payé* selon le total encaissé.

## Alma (paiement 3/4 fois)
Si la facture a été émise avec Alma :
- Les échéances sont créées automatiquement
- Le rapprochement est fait quotidiennement par un cron
- Vérifier dans **Finances → Réconciliation Alma**

## Export comptable (FEC)
**Finances → Export FEC** pour générer le fichier des écritures comptables sur une période.

## ⚠️ Mode Sandbox Alma
Si vous voyez une bannière rouge "Mode Sandbox actif", **n'enregistrez aucun paiement réel** : vous êtes en mode test.`,
  },
  {
    id: "relances",
    title: "Configurer et suivre les relances",
    category: "communication",
    contextPaths: ["/communications", "/aujourdhui"],
    keywords: ["relance", "rappel", "automatique", "email", "communication"],
    body: `# Relances automatiques

## Types de relances
- **Impayés** : J+7, J+14, J+30 après échéance
- **Documents non signés** : J+3, J+7
- **Examens à venir** : J-7, J-2
- **Satisfaction** : J+1 après fin de session

## Configuration
**Communications → Relances auto** : activer/désactiver par type, modifier les délais et les templates.

## Suivi quotidien
Toutes les relances dues aujourd'hui apparaissent dans **Aujourd'hui** avec leur priorité (Critique / Important / Standard).

## Templates
Le module **Studio Templates** permet de personnaliser le contenu des emails. Les variables comme {{prenom}}, {{session}}, {{montant_du}} sont remplacées dynamiquement.`,
  },
  {
    id: "examens",
    title: "Inscrire un apprenant à un examen",
    category: "sessions",
    contextPaths: ["/sessions", "/contacts"],
    keywords: ["examen", "inscription examen", "code", "conduite", "session examen"],
    body: `# Inscriptions aux examens

Depuis la fiche apprenant → onglet **Examens** :

1. Cliquer **Nouvelle tentative**.
2. Sélectionner le **type** (Code, Conduite) et le **département** (75, 77, 78, etc.).
3. Choisir la **session d'examen** dans la liste filtrée.
4. Valider.

## Suivi automatique
- Les examens passés sont automatiquement marqués comme *passe* via un cron quotidien.
- Renseignez le **résultat** (réussite / échec) pour mettre à jour la fiche.
- Les rappels J-7 et J-2 sont envoyés automatiquement.

## Cas particulier CMA
Pour les apprenants en parcours *Initial CMA*, la matrice des 5 documents doit être complète **avant** l'inscription à l'examen.`,
  },
  {
    id: "ia-director",
    title: "Utiliser l'IA Director",
    category: "demarrage",
    contextPaths: ["/", "/dashboard"],
    keywords: ["ia", "intelligence", "ai", "director", "analyse", "audit"],
    body: `# IA Director

L'IA Director scanne vos données quotidiennement et identifie :

- Les **anomalies** (apprenants sans paiement, sessions sans formateur, documents manquants)
- Les **opportunités** (prospects chauds non relancés, sessions remplies à 80% à 7 jours)
- Le **score SAO** (Sécurité, Activité, Opportunités) sur 30 jours glissants

## Lancement manuel
**Dashboard → onglet Analyse IA → bouton "Lancer l'analyse"**.

L'analyse prend 10–30 secondes et génère un rapport stratégique en langage naturel.

## Plan d'action
Chaque anomalie détectée est accompagnée d'une action concrète à effectuer. Cliquez sur l'action pour être redirigé vers l'écran concerné.

## Sécurité
L'IA n'effectue **aucune action destructive** sans validation humaine. Toutes les suggestions doivent être confirmées manuellement.`,
  },
];

export const HELP_CATEGORIES: { id: HelpArticle["category"]; label: string }[] = [
  { id: "demarrage", label: "Démarrage" },
  { id: "prospects", label: "Prospects" },
  { id: "sessions", label: "Sessions" },
  { id: "documents", label: "Documents" },
  { id: "communication", label: "Communication" },
  { id: "finances", label: "Finances" },
  { id: "qualiopi", label: "Qualiopi" },
];
