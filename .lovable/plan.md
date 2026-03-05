

## Analyse : votre migration n'est pas compatible avec ce projet

Votre SQL fait référence à `org_id` et `get_user_org_id()` — **ces concepts n'existent pas dans T3P Campus**. Le projet utilise un modèle multi-tenant basé sur `centre_id` (pas `org_id`), avec les fonctions `get_user_centre_id()` et `has_centre_access()`.

### État actuel de la table `prospects`

| Élément | Statut |
|---------|--------|
| Colonne `centre_id` | ✅ Existe déjà (uuid, nullable) |
| Colonne `org_id` | ❌ N'existe pas |
| Fonction `get_user_org_id()` | ❌ N'existe pas |
| Trigger `trg_auto_set_prospect_centre_id` | ✅ Existe déjà (auto-remplit `centre_id` via `user_centres`) |
| RLS | ✅ Activé — policies `admin` et `staff` via `has_role()` |

### Ce qui est déjà en place (équivalent exact de votre demande)

1. **`centre_id`** sur `prospects` = votre `org_id`
2. **Trigger `trg_auto_set_prospect_centre_id`** = votre `trg_set_prospect_org_id` — remplit automatiquement `centre_id` à l'insertion
3. **RLS** — accès admin/staff déjà configuré

### Ce qui pourrait être amélioré

Les policies actuelles filtrent par **rôle** (`admin`/`staff`) mais pas par **centre**. Un admin peut voir les prospects de tous les centres. Si vous souhaitez un **isolement strict par centre**, les policies devraient inclure un filtre `centre_id = get_user_centre_id()` en plus du rôle, ou utiliser `has_centre_access(centre_id)`.

### Plan proposé

**Renforcer les RLS prospects avec isolation par centre** (si souhaité) :

1. Remplacer les 2 policies existantes par des policies combinant rôle + centre :
   - `admin`/`staff` : `has_role(auth.uid(), 'admin') AND has_centre_access(prospects.centre_id)` (les super_admins passent via `has_centre_access` qui inclut `is_super_admin()`)
   - Conserver le trigger existant pour auto-remplir `centre_id`

2. Aucune création de colonne `org_id` ni de fonction `get_user_org_id()` — utiliser l'infrastructure existante.

**Aucun changement de code applicatif requis** — les hooks (`useProspects`, etc.) fonctionnent déjà sans filtre client-side car le RLS s'en charge.

