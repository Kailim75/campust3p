# Plan — Requalification contacts & préservation historique SmartOF

Mode : sécurisation CRM, **aucune** action automatique, validation humaine requise pour chaque contact.

---

## 1. État des lieux (lecture base)

Aucun champ existant ne permet d'identifier un import SmartOF :

- `source` : 27 valeurs libres non normalisées, **aucune** valeur "smartof".
- `origine` (enum `contact_origin`) : 633/634 à NULL, enum = {site_web, bouche_a_oreille, partenaire, reseaux_sociaux, publicite, salon, autre} — pas de valeur "import" ni "smartof".
- `precisions`, `commentaires` : texte libre, non fiable.
- Aucune table `tags`, `imports`, `requalification`, `reviews`, `smartof`.
- Pas de colonne `import_source`, `imported_at`, `is_historical_import`, `metadata`, `created_by`.

**Conclusion :** il faut créer une infrastructure dédiée. Pas de champ existant exploitable de façon fiable.

---

## 2. Solution recommandée (non destructive)

### 2.1 Schéma — nouvelle migration

1. **Colonnes ajoutées à `contacts`** (toutes nullable, valeurs par défaut neutres) :
   - `is_historical_import boolean NOT NULL DEFAULT false`
   - `import_source text` (libre, ex : `'smartof'`, `'csv_2024'`)
   - `imported_at timestamptz`
   - `requalification_category text` — valeurs autorisées via CHECK :
     - `apprenant_historique_smartof`
     - `apprenant_actif_reel`
     - `ancien_apprenant_a_archiver`
     - `ancien_apprenant_diplome`
     - `fiche_incomplete`
     - `anomalie_a_verifier`
     - `accompagnement_pratique_en_cours`
     - `non_classe` (défaut implicite via NULL)
   - `requalification_reviewed_at timestamptz`
   - `requalification_reviewed_by uuid`

2. **Nouvelle table `contact_requalification_log`** (journal d'audit immuable) :
   - `id`, `contact_id`, `centre_id`
   - `previous_category`, `new_category`
   - `previous_statut_apprenant`, `new_statut_apprenant`
   - `recommended_category` (snapshot de la suggestion moteur)
   - `is_smartof_source boolean`
   - `user_id`, `user_email`, `created_at`
   - `comment text NOT NULL` (commentaire obligatoire)
   - `reason text NOT NULL`
   - `action_type text` (mark_smartof, exclude_kpi, archive, mark_diplome, attach_session, create_inscription, add_note, create_task)
   - GRANT + RLS scopée par `centre_id` (admin/staff), formateur exclu.

3. **Index** : `contacts(is_historical_import)`, `contacts(requalification_category)`, `contact_requalification_log(contact_id, created_at)`.

4. **Aucune migration de données** : tous les contacts existants restent `is_historical_import=false`, `requalification_category=NULL`. Le marquage SmartOF se fera **manuellement** depuis l'UI (ou via un script CSV validé plus tard).

### 2.2 Impact KPI (frontend uniquement, pas de trigger)

Les helpers d'activité (`isActiveApprenant`, `getActiveReasons` dans `src/lib/apprenant-active.ts`) sont étendus :

- si `is_historical_import = true` OU `requalification_category = 'apprenant_historique_smartof'` → renvoyé comme **inactif** quel que soit `statut_apprenant`.
- les compteurs Actifs/Inactifs/Terminés et le dashboard utiliseront ce filtre.
- `statut_apprenant` n'est **jamais** modifié automatiquement (préservation Qualiopi).

---

## 3. Fichiers concernés

### 3.1 Nouveaux fichiers

- `supabase/migrations/<ts>_smartof_requalification.sql` — colonnes + table log + RLS + GRANT.
- `src/components/requalification/RequalificationPage.tsx` — page principale `/admin/requalification-contacts`.
- `src/components/requalification/RequalificationFilters.tsx` — filtres (SmartOF, sans inscription, formation, facture/paiement/document/examen, sans preuve, à vérifier).
- `src/components/requalification/RequalificationCategoryBadge.tsx`
- `src/components/requalification/RequalificationActionDialog.tsx` — dialogue d'action (commentaire + raison obligatoires).
- `src/components/requalification/RequalificationKPIs.tsx` — bandeau de KPI dédié.
- `src/hooks/useRequalificationContacts.ts` — fetch enrichi (jointures session_inscriptions, factures, paiements, documents, examens) + classification suggérée.
- `src/hooks/useRequalificationActions.ts` — wrappers d'écriture (toujours via log + update ciblé d'un seul contact).
- `src/lib/requalification/classifier.ts` — moteur de **suggestion** (renvoie une catégorie recommandée + niveau de confiance, ne modifie rien).
- `src/lib/requalification/categories.ts` — constantes + labels FR.

### 3.2 Fichiers modifiés

- `src/lib/apprenant-active.ts` — étendre `ActiveInput` avec `is_historical_import` + `requalification_category`, exclure du calcul actif.
- `src/hooks/useEnrichedContacts.ts` — sélectionner les nouvelles colonnes.
- `src/hooks/useContacts.ts` — id.
- `src/integrations/supabase/types.ts` — auto-régénéré post-migration.
- `src/config/navigationRegistry.ts` — entrée `/admin/requalification-contacts` (admin + super_admin).
- `src/pages/Index.tsx` — lazy route.
- `src/components/dashboard/*` (ciblé, à confirmer après lecture) — bloc KPI distinguant : Apprenants actifs réels / Historique SmartOF / À requalifier / Fiches incomplètes / Anomalies / À rattacher.
- `src/components/apprenants/ApprenantsToolbar.tsx` — filtre "Masquer historique SmartOF" (par défaut **on**).

