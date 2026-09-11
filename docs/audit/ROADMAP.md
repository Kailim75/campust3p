# Roadmap d'action — CRM T3P Campus

**Date :** 13 août 2026 · Complément de `RAPPORT_AUDIT.md` et `QUICK_WINS.md`.

Plan séquencé en **3 vagues**. Chaque vague est ordonnée ; l'effort est cumulé ; les dépendances sont explicites.
Rappel des efforts : XS <1 h · S <½ j · M 1–3 j · L >3 j. Dépendances : 🔵 agent Lovable · 🟡 confirmation panneau Cloud · 🟢 front pur.

---

## 🔴 Vague 1 — Sécurité & bloquants (à traiter en priorité)

Objectif : fermer les failles exploitables et arrêter les pertes de données possibles. **Rien d'autre ne devrait passer devant.**

| Ordre | Chantier | Réf. rapport | Effort | Dép. |
|---|---|---|---|---|
| 1 | **Révoquer l'accès `anon` aux 4 RPC de signature** + router `SignaturePage` par les edge functions à jeton + retirer `access_token` de `get_related_signature_docs` | §3.1 P0 | S | 🔵 |
| 2 | **`export-audit-pack` : scoper par centre** (résoudre le `centre_id` de l'appelant, vérifier l'appartenance session/contact) | §3.1 P0 | S | 🔵 |
| 3 | **`soft_delete_record`/`restore_record` : contrôle rôle + centre + `REVOKE anon`** | §3.1 P0/P1 | S | 🔵 |
| 4 | **Basculer les suppressions dures financières/Qualiopi en soft-delete + audit** (`transactions_bancaires`, `qualiopi_preuves`, `facture_lignes`, `contact_documents`…) | §3.1 P0 | M | 🔵🟢 |
| 5 | **`download-email-attachment` : vérifier le JWT + résoudre le centre côté serveur** + déclarer `verify_jwt=true` | §3.1 P1 | S | 🔵 |
| 6 | **`CRON_SECRET` partagé** vérifié en tête de chaque cron | §3.1 P1 | M | 🔵 |
| 7 | **`incoming-webhook` : fail-closed** + valider le `centre_id` contre une allowlist | §3.1 P1 | S | 🔵 |
| 8 | **`public-sign-document` : durcir `get_document_url`** (token non nul, statut/expiration) + capturer `ip_signature` | §3.1 P1 + P2 | S | 🔵 |
| 9 | **Confirmations panneau Cloud** (à faire avant/pendant) : `verify_jwt` réel, grants `EXECUTE` par défaut, flags `public` des buckets, PITR/sauvegardes, secrets configurés | §4 | S | 🟡 |

**Effort vague 1 :** ~1 à 1,5 semaine. **Dépendance forte :** l'essentiel passe par l'agent Lovable (migrations/edge functions) — grouper en une ou deux sessions « durcissement ». Protocole : merger la PR de migration **avant** de la faire appliquer par l'agent.

---

## 🟠 Vague 2 — Simplification de l'usage quotidien

Objectif : rendre l'outil plus fiable et plus rapide pour la secrétaire. La plupart sont front pur (mergeables directement).

