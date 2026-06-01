# Audit & Simplification du module Finances

## 1. État actuel

**Route unique** : `/finances` → `FinancesPage` (4 onglets de 1er niveau).

```
Finances (/finances)
├── Facturation (FacturationUnifiedPage)
│   ├── 4 KPI (Devis, À encaisser, Encaissé, Recouvrement)
│   ├── FacturationIntelligence (prédictif)
│   ├── FacturationAuditPanel
│   └── Sous-onglets : Factures (PaiementsPage) | Devis (DevisPage) | Par session (AnalyseParSession)
├── Trésorerie (TresoreriePage)
│   └── Dashboard | Import relevés | Rapprochement | Prévisions
├── Analyse (CockpitFinancierPage)
│   └── Vue d'ensemble | Revenus | Charges | Prévisionnel
└── Réconciliation Alma (AlmaReconciliationPage)
```

**Légendes legacy** : `legacyPaths: ["facturation","paiements"]` redirigés vers `/finances` (préservés).

**Hooks de calcul actifs** :
- `useDashboardData` → `caFacture`, `encaissements`, `resteAEncaisser`, `panierMoyen` (source de vérité Dashboard).
- `useFinancialData` / `useFinancialCockpit` → utilisés par le Cockpit (Vue, Revenus, Charges, Prévisionnel).
- `useTreasuryKPIs` → encaissements mois actuel / précédent.
- `useFactures` / `useFacturesPaginated` → totaux client-side dans `PaiementsPage` + `FacturationUnifiedPage`.
- `useSessionFinancials` → CA par session.
- `useRappelsFinancials`, `useFacturationAudit`.

## 2. Problèmes détectés (UX + cohérence)

### Doublons d'écrans
- **3 dashboards financiers concurrents** affichant des KPI similaires :
  - `FacturationUnifiedPage` (CA facturé, Encaissé, À encaisser, Recouvrement)
  - `PaiementsPage` (CA facturé, Encaissé, Reste à encaisser, Taux recouvrement)
  - `CockpitFinancierPage › VueEnsembleTab` (CA Encaissé, Charges, Résultat)
- **2 vues "Prévisionnel"** : `CockpitFinancier › Prévisionnel` et `Trésorerie › Prévisions` (objet différent mais nom confondant).
- **Encaissements** calculés à 3 endroits : `useDashboardData`, `useTreasuryKPIs`, `PaiementsPage` (client-side).

### Doublons de calcul (mêmes notions, formules divergentes)
| KPI | Lieux de calcul | Divergence |
|---|---|---|
| CA facturé | `useDashboardData` (exclut `brouillon`) ; `FacturationUnifiedPage` (inclut TOUTES factures, sans filtre statut) ; `PaiementsPage › stats.total` (exclut `brouillon`) | `FacturationUnifiedPage` peut compter `annulee` et `brouillon` dans le total |
| Encaissé | `useDashboardData` (somme `paiements`) ; `FacturationUnifiedPage` (somme `montant_total` des factures `payee`) ; `PaiementsPage › stats.paye` | `FacturationUnifiedPage` ignore les paiements partiels et compte `montant_total` au lieu de `total_paye` |
| Reste à encaisser / À encaisser | `useDashboardData.resteAEncaisser` ; `FacturationUnifiedPage.totalImpaye = totalFactures - totalPaye` ; `PaiementsPage.stats.impaye` | Idem : la formule de `FacturationUnifiedPage` est fausse en présence de partiels et d'annulées |
| Taux recouvrement | `FacturationUnifiedPage` (totalPaye / totalFactures) ; `PaiementsPage` (variante) | Bases différentes |

### UX
- 3 niveaux d'onglets imbriqués (Finances → Facturation → Factures/Devis/Sessions) → friction.
- Pas d'onglet "Pilotage" dédié : les KPI consolidés sont dispersés.
- "Devis" enterré au 3e niveau alors que c'est une entité de 1er rang.
- Charges et Prévisionnel cachés dans "Analyse".
- `FacturationAuditPanel` toujours visible (bruit hors-contexte).
- Pas de distinction visuelle claire entre statuts `brouillon` / `emise` / `partiel` / `payee` / `impayee` / `annulee` dans les KPI cards.

