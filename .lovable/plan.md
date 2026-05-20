# Sprint 4.2 — Performance KPIs factures (DB-side)

## Objectif
Déplacer le calcul de `total_paye` + score de risque côté base, pour que la pagination serveur (`useFacturesPaginated`) renvoie déjà des lignes enrichies et que `useFactures` soit allégé.

## Livrables

### 1. Vue SQL `v_factures_enriched`
```sql
CREATE OR REPLACE VIEW public.v_factures_enriched AS
SELECT
  f.*,
  COALESCE(p.total_paye, 0) AS total_paye,
  GREATEST(0, f.montant_total - COALESCE(p.total_paye, 0)) AS reste_a_payer,
  CASE
    WHEN f.statut = 'payee' THEN 0
    WHEN f.statut = 'brouillon' THEN 5
    WHEN f.date_echeance IS NULL THEN 50
    WHEN f.date_echeance < CURRENT_DATE - 60 THEN 100
    WHEN f.date_echeance < CURRENT_DATE - 30 THEN 80
    WHEN f.date_echeance < CURRENT_DATE THEN 60
    ELSE 30
  END AS risk_score,
  CASE
    WHEN f.statut IN ('emise','partiel','impayee')
      AND f.date_echeance IS NOT NULL
      AND f.date_echeance < CURRENT_DATE THEN true
    ELSE false
  END AS is_overdue
FROM public.factures f
LEFT JOIN (
  SELECT facture_id, SUM(montant) AS total_paye
  FROM public.paiements
  WHERE deleted_at IS NULL
  GROUP BY facture_id
) p ON p.facture_id = f.id;
```
RLS héritée des tables sources.

### 2. RPC `get_factures_paginated(p_page,p_size,filters jsonb)`
Retourne `{ rows, total, page, page_size }` — utilise la vue, applique filtres + tri serveur, fait le count en parallèle.

### 3. Refactor hooks
- `useFacturesPaginated` → consomme la nouvelle RPC, `total_paye` réel
- `useFactures` → lit la vue (suppression de la 2e query `paiements` + map JS)
- `useFacturesStats` → idem (SUM en SQL)

### 4. Aucun changement UI
PaiementsPage continue d'utiliser `useFactures` ; gain perf transparent.

---

# Sprint 8 — Factur-X & PDP (étape 1 : préparation technique)

## Objectif
Mettre en place l'infrastructure pour la réforme 2026 : génération du XML Factur-X (CII / EN 16931) et suivi du cycle de vie PDP. L'envoi réel vers une PDP (Chorus Pro / Docaposte / etc.) reste désactivé tant que les credentials ne sont pas fournis.

## Livrables

### 1. Migration : suivi PDP
- `factures` : ajout `facturx_xml` (text), `facturx_generated_at`, `pdp_status` (enum: `non_transmis`,`en_attente`,`envoye`,`accepte`,`rejete`,`erreur`), `pdp_reference`, `pdp_last_error`
- Nouvelle table `facture_pdp_transmissions` (id, facture_id, statut, payload jsonb, response jsonb, created_at, created_by, centre_id) avec RLS standard
- Trigger : init `pdp_status='non_transmis'` à la création

### 2. Edge function `generate-facturx`
- Input : `{ facture_id }`
- Charge la facture + snapshot vendeur/acheteur + lignes
- Génère le XML CII minimal EN 16931 (profil BASIC) — vendeur, acheteur, lignes, totaux HT/TVA/TTC, régime TVA, conditions de paiement, mentions légales
- Stocke `facturx_xml` + timestamp, retourne le XML
- `verify_jwt: true`

### 3. Edge function `submit-pdp` (stub)
- Input : `{ facture_id, pdp_target }`
- Vérifie compliance ≥ seuil centre (réutilise `compute_invoice_compliance`)
- Crée une entrée `facture_pdp_transmissions` avec `statut='en_attente'`
- TODO : appel HTTP réel à la PDP (commenté, à activer plus tard quand l'utilisateur fournit ses credentials via `add_secret`)
- Met à jour `factures.pdp_status` + `pdp_reference`

### 4. UI dans `FactureDetailSheet`
- Bloc "Facturation électronique 2026/2027" :
  - Badge `pdp_status`
  - Bouton "Générer Factur-X" (appelle `generate-facturx`) — affiche/télécharge le XML
  - Bouton "Transmettre via PDP" (appelle `submit-pdp`) — désactivé tant que `einv_pdp_choice = 'non_choisie'`
  - Liste des transmissions passées (table `facture_pdp_transmissions`)

### 5. Hook `usePdpTransmissions(factureId)`
Lecture des transmissions + mutations `generateFacturX` / `submitPdp`.

## Hors scope (laissé pour étape 2)
- Intégration HTTP réelle vers une PDP spécifique (nécessite credentials)
- Format PDF/A-3 avec XML embarqué (le XML est stocké à part pour l'instant)
- Webhooks de retour PDP (statuts asynchrones)
- Réception de factures fournisseurs

## Détails techniques

**Fichiers créés**
- `supabase/migrations/*_sprint_4_2_view_factures_enriched.sql`
- `supabase/migrations/*_sprint_8_pdp_infrastructure.sql`
- `supabase/functions/generate-facturx/index.ts`
- `supabase/functions/submit-pdp/index.ts`
- `src/hooks/usePdpTransmissions.ts`
- `src/components/facturation/PdpTransmissionPanel.tsx`

**Fichiers modifiés**
- `src/hooks/useFactures.ts` (lit la vue)
- `src/hooks/useFacturesPaginated.ts` (RPC)
- `src/components/facturation/FactureDetailSheet.tsx` (ajoute `PdpTransmissionPanel`)

## Validation
- Linter Supabase après migrations
- Le XML généré pour une facture exemple est conforme schéma EN 16931 (validation manuelle structurelle)
- Pas de régression sur `useFactures` (mêmes champs retournés)
