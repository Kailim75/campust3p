# Cartographie des pages / dossiers — Statut de chaque module
> Générée le 2026-03-11 — Sprint Quick Wins L4

## Légende
- ✅ **ACTIF** — En production, importé et branché
- ⚠️ **LEGACY BRANCHÉ** — Encore importé quelque part mais remplacé logiquement par un équivalent V2
- 🔇 **ORPHELIN** — Aucun import trouvé, code mort probable
- 🟡 **AMBIGU** — Importé mais usage réel incertain (import sans rendu, ou doublon fonctionnel)

---

## Dossiers `src/components/`

| Dossier | Statut | Importé par | Commentaire |
|---------|--------|-------------|-------------|
| `admin/` | ✅ ACTIF | — | Module admin |
| `agent-ia/` | 🔇 ORPHELIN | Aucun import externe | `AgentIAPage` n'est importé nulle part. Wrapper de `CRMAnalysisTab`. |
| `ai/` | ✅ ACTIF | — | Composants IA intégrés |
| `alertes/` | ✅ ACTIF | `Index.tsx` | Page alertes |
| `apprenants/` | ✅ ACTIF | 7+ fichiers | Module apprenant principal |
| `aujourdhui/` | ✅ ACTIF | `Index.tsx` | Page Aujourd'hui |
| `auth/` | ✅ ACTIF | `App.tsx` | Authentification |
| `automations/` | ✅ ACTIF | `Index.tsx` | Inclut template-studio v1 + workflows |
| `blockage/` | ✅ ACTIF | — | Gestion des blocages |
| `charter/` | ✅ ACTIF | — | Charte de sécurité |
| `cockpit-financier/` | ✅ ACTIF | `FinancesPage` | Cockpit financier |
| `communications/` | ✅ ACTIF | `AutomationsPage` | Page communications (onglet Automations) |
| `contacts/` | ✅ ACTIF | `Index.tsx` + multiples | Module contacts/apprenants |
| `conventions/` | 🔇 ORPHELIN | Aucun import | `ConventionGeneratorDialog` — aucun import trouvé |
| `corbeille/` | ✅ ACTIF | `Index.tsx` | Corbeille soft-delete |
| `dashboard/` | ✅ ACTIF | `Index.tsx` | Dashboard principal |
| `devis/` | ✅ ACTIF | — | Module devis |
| `documents/` | ✅ ACTIF | Multiples | Workflow documentaire unifié |
| `email/` | ✅ ACTIF | Multiples | EmailComposerModal |
| `errors/` | ✅ ACTIF | `App.tsx` | Error boundary |
| `facturation/` | ✅ ACTIF | `FinancesPage` | `FacturationUnifiedPage` |
| `finances/` | ✅ ACTIF | `Index.tsx` | Page finances (tabs) |
| **`financial/`** | 🔇 ORPHELIN | Aucun import | Doublon de `cockpit-financier/` — `CockpitFinancierPage` existe dans les deux dossiers |
| `formateurs/` | ✅ ACTIF | `Index.tsx` | Module formateurs |
| `formations/` | ✅ ACTIF | `Index.tsx` | Catalogue formations |
| `ia-director/` | ✅ ACTIF | `AutomationsPage` | Onglet IA dans Automations |
| `layout/` | ✅ ACTIF | `Index.tsx` | Sidebar, Header, QuickActions |
| `learner/` | ✅ ACTIF | `LearnerPortal` | Portail apprenant public |
| `legal/` | ✅ ACTIF | — | Mentions légales |
| **`lms/`** | 🟡 AMBIGU | `LearnerPortal` + `ContactQuizSection` | Quiz player utilisé, mais `LmsAdminPage` est orpheline (jamais importée) |
| **`marketing/`** | ⚠️ LEGACY BRANCHÉ | 4 pages Flyer (`FlyerPage`, etc.) | Pages marketing statiques, routes `/flyer*` — fonctionnelles mais hors navigation principale |
| `onboarding/` | ✅ ACTIF | — | Onboarding centre |
| `paiements/` | ✅ ACTIF | — | Module paiements |
| `partners/` | ✅ ACTIF | `Index.tsx` | Partenaires |
| **`pipeline/`** | ⚠️ LEGACY BRANCHÉ | `ProspectsPage` | Vue pipeline intégrée comme onglet dans Prospects — dossier séparé inutile |
| **`planning/`** | 🔇 ORPHELIN | Aucun import | `PlanningPage` + `CreneauFormDialog` — aucun import, doublon de `planning-conduite/` |
| `planning-conduite/` | ✅ ACTIF | `Index.tsx` | Planning conduite actif |
| `presentation/` | ✅ ACTIF | `Presentation.tsx` | Landing page marketing |
| `prospects/` | ✅ ACTIF | `Index.tsx` | Module prospects |
| `pwa/` | ✅ ACTIF | — | PWA install prompt |
| `qualiopi/` | ✅ ACTIF | — | Module qualité Qualiopi |
| `qualite/` | ✅ ACTIF | `Index.tsx` | Page qualité |
| **`rappels/`** | ✅ ACTIF | Interne seulement | `RappelsPage` s'auto-importe — vérifier si branché dans `Index.tsx` |
| **`rapports/`** | 🔇 ORPHELIN | Aucun import externe | `RapportsPage` jamais importée — code mort |
| `sessions/` | ✅ ACTIF | `Index.tsx` + multiples | Module sessions |
| `settings/` | ✅ ACTIF | `Index.tsx` | Paramètres |
| `shared/` | ✅ ACTIF | — | Composants partagés |
| `signatures/` | ✅ ACTIF | — | Signature électronique |
| `superadmin/` | ✅ ACTIF | — | Espace super admin |
| **`template-studio/`** | ⚠️ LEGACY BRANCHÉ | `AutomationsPage` + `DocumentsUnifiedPage` + `useTemplateStudio` | V1 encore branchée dans Automations et génération doc legacy. V2 dans `template-studio-v2/` |
| **`template-studio-v2/`** | 🟡 AMBIGU | `SessionDetailSheet` (import seul) | `SessionDocumentsTab` importé mais **jamais rendu** dans le JSX — import mort |
| `tresorerie/` | ✅ ACTIF | `FinancesPage` | Module trésorerie |
| `ui/` | ✅ ACTIF | Partout | Design system shadcn |
| **`workflow/`** | ✅ ACTIF | `ProspectsPage` + `ApprenantDetailContent` | Composants workflow (conversion, stepper) |
| **`workflows/`** | ✅ ACTIF | `AutomationsPage` | Module workflows automatisés — **attention : doublon nominal avec `workflow/`** |