## 3. Règles de calcul actuelles (à figer comme contrat)

```text
Référentiel statuts factures : brouillon | emise | partiel | payee | impayee | annulee
Référentiel statuts devis    : brouillon | envoye | accepte | refuse | expire | converti
Soft delete                  : deleted_at IS NULL partout
```

**Source de vérité (useDashboardData) — à promouvoir partout** :
- `caFacture` = Σ `factures.montant_total` WHERE `statut <> 'brouillon'` AND `statut <> 'annulee'` AND `date_emission ∈ période` AND `deleted_at IS NULL`.
- `encaissements` = Σ `paiements.montant` WHERE `date_paiement ∈ période` AND `deleted_at IS NULL` (paiements liés à factures non annulées).
- `resteAEncaisser` = Σ (`montant_total - total_paye`) WHERE `statut ∈ ('emise','partiel','impayee')` AND `deleted_at IS NULL` (instantané, hors période).
- `panierMoyen` = `caFacture / inscriptionsCount` sur la période.
- `paiementsRetard` = factures `statut ∈ ('emise','partiel')` AND `date_echeance < today` AND `total_paye < montant_total`.

**Incohérences à corriger** (sans toucher la DB) :
- `FacturationUnifiedPage` : remplacer les agrégats client-side par les valeurs de `useDashboardData` (ou un sélecteur dérivé).
- `PaiementsPage.stats` : aligner la sémantique de `paye` (somme des `paiements` et non `montant_total` des factures `payee`) pour gérer les partiels correctement.

## 4. Structure cible (7 onglets, sans suppression de route)

```
/finances  (FinancesPage — refonte de la TabsList)
├── 1. Pilotage          → nouveau FinancesPilotageTab (KPI consolidés + alertes)
├── 2. Factures          → PaiementsPage (existant, KPI internes masqués au profit du Pilotage)
├── 3. Paiements         → nouvelle vue PaiementsListTab (liste des paiements purs, dérivée de useTreasuryKPIs/usePaiements)
├── 4. Devis             → DevisPage (promu au 1er niveau)
├── 5. Trésorerie        → TresoreriePage (inchangé : Dashboard / Import / Rapprochement / Prévisions)
├── 6. Charges           → CockpitFinancierPage › ChargesTab (extrait au 1er niveau)
└── 7. Prévisionnel      → CockpitFinancierPage › PrevisionnelTab (extrait au 1er niveau)
```

Sous-onglet supplémentaire conservé dans Pilotage : "Analyse par session" (`AnalyseParSession`) + "Réconciliation Alma" (`AlmaReconciliationPage`) accessibles via cartes secondaires (pas de perte de route).

**Mapping des deep-links existants (rétro-compat 100%)** :
- `?tab=factures` → onglet Factures
- `?tab=tresorerie` → onglet Trésorerie
- `?tab=analyse` → onglet Pilotage (remap)
- `?tab=alma` → onglet Pilotage > carte Alma (ou conserver tab Alma caché)
- `?tab=devis` → onglet Devis
- `?tab=charges` / `?tab=previsionnel` → nouveaux onglets dédiés
- `/facturation` et `/paiements` (legacyPaths) → inchangés.

## 5. Fichiers concernés

**Nouveaux (frontend uniquement)** :
- `src/components/finances/FinancesPilotageTab.tsx` — KPI consolidés (CA facturé, Encaissé, Reste à encaisser, Panier moyen, Recouvrement, Retards) basés sur `useDashboardData`.
- `src/components/finances/PaiementsListTab.tsx` — liste pure des paiements (filtrable, exportable), basée sur les hooks existants.
- `src/hooks/useFinancesKpis.ts` — wrapper *read-only* qui ré-expose `useDashboardData` + `useTreasuryKPIs` sous un contrat unique, pour éliminer les recalculs locaux.

