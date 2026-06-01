
# Audit fiche apprenant/contact — Plan de restructuration

## 1. État actuel

**Point d'entrée unique** : `ApprenantDetailContent.tsx` (809 lignes), utilisé par :
- `ApprenantDetailSheet` (slide-over depuis la liste)
- `ApprenantFullPage` (route `/contacts/:id`)
- `ContactSheetNavigator`

**Onglets actuels (7)** : Résumé · Identité (`dossier`) · CMA **ou** Carte Pro (track-aware) · Documents · Paiements · Formation (sessions+examens) · Suivi (échanges+notes+rappels).

**Header / cockpit** :
- Avatar, nom, `StatutApprenantDropdown` (statut_apprenant), badge pipeline (`statut`), badge track, badge urgence, compteur d'envois.
- 4 cartes KPI : Progression, CMA/Carte Pro, Prochaine échéance, Dernière action.
- `WorkflowStepper` (Prospect → Dossier → Session → Facturé → Payé) + CTA dynamique.
- Barre d'actions : Appeler, Email, WhatsApp, Relance CMA, Fait, Générer doc, Chevalet, Att. présence, Enquête.
- Bandeau "informations manquantes".
- Footer : Sync DriveFlow, Modifier, Archiver.

**Sous-onglets imbriqués** :
- `FormationExamensTab` → sous-tabs Sessions / Examens
- `ExamensTab` (apprenants) ≠ `ExamensTab` (contacts) → sous-tabs T3P / Pratique
- `SuiviTab` → sous-tabs Échanges / Notes / Rappels

**Composants détail contact "orphelins"** (`src/components/contacts/detail/`) :
- `ContactCartesProSection`, `ContactCertificatesSection`, `ContactDocumentsTab`, `ContactQuizSection` — non intégrés à `ApprenantDetailContent`, semblent legacy.

## 2. Problèmes UX détectés

| # | Problème | Impact |
|---|---|---|
| P1 | **Pas de timeline parcours unifiée** dans Résumé : événements (création, inscription, docs, paiements, examens, relances, statut, requalif SmartOF, notes) éparpillés dans 3 onglets | Vision opérationnelle fragmentée |
| P2 | Header surchargé : 4 badges + 4 KPI + stepper + CTA dynamique + 9 boutons d'action → bruit visuel | Charge cognitive élevée |
| P3 | Onglet "Formation" = sessions+examens via sous-tabs, et examens encore re-divisé T3P/Pratique → 2 niveaux d'imbrication | Navigation profonde, perte de repère |
| P4 | "Identité" (`DossierTab`) ne contient que la fiche d'état civil — l'onglet CMA/Carte Pro contient pourtant aussi de l'identité réglementaire | Doublon conceptuel |
| P5 | "Suivi" combine 3 sous-onglets différents (Échanges/Notes/Rappels), alors que rappels apparaissent déjà dans Résumé + cockpit | Triple source de vérité |
| P6 | Composants `contacts/detail/*` (certificats, quiz, cartes pro) non utilisés dans la fiche unifiée | Code mort / fonctionnalités cachées |
| P7 | Aucun indicateur visuel "import historique SmartOF" sur la fiche elle-même alors que la liste le masque | Risque de confusion : l'utilisateur ouvre une fiche SmartOF sans savoir qu'elle est historique |
| P8 | Action "Planifier examen" n'existe pas en raccourci dans l'en-tête (cf. demande mission §5) | Action métier manquante |
| P9 | Action "Inscrire à une session" n'est accessible que via le CTA dynamique du stepper, pas dans la barre d'actions principale | Découvrabilité faible |
| P10 | "Ajouter paiement" n'est pas une action de header (il faut entrer dans l'onglet Paiements) | Friction sur action critique |

## 3. Structure cible — 7 onglets

```text
┌─────────────────────────────────────────────────────────────────┐
│ HEADER condensé : avatar · nom · badges · progression · CTA #1  │
│ [Bandeau SmartOF si is_historical_import] [Infos manquantes]    │
│ Quick actions: Appeler · Email · WhatsApp · Doc · Session ·     │
│                Paiement · Examen · Note                          │
├─────────────────────────────────────────────────────────────────┤
│ ▸ Résumé   ▸ Identité   ▸ Formation   ▸ Documents               │
│ ▸ Paiements   ▸ Examens   ▸ Historique                           │
└─────────────────────────────────────────────────────────────────┘
```

