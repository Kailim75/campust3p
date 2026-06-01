# Refonte fiche session — vue opérationnelle de pilotage

## État actuel
`SessionDetailSheet.tsx` (742 l.) affiche 7 onglets : **Infos · Inscrits · Docs · Parcours · Finances · Qualiopi · Émargement**. Composants en place :
- `SessionDetailHeader` (titre, badges, formateur, bouton Modifier).
- `SessionKPICockpit` (40 l. — sous-utilisé).
- `SessionQualiopiTab` (640 l. — concentre alertes Qualiopi, formateur, docs, émargement, satisfaction).
- `SessionFinancesTabContent`, `SessionInscritsTable`, `SessionParcoursTab`, `EmargementSheet`, `SessionDocumentMatrixView`, `DocumentEnvoiHistoryPanel`.
- `SessionClosureWizard` (3 étapes : Attestations · Satisfaction · Export Pack Audit) déclenché depuis l'onglet Infos (`setCloseDialogOpen`).
- `CloseSessionDialog` (existant, simple confirmation legacy).
- `SessionQuickActions` (142 l.) déjà disponible mais non monté dans le sheet.

## Problèmes UX identifiés
1. **Pas de Résumé opérationnel** : l'onglet "Infos" est purement descriptif (dates, lieu, prix, objectifs) — aucun indicateur "ce qu'il reste à faire".
2. **Doublons fonctionnels** : actions de Qualiopi (envoyer docs, ouvrir émargement, enquête) recoupent Documents / Émargement / Finances ; la matrice docs apparaît dans deux onglets implicitement.
3. **Planning/Formateurs dispersé** : horaires dans Infos, formateur dans le header, émargement à part, parcours pédagogique séparé.
4. **Clôture peu sécurisée** : bouton "Clôturer" dans Infos n'est désactivé que si `inscriptionCount === 0` — pas de vérification émargements/paiements/attestations avant ouverture du wizard.
5. **Aucune timeline** : difficile de répondre à "où en est la session ?" sans naviguer dans 4 onglets.
6. **Manque action ciblées** : "Générer attestations en masse", "Relancer paiements en retard", "Compléter émargements manquants" demandent plusieurs clics et changement d'onglet.

## Structure cible — 7 onglets max
| # | Onglet | Contenu |
|---|--------|---------|
| 1 | **Résumé** | KPIs opérationnels + alertes Qualiopi + timeline + raccourcis actions |
| 2 | **Inscrits** | `SessionInscritsTable` (inchangé) — actions par apprenant |
| 3 | **Planning / Formateurs** | Dates, horaires, lieu, formateur(s) assigné(s), parcours pédagogique (fusion `Infos` descriptif + `Parcours`) |
| 4 | **Documents** | `SessionDocumentMatrixView` + `DocumentEnvoiHistoryPanel` (inchangé) |
| 5 | **Émargement** | `EmargementSheet` (inchangé) |
| 6 | **Examens / Évaluations** | Examens pratiques + théoriques liés à la session + envoi enquête satisfaction |
| 7 | **Finances / Clôture** | `SessionFinancesTabContent` + bouton Clôture (wizard sécurisé) + Pack Audit + Archive |

L'onglet "Qualiopi" actuel est **absorbé** : alertes → Résumé ; envois docs/satisfaction → Documents / Examens ; assignation formateur → Planning.

### Détail Onglet 1 — Résumé
Bloc unique `SessionResumeTab` composé de :
- **Cartes KPI** (grille 4×2 desktop, 2×4 mobile) :
  - Inscrits / Places (`inscriptionCount / places_totales`)
  - Places restantes
  - Taux de remplissage (% + barre Progress)
  - Documents manquants (depuis `SessionDocumentMatrixView` agrégat)
  - Paiements en retard (depuis `SessionFinancesTabContent` agrégat)
  - Émargements manquants (calcul jours × inscrits − feuilles signées)
  - Évaluations à envoyer (apprenants sans `enquete_envoyee_at`)
  - Attestations à générer (apprenants sans `attestation_generated_at`)
- **Bloc alertes Qualiopi** : extrait de `useSessionQualiopi` — liste compacte des critères en `warning`/`error`.
- **Timeline session** (nouveau composant `SessionTimeline` + hook `useSessionTimeline`, agrégation lecture seule depuis : `sessions.created_at`, `session_inscriptions.created_at`, `contact_documents` (scope session), `paiements` (via inscriptions), `emargement_*`, `examens_*`, `contact_historique` filtré, `session.archived_at` / clôture).
- **Raccourcis actions** (réutilisent dialogs/onglets existants, aucune écriture directe) : Inscrire un apprenant · Envoyer documents en masse · Relancer paiements · Compléter émargement · Envoyer satisfaction · Ouvrir clôture.