### 3.3 Tables existantes utilisées (lecture seule pour classifier)

`contacts`, `session_inscriptions`, `sessions`, `factures`, `paiements`, `contact_documents`, `examens_t3p`, `fiches_pratique`.

---

## 4. Actions manuelles disponibles dans l'UI

Chaque action écrit une ligne dans `contact_requalification_log` **avant** la mise à jour du contact, dans une transaction (RPC) :

| Action | Effet sur `contacts` | Effet sur autres tables |
|---|---|---|
| A. Marquer historique SmartOF | `is_historical_import=true`, `import_source='smartof'`, `requalification_category='apprenant_historique_smartof'` | aucun |
| B. Sortir des KPI actifs | `is_historical_import=true` uniquement | aucun |
| C. Archiver ancien apprenant | `requalification_category='ancien_apprenant_a_archiver'`, `archived=true` | aucun |
| D. Marquer diplômé (avec preuve) | `statut_apprenant='diplome'`, `requalification_category='ancien_apprenant_diplome'` | aucun — preuve doc référencée en commentaire |
| E. Rattacher à session historique | aucun direct | insertion `session_inscriptions` (statut historique) **après dialog de confirmation** |
| F. Nouvelle inscription | aucun direct | redirige vers flow d'inscription existant |
| G. Note administrative | aucun | log seul (commentaire) |
| H. Tâche de vérification | aucun | création `rappels` existante |

Aucune action n'est groupée/bulk dans la V1 — un contact à la fois.

---

## 5. Risques

1. **Mauvais marquage SmartOF** → contact retiré à tort des KPI. Mitigation : action réversible via la même UI (catégorie `non_classe`), log conservé.
2. **Faux diplômés** → impact Qualiopi. Mitigation : commentaire + raison obligatoires, action D ne suggère jamais automatiquement, exige une mention de preuve.
3. **Régression KPI dashboard** : modifier le compteur actifs peut surprendre. Mitigation : toggle "Inclure historique SmartOF" dans la toolbar + libellé KPI explicite.
4. **CHECK constraint sur enum textuel** : utiliser CHECK (pas enum Postgres) pour permettre extensions futures sans `ALTER TYPE`.
5. **Volume** : 365 contacts à traiter — la page doit paginer/virtualiser.

---

## 6. Plan de rollback

1. **Rollback données** (par contact) : ré-exécuter l'action inverse via l'UI — historisé dans le log. Aucune perte.
2. **Rollback structure** (migration) :
   ```sql
   DROP TABLE IF EXISTS public.contact_requalification_log;
   ALTER TABLE public.contacts
     DROP COLUMN IF EXISTS is_historical_import,
     DROP COLUMN IF EXISTS import_source,
     DROP COLUMN IF EXISTS imported_at,
     DROP COLUMN IF EXISTS requalification_category,
     DROP COLUMN IF EXISTS requalification_reviewed_at,
     DROP COLUMN IF EXISTS requalification_reviewed_by;
   ```
3. **Rollback front** : retirer route + lien navigation + revert `apprenant-active.ts`. Aucun autre fichier business touché.

---

## 7. Tests à effectuer

### 7.1 Base
- Migration appliquée, aucune ligne `contacts` modifiée (`COUNT(*) WHERE is_historical_import=true` = 0 juste après).
- Insertion d'une ligne log impossible sans `comment` et `reason` (NOT NULL).
- RLS : un user d'un autre centre ne voit pas les logs d'un autre centre.

### 7.2 UI Requalification
- Page accessible uniquement à admin/super_admin.
- Filtres combinables : SmartOF + sans inscription + VTC → résultat cohérent.
- Action A sur contact X → log créé, contact mis à jour, recompte KPI tableau Apprenants : -1 actif.
- Action B réversible : repasser `is_historical_import=false` recrée une ligne log et restaure le KPI.
- Action D refusée si commentaire vide.
- Action E (rattacher session) demande confirmation explicite, n'apparaît pas dans le flow sans validation.

### 7.3 KPI dashboard
- Toggle "Inclure historique SmartOF" off (défaut) → KPI Actifs cohérent avec page Apprenants.
- Toggle on → équivalent au comportement actuel.
- Compteurs distincts visibles : Actifs réels / Historique SmartOF / À requalifier / Fiches incomplètes / Anomalies.

### 7.4 Non-régression
- Page Contacts/Apprenants : tri, recherche, filtres existants OK.
- Création/édition contact : pas de champ obligatoire nouveau côté formulaire utilisateur final.
- Anti-doublon actif (livraison précédente) toujours fonctionnel.

---

## 8. Suite

Aucun fichier n'est modifié à ce stade. En attente de **validation** pour :
1. lancer la migration (étape 2.1) ;
2. puis générer la page + hooks + KPI ;
3. enfin proposer (séparément, si tu valides) un script CSV de marquage en masse pour les contacts identifiés comme SmartOF d'après une liste que tu fourniras.
