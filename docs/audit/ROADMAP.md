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

**Reste à faire (vague 2)** : fil d’Ariane visible, brancher SoftDeleteConfirmDialog sur les suppressions à impact, garde anti-perte de saisie (brouillon), vue mobile de la session, accessibilité (aria-label, sélecteurs clavier), action groupée de statut, window.confirm restants (SessionParcoursTab, FormationsPage, DuplicatesDialog). **Perf** : framer-motion hors chemin critique. **Vague 3a (avant le 2ᵉ centre)** : inchangée. **À activer** : `CRON_SECRET` (procédure dans supabase/CRON_JOBS.md).