| Onglet | Contenu | Origine |
|---|---|---|
| **Résumé** | Action prioritaire + Checklist dossier + **Timeline Parcours** (nouveau) + dernières actions du jour | `ResumeTab` enrichi |
| **Identité** | État civil, coordonnées, permis, CMA *ou* Carte Pro réglementaire (selon track) | Fusion `DossierTab` + `CMATab`/`CarteProTab` via accordéon |
| **Formation** | Sessions assignées, progression pédagogique, attestations présence | `FormationTab` (sans Examens) |
| **Documents** | Documents générés/uploadés, envois, signatures | `DocumentsTab` inchangé |
| **Paiements** | Factures, paiements, financement, relances paiement | `PaiementsTab` inchangé |
| **Examens** | T3P + Pratique en sous-tabs (déjà existant, plus court) | `ExamensTab` (apprenants) |
| **Historique / Notes** | Échanges + Notes + Rappels (sous-tabs) + journal complet d'audit | `SuiviTab` enrichi par flux d'audit |

**Note** : 7 onglets max respecté. Aucun onglet supprimé sans transition — CMA/Carte Pro est replié dans Identité (accordéon dépliable par défaut si incomplet).

## 4. Timeline « Parcours apprenant » (nouveau, onglet Résumé)

Composant `ApprenantTimeline` agrégeant en **flux chronologique inversé** :

| Source | Type d'événement |
|---|---|
| `contacts.created_at` | Création du contact (+ badge `import_source` si SmartOF) |
| `session_inscriptions` | Inscription / transfert / désinscription |
| `contact_documents` + `document_envoi_history` | Document généré / envoyé / signé |
| `factures` + `paiements` | Facture émise / paiement reçu / relance |
| `examens_t3p` + `examens_pratique` | Examen programmé / réussi / échoué |
| `contact_historique` (alerte_active) | Rappel créé / clôturé |
| `contact_historique` ([AUTO]) | Action auto journalisée |
| `apprenant_status_log` (si existe) ou diff `statut_apprenant` | Changement de statut |
| Requalification SmartOF (`is_historical_import` + audit log) | Marquage historique / requalif |
| Notes manuelles | Note interne |

**Implémentation** : hook `useApprenantTimeline(contactId)` qui combine via `useQueries` toutes ces sources, normalise vers `{ id, at, kind, icon, title, summary, actor }[]`, trie par date desc, virtualise si > 100. **Aucune écriture DB**, lecture seule.

## 5. Actions principales (header)

Réorganisation en deux rangées :

**Communication** : Appeler · Email · WhatsApp
**Opérationnel** : Générer doc · Inscrire session · Ajouter paiement · Planifier examen · Ajouter note

Actions secondaires (overflow `…`) : Chevalet · Attestation présence · Enquête · Relance CMA · Marquer fait · Sync DriveFlow.

Toutes les actions sensibles (relances, génération doc, planification examen, changement de statut) **continuent d'écrire dans `contact_historique`** (journalisation déjà en place via `createAutoNote`). Aucune nouvelle action ne contourne ce journal.

## 6. Garde-fous SmartOF

- **Bandeau permanent** en haut de la fiche si `contact.is_historical_import = true` :
  > *"Import historique SmartOF — fiche consultable, non comptée dans les KPI opérationnels."*
- Le badge "Statut apprenant" reste affiché tel quel (jamais modifié).
- Le `WorkflowStepper` est **grisé** pour les SmartOF (lecture seule, pas de CTA "Convertir").
- Les actions de **génération de documents / inscription / paiement restent disponibles** (un SmartOF peut être réactivé manuellement) mais affichent une confirmation : *"Cette fiche est marquée historique. Voulez-vous la réactiver opérationnellement ?"*. **La réactivation reste manuelle** : aucun changement automatique de `statut_apprenant`.

## 7. Composants à modifier / créer

### À modifier
- `src/components/apprenants/ApprenantDetailContent.tsx` — restructuration tabs (7), header condensé, bandeau SmartOF, nouveau jeu d'actions.
- `src/components/apprenants/tabs/ResumeTab.tsx` — ajout `<ApprenantTimeline/>`.
- `src/components/apprenants/tabs/DossierTab.tsx` — accueillir l'accordéon réglementaire (CMA/Carte Pro).
- `src/components/apprenants/tabs/FormationExamensTab.tsx` — **scinder** en `FormationTab` (déjà existant) et exposer `ExamensTab` comme onglet racine ; ce wrapper devient déprécié (gardé en alias 1 release).
- `src/components/apprenants/tabs/SuiviTab.tsx` → renommer **logiquement** "Historique / Notes" (label uniquement, pas de fichier).