### Détail Onglet 7 — Clôture sécurisée
- Refactor de `SessionClosureWizard` pour ajouter une **étape 0 "Préchecks"** :
  - Émargements obligatoires manquants → **bloquant** (impossible d'avancer).
  - Paiements non soldés → alerte non bloquante, justification à saisir.
  - Attestations non générées → alerte non bloquante, propose génération guidée.
  - Satisfaction non envoyée → alerte non bloquante.
  - Case "Je confirme la clôture en tant qu'admin" (rôle vérifié via `useCurrentUserRole`) obligatoire avant écriture.
- Aucune clôture automatique. Aucune génération en masse sans confirmation explicite. Journalisation : insertion `contact_historique` par apprenant + entrée `audit_log` (table existante si présente, sinon `apprenant_status_log`) pour l'action `session_cloturee`.

## Composants à modifier ou créer
**Créés**
- `src/components/sessions/tabs/SessionResumeTab.tsx`
- `src/components/sessions/tabs/SessionPlanningTab.tsx` (fusion descriptif + parcours)
- `src/components/sessions/tabs/SessionExamensTab.tsx` (extrait de Parcours + bouton satisfaction)
- `src/components/sessions/tabs/SessionClotureTab.tsx` (wrapper Finances + bouton clôture)
- `src/components/sessions/SessionTimeline.tsx`
- `src/hooks/useSessionTimeline.ts` (lecture seule, agrège 6 sources)
- `src/hooks/useSessionOperationalKpis.ts` (calcule les 8 KPI résumé)

**Modifiés**
- `src/components/sessions/SessionDetailSheet.tsx` : nouvelle liste d'onglets, mapping vers nouveaux tabs ; conserve les onglets `inscriptions`, `documents`, `emargement` à l'identique.
- `src/components/sessions/SessionClosureWizard.tsx` : ajout étape Préchecks + confirmation rôle admin.
- `src/components/sessions/SessionDetailHeader.tsx` : aucun changement structurel, conservé.

**Non modifiés / inchangés**
- `SessionInscritsTable`, `EmargementSheet`, `SessionDocumentMatrixView`, `DocumentEnvoiHistoryPanel`, `SessionFinancesTabContent`, `SessionQualiopiTab` (gardé en fichier pour rétro-compat, plus monté).
- Toutes les tables DB, RLS, GRANT, triggers. Aucune migration.
- Routes : aucune supprimée. Les anciens `defaultTab="qualiopi"` ou `parcours` sont remappés en code vers `resume` / `planning` / `examens`.

## Risques
- **R1** Régression sur des deep-links `?tab=qualiopi` ou `?tab=parcours` → mitigé par remap d'alias dans `SessionDetailSheet`.
- **R2** KPI résumé incohérents avec ceux de Finances/Docs → mitigé en branchant sur les mêmes hooks que les onglets sources, pas de recalcul parallèle.
- **R3** Timeline coûteuse en requêtes → mitigé par 1 hook unique, `staleTime` 60 s, pagination 100 entrées.
- **R4** Wizard de clôture bloquant trop strict → préchecks bloquants limités aux émargements obligatoires ; le reste est alerte avec justification.
- **R5** Action "Relancer paiements" perçue comme automatique → toujours via modal de confirmation, jamais d'envoi sans clic explicite.
- **R6** Rôle admin mal détecté côté UI → la confirmation UI ne remplace pas la RLS ; toute écriture passe par les policies existantes.

## Plan de rollback
Purement frontend, aucune migration. Revert = restaurer `SessionDetailSheet.tsx` et `SessionClosureWizard.tsx`, supprimer les 4 nouveaux fichiers de `tabs/` + `SessionTimeline.tsx` + 2 hooks. Les composants enfants (`SessionInscritsTable`, etc.) ne sont pas touchés. Feature flag possible : `VITE_SESSION_V2_RESUME=true` pour bascule progressive.

## Tests à effectuer
1. **Affichage onglets** : ouvrir une session active → 7 onglets visibles, Résumé sélectionné par défaut.
2. **Deep-link rétro-compat** : `?tab=qualiopi` ouvre Résumé sans erreur ; `?tab=parcours` ouvre Planning.
3. **KPI cohérents** : valeurs Résumé = valeurs onglets sources (test sur 1 session pleine, 1 session vide, 1 session terminée).
4. **Timeline ordre** : événements triés desc, badges types corrects, pas d'écriture DB observable au chargement.
5. **Raccourcis Résumé** : chaque bouton ouvre le bon onglet/dialog, aucun appel mutate spontané.
6. **Clôture bloquée** : session avec émargements manquants → bouton Clôturer désactivé + message explicatif.
7. **Clôture avec alertes non bloquantes** : paiements non soldés → modal demande justification + checkbox admin avant de continuer.
8. **Clôture nominale** : tous critères verts → wizard complet → entrée écrite dans `contact_historique` et statut session passé à `terminee`.
9. **Aucune action automatique** : ouvrir/fermer Résumé 10×, vérifier 0 mutation réseau.
10. **Mobile 375 px** : KPI en grille 2 col, onglets scrollables, timeline lisible.
11. **Rôle non-admin** : checkbox de confirmation admin grisée → wizard non finalisable.
12. **KPI dashboard global et apprenants actifs** : valeurs inchangées avant/après.

Pas d'écriture, pas de migration, pas de suppression de routes — j'attends ta validation avant d'implémenter.