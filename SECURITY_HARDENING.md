# 🔐 Security Hardening — Sprint 1

Branche : `security-hardening`
Date : 18 avril 2026

Ce document liste les changements automatiques effectués et les **actions manuelles restantes**.

---

## ✅ Changements automatiques (dans cette PR)

### 1. `index.html` — Viewport + headers de sécurité
- Retiré `user-scalable=no` et `maximum-scale=1.0` (accessibilité WCAG 1.4.4)
- Ajouté `X-Content-Type-Options: nosniff`
- Ajouté `Referrer-Policy: strict-origin-when-cross-origin`
- Ajouté `Permissions-Policy` (désactive camera, mic, geolocation, payment)

### 2. `vite.config.ts` — Code-splitting
Ajout de `manualChunks` pour séparer les vendors lourds (Radix, charts, PDF, xlsx, Supabase, forms, framer-motion).
→ Le bundle initial sera significativement plus léger.

### 3. `.gitignore`
Ajout de `.env.local`, `.env.*.local`, `.env.staging`, `.env.production`, `supabase/.temp`.
**Note :** `.env` reste tracké car il ne contient que des `VITE_*` publiques (anon key + URL, déjà inlinées dans le bundle final). Lovable s'en sert.

### 4. `supabase/config.toml` — `verify_jwt` sélectif
- **Public (verify_jwt = false)** — nécessaire :
  - `alma-webhook`, `incoming-webhook`, `public-sign-document`, `sync-gmail-inbox`
  - Crons : `send-automated-emails`, `send-exam-reminders`, `send-daily-report`, `generate-notifications`
- **Protégé (verify_jwt = true)** — 21 fonctions user-facing sécurisées :
  - `create-user`, `delete-user`, `list-users`, `ai-assistant`, `execute-workflow`,
  - `send-signature-email`, `send-enquete-email`, `alma-payment`,
  - `prospect-scoring`, `centre-scoring`,
  - `generate-template-ai`, `generate-workflow-ai`, `ia-action-plan`, `ia-predictive-analysis`,
  - `export-audit-pack`, `bulk-send-documents`,
  - `sync-driveflow`, `send-gmail-reply`, `send-gmail-new`,
  - `promote-attachment`, `get-service-key`

> ⚠️ **Avant merge : tester en staging** que le frontend passe bien le JWT via `supabase.functions.invoke()`. Si tu utilises `fetch()` directement vers une edge function, il faut ajouter `Authorization: Bearer <jwt>` manuellement.

---

## 🛠 Actions manuelles à faire (toi, dans Supabase Dashboard)

### A. Rotation de l'anon key (recommandé si fuite suspectée)
Même si l'anon key est publique par design, si tu suspectes un abus, roter :
`Dashboard Supabase → Project Settings → API → Regenerate anon key` puis mettre à jour `.env`.

### B. CORS — restreindre aux domaines réels
Dans chaque edge function (`supabase/functions/*/index.ts`), remplacer :
```ts
"Access-Control-Allow-Origin": "*"
```
par :
```ts
const ALLOWED = [
  "https://t3pcampus.net",
  "https://www.t3pcampus.net",
  "http://localhost:8080", // dev uniquement
];
const origin = req.headers.get("origin") ?? "";
const corsOrigin = ALLOWED.includes(origin) ? origin : ALLOWED[0];
// puis: "Access-Control-Allow-Origin": corsOrigin
```

### C. RLS policies permissives — 186 à auditer
Génère la liste :
```sql
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE qual = 'true' OR with_check = 'true'
ORDER BY tablename;
```
→ Pour chaque policy, remplacer `USING (true)` par une condition basée sur `auth.uid()` et/ou `centre_id`.

**Exemple type :**
```sql
-- Avant
CREATE POLICY "public_read" ON contact_documents FOR SELECT USING (true);

-- Après
DROP POLICY "public_read" ON contact_documents;
CREATE POLICY "centre_members_read" ON contact_documents FOR SELECT
  USING (
    centre_id IN (
      SELECT centre_id FROM user_centres WHERE user_id = auth.uid()
    )
  );
```

### D. Cloudflare — Headers de sécurité côté CDN
Dans Cloudflare → ton domaine → Rules → Transform Rules → Response Headers, ajouter :
```
X-Frame-Options: DENY
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self' https://*.supabase.co; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.getalma.eu;
```

> ⚠️ Tester la CSP en mode `Content-Security-Policy-Report-Only` d'abord — elle peut casser certaines intégrations.

### E. `localStorage` → `sessionStorage` pour la session
Dans `src/integrations/supabase/client.ts` :
```ts
// Optionnel — réduit risque XSS mais déconnecte à la fermeture de l'onglet
storage: sessionStorage, // au lieu de localStorage
```
→ Arbitrage UX/sécu : à discuter.

### F. DOMPurify plus strict dans templates
Dans les 11 usages de `dangerouslySetInnerHTML` (principalement templates email), remplacer :
```ts
DOMPurify.sanitize(html, { ADD_ATTR: ["style"] })
```
par :
```ts
DOMPurify.sanitize(html, {
  ALLOWED_TAGS: ["p", "br", "b", "i", "u", "strong", "em", "a", "ul", "ol", "li", "h1", "h2", "h3", "img", "div", "span", "table", "tr", "td", "th", "thead", "tbody"],
  ALLOWED_ATTR: ["href", "target", "src", "alt", "class"],
  ALLOW_DATA_ATTR: false,
})
```

### G. Audit log RGPD
Créer une table `audit_log` avec trigger sur toutes les actions sensibles (create/delete/update users, RLS changes, etc.) :
```sql
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip inet,
  created_at timestamptz DEFAULT now()
);
```

---

## 🧪 Plan de test avant merge

1. **Staging deploy** de la branche `security-hardening`
2. Vérifier **login** fonctionne
3. Vérifier **création utilisateur** (appelle `create-user` avec JWT désormais)
4. Vérifier **paiement Alma** (création lien + webhook de retour)
5. Vérifier **envoi email depuis Gmail inbox**
6. Vérifier **signature de document publique** (non régressé)
7. Vérifier **responsive mobile** (viewport corrigé)
8. Vérifier **taille du bundle** : `npm run build` puis regarder `dist/` — les chunks doivent être splittés.

Si tout passe → merge sur `main`.

---

## 📌 Suite recommandée (Sprint 2)

Voir l'audit complet dans le commentaire PR ou dans les discussions. Les prochains gros chantiers :
- Sentry + PostHog (monitoring prod)
- Refactorer les 15 fichiers > 700 lignes
- Ajouter Vitest + tests critiques
- Splitter les 171 migrations en 1 baseline snapshot
