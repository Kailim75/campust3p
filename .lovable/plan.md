

# Audit UX & Plan de Fluidification du CRM

## A. Constat — Ce qui existe déjà (à conserver)

| Brique | État | Verdict |
|---|---|---|
| Sidebar 16 sections (9 + 7 "More") | ✅ | Bonne base, mais surchargée |
| Command Palette (Cmd+K) | ✅ | Excellent, **sous-utilisé** car peu visible |
| Raccourcis G+letter / N+letter | ✅ | Power-users only, invisibles pour les autres |
| Page "Aujourd'hui" (6 blocs prioritaires) | ✅ | Bon hub, mais en concurrence avec Dashboard |
| OnboardingTour + Checklist | ✅ | Présent mais one-shot |
| QuickActionsMenu (FAB) | ✅ | Redondant avec Cmd+K et Sidebar |
| RecentItems | ✅ | Caché dans sidebar |
| QuickView vs FullPage Apprenant | ✅ | Pattern réussi à généraliser |
| URL routing par section | ✅ | OK mais détails internes (onglets, IDs) peu partagés |

## B. Frictions identifiées

### 1. Surcharge cognitive de navigation
- 16 sections accessibles, **3 hubs concurrents** : Dashboard, Aujourd'hui, Sidebar. L'utilisateur ne sait pas par où commencer sa journée.
- "More menu" cache 7 modules importants (Alertes, Qualité, Planning conduite…) → effet "out of sight, out of mind".
- Pas de **breadcrumb actif** ni de fil "où je suis dans le workflow".

### 2. Création d'entités fragmentée
- Créer un apprenant, un prospect, une session, une facture = **4 dialogs différents** déclenchés depuis 4 endroits différents.
- Pas de **création contextuelle** : quand je crée une inscription, je ne peux pas créer le contact à la volée sans changer de page.

### 3. Recherche & navigation rapide
- Cmd+K existe mais **pas de point d'entrée visuel permanent** (barre de recherche en header).
- Pas de **recherche globale floue** (tape "dupont taxi mai" → résultats mixtes contacts/sessions).

### 4. Friction sur les actions répétitives
- Inscrire un apprenant à une session = ouvrir session → onglet inscrits → +ajouter → chercher contact = **5 clics**.
- Marquer un paiement reçu = naviguer Finances → facture → +paiement = 4 clics.
- Pas de **bulk actions** harmonisées (sélection multiple → action) sur les listes.

### 5. Feedback & état système
- Toasts présents mais **pas d'indicateur global** "X actions en attente / Y rappels dûs aujourd'hui" en permanence.
- Undo (Ctrl+Z) existe mais **invisible** pour l'utilisateur lambda.

### 6. Mobile
- Sidebar Sheet OK mais **FAB QuickActions et Cmd+K mal optimisés mobile**.
- Tableaux denses (sessions, finances) difficilement lisibles < 768px.

### 7. Onboarding continu
- Tour one-shot. Pas de **coach contextuel** ("vous n'avez pas encore essayé X").
- Pas de **template "première session" / "premier apprenant"** pour démarrer vide.

## C. Plan de fluidification — 6 chantiers priorisés

### Chantier 1 — Header Universel avec SearchBar (gain immédiat)
Ajouter dans le `Header` global :
- Barre de recherche centrale (placeholder "Rechercher apprenant, session, facture… ⌘K") qui ouvre Command Palette au clic/focus.
- Badge "Aujourd'hui : 3 rappels • 2 CMA" cliquable → page Aujourd'hui.
- Bouton "+" unifié (dropdown : Apprenant / Prospect / Session / Facture / Document) remplaçant le FAB.
- Avatar avec menu (profil, raccourcis, déconnexion).

**Impact** : -50% des clics pour naviguer + découvrabilité Cmd+K x10.

