# T3P Campus

CRM multi-tenant pour centres de formation de chauffeurs (Taxi, VTC, VMDTR).

**Documentation de référence : [`CLAUDE.md`](./CLAUDE.md)** — règles Lovable,
canaux de déploiement, zones sensibles, CI, dettes connues. À lire avant
toute intervention sur ce dépôt.

## Démarrage local

```sh
bun install --frozen-lockfile
bun run dev
```

`bun.lock` est le seul fichier de verrouillage. Il se met à jour sur place
(`bun add`, `bun update`) et ne se régénère jamais — pas de `package-lock.json`,
pas de `npm install`, pas de `bun.lockb`.

## Scripts

| Commande | Rôle |
|---|---|
| `bun run dev` | Serveur de développement (Vite) |
| `bun run build` | Build de production |
| `bun run test` | Tests unitaires (Vitest) |
| `bun run typecheck` | Vérification des types (`tsc --noEmit`) |
| `bun run lint` | ESLint complet (dette existante, non bloquant en CI) |
| `bun run lint:hooks` | Règle `react-hooks/rules-of-hooks` seule, **bloquante** |
| `bun run lint:ratchet` | Gel de la dette lint (`lint-baseline.json`), **bloquant** |

## Architecture — repères

- **Stack** : React 19 + Vite + TypeScript + Tailwind + shadcn/Radix.
- **Backend** : Supabase via **Lovable Cloud** (Postgres + RLS, edge
  functions Deno). Le développeur local n'a pas de compte Supabase direct :
  la base n'est accessible que via le panneau Cloud de Lovable.
- **Multi-tenant** : cloisonnement par `centre_id` — RLS active sur
  (quasi) toutes les tables métier, et par premier segment du chemin pour
  le stockage (buckets Storage).
- **Données** : hooks TanStack Query dans `src/hooks/` (un fichier par
  domaine), variantes paginées à préférer pour les listes.
- **Emails** : Resend, gabarit commun côté edge functions.
- **Paiements** : Alma.
- **Tests** : Vitest (`src/**/__tests__`), harnais dédiés pour les edge
  functions Deno critiques (stubs `Deno`/`supabase-js`/`resend`).
- **CI** : GitHub Actions bloquante sur `main` (types, tests, build, règle
  des hooks React, gel de la dette lint) — détails dans `CLAUDE.md`.

## Déploiement — 3 canaux réels

1. **Front** : bouton **Publier** dans Lovable (Share → Publish).
2. **Edge functions et migrations SQL** : outil de migration de l'agent
   Lovable — le sync GitHub ne déploie ni les migrations ni les edge
   functions.
3. **Canal de secours** (SQL collé dans l'éditeur du panneau Cloud) :
   dérogation exceptionnelle, jamais un mode normal.

Détail complet, historique et garde-fous : voir `CLAUDE.md`.
