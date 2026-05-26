# Plan — Passage du CRM à 9.5/10

Objectif : combler l'axe au meilleur ROI identifié dans l'audit — **onboarding utilisateur + aide contextuelle in-app**, sans toucher au métier ni à la sécurité.

## Ce qu'on va livrer

### 1. Tour guidé interactif (Product Tour)
Un onboarding au premier login qui présente les 6 zones critiques du CRM :
- Aujourd'hui (inbox d'actions)
- Prospects → Conversion
- Sessions & inscriptions
- Documents & signatures
- Finances & encaissements
- IA Director

Caractéristiques :
- Skippable + reprenable depuis le menu profil
- Progression sauvegardée par utilisateur (table `user_onboarding_progress`)
- Tooltips ancrés sur les vrais éléments UI (data-tour attributes)
- 1 tour global + tours contextuels par module (déclenchés au 1er accès)

### 2. Centre d'aide contextuel
Bouton "?" flottant en bas à droite qui ouvre un panneau latéral avec :
- Articles d'aide filtrés selon la route active (ex: sur `/sessions`, suggère les articles sessions)
- Recherche full-text
- Mini-vidéos (placeholders, à enregistrer plus tard)
- Lien "Contacter le support"

Articles initiaux (~15) couvrant : conversion prospect, génération doc, signature, clôture session Qualiopi, encaissement, relances.

### 3. HintBubbles intelligents
Réactivation et extension du composant `HintBubble` existant :
- Apparition contextuelle sur les écrans complexes (cockpit financier, template studio, IA Director)
- Dismissible définitivement par utilisateur (localStorage + DB)
- Niveau "débutant" / "expert" auto-déterminé selon l'ancienneté du compte

### 4. Page "Mémo & raccourcis"
Nouvelle route `/aide` listant :
- Tous les raccourcis clavier
- Le glossaire métier (CMA, Carte Pro, Contrat vs Convention, etc.)
- Les workflows-types illustrés
- Liens vers la doc Qualiopi

## Architecture technique

```text
src/components/onboarding/
  ├── ProductTour.tsx              (lib: driver.js, déjà compatible)
  ├── TourSteps.ts                 (définition des étapes par module)
  ├── OnboardingProvider.tsx       (context global)
  └── ResumeTourButton.tsx

src/components/help/
  ├── HelpCenterDrawer.tsx         (panneau latéral)
  ├── HelpArticleViewer.tsx        (markdown renderer)
  ├── HelpFloatingButton.tsx       (bouton flottant)
  ├── articles/                    (markdown)
  │   ├── prospect-conversion.md
  │   ├── session-closure.md
  │   └── ...
  └── useContextualHelp.ts         (matching route → articles)

src/pages/Aide.tsx                 (mémo & raccourcis)
```

Base de données (1 migration) :
- `user_onboarding_progress (user_id, tour_id, completed_at, skipped, dismissed_hints jsonb)`
- RLS : user lit/écrit uniquement ses lignes
- GRANTs standards

Dépendance ajoutée : `driver.js` (léger, ~10kb, sans tracker).

## Hors scope (axes restants pour viser 10/10)
- Tests E2E Playwright (parcours signature + génération doc)
- Reporting PDF client exportable
- Refonte responsive complète des cockpits financiers

Ces 3 chantiers peuvent être traités ensuite, par lots indépendants.

## Estimation impact
- Onboarding : 6→9 (+3)
- Documentation : 5→8 (+3)
- Note globale projetée : **9.5/10**