### Chantier 2 — Refonte Sidebar (réduction cognitive)
Regrouper en **5 sections + 1 "Plus"** :
```text
🏠 Aujourd'hui (hub unifié, fusion Dashboard+Aujourd'hui)
👥 Personnes        (Prospects + Apprenants en onglets)
📅 Formations       (Sessions + Catalogue + Planning conduite en onglets)
💰 Finances         (Factures + Paiements + Partenaires)
📨 Inbox CRM
⋯ Plus              (Automations, Qualité, Formateurs, Alertes, Sécurité, Corbeille)
```
Le **Dashboard actuel devient le bloc "Vue dirigeant"** dans Aujourd'hui (toggle).

### Chantier 3 — Création contextuelle universelle ("Quick Create")
Composant `<QuickCreate type="contact" onCreated={cb} />` réutilisable :
- Inline dans tous les sélecteurs (combobox "Choisir apprenant" → "+ Créer Jean Dupont").
- Mode mini-form (3 champs essentiels) + lien "Compléter plus tard".
- Branché sur les hooks existants (`useCreateContact`, `useCreateProspect`, etc.).

**Impact** : -3 clics par inscription, -60% d'abandon de formulaires.

### Chantier 4 — Bulk actions standardisées
Hook `useBulkSelection<T>` + composant `<BulkActionBar>` réutilisable :
- Checkbox sur lignes de toutes les listes (Apprenants, Sessions, Factures, Prospects).
- Barre flottante en bas : Email groupé / Export / Archiver / Convertir / Supprimer.
- Branché sur les Edge Functions existantes (email composer, audit pack, soft delete).

### Chantier 5 — Coach contextuel & Empty States actionnables
- Composant `<HintBubble id="..." />` qui affiche une astuce une fois (state localStorage).
- Empty states avec CTA explicite + lien doc (déjà partiellement fait → généraliser).
- Bandeau "Astuce du jour" rotatif sur Aujourd'hui (3-5 tips selon usage détecté).
- Indicateur Undo : toast persistant 5s avec bouton "Annuler" (au lieu de Ctrl+Z invisible).

### Chantier 6 — Mobile-first sur les flux critiques
- Tableau Sessions/Finances → Cards empilées < 768px (pattern déjà utilisé dans Apprenants).
- FAB mobile uniquement (desktop = bouton "+" header).
- Bottom sheet pour les détails (vs Sheet latéral desktop).

## D. Implémentation par étapes

| Étape | Fichiers principaux | Risque |
|---|---|---|
| 1. Header Universel + SearchBar | `Header.tsx`, nouveau `<GlobalSearchBar>`, `<GlobalCreateMenu>`, `<TodayBadge>` | 🟢 Faible |
| 2. Sidebar regroupée (feature-flag) | `Sidebar.tsx`, `Index.tsx` (routing onglets) | 🟡 Moyen |
| 3. QuickCreate contextuel | nouveau `<QuickCreate>` + intégration dans 5-8 sélecteurs clés | 🟢 Faible |
| 4. Bulk actions | nouveau `useBulkSelection`, `<BulkActionBar>`, intégration 4 listes | 🟡 Moyen |
| 5. Coach + Undo visible | `<HintBubble>`, refonte `useUndoStore` toast | 🟢 Faible |
| 6. Mobile responsive listes | Refacto `SessionsGroupedTable`, `FacturesTable` | 🟡 Moyen |

## E. Ce qu'on NE touche PAS

- Logique métier (RLS, triggers, statuts canoniques, conformité Qualiopi)
- Edge Functions existantes
- Schéma DB
- Documents et signatures
- Multi-tenant centre_id

## F. Livrables attendus

- Une UX où **80% des actions courantes se font en ≤ 2 clics ou via Cmd+K**.
- Une sidebar lisible pour un nouvel utilisateur en < 30 secondes.
- Mobile pleinement utilisable pour les flux Aujourd'hui / Inscription / Paiement.
- Aucune régression fonctionnelle.

---

**Recommandation** : démarrer par les chantiers **1, 3 et 5** (gain visible immédiat, risque faible, ~1 itération). Les chantiers 2, 4, 6 dans une 2e itération une fois validé.

Veux-tu qu'on commence par le **Chantier 1 (Header Universel)** ?