| Ordre | Chantier | Réf. rapport | Effort | Dép. |
|---|---|---|---|---|
| 1 | **États d'erreur sur les listes** (exposer `isError` + encart « Réessayer ») — Rappels, Paiements, Apprenants, Aujourd'hui | §3.6 P1 | M | 🟢 |
| 2 | **Feedback d'échec sur les écritures** (présence, pièce CMA, mutations trésorerie/notifications) | §3.6 P1 | S | 🟢 |
| 3 | **Confirmation avant envoi d'email client** (facture, félicitations, devis, relance signature) | §3.6 P1 | S/M | 🟢 |
| 4 | **Un seul mot pour l'apprenant** (bannir « stagiaire »/« contact » des libellés, commencer par Sessions) | §3.6 P1 | M | 🟢 |
| 5 | **Messages d'erreur en français clair** (mapper les erreurs Supabase, ne jamais afficher `error.message` nu) | §3.6 P2 | M | 🟢 |
| 6 | **Fil d'Ariane** : passer `activeSection`/`onNavigate` au `Header` (le composant existe déjà) | §3.6 P2 | M | 🟢 |
| 7 | **Actions dangereuses cohérentes** : brancher `SoftDeleteConfirmDialog`, confirmer la désinscription (+ toast « Annuler »), remplacer les `window.confirm` | §3.6 P2 | S/M | 🟢 |
| 8 | **Protection contre la perte de saisie** (garde *dirty* + brouillon localStorage sur ExpressEnrollment/FactureForm) | §3.6 P2 | M | 🟢 |
| 9 | **Vue mobile de la session** (carte inscrit exposant CMA/facture/statut) | §3.6 P2 | M | 🟢 |
| 10 | **Accessibilité** : `aria-label` sur les boutons icône, sélecteurs d'inscription au clavier, contraste du CTA orange | §3.6 P2 | S | 🟢 |
| 11 | **Action groupée de changement de statut** dans la liste des inscrits | §3.6 P2 | S | 🟢 |
| 12 | **Quick wins UX restants** (⌘K Inbox, validation `onBlur`, vocabulaire pilotage) | `QUICK_WINS.md` | XS | 🟢 |

**Effort vague 2 :** ~1,5 à 2,5 semaines. **Dépendance :** quasi tout est front → **mergeable par Karim** au fil de l'eau, sans l'agent Lovable. Priorité aux points 1-3 (fiabilité perçue).

---

## 🟢 Vague 3 — Fond structurel & évolutions produit

Objectif : réduire la dette qui freine l'évolution et préparer la montée en charge / le 2ᵉ centre / la conformité Qualiopi.

### 3a. Préparation du 2ᵉ centre (prérequis avant tout onboarding multi-centre)
| Chantier | Réf. rapport | Effort | Dép. |
|---|---|---|---|
| **Isolation par centre des tables oubliées** (financier, templates, qualiopi, objectifs, workflows, réclamations, CR séance) | §3.1 P1 | M | 🔵 |
| **Numérotation de facture scindée par centre** (génération + unicité `(centre_id, numero_facture)`) | §3.4 P1 | M | 🔵 |
| **`delete-user`/`list-users` scopés au centre** ; fonctions edge sans contrôle de rôle/centre (`sync-driveflow`, `execute-workflow`, `send-signature-email`) | §3.1 P2 | M | 🔵 |
| **Contenu LMS** : arbitrer partagé vs per-centre | §3.1 (annexe) | M | 🔵 |
| Reprise de la check-list mono-centre existante (`AMELIORATIONS.md`) | — | S | — |

### 3b. Performance
| Chantier | Réf. rapport | Effort | Dép. |
|---|---|---|---|
| **Corriger le préchargement des vendors** (helper `__vitePreload`, `manualChunks` fonction) — ~397 Ko gz économisés | §3.5 P1 | M | 🟢 |
| **Sortir framer-motion du chemin critique** (transition CSS) + lazifier SuperAdmin/AIAssistant/Onboarding | §3.5 P1/P2 | M | 🟢 |
| **`FinancesPage` : lazy par onglet** | §3.5 P2 | M | 🟢 |
| **Étendre `shared-queries`** / RPC d'agrégation pour les pages lourdes | §3.5 P2 / §3.4 P2 | L | 🟢🔵 |

