## Lot P0/P1 — CampusT3P CRM

Objectif : sécuriser l'API, fiabiliser le dashboard, améliorer prospects/contacts/sessions, durcir la sécurité UI/logs. Changements petits, réversibles, sans refonte.

---

### A. Sync `supabase/functions/api-v1/index.ts` (sécurité API)

- Lire l'état actuel du fichier pour comparer avec le déployé.
- Réintroduire/garder :
  - `RESOURCE_CONFIG` par ressource : `hasDirectCentreId`, `hasDeletedAt`, `centreScope` (`direct` ou `via {fkColumn, parentTable}`), `defaultOrder`.
  - Helpers `applyCentreScope`, `applySoftDeleteScope`, `verifyParentBelongsToCentre`, `verifyRecordInCentre`.
  - Scoping indirect : `session_inscriptions`, `emargements` → `sessions`; `contact_documents`, `contact_historique` → `contacts`; `paiements` → `factures`.
  - Soft-delete par défaut, `?include_deleted=true` en lecture seule.
  - DELETE → soft-delete (`deleted_at`, `deleted_by` si possible) ou 405 si non soft-deletable.
  - Bloquer changement `centre_id` dans POST/PATCH.
  - Erreurs sans détails internes (logger côté serveur, message générique côté client).
- Mettre à jour `API.md` (section soft-delete, scoping indirect, `include_deleted`).
- Déployer la fonction.

### B. Dashboard hooks fiables

- `src/hooks/useDashboardActionData.ts` :
  - `prospects` : ajouter `.is("deleted_at", null)`.
  - `factures` : ajouter `.is("deleted_at", null)`.
  - `session_inscriptions` (déjà filtré, vérifier).
  - `contact_documents` : ajouter `.is("deleted_at", null)`.
  - `useUpcomingSessions` : ajouter `.is("deleted_at", null)` sur sessions et inscriptions.
- `src/hooks/useDashboardData.ts` : ajouter TODO de pagination claire sur `.limit(1000)`, vérifier filtres `deleted_at`.
- Helper `countActiveEnrollmentsBySession(inscriptions)` partagé pour éviter duplication.

### C. Prospects — priorisation visible

- `ProspectQuickFilters.tsx` : ajouter filtres `en_retard`, `aujourdhui`, `cette_semaine`, `sans_action`, `mes_leads` (si pas déjà présents).
- `ProspectsKanban.tsx` / list : afficher badge priorité + retard `next_action_at` si présent.
- Empty states contextuels selon filtre actif.
- Garder tous les flux existants (create/edit/convert/delete/quick actions).

### D. Contacts / Apprenants

- Vérifier que `ApprenantsPage.tsx` utilise bien la version paginée.
- Badge "coordonnées incomplètes" si pas de tel ni email.
- Empty state si liste vide.

### E. Sessions

- Vérifier `useSessionsList`, `useSessionEnrollments`, `useSessionInscrits` filtrent `deleted_at IS NULL`.
- Compteurs inscrits = inscriptions actives uniquement.
- Empty state si aucune session.

### F. Sécurité UI / logs

- `src/pages/MentionsLegales.tsx` : ajouter `DOMPurify.sanitize()` avant `dangerouslySetInnerHTML`.
- Créer `supabase/functions/_shared/redact.ts` avec helpers `redactEmail`, `redactPhone`, `redactToken`, `redactUrl`, `redactPayload`.
- Appliquer dans `sync-driveflow/index.ts` et `send-daily-report/index.ts` (si présent).

### G. Tests ciblés

- Test pour `countActiveEnrollmentsBySession`.
- Test pour helpers de redaction.
- Si bloqué par Rollup optionnel → documenter, ne pas supprimer.

---

### Notes

- Tous les changements respectent RLS, multi-tenant, soft-delete, et la mémoire projet.
- Pas de DELETE physique. Pas de modification de migrations.
- Pas de secrets en clair. Pas de payloads loggés.
- Si un fichier (ex. `ProspectQuickFilters.tsx`, `ApprenantsPage.tsx`) n'existe pas exactement comme décrit, je m'adapte sans inventer.

Le lot est volumineux : je l'exécute en séquence (A → B → F → C → D → E → G), en s'arrêtant si un point bloque.
