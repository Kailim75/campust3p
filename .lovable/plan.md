# Plan — Sécurisation tokens signature & fix 401 lot

## Principe

- **URL publique** : `/signature/:id/:access_token` uniquement. `access_token` = jeton de lecture.
- **`signing_token`** : ne quitte jamais le serveur via URL/email. Échangé à la demande contre l'`access_token` via une edge function dédiée.
- Single-use et constant-time check de `signing_token` dans `public-sign-document` : **inchangés**.

## Flux candidat

```text
1. Email reçu  → /signature/:id/:access_token
2. SignaturePage mount → resolveDocumentUrl (action: get_document_url, signingToken=résolu)
3. Au mount : appel resolve-signing-token(access_token) → renvoie signing_token (stocké en state React)
4. Clic « Signer » → public-sign-document(signingToken from state) → OK
5. Doc suivant du lot → lien interne avec access_token du doc suivant → étape 2
```

Le `signing_token` vit uniquement en mémoire React, jamais en URL, localStorage, ni email.

## 1. Nouvelle edge function `resolve-signing-token`

- `verify_jwt = false` (lien public)
- Body : `{ signatureId: string, accessToken: string }`
- Lookup : `signature_requests` where `id = signatureId`
- Vérifs (tout-ou-rien, sinon 401 générique) :
  - ligne existe
  - `access_token` matche en **constant-time**
  - `statut ∈ ('en_attente','envoye')`
  - `date_expiration` non dépassée
  - `signing_token IS NOT NULL` (sinon 410 « déjà signé »)
- Réponse : `{ success: true, signingToken }`
- Logs sans token, juste `signatureId` + raison du refus.

## 2. `SignaturePage.tsx`

- L.68-72 : URL n'expose plus que `access_token`. Renommer `tokenParam` → `accessTokenParam`. Supprimer la lecture de `?token=`.
- Ajouter state `const [signingToken, setSigningToken] = useState<string|null>(null)`.
- Nouvelle fonction `resolveSigningToken(accessToken)` qui appelle `resolve-signing-token` et set le state. Appelée dans `loadSignatureRequest` après le RPC, **avant** `resolveDocumentUrl`.
- `resolveDocumentUrl` et `handleSign` utilisent `signingToken` du state (au lieu de l'URL).
- L.405-407 et L.638 : liens internes construits avec `access_token` du doc cible (déjà le cas). RAS sur ces lignes — déjà conforme.
- Si `resolveSigningToken` échoue → afficher l'écran « lien invalide ou expiré ».

## 3. `SignaturesPage.tsx` (L.135)

Remplacer :
```ts
`${origin}/signature/${sig.id}/${sig.signing_token}?token=${sig.signing_token}`
```
par :
```ts
`${origin}/signature/${sig.id}/${sig.access_token}`
```
Garde-fou : si `access_token` est null (legacy), bloquer l'envoi avec toast « Lien invalide, régénérez la demande ».

## 4. `SignaturesTrackingPanel.tsx` (L.182)

Idem : `access_token` au lieu de `signing_token`. SELECT L.98 : remplacer `signing_token` par `access_token` dans le champ remonté. Type L.51 : `access_token: string | null` au lieu de `signing_token`.

## 5. `public-sign-document/index.ts`

**Aucune modification.** Le check constant-time + invalidation `signing_token=NULL` restent identiques.

## 6. `supabase/config.toml`

Ajouter :
```toml
[functions.resolve-signing-token]
verify_jwt = false
```

## Liens email déjà envoyés

Comme demandé : non maintenus. Les anciens liens (avec `signing_token` en path) **continueront de fonctionner techniquement** tant que le token est valide, car `public-sign-document` lit le token depuis le body — pas depuis l'URL. Le risque est que `SignaturePage` ne lise plus `?token=` ni le segment path comme `signing_token`. → **Action complémentaire** : tu m'as dit que tu renverras les emails ; je laisse l'invalidation côté DB optionnelle (un simple `UPDATE signature_requests SET signing_token = gen_random_bytes(32)...` côté toi quand tu veux casser les anciens liens en masse).

## Fichiers touchés

| Fichier | Action |
|---|---|
| `supabase/functions/resolve-signing-token/index.ts` | Création |
| `supabase/config.toml` | Ajout bloc verify_jwt=false |
| `src/pages/SignaturePage.tsx` | Refacto resolveSigningToken + state |
| `src/components/signatures/SignaturesPage.tsx` | L.125-135 |
| `src/components/signatures/SignaturesTrackingPanel.tsx` | L.51, L.98, L.178-182 |

## Diffs résumés

**`SignaturesPage.tsx` L.123-138 :**
```diff
- if (!sig.signing_token) {
-   toast.error("...lien de signature manquant...");
+ if (!sig.access_token) {
+   toast.error("Lien invalide. Régénérez la demande de signature.");
    return;
  }
- const link = `${origin}/signature/${sig.id}/${sig.signing_token}?token=${sig.signing_token}`;
+ const link = `${origin}/signature/${sig.id}/${sig.access_token}`;
```

**`SignaturesTrackingPanel.tsx`** : symétrique (type + SELECT + link).

**`SignaturePage.tsx`** : ajout state + appel `resolve-signing-token` au mount, suppression de la lecture URL→signingToken.

**Nouvelle fn `resolve-signing-token/index.ts`** : ~70 lignes, structure identique à `public-sign-document` (CORS partagé, supabase service-role, compare constant-time, JSON 401 sur échec).

---

Valide pour que j'applique.