### 3c. Dette de code & maintenabilité
| Chantier | Réf. rapport | Effort | Dép. |
|---|---|---|---|
| **Centraliser la logique financière** (`computeResteAEncaisser`/`computeTotalPaye` dans `lib/`, corriger l'incohérence de clamp) | §3.3 P1 | M | 🟢 |
| **Supprimer les `(supabase as any)`** sur tables typées | §3.3 P1 | M | 🟢 |
| **Découper les god-components** (AujourdhuiPage, ApprenantDetailContent…) vers `lib/` + hooks | §3.3 P2 | L | 🟢 |
| **Supprimer le code mort** (`template-studio-v2`, hooks inbox morts) + trancher le sort de l'inbox | §3.3 P2 | S | 🟢 |
| **Unifier toasts / formatage monétaire** + error boundaries par hub | §3.3 P2 | S | 🟢 |
| **Suivi d'erreurs front** (Sentry ou collecteur maison) | §3.8 P1 | S | 🟢🔵 |
| **Tests des zones critiques** (RLS multi-tenant, edge sensibles, calculs financiers) + outillage (`coverage`, `user-event`) | §3.8 P1/P2 | L | 🟢 |
| **Étendre l'audit trigger** aux tables financières/Qualiopi manquantes | §3.8 P2 | S | 🔵 |

### 3d. Évolutions produit métier
| Chantier | Réf. rapport | Effort | Dép. |
|---|---|---|---|
| **Pilotage Qualiopi automatique** (dériver le statut des 32 indicateurs depuis les données réelles) | §3.1 P0 | M | 🟢🔵 |
| **Dossier de preuve Qualiopi consolidé** (émargements horodatés + satisfaction + réclamations + preuves par indicateur) | §3.7 P1 | M | 🟢🔵 |
| **Récupération de points** : retirer le placeholder mort, ou modéliser l'activité | §3.7 P1 | XS (nettoyage) / L (modélisation) | 🟢🔵 |
| **Positionnement structuré & scoré** + registre de veille (critère 6) | §3.7 P2 | S/M | 🔵 |
| **RGPD** : purge/anonymisation après échéance, adoption de `redact.ts`, encadrement des transferts sous-traitants | §3.2 P2 | M | 🔵 |

**Effort vague 3 :** plusieurs semaines, à étaler. **Dépendance clé :** la sous-vague **3a est bloquante avant le 2ᵉ centre** — à programmer dès qu'une ouverture est décidée.

---

## Synthèse des dépendances

- **Mergeable par Karim sans l'agent Lovable** (🟢) : l'essentiel de la vague 2 + la perf + la dette de code.
- **Nécessite l'agent Lovable** (🔵, migrations/edge) : quasi toute la vague 1 + la préparation multi-centre.
- **Nécessite une confirmation dans le panneau Cloud** (🟡) avant d'agir : flags `public` des buckets, existence d'index, `verify_jwt` réel, grants `EXECUTE`, PITR — voir §4 du rapport.

**Recommandation d'enchaînement :** Vague 1 (sécurité, en 1-2 sessions groupées avec l'agent) → Vague 2 points 1-3 (fiabilité perçue immédiate) → reste de la vague 2 → Vague 3 par sous-thème selon les priorités business (3a seulement si le 2ᵉ centre approche).

---

## Suivi d’exécution

