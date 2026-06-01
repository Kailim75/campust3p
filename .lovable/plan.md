# Plan — Action groupée "Marquer comme historique SmartOF"

## Objectif
Ajouter une action de masse sécurisée sur `/requalification-contacts` pour marquer N contacts comme historique SmartOF en une opération, avec validation humaine forte, journalisation par contact, et zéro impact sur statut_apprenant / finances / docs / examens / inscriptions.

## Fichiers concernés

### Modifiés
- `src/components/requalification/RequalificationPage.tsx` — colonne checkbox, sélection globale, barre d'action quand sélection > 0, bouton "Marquer comme historique SmartOF".
- `src/hooks/useRequalificationActions.ts` — nouvelle fonction `bulkMarkAsSmartOFHistory(contactIds, comment, reason)` réutilisant la logique unitaire existante en boucle séquentielle, avec collecte d'erreurs ligne par ligne.
- `src/hooks/useRequalificationContacts.ts` — exposer comptages agrégés pour la modale (factures/paiements/docs/examens/email/tel/formation) à partir des contacts sélectionnés (calcul client à partir des données déjà chargées).

### Créés
- `src/components/requalification/BulkSmartOFDialog.tsx` — modale de confirmation :
  - KPIs de la sélection (8 compteurs demandés)
  - Liste des 10 premiers (nom + email)
  - Champ `raison` (Select avec presets + "autre")
  - Champ `commentaire` (Textarea, min 10 caractères)
  - Checkbox de confirmation textuelle obligatoire
  - Bouton désactivé tant que conditions non remplies
- `src/components/requalification/BulkResultDialog.tsx` — résultat post-exécution : succès / ignorés / erreurs détaillées + bouton "Exporter CSV".
- `src/lib/requalification/bulkSelection.ts` — helpers purs (filtrage des éligibles, agrégation des compteurs, génération CSV).

## Migration / RPC
**Aucune migration nécessaire.** Le schéma actuel suffit :
- `contacts` a déjà `is_historical_import`, `import_source`, `imported_at`, `requalification_category`, `requalification_reviewed_at`, `requalification_reviewed_by`.
- `contact_requalification_log` accepte déjà une ligne par contact.
- RLS existantes (admin/staff/super_admin + `centre_id`) couvrent l'action groupée.

**Pas de RPC** : on réutilise la mutation unitaire existante en séquentiel côté client (max 200 contacts par action). Avantage : journalisation et erreurs déjà gérées, pas de transaction partielle silencieuse. Si plus de 200 sélectionnés → bloquer avec message.

## Garde-fous
- Bouton groupé masqué si rôle ≠ admin/staff/super_admin (déjà filtré par RLS, redondance UI).
- Filtrage côté client avant envoi :
  - exclure contacts déjà `requalification_category = 'apprenant_historique_smartof'` ou `is_historical_import = true`
  - exclure contacts `deleted_at IS NOT NULL`
- Action désactivée si sélection vide après filtrage.
- Commentaire < 10 caractères → bouton désactivé.
- Checkbox de confirmation non cochée → bouton désactivé.
- `statut_apprenant` n'est **jamais** dans le payload UPDATE.
- Aucune écriture sur `session_inscriptions`, `factures`, `paiements`, `contact_documents`, `examens_t3p`.

## Risques
| Risque | Mitigation |
|---|---|
| Marquage en masse d'apprenants réellement actifs | Modale affiche compteurs business (factures/paiements/docs/examens) avant validation ; commentaire + checkbox textuelle obligatoires |
| Échec partiel (N succès, M erreurs) | Exécution séquentielle, collecte ligne par ligne, modale résultat détaillée, journal écrit avant UPDATE pour chaque contact |
| Surcharge réseau si grosse sélection | Limite dure 200 contacts/action, avec progression visible |
| Régression KPIs dashboard | `is_historical_import` exclut déjà via `apprenant-active.ts`, invalidation des queries `enriched-contacts` après action |

## Plan de rollback
1. **Logique** (par contact) : ré-ouvrir la fiche dans `/requalification-contacts`, choisir "Réintégrer dans actifs" (action existante qui repasse `is_historical_import=false` et `requalification_category=NULL`), avec nouvelle ligne de journal `action_type='rollback'`.
2. **Bulk** (futur, pas dans ce ticket) : un rollback groupé pourrait être ajouté ultérieurement, basé sur le `contact_requalification_log` (filtrer par `user_id` + plage horaire + `action_type='mark_smartof'`).
3. **Code** : revert des 3 nouveaux fichiers + diff des 3 fichiers modifiés — aucune migration à défaire.

## Tests manuels
1. Sélection 1 contact → modale affiche "1 contact", compteurs corrects, action ok.
2. Sélection 20 contacts mixtes → compteurs business exacts, liste 10 premiers affichée, action ok, 20 lignes dans `contact_requalification_log`.
3. Sélection incluant 5 contacts déjà SmartOF → ignorés silencieusement, modale dit "15 traités / 5 ignorés".
4. Utilisateur formateur (rôle non autorisé) → page inaccessible (déjà géré par route).
5. Commentaire vide ou < 10 chars → bouton "Confirmer" disabled.
6. Checkbox non cochée → bouton disabled.
7. Vérifier en base : `statut_apprenant` inchangé sur tous les contacts traités.
8. Recharger `/apprenants` → contacts traités ne sont plus dans la liste "actifs".
9. Export CSV → contient id, nom, email, statut traité/ignoré/erreur, message.

## Ordre d'implémentation
1. `bulkSelection.ts` (logique pure, testable)
2. `useRequalificationActions.ts` — ajouter `bulkMarkAsSmartOFHistory`
3. `BulkSmartOFDialog.tsx` + `BulkResultDialog.tsx`
4. `RequalificationPage.tsx` — intégration sélection + barre d'action

Aucune base de données modifiée. Aucun comportement existant cassé.
