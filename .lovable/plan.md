## Phase 1 — Sécurité critique

### 1. Sécuriser les credentials
- ⚠️ `.gitignore` est en lecture seule (géré par Lovable) — `.env` est déjà auto-généré et non versionné
- Créer `.env.example` avec des placeholders
- `client.ts` est auto-généré — ne pas modifier

### 2. Activer JWT sur les Edge Functions
- Mettre `verify_jwt = true` dans `config.toml` pour toutes les fonctions sauf `incoming-webhook` et `public-sign-document`
- ⚠️ Note : le système Lovable Cloud déploie les fonctions avec `verify_jwt = false` par défaut car la validation JWT se fait en code via `getClaims()`. Changer cela pourrait casser les appels existants. **Recommandation : vérifier que chaque fonction valide déjà le JWT en code avant de changer le config.**

### 3. Audit RLS
- Lancer le linter Supabase pour identifier les politiques `USING(true)` réelles
- Créer une migration ciblée (les tables critiques utilisent déjà `has_centre_access()`)

### 4. Renforcer ProtectedRoute
- Ajouter timeout 5s + splash screen

### 5. Documentation mot de passe compromis
- Ajouter note dans README

## Phase 2 — UX/UI

### 6-9. QualitéClient, PDFs, Pagination, Mobile
- Chacun est un chantier significatif — à traiter un par un

### 10. Refactoriser useSessions
- Découper en hooks spécialisés

## Phase 3 — Qualité
### 11-13. EmptyStates, Skeletons, Accessibilité
- Amélioration incrémentale

---

**⚠️ Réaliste :** Ce plan représente ~20-30 modifications de fichiers. Je propose de commencer par les items **2, 4, 5, 10** (faisables immédiatement) et l'audit RLS (item 3). Les items 6-9 et 11-13 nécessiteront des passes séparées.