| Date | Lot | PR | État |
|---|---|---|---|
| 09/09/2026 | Quick wins ergonomie (⌘K, feedback présence/CMA, confirmations facture & résultats, onBlur, corbeille documents, URL 30 j, tokens Qualiopi, libellés, icône PWA) | #64 | ✅ en prod |
| 09/09/2026 | **Vague 1 — sécurité** : RPC signature révoquées, public-sign-document point d’entrée unique (+ ip_signature), export-audit-pack et download-email-attachment cloisonnés, garde-fous soft_delete/restore, triggers d’audit sur 11 tables, incoming-webhook fail-closed, garde x-cron-secret (mode transition, CRON_SECRET à créer) | #65 | ✅ en prod (fonctions redéployées + 3 migrations appliquées, vérifiés par curl) |
| 10/09/2026 | Vague 2 n°1 — état d’erreur explicite sur toutes les listes (composant ErrorState) | #67 | ✅ en prod |
| 10/09/2026 | Vague 2 n°4 — un seul mot « apprenant » (31 libellés d’écran ; documents légaux inchangés) | #68 | ✅ en prod |
| 10/09/2026 | Perf P1 — JS de démarrage 771 → 363 Ko gz (manualChunks fonction, helpers partagés, SuperAdmin/onboarding/assistant IA en lazy) | #69 | ✅ en prod |
| 10/09/2026 | Vague 2 n°3 — confirmation avant envoi d’email : devis, lien Alma, renvoi/relance de signature (ConfirmSendDialog) | #70 | ✅ en prod |
| 10/09/2026 | Perf P2 — onglets Finances en lazy (chunk 648 Ko → 8 Ko) | #71 | ✅ en prod |
| 10/09/2026 | Archi P1 — reste à encaisser : formule unique jamais négative (lib/montants + 6 tests) | #72 | ✅ en prod |
| 10/09/2026 | Vague 2 n°5 — messages d’erreur en français clair (lib/erreurs, 123 toasts réécrits, 7 tests) | #74 | ✅ en prod |
| 10/09/2026 | Vague 2 n°7 — désinscription et suppression de facture avec confirmation nominative (plus de window.confirm sur la fiche session) | #75 | ✅ en prod |
| 10/09/2026 | Élagage 1/3 — code mort (Inbox, template-studio-v2, charter, 11 hooks orphelins ; −6 406 lignes) | #77 | ✅ mergée (aucun effet visible) |
| 10/09/2026 | Élagage 2/3 et 3/3 — « outil interne » : Plus › Administration 6 → 3 entrées, « Modèles & automatisations » ouvre sur les modèles de documents, 4 blocs d’Aujourd’hui mis en sommeil (`BLOCS_EN_SOMMEIL`), puce Anomalies et onglet Snippets retirés (+ restauration de 3 edge functions supprimées à tort par #77 — en réalité 2 : `centre-scoring` et `prospect-scoring` ; `crm-analysis` n'avait plus d'appelant, son seul consommateur `CRMAnalysisTab` n'étant importé nulle part depuis mars 2026) | #78 | ✅ en prod |
| 10/09/2026 | Scan de sécurité Lovable 1/2 — jetons d’enquête créables pour un contact d’un autre centre (critique), bucket `produits-photos` sans cloisonnement (critique), RIB/SIRET/taux horaire des formateurs visibles par tout formateur (avertissement) | #79 | ✅ migration appliquée par l’agent |
| 10/09/2026 | Scan de sécurité Lovable 2/2 — cloisonnement par centre de `objectifs`, `qualiopi_audits`, `qualiopi_indicateurs`, `reclamations`, `attestation_certificates` (+ trigger `generic_auto_set_centre_id` sur les 2 tables Qualiopi ; 32 indicateurs rattachés au centre) | #80 | ✅ appliquée — **0 critique, 7 avertissements** restants (SECURITY DEFINER différés, LMS/budget/tables financières sans colonne centre → vague 3a) |
| 10/09/2026 | **Revue adversariale des PR #64→#78** (11 chercheurs, 2 réfutateurs + arbitre par constat : 47 confirmés, 4 réfutés) — correctif n°1 : signature impossible pour les demandes partagées par « Copier le lien » (régression de #65 : le `signing_token` n’était créé que par l’envoi d’email) | #81 | ✅ `resolve-signing-token` redéployée + smoke test prod |
| 10/09/2026 | **Correctifs de la revue — 46 constats, 7 lots** implémentés en parallèle et relus chacun par un relecteur adversarial (7/7 approuvés, 0 issue bloquante) : `erreurs.ts` réécrit (codes lus dans `code`/`status` et non dans le texte, messages français préservés, `messageErreurInvoke`), `useRappels`/`useAujourdhuiData` lèvent au lieu d’afficher un faux « rien à faire », anti-double-envoi sur `ConfirmSendDialog`, reste à encaisser par facture sur la fiche apprenant + pièces en corbeille décomptées, `alma-reconcile-cron` accepte un JWT admin (survit à `CRON_SECRET`), garde rôle+centre sur `reactivate_contact`, rôles staff alignés, 7 edge functions sans appelant supprimées. 209 tests (175 → +34) | #82 | ✅ en prod |
| 10/09/2026 | **`CRON_SECRET` créé et activé** (vers 11h15 UTC) : les 8 jobs pg_cron portent l’en-tête `x-cron-secret`, vérifié le jour même sur `send-convocation-cron?dryRun=true` (200 **avec** l’en-tête, 401 **sans**) | — | ✅ en prod |
| 10/09/2026 | **Lot 1/4 — retrait de l’onglet IA** : `ia-director/` (16 fichiers) et 7 hooks sans consommateur supprimés, 4 edge functions IA retirées du repo et de `config.toml`, aide et glossaire nettoyés | `correctifs-lot2` | 🟡 à merger — **4 fonctions IA à DÉSINSTALLER côté Lovable** |
| 10/09/2026 | **Lot 2/4 — garde anti-perte de saisie** (brouillon + confirmation de sortie) et fin des confirmations natives | `correctifs-lot2` | 🟡 à merger |
| 10/09/2026 | **Lot 3/4 — points mineurs** : montant d’un versement validé à la saisie, envoi de signature par ligne, liste des apprenants alignée sur le calcul par facture, statuts de facture exclus (`STATUTS_FACTURE_EXCLUS`) | `correctifs-lot2` | 🟡 à merger |
| 10/09/2026 | **Lot 4/4 — authentification des emails automatiques** : `send-automated-emails` (doublon de rappel retiré, `?dryRun=true`, déduplication, chemins cron/JWT exclusifs) | `correctifs-lot2` | 🟡 à merger — **accord de redéploiement DONNÉ le 10/09/2026**, périmètre fixé par l’interrupteur (ligne suivante) |
| 10/09/2026 | **Reprise après relecture d’intégration** : documentation alignée sur `CRON_SECRET` actif (B1), versement rattaché à une facture brouillon (B2) et « Rien à encaisser » au lieu de « Soldé » (B3) — deux régressions du calcul par facture —, **rapport CRM quotidien réparé** (`send-daily-report` filtrait `validee`/`en_attente`, statuts qu’aucune inscription active ne porte : 0 inscrit et 0 dossier incomplet annoncés chaque matin sur 388 inscriptions). 256 tests (243 → +13, dont 6 sur les deux régressions) | `correctifs-lot2` | 🟡 à merger — **`send-daily-report` à REDÉPLOYER** |
| 10/09/2026 | **Interrupteur par bloc** (`BLOCS_AUTOMATIQUES_ACTIFS`, en tête de `send-automated-emails`) — **accord du directeur donné le 10/09/2026**, périmètre précis : relance de paiement J-7 **ÉTEINTE** (« le processus de relance n’est pas encore au point côté centre »), rappels de formation **J-7** et **J-1** et rappel d’examen pratique **J-7 ALLUMÉS**. Un bloc éteint ne fait aucune requête, aucun envoi, aucune écriture dans `email_logs`, et se déclare `actif: false` dans le résumé JSON | `correctifs-lot2` | 🟡 à merger — **`send-automated-emails` à REDÉPLOYER côté Lovable** (vérifier d’abord le volume avec `?dryRun=true`) |
| 10/09/2026 | **Correctifs avant fusion du lot emails** (4 remarques de la relecture adversariale finale) : rappels de formation envoyés à **toutes les inscriptions sauf `annule`/`report`** — la liste blanche `statut === "inscrit"` n’en servait que 44 sur 388 — ; **sessions et inscriptions en corbeille écartées** (`deleted_at`, absent des 3 blocs allumés) ; **statut vide** rattrapé dans le rapport quotidien (`.or("statut.is.null,statut.not.in.(annule,report)")`, `NOT IN` valant NULL sur une colonne sans `NOT NULL`) ; documentation alignée. Vérifié par harnais (bundle esbuild + stubs `Deno`/`supabase-js`/`resend`, `TZ=UTC`) : 6 scénarios, 20 assertions | `correctifs-lot2` | 🟡 à merger — **`send-automated-emails` et `send-daily-report` à REDÉPLOYER** |
| 11/09/2026 | **Mention NDA retirée des documents** — décision du directeur (« je n'ai pas de numéro NDA, je ne souhaite pas faire apparaître cette mention »). 17 sites sur 6 surfaces : générateurs PDF front et edge (garde unique `hasNda`/`hasSiret`, phrases refermées, disclaimer conditionné, clause « Ci-après dénommé l'Organisme » préservée), gabarits HTML nettoyés **au rendu** (règle de reconnaissance exacte en 2 classes — voir CLAUDE.md), page mentions légales, flyers, réglage rendu facultatif. **Trois défauts trouvés en chemin** : un jeton `{{centre_nda}}` ressortait LITTÉRALEMENT dans les documents téléchargés et envoyés par email (`replaceVariables` sans variables `centre_*`) ; le contrat de conduite imprimait « À planifier » comme raison sociale, adresse, SIRET et adresse du stagiaire (4 colonnes lues qui n'existent pas) ; identité de centre FICTIVE supprimée de `send-automated-emails`. Trou de mise en page de la convention rebouché (mesuré : 10 mm de blanc). **9 relectures adversariales**, dont 5 verdicts BLOQUANT successifs sur le nettoyeur de gabarits, qui détruisait du texte contractuel. 466 tests (256 → +210), ESLint 131 → 120 | #85 | ✅ **front en prod le 11/09/2026** (publié par Karim). Vérifié par le CONTENU servi, l’empreinte du build Lovable différant de celle du build local : marqueur du lot présent dans `SettingsPage-CmbtmOkM.js`, et `[NDA requis]`/`[NDA non configuré]` absents des **185 fragments** servis. **3 fonctions edge REDÉPLOYÉES le 11/09/2026** par Karim (`send-automated-emails`, `send-convocation-cron`, `generate-template-ai`) — le sync GitHub ne les déploie pas. Contrôle possible depuis l’extérieur : les 3 répondent **401 avec leur propre garde** et un nom inexistant renvoie **404**, donc elles sont bien déployées et joignables ; **la VERSION déployée n’est pas vérifiable sans session Lovable** — aucune sonde non authentifiée ne distingue l’ancienne de la nouvelle. Première preuve observable : une convocation automatique émise après le redéploiement, dont le PDF ne portera plus la mention |
| 11/09/2026 | **Point M1 — une seule convention pour les statuts de facture.** Symptôme corrigé : « Aujourd’hui » ne propose plus de relancer un apprenant dont la fiche affiche « Soldé » (un brouillon passait pour une facture ouverte). 14 modules passent par `lib/montants` ; 3 familles de défauts : brouillons dans le CA, versements sommés sans rattachement (recouvrement > 100 %), pièces en corbeille encore comptées. **Défauts trouvés en chemin** : `usePredictiveScoring` faisait DISPARAÎTRE du CA une facture dès qu’elle passait en `partiel` — encaisser un acompte baissait le CA du mois ; `ForecastCACard` et `useAdvancedStats` omettaient `impayee` de leur liste blanche. 542 tests (466 → +76), ESLint 58 → 51. **5 tours de relecture, 4 verdicts BLOQUANT — tous sur l’en-tête de `montants.ts`, jamais sur le calcul** : l’en-tête n’énumère plus rien (voir la leçon de méthode ci-dessous) | #88 | 🟡 à merger — **aucune fonction edge concernée**, mais publication du front requise pour que les chiffres bougent |

**Reste à faire (vague 2)** : fil d’Ariane visible, brancher SoftDeleteConfirmDialog sur les suppressions à impact, vue mobile de la session, accessibilité (aria-label, sélecteurs clavier), action groupée de statut. **Perf** : framer-motion hors chemin critique. **Vague 3a (avant le 2ᵉ centre)** : inchangée, et confirmée par le scan Lovable (LMS, budget prévisionnel, tables financières encore sans colonne `centre_id`).

**`CRON_SECRET` : fait, plus rien à activer.** Créé et activé le 10/09/2026 vers 11h15 UTC ; les 8 jobs pg_cron portent l’en-tête `x-cron-secret` ; vérifié le jour même (200 avec l’en-tête, 401 sans). La procédure de `supabase/CRON_JOBS.md` reste la référence pour une **rotation** du secret — même ordre : en-tête sur les jobs d’abord, secret ensuite.

*Livrés depuis, et retirés de cette liste* : **garde anti-perte de saisie** (brouillon) et **fin des `window.confirm`** — il ne reste **0 `confirm(` natif dans `src/`** (SessionParcoursTab, FormationsPage et DuplicatesDialog passent tous par un dialogue de confirmation).

*Revirement assumé sur `centre-scoring` et `prospect-scoring`* : supprimées à tort par #77, **restaurées le matin du 10/09/2026 par #78** (l’onglet IA les appelait encore), puis **re-supprimées le soir même** avec cet onglet — elles n’ont désormais plus aucun appelant. Les deux restent à désinstaller côté Lovable.

**Points mineurs relevés par les relecteurs, non traités** (aucun n’est bloquant) : `activeTab` d’`AutomationsPage` non réinitialisé après un deep-link d’onboarding ; `ContactQuickView` somme encore des agrégats et filtre `annulee` dans sa requête (fichier réservé à un autre lot) — à aligner sur `lib/montants` comme `ApprenantQuickView`.

**Point ouvert M2 — `supabase/config.toml` : 6 fonctions déployées sans entrée** (`alma-reconcile`, `generate-facturx`, `process-payment-reminders`, `submit-pdp`, `track-link`, `track-open`). Elles tournent donc sous le `verify_jwt` par défaut de la plateforme au lieu d’une politique écrite et relue, alors que le fichier documente en tête que « les fonctions en `verify_jwt = false` DOIVENT faire leur propre contrôle d’autorisation ». **À compléter en fixant `verify_jwt` pour chacune** (et en vérifiant la garde interne de celles qu’on laisse publiques — `process-payment-reminders` est appelée par un job pg_cron horaire). Défaut **préexistant**, hors périmètre du lot du 10/09/2026.

**Point M1 — TRAITÉ le 11/09/2026.** Le symptôme d’origine est corrigé : « Aujourd’hui » ne propose plus de relancer un apprenant dont la fiche affiche « Soldé » (un BROUILLON était traité comme une facture ouverte). Quatorze modules qui calculaient un total d’argent en énumérant les statuts à leur main passent par `src/lib/montants.ts` — via `filtreFacturesComptees` côté SQL et `estFactureComptee` / `sommeFactures` / `sommePaiementsFactures` côté JS. Trois familles de défauts corrigées : brouillons comptés dans le chiffre d’affaires ; versements sommés sans rattachement à une facture comptée (taux de recouvrement faussé) ; requêtes sans `.is("deleted_at", null)`, où une pièce en corbeille pesait encore.

**Ce que M1 ne règle pas, et qu’il ne faut pas croire réglé :**
- **Sept des treize indicateurs corrigés ne sont affichés nulle part** — `ForecastCACard`, `CAByFormationChart`, `ObjectifProgressCard`, `FinancialSummaryCard`, `useDashboardHealthScore`, `usePredictiveScoring`, `StrategicPillars` n’ont aucun importeur menant à la racine. Correction juste, effet invisible. Six seulement sont sur des écrans vivants : Aujourd’hui, courbe de CA, page Sessions, Finances › Facturation, portail formateur.
- **Neuf lectures portant `montant_total` n’ont toujours pas `.is("deleted_at", null)`** (dont `useExportFEC`, qui alimente l’export comptable) : une facture en corbeille y pèse encore.
- **Un taux de recouvrement peut dépasser 100 %** sur un trop-perçu : l’encaissé n’est pas borné au montant de la facture, et c’est voulu — voir `tropPercu()`.
- **Des écrans gardent volontairement leur convention** : relances (`lib/rappels`), retards (`PaiementsPage`), vue « compte en banque » (`useDashboardData.encaissements`, `useFinancesKpis` qui en dérive), et le KPI « factures en attente » de `useDashboardMetrics`, brouillons inclus par choix de libellé.

**Leçon de méthode, payée quatre fois sur ce lot** : l’en-tête de `src/lib/montants.ts` a contenu quatre versions successives d’un inventaire « ce qu’il reste à faire », et les quatre ont été prises en défaut — modules accusés à tort, modules oubliés, comptes faux, garantie que le code ne tenait pas. Un recensement rédigé à la main dans un commentaire est faux le lendemain. L’en-tête n’énumère plus rien : il porte la règle et trois avertissements. Le suivi vit ici, daté.

**Point ouvert M3 — ce que le lot NDA (11/09/2026) laisse ouvert**, chacun mesuré sur le rendu réel, aucun bloquant :
- **Gabarits Word (.docx) téléversés** : le nettoyage opère sur du HTML, pas sur du XML Word. Un modèle portant « N° de déclaration d'activité : {centre_nda} » imprimera le libellé suivi du vide. Aucune perte de contenu. Remède le plus sûr : refuser le téléversement d'un gabarit portant un jeton NDA quand le centre n'en a pas, ou retirer le libellé du gabarit concerné.
- **Compromis assumé de la classe B** : une formulation verbale suivie de texte (« Déclaration d'activité enregistrée sous le n° {{centre_nda}} auprès du préfet… ») garde son libellé visible avec un numéro vide. C'est le prix de la règle « ne jamais supprimer ce qui n'est pas la mention », adoptée après que trois relecteurs ont prouvé la destruction de texte contractuel. **Ne pas « corriger » en élargissant la coupe.**
- **Marqueurs entre crochets encore imprimables si le centre n'est JAMAIS configuré** : `[Centre non configuré - Paramètres > Centre]`, `[Adresse requise]`, `[Téléphone requis]`, `[Email requis]` (`centre-to-company.ts`). `[SIRET…]` et `[NDA…]` sont traités, eux. Sans effet tant que Réglages › Centre est rempli.
- **Six gardes SIRET ad hoc** plus permissives que `hasSiret` (`pdf-generator.ts` ×2, `generateConventionFormation.ts` ×2, `generateContratFormation.ts` ×2) : un SIRET composé d'espaces y passerait. À mutualiser sur le prédicat unique.
- **`convention-pdf-generator.ts` lit l'identité dans la constante `ORGANISME` du code**, pas en base : la convention *legacy*, le règlement intérieur et les CGV porteraient l'identité du 1ᵉʳ centre pour un 2ᵉ centre. Piège associé : le repli `company?.nda || ORGANISME.nda` ferait hériter le NDA de la constante le jour où elle serait renseignée. → **vague 3a**.
- **Deux trous de couverture** : les garde-fous de la page publique `/mentions-legales` ne sont mordus par aucun test (mutation vérifiée : suite verte avec la version `main`) ; le corpus « gabarits réels » du test est recopié à la main (2 des 5 corps seedés par migration).
- **`generate-template-ai`** : la consigne n'impose plus `{{centre_nda}}`, mais un gabarit produit par l'IA peut encore écrire la mention **sans jeton** (un titre « Déclaration d'activité »), forme que le nettoyage ne peut pas retirer.
- **Changement de comportement d'un cron, à connaître** : si `centre_formation` devient illisible et que des PDF sont demandés, `send-automated-emails` répond 500 et **n'envoie rien** — au lieu de partir avec une identité inventée. Bon arbitrage, mais un incident RLS un matin bloquerait la campagne du jour, avec pour seule trace un `console.error`.

*Traités depuis* (lot « mineurs ») : validation du montant d’un versement à la saisie (attribut `min`, bouton désactivé, garde avant l’appel) ; état d’envoi **par ligne** dans `SignaturesTrackingPanel` (ensemble des envois en vol : la ligne B reste envoyable pendant l’envoi de A, et la fin de A ne la déverrouille pas) ; liste des apprenants alignée sur le calcul par facture (`resteDu` dans `useEnrichedContacts`) ; règle unique « une facture en brouillon ou annulée ne compte ni dans le facturé ni dans le reste à encaisser », exposée une seule fois dans `src/lib/montants.ts` (`STATUTS_FACTURE_EXCLUS` / `estFactureComptee`) et appliquée par les helpers ; `ApprenantQuickView` aligné sur ces mêmes helpers (composant aujourd’hui sans importeur : pas d’effet visible tant qu’il n’est pas remis en service).