**Modifiés (refonte de la TabsList + délégation des KPI)** :
- `src/components/finances/FinancesPage.tsx` — passe de 4 à 7 onglets, ajoute mapping legacy.
- `src/components/facturation/FacturationUnifiedPage.tsx` — supprime ses propres agrégats, consomme `useFinancesKpis`. (Conservé pour rétro-compat si utilisé ailleurs.)
- `src/components/paiements/PaiementsPage.tsx` — corrige `stats.paye` (somme des paiements), masque ses KPI quand monté depuis `FinancesPilotageTab` (prop `embedded`).
- `src/components/cockpit-financier/CockpitFinancierPage.tsx` — devient un conteneur léger pour Vue/Revenus, conserve les sous-onglets mais Charges & Prévisionnel sont aussi exposés au 1er niveau.

**Inchangés** :
- Toutes les routes (`/finances`, legacyPaths).
- `useDashboardData`, `useFinancialData`, `useTreasuryKPIs`, `useFactures`, `useSessionFinancials`.
- DB, RLS, edge functions, exports (FEC, CSV, PDF, Factur-X, PDP).
- Composants de génération de factures et signatures.

## 6. Garde-fous (contrat de non-régression)

- Aucune écriture DB ; aucune migration.
- Aucune route supprimée ; tous les deep-links répondent.
- `statut = 'annulee'` jamais compté dans `caFacture` ou `encaissements`.
- `statut = 'brouillon'` jamais compté dans le CA actif (déjà géré dans `useDashboardData`, à propager).
- Distinction stricte facturé vs encaissé conservée dans toutes les cards.
- Partiels = `total_paye > 0 AND total_paye < montant_total`, jamais agrégés comme `payee`.
- Exports (FEC, CSV, PDP, Factur-X) inchangés.

## 7. Risques

| Risque | Probabilité | Mitigation |
|---|---|---|
| Régression deep-link sur ancien onglet | Moyenne | Table de mapping explicite + tests manuels |
| Cards Pilotage = chiffres ≠ Dashboard | Moyenne | Source unique `useFinancesKpis` |
| `PaiementsPage` cassé par prop `embedded` | Faible | Prop optionnelle, défaut = comportement actuel |
| Charges/Prévisionnel cassés par double-montage | Faible | Composants déjà autonomes, contexte de date partagé via prop `range` |
| Confusion utilisateur durant la transition | Moyenne | Conserver intitulés FR familiers, sous-titres descriptifs |

## 8. Plan de rollback

- Refonte 100% frontend, isolée dans `FinancesPage.tsx` + 2 nouveaux fichiers.
- 1 commit unique → rollback = revert.
- Aucune migration DB → aucune action côté backend.
- Drapeau optionnel `VITE_FINANCES_V2=true` pour déploiement progressif (fallback = ancien 4-onglets).

## 9. Tests à effectuer

1. `/finances` ouvre l'onglet **Pilotage** par défaut.
2. Les 6 KPI du Pilotage = valeurs du Dashboard pour la même période.
3. `/finances?tab=factures` ouvre Factures, `?tab=tresorerie` Trésorerie, `?tab=analyse` Pilotage (remap), `?tab=alma` accessible.
4. `/facturation` et `/paiements` (legacyPaths) redirigent vers `/finances` sans 404.
5. Onglet Factures : créer / éditer / annuler une facture fonctionne (aucune régression sur `PaiementsPage`).
6. Onglet Devis : créer / convertir un devis fonctionne (aucune régression sur `DevisPage`).
7. Trésorerie : Import, Rapprochement, Prévisions chargent et affichent les mêmes données qu'avant.
8. Charges : ajout / édition / suppression de charge fonctionne.
9. Prévisionnel : projections affichées identiques à l'ancien onglet Analyse > Prévisionnel.
10. Une facture `annulee` n'apparaît dans aucun KPI (CA, encaissé, reste à encaisser).
11. Une facture `partiel` (ex: 1000€ total, 400€ payés) apparaît : CA facturé +1000€, Encaissé +400€, Reste à encaisser +600€.
12. Exports FEC, CSV factures, PDF facture, Factur-X, PDP : tous fonctionnels et identiques.
13. Mobile 375px : les 7 onglets scrollent horizontalement, aucun overflow.
14. Bandeau Alma sandbox toujours visible en mode test.

---

**N'applique rien tant que ce plan n'est pas validé.**