### À créer
- `src/components/apprenants/ApprenantTimeline.tsx` — composant timeline.
- `src/hooks/useApprenantTimeline.ts` — agrégation lecture seule.
- `src/components/apprenants/SmartOFHistoricalBanner.tsx` — bandeau garde-fou.
- `src/components/apprenants/HeaderActionsOverflow.tsx` — menu `…` pour actions secondaires.

### Inchangé (zéro modification)
- `DocumentsTab`, `PaiementsTab`, `CMATab`, `CarteProTab`, `ExamensTab`, `FormationTab`.
- Toutes les routes (`/contacts`, `/contacts/:id`, `/apprenants/:id`).
- Schéma DB, `statut_apprenant`, RLS, `apprenant-active.ts`, helpers KPI.

## 8. Risques

| Risque | Niveau | Mitigation |
|---|---|---|
| Régression visuelle pour utilisateurs habitués à l'onglet "Formation" combiné | Moyen | Garder `FormationExamensTab` comme alias pendant 1 release + toast informatif au 1er accès |
| Charge réseau timeline (multi-queries) | Moyen | `useQueries` parallèles + `staleTime: 30s` + limite 100 événements + pagination "Charger plus" |
| Doublon d'info Rappels (Résumé + onglet Historique) | Faible | OK assumé : Résumé = top 1, Historique = liste complète |
| Confusion accordéon CMA dans Identité | Faible | Ouvrir par défaut si `missingCMA > 0` |
| Tab guard cassé après réorganisation | Faible | Tests unitaires existants `apprenant-active.test.ts` + ajout test `tabs` |
| Actions header trop nombreuses sur mobile | Moyen | Overflow `…` responsive, action principale = CTA dynamique du stepper |

## 9. Plan de rollback

1. **Aucune migration DB**, donc rien à défaire côté base.
2. Rollback purement frontend : `git revert` du commit unique de restructuration suffit.
3. Les nouveaux fichiers (`ApprenantTimeline`, `useApprenantTimeline`, `SmartOFHistoricalBanner`, `HeaderActionsOverflow`) sont isolés : suppression sans impact transverse.
4. Feature flag local possible (`VITE_APPRENANT_V2=true`) pour activer la nouvelle structure sur un sous-ensemble d'utilisateurs et basculer si besoin.

## 10. Tests à effectuer

### Automatiques
- `src/lib/__tests__/apprenant-active.test.ts` — toujours vert.
- Nouveau `src/hooks/__tests__/useApprenantTimeline.test.ts` : agrégation, tri desc, dédoublonnage.
- Nouveau `src/components/apprenants/__tests__/ApprenantDetailContent.test.tsx` : 7 onglets présents, track-aware, bandeau SmartOF visible si `is_historical_import`.

### Manuels (checklist QA)
1. Ouvrir un apprenant **actif initial** → 7 onglets, accordéon CMA dans Identité, timeline peuplée.
2. Ouvrir un apprenant **formation continue** → CMA remplacé par Carte Pro dans Identité.
3. Ouvrir un import **SmartOF** (`is_historical_import=true`) → bandeau visible, stepper grisé, actions disponibles avec confirmation.
4. Cliquer chaque action header → écrit bien dans `contact_historique` (vérif onglet Historique).
5. Naviguer entre fiches via `ContactSheetNavigator` → état tab préservé / reset cohérent.
6. Vérifier que `statut_apprenant` n'est **jamais** modifié par les nouvelles actions (DB query témoin avant/après).
7. Route directe `/contacts/:id` (ApprenantFullPage) → même rendu que slide-over.
8. Mobile 375px → onglets scrollables, actions en overflow.
9. KPI dashboard (Apprenants actifs) → inchangé avant/après ouverture d'une fiche SmartOF.
10. Recherche globale → fiche SmartOF accessible, fiche actif inchangée.

---

**Attente de validation avant toute écriture.** Aucune modification de fichier, de schéma, de RLS ni de donnée n'est faite tant que ce plan n'est pas approuvé.
