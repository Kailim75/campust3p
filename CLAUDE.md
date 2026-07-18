# CLAUDE.md — T3P Campus

CRM multi-tenant pour centres de formation de chauffeurs (Taxi, VTC, VMDTR).
Stack : React 18 + Vite + TypeScript + Tailwind + shadcn/Radix, Supabase
via **Lovable Cloud** (Postgres + RLS par `centre_id`, edge functions Deno),
emails Resend, paiements Alma. **Repo synchronisé avec Lovable** — voir
« Règles Lovable ».

## Règles Lovable (impératives)

- Ne jamais restructurer l'arborescence, renommer des dossiers, ni changer
  la stack ou l'outillage de build (Vite, Tailwind, ESLint, configs TS).
- Ne jamais travailler en parallèle d'une session d'édition Lovable active.
- Petits commits réversibles, un lot à la fois, PR relue avant merge.
- **Le sync GitHub ne déploie PAS les edge functions** : après un merge qui
  modifie `supabase/functions/`, demander à l'agent Lovable de redéployer
  (« Redéploie X — le code est à jour dans le repo, ne modifie aucun
  fichier »).
- **Les migrations du repo ne s'appliquent PAS automatiquement**, et
  l'éditeur SQL du panneau Cloud refuse le DDL (« Request cancelled »).
  Tout changement de schéma passe par l'agent Lovable (qui crée et applique
  la migration). Les SELECT et `cron.schedule` passent, eux, par l'éditeur
  SQL du panneau Cloud.
- Le développeur local n'a PAS de compte Supabase : la base n'est
  accessible que via le panneau Cloud de Lovable (app desktop ou web).

## Zones sensibles — NE PAS TOUCHER sans accord explicite

- **Flux de signature électronique** (`SignaturePage`,
  `public-sign-document`, `resolve-signing-token`, `send-signature-email`) :
  correctif 401 sur les lots de documents suivi côté Lovable.
- **Trigger `trg_lock_signed_signature_request`** sur `signature_requests` :
  gèle les demandes signées. Aucune migration ne doit le désactiver.
  Corollaire : tout batch qui modifie `signature_requests` ne doit cibler
  que des lignes non signées (voir `signature-reminders`).
- **Policies RLS durcies** : bucket `crm-email-attachments`, table
  `template_audit_log`. Ne pas élargir.
- Les ~150 warnings SECURITY DEFINER sont **différés volontairement** : ne
  pas « corriger » en masse.
- `leads` n'a pas de `centre_id` : décision produit en attente — ne pas
  « corriger ».

## Architecture — repères

- Navigation : registre central `src/config/navigationRegistry.ts` +
  switch dans `src/pages/Index.tsx` + routes `APP_SECTION_PATHS` dans
  `src/App.tsx`. Une nouvelle page = entrée registre + case Index + path
  App ; le test `src/config/__tests__/navigationRegistry.test.ts` verrouille
  la cohérence.
- Données : hooks TanStack Query dans `src/hooks/` (un fichier par domaine).
  Préférer les variantes paginées (`useContactsPaginated`,
  `useFacturesPaginated`) et les selects de colonnes ciblées.
- Multi-tenant : `centre_id` sur presque toutes les tables, RLS active.
  Création d'enregistrement : passer par `getUserCentreId()`
  (`src/utils/getCentreId.ts`). **Un 2ᵉ centre est prévu** : check-list
  d'onboarding dans `AMELIORATIONS.md` (en-tête, décisions du 11/07/2026).
- Suppression : soft-delete via RPC `soft_delete_record` (+ Corbeille) pour
  les tables métier ; jamais de DELETE direct.
- Documents PDF : DEUX générateurs (front `src/lib/pdf-generator.ts`,
  edge `supabase/functions/_shared/pdf-generator.ts`). Toute évolution de
  contenu documentaire doit être reportée dans les deux.
- Docs CMA : source de vérité `src/lib/cma-constants.ts` (types de pièces +
  alias). Statut administratif : colonne enum `contacts.statut_cma`, seule
  source de vérité (pas de string-matching sur les libellés).
- Emails transactionnels : gabarit commun
  `supabase/functions/_shared/email-template.ts`, traçage systématique dans
  `email_logs` (avec `metadata` pour la déduplication).

## Base de données

- Migrations dans `supabase/migrations/`. La base en ligne peut différer
  (jobs créés au dashboard, index…) : pour tout ce qui dépend du runtime,
  vérifier par SELECT avant d'affirmer.
- **Jobs planifiés : référence versionnée dans `supabase/CRON_JOBS.md`**
  (9 jobs pg_cron). Tout nouveau job : `cron.schedule` via l'éditeur SQL
  (idempotent sur le nom) + mise à jour de ce fichier.
- Enums existants à réutiliser : `session_status`, `statut_cma`,
  `prospect_status`, `statut_apprenant`… — pas de nouveaux statuts en texte
  libre.
- **Motif initplan RLS (18/07/2026)** : TOUTES les policies du schéma
  public (sauf `template_audit_log`, durcie et exclue volontairement)
  enveloppent les appels indépendants de la ligne en `(SELECT fn())`
  (has_role, is_admin_or_staff, is_super_admin…) — requête max mesurée
  3,8 s → 0,8 s. Toute NOUVELLE policy doit suivre ce motif ; les
  fonctions à argument de ligne (`has_centre_access(centre_id)`…) restent
  sans enveloppe. Migrations : `20260717224714…` (10 tables chaudes,
  explicite) puis `20260718120550…` (reste du schéma, programmatique et
  idempotente, avec assertion sur le total de policies).
- Dette connue : plusieurs états métier vivent encore dans des notes
  `[AUTO]` de `contact_historique` parsées par regex (chantier §5.1 du
  rapport `AMELIORATIONS.md`).

## Vérifications avant de conclure « ça marche »

- `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`
- `./node_modules/.bin/vitest run` (59+ tests, dont cohérence navigation)
- `node node_modules/vite/bin/vite.js build`
- Lockfile de référence : **`bun.lock`** (`bun install --frozen-lockfile`).
  Le `package-lock.json` est désynchronisé — ne pas s'y fier.
- Pour les envois d'emails : modes `dryRun` des fonctions cron
  (`send-convocation-cron`, `signature-reminders` acceptent
  `?dryRun=true`).

## Dettes connues (ne pas redécouvrir)

- `jspdf` et `vitest` à mettre à jour.
- Chemins encore mono-centre (à corriger avant l'ouverture du 2ᵉ centre) :
  `send-automated-emails` (bulk, `centre_formation` limit(1)),
  `send-signature-email` et `signature-reminders` (FROM en dur),
  génération PDF côté front (`useCentreFormation`).
- Historique complet des analyses et améliorations : `AMELIORATIONS.md`
  (lots 1 à 4 réalisés en juillet 2026, PR #3 à #6).
