# Workflow documentaire CRM : Prospect → Inscription → Fin de formation

## Objectif
Automatiser la génération et le suivi des 3 documents clés (convocation, feuille d'émargement, attestation) le long du parcours apprenant, avec statuts visibles et alertes de blocage.

## Étapes du workflow (statuts par inscription)

```text
Prospect ─► Inscrit ─► Convoqué ─► En formation ─► Émargé ─► Terminé ─► Attesté
                │           │                          │                     │
                │           ▼                          ▼                     ▼
                │   doc: Convocation              doc: Émargement      doc: Attestation
                │   (J-7 avant session)           (chaque journée)     (J+1 fin session)
                ▼
        contrat/convention signé
```

## 1. Modèle de données (migration)
Ajouter sur `session_inscriptions` :
- `workflow_step` (enum: `inscrit`, `convoque`, `en_formation`, `emarge`, `termine`, `atteste`)
- `convocation_generated_at`, `convocation_sent_at`
- `emargement_ready_at`
- `attestation_generated_at`, `attestation_sent_at`
- `workflow_blocked_reason` (text nullable)

Trigger DB : recalcule `workflow_step` à chaque update (signature contrat, émargements complétés, session passée…).

## 2. Hook unifié `useInscriptionWorkflow`
Retourne pour chaque inscription :
- étape courante + étapes complétées
- documents associés (statut généré/envoyé/signé via `useDocumentWorkflow`)
- prochaine action recommandée
- alertes (convocation manquante J-3, émargement non signé, attestation en retard…)

## 3. Génération automatique
Edge function `auto-generate-workflow-docs` (cron quotidien) :
- J-7 avant session : génère convocations manquantes (statut `inscrit`+contrat OK)
- J0 chaque jour de session : crée feuille d'émargement du jour
- J+1 fin de session : génère attestations (si émargement ≥ seuil présence)

Tous les docs vont dans `generated_documents_v2` → réutilise pipeline existant (Template Studio + pdfResolver).

## 4. UI — Composant `InscriptionWorkflowTimeline`
Réutilise `WorkflowStepper` existant. Affiché :
- dans la fiche apprenant (onglet Parcours)
- dans la matrice session (ligne par apprenant, colonnes = étapes)

Chaque étape : statut (complete/active/blocked/pending) + bouton action contextuelle (Générer / Renvoyer / Voir).

## 5. Alertes & cockpit "Aujourd'hui"
Nouveau bloc dans l'inbox `today-action-hub` :
- "Convocations à envoyer" (J-7 à J-1)
- "Émargements incomplets" (sessions du jour)
- "Attestations en retard" (sessions terminées >48h sans attestation)

Source : vue SQL `v_workflow_alerts` agrégeant les inscriptions par type d'alerte.

## 6. Notifications
- Email auto à l'apprenant à chaque doc envoyé (template centre)
- Notification in-app au staff si blocage > 24h

## Détails techniques

**Fichiers créés**
- `supabase/migrations/*_inscription_workflow.sql` (colonnes + trigger + vue)
- `supabase/functions/auto-generate-workflow-docs/index.ts` (cron)
- `src/hooks/useInscriptionWorkflow.ts`
- `src/components/workflow/InscriptionWorkflowTimeline.tsx`
- `src/components/inbox/blocks/WorkflowAlertsBlock.tsx`

**Fichiers modifiés**
- `src/components/apprenants/...DetailView` → ajout onglet Parcours
- `src/components/sessions/SessionMatrix...` → colonne workflow
- `src/hooks/useTodayCounts.ts` → +alertes workflow
- `src/lib/document-workflow/types.ts` → expose `workflowStep`

**Compat**
- `useDocumentWorkflow` reste source de vérité pour les statuts doc, le nouveau hook l'agrège côté inscription.
- Pas de changement sur Template Studio ni signatures (réutilisés tels quels).
- Cron : pg_cron + pg_net (déjà actifs).

## Hors scope
- Pas de refonte du Template Studio ni de la signature.
- Pas de modification du parcours prospect amont (déjà géré par `prospect-follow-up-engine`).
- Pas de touch sur la facturation.