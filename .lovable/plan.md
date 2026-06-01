
# Harmonisation KPI apprenants actifs — exclusion SmartOF

## Objectif
Centraliser la règle "apprenant opérationnellement actif" dans un seul helper et refactoriser tous les hooks/composants KPI pour l'utiliser, **sans toucher aux données** ni à `statut_apprenant`. Les SmartOF restent visibles partout (recherche, fiche, requalification, exports historiques).

## Nouvelle règle centralisée

Fichier : `src/lib/apprenant-active.ts`

```ts
estOperationnellementActif(contact, options?: { inclureHistorique?: boolean })
```

Un contact est **opérationnellement actif** si TOUTES ces conditions sont réunies :
- `deleted_at` est `null`
- `archived === false`
- `is_historical_import !== true` ET `requalification_category !== 'apprenant_historique_smartof'`  
  (sauf si `options.inclureHistorique === true`)
- `statut_apprenant` n'est pas `diplome` / `abandon` / `archive`
- **ET** au moins une de ces deux conditions :
  - a une inscription session active (`session_inscriptions.statut = 'inscrit'`, `deleted_at IS NULL`)
  - OU `statut` ∈ { `En formation théorique`, `En formation pratique`, `Examen pratique programmé` }

**Important** : `Client` seul n'est PAS considéré comme actif opérationnel.

Helpers exportés complémentaires :
- `estHistoriqueSmartOF(contact)` (déjà existant sous `isHistoricalImport`, on garde alias)
- `estTermine(contact)` (déjà existant `isTerminated`)

## Fichiers modifiés (frontend uniquement, aucune migration SQL)

### Helper
1. `src/lib/apprenant-active.ts` — ajout de `estOperationnellementActif` + type `EstActifOptions`. Conserve les helpers existants (rétrocompatibilité).

### Hooks / composants KPI refactorés
2. `src/components/dashboard/DashboardKPIRow.tsx`  
   Remplace `c.statut === "En formation théorique" || c.statut === "En formation pratique"` par `estOperationnellementActif(c)`. Ajoute `is_historical_import, requalification_category, deleted_at, statut_apprenant` au SELECT. Joint inscriptions actives.

3. `src/hooks/useDashboardStats.ts` — idem.
4. `src/hooks/useDashboardDynamicStats.ts` — filtre les listes contacts via helper avant comptage statut.
5. `src/hooks/useDashboardHealthScore.ts` — exclut SmartOF du score.
6. `src/hooks/useContacts.ts` (`useContactsStats`) — KPI stats exclut SmartOF par défaut.
7. `src/hooks/useEnrichedContacts.ts` — ajoute champ `estActifOperationnel` calculé ; ne filtre pas (la liste reste complète, masquage côté UI via toggle).
8. `src/hooks/usePeriodComparison.ts` — exclut SmartOF des comparaisons.
9. `src/components/dashboard/StrategicPillars.tsx` — exclut SmartOF.
10. `src/components/aujourdhui/useAujourdhuiData.ts` — `isContactActive` délègue au helper.
11. `src/hooks/useDashboardData.ts` — si concerné, idem.

### UI — masquage par défaut + filtre
12. `src/components/contacts/ContactsTable.tsx` (liste Apprenants) — masque SmartOF par défaut, ajoute toggle "Inclure historiques SmartOF" (badge compteur).

### Tooltips
13. Ajout d'un `<Tooltip>` sur les cartes "Apprenants actifs" (DashboardKPIRow + StrategicPillars + Aujourd'hui) :  
    *"Les apprenants historiques importés de SmartOF sont exclus des actifs opérationnels."*

### Tests
14. `src/lib/__tests__/apprenant-active.test.ts` (nouveau) couvrant les 8 cas listés mission §6.

## Zones NON modifiées (SmartOF reste visible)
- Recherche globale (`GlobalSearch`, etc.)
- Fiche contact (`ContactDetailPage`, drawers)
- Page requalification (`RequalificationPage`)
- Exports historiques (passeront `inclureHistorique: true`)
- Aucune modification DB, aucune modification de `statut_apprenant`, aucune écriture

## Anciens calculs remplacés (résumé)

| Fichier | Ancien | Nouveau |
|---|---|---|
| DashboardKPIRow | filter sur `statut` 2 valeurs | `estOperationnellementActif` |
| useDashboardStats | filter inline `statut` | helper |
| useDashboardDynamicStats | total = tous non-archivés | total opérationnel via helper |
| useDashboardHealthScore | comptage brut | exclut SmartOF |
| useContactsStats | comptage brut | exclut SmartOF |
| useAujourdhuiData.isContactActive | heuristique `updated_at ≤ 30j` | helper strict |
| StrategicPillars | filter `statut` | helper |
| usePeriodComparison | comptage brut | exclut SmartOF |

## Risques
- **Chute visuelle des KPI** : "Apprenants actifs" passera de N à N - (~365 SmartOF + clients sans inscription). C'est volontaire mais à communiquer. Tooltip ajouté.
- **Régression liste Apprenants** : masquage par défaut peut surprendre. Toggle visible + compteur "X historiques masqués".
- **Performances** : besoin de joindre `session_inscriptions` dans les hooks dashboard. Mitigation : 1 seule requête `select id, session_id` filtrée `statut='inscrit'`, Set côté JS.
- **Aujourd'hui** : `isContactActive` actuel est plus laxiste (`updated_at`). Certains contacts récemment touchés mais sans inscription disparaîtront → conforme à la spec.

## Plan de rollback
- Pas de migration → rollback = revert des fichiers TS listés ci-dessus.
- Helper conserve les anciennes fonctions (`isActiveApprenant`, `getActiveReasons`) → aucun appelant cassé pendant la transition.
- Toggle "Inclure historiques" permet un rollback visuel immédiat pour les utilisateurs.

## Tests à exécuter (mission §6)
Unitaires (`apprenant-active.test.ts`) :
1. Actif + inscription active → `true`
2. SmartOF historique → `false`
3. Archived → `false`
4. deleted_at non null → `false`
5. statut_apprenant=diplome → `false`
6. statut_apprenant=abandon → `false`
7. Client sans inscription → `false`
8. "En formation théorique" sans inscription → `true` (statut métier de parcours)
9. SmartOF + `{ inclureHistorique: true }` → `true` si reste actif

Manuels :
- Recherche globale retourne SmartOF ✓
- Fiche contact SmartOF accessible ✓
- Page requalification liste SmartOF ✓
- `statut_apprenant` en DB inchangé (vérif SQL `select count` avant/après) ✓
- KPI Dashboard "Apprenants actifs" diminue du nombre attendu ✓
- Toggle liste Apprenants ré-affiche SmartOF ✓

## Migration nécessaire ?
**Non.** Aucune SQL, aucune RPC. 100% frontend.

---

Validez ce plan pour que j'applique les modifications.