---

## Routes legacy dans `App.tsx`

| Route | Type | Commentaire |
|-------|------|-------------|
| `/pipeline` | Legacy alias | Redirigé vers Prospects (index mapping) |
| `/prospects-agenda` | Legacy alias | Redirigé vers Prospects (index mapping) |
| `/apprenants` | Legacy alias | Redirigé vers `/contacts` |
| `/facturation` | Legacy alias | Redirigé vers `/finances` |
| `/paiements` | Legacy alias | Redirigé vers `/finances` |

---

## Fichiers à import mort (importé mais jamais rendu)

| Fichier | Importé dans | Problème |
|---------|-------------|----------|
| `template-studio-v2/SessionDocumentsTab` | `SessionDetailSheet.tsx` | Import présent ligne 71, mais **aucune utilisation JSX** |

---

## Résumé des actions recommandées

### Suppression sécurisée (0 import, 0 risque)
- `src/components/financial/` — doublon de `cockpit-financier/`
- `src/components/planning/` — doublon de `planning-conduite/`
- `src/components/rapports/` — code mort
- `src/components/conventions/` — code mort
- `src/components/agent-ia/` — code mort (wrapper vide)

### Nettoyage d'import mort
- Retirer l'import inutilisé de `SessionDocumentsTab` dans `SessionDetailSheet.tsx`
- Retirer `LmsAdminPage` si aucune route ne l'utilise

### À traiter avec prudence (legacy branché)
- `template-studio/` — V1 encore utilisée dans Automations, migration vers V2 nécessaire avant suppression
- `pipeline/` — Branché dans ProspectsPage, fusionner puis supprimer le dossier
- `marketing/` — Pages flyer fonctionnelles mais isolées, décider si on conserve

### Doublon nominal à clarifier
- `workflow/` (composants métier) vs `workflows/` (page automatisations) — nommage confus, renommer possible
