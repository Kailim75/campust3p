
# Inbox CRM — Architecture V2 corrigée

---

## A. Corrections appliquées (résumé des 8 points)

| # | Point | Correction |
|---|-------|------------|
| 1 | Réponse via Gmail API | ✅ Gmail API pour réception ET réponse. Resend reste cantonné aux emails transactionnels CRM (rappels, factures, documents). |
| 2 | Table `crm_email_threads` | ✅ Statuts, assignation, archivage, non-lu et notes portés au niveau thread. |
| 3 | Rattachement souple `crm_email_links` | ✅ Table pivot polymorphe : lien principal + secondaires, compatible contact/prospect/session/facture/document/groupe payeur. |
| 4 | Provider-agnostic | ✅ Champs `provider`, `provider_message_id`, `provider_thread_id`, `source_system`, `in_reply_to`, `references_header`. |
| 5 | Stratégie Gmail clarifiée | ✅ OAuth2 boîte centre, sync incrémentale `historyId`, cron de secours, aucun service account générique. |
| 6 | Logique documentaire PJ | ✅ PJ brute par défaut, promotion optionnelle en document métier avec traçabilité et anti-doublon (hash SHA-256). |
| 7 | Permissions affinées | ✅ Matrice admin/staff/formateur avec périmètres distincts. Formateur : lecture seule sur threads rattachés à ses sessions. |
| 8 | Schéma complet V2 | ✅ Ci-dessous. |

---

## B. Schéma de tables révisé

### 1. `crm_email_accounts` — Comptes email connectés par centre
```sql
CREATE TABLE public.crm_email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id),
  provider TEXT NOT NULL DEFAULT 'gmail',        -- 'gmail' | 'outlook' (V2)
  email_address TEXT NOT NULL,                   -- ex: montrouge@ecolet3p.fr
  display_name TEXT,
  oauth_encrypted_token TEXT,                    -- stocké chiffré via Vault
  oauth_refresh_token TEXT,
  oauth_token_expires_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_history_id TEXT,                          -- Gmail historyId pour sync incrémentale
  sync_status TEXT DEFAULT 'idle',               -- idle | syncing | error
  sync_error TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(centre_id, email_address)
);
ALTER TABLE public.crm_email_accounts ENABLE ROW LEVEL SECURITY;
```

### 2. `crm_email_threads` — Conversations (niveau thread)
```sql
CREATE TABLE public.crm_email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id),
  account_id UUID NOT NULL REFERENCES crm_email_accounts(id),
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_thread_id TEXT NOT NULL,              -- Gmail threadId
  subject TEXT,
  -- Statuts et traitement (portés au niveau THREAD)
  status TEXT NOT NULL DEFAULT 'nouveau',        -- nouveau | en_cours | traite | archive
  is_unread BOOLEAN DEFAULT true,
  priority TEXT DEFAULT 'normale',               -- basse | normale | haute | urgente
  -- Assignation
  assigned_to UUID,                              -- user_id assigné
  assigned_at TIMESTAMPTZ,
  assigned_by UUID,
  -- Métadonnées thread
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  has_attachments BOOLEAN DEFAULT false,
  snippet TEXT,                                  -- aperçu du dernier message
  -- Participants
  participants JSONB DEFAULT '[]',               -- [{email, name, type: from|to|cc}]
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  archived_at TIMESTAMPTZ,
  UNIQUE(centre_id, provider, provider_thread_id)
);
ALTER TABLE public.crm_email_threads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_threads_centre_status ON crm_email_threads(centre_id, status);
CREATE INDEX idx_threads_assigned ON crm_email_threads(assigned_to);
CREATE INDEX idx_threads_last_msg ON crm_email_threads(last_message_at DESC);
```

### 3. `crm_email_messages` — Messages individuels
```sql
CREATE TABLE public.crm_email_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id),
  thread_id UUID NOT NULL REFERENCES crm_email_threads(id) ON DELETE CASCADE,
  -- Provider-agnostic
  provider TEXT NOT NULL DEFAULT 'gmail',
  provider_message_id TEXT NOT NULL,             -- Gmail messageId
  source_system TEXT NOT NULL DEFAULT 'gmail',   -- gmail | resend | manual
  -- Threading RFC
  in_reply_to TEXT,                              -- Message-ID header
  references_header TEXT,                        -- References header complet
  message_id_header TEXT,                        -- Message-ID de ce message
  -- Direction et contenu
  direction TEXT NOT NULL,                       -- 'inbound' | 'outbound'
  from_address TEXT NOT NULL,
  from_name TEXT,
  to_addresses JSONB NOT NULL DEFAULT '[]',      -- [{email, name}]
  cc_addresses JSONB DEFAULT '[]',
  bcc_addresses JSONB DEFAULT '[]',
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  snippet TEXT,
  -- Métadonnées
  gmail_label_ids TEXT[] DEFAULT '{}',
  gmail_internal_date TIMESTAMPTZ,
  has_attachments BOOLEAN DEFAULT false,
  -- Envoi (pour outbound via Gmail API)
  sent_at TIMESTAMPTZ,
  sent_by UUID,                                  -- user_id qui a envoyé
  send_status TEXT,                              -- draft | sending | sent | failed
  send_error TEXT,
  -- Timestamps
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(centre_id, provider, provider_message_id)
);
ALTER TABLE public.crm_email_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_messages_thread ON crm_email_messages(thread_id);
CREATE INDEX idx_messages_from ON crm_email_messages(from_address);
CREATE INDEX idx_messages_date ON crm_email_messages(received_at DESC);
```

### 4. `crm_email_attachments` — Pièces jointes
```sql
CREATE TABLE public.crm_email_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id),
  message_id UUID NOT NULL REFERENCES crm_email_messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  storage_path TEXT,                             -- chemin dans le bucket
  sha256_hash TEXT,                              -- anti-doublon
  -- Promotion en document métier
  promoted_to_document_id UUID,                  -- FK vers contact_documents ou pedagogical_documents
  promoted_to_table TEXT,                        -- 'contact_documents' | 'pedagogical_documents'
  promoted_at TIMESTAMPTZ,
  promoted_by UUID,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_email_attachments ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_attachments_message ON crm_email_attachments(message_id);
CREATE INDEX idx_attachments_hash ON crm_email_attachments(sha256_hash);
```

### 5. `crm_email_links` — Rattachement polymorphe (souple)
```sql
CREATE TABLE public.crm_email_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id),
  thread_id UUID NOT NULL REFERENCES crm_email_threads(id) ON DELETE CASCADE,
  -- Entité liée
  entity_type TEXT NOT NULL,                     -- 'contact' | 'prospect' | 'session' | 'facture' | 'groupe_payeur' | 'document' | 'devis'
  entity_id UUID NOT NULL,
  -- Qualification
  is_primary BOOLEAN DEFAULT false,              -- lien principal
  link_source TEXT DEFAULT 'auto',               -- 'auto' | 'manual' | 'ai'
  confidence_score NUMERIC(3,2),                 -- 0.00 à 1.00 pour auto-matching
  -- Qui a rattaché
  linked_by UUID,
  linked_at TIMESTAMPTZ DEFAULT now(),
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(thread_id, entity_type, entity_id)
);
ALTER TABLE public.crm_email_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_links_thread ON crm_email_links(thread_id);
CREATE INDEX idx_links_entity ON crm_email_links(entity_type, entity_id);
```

### 6. `crm_email_notes` — Notes internes sur threads
```sql
CREATE TABLE public.crm_email_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id UUID NOT NULL REFERENCES centres(id),
  thread_id UUID NOT NULL REFERENCES crm_email_threads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.crm_email_notes ENABLE ROW LEVEL SECURITY;
```

---

## C. Matrice RLS détaillée

| Table | admin | staff | formateur |
|-------|-------|-------|-----------|
| `crm_email_accounts` | CRUD (son centre) | Lecture seule | ❌ Aucun accès |
| `crm_email_threads` | CRUD (son centre) | Lecture + Mise à jour statut/assignation | Lecture seule — uniquement threads rattachés à ses sessions via `crm_email_links` |
| `crm_email_messages` | CRUD (son centre) | Lecture + Envoi (outbound) | Lecture seule — uniquement messages des threads autorisés |
| `crm_email_attachments` | CRUD | Lecture + Promotion en document | Lecture seule — threads autorisés |
| `crm_email_links` | CRUD | Lecture + Création manuelle | Lecture seule |
| `crm_email_notes` | CRUD | CRUD (ses propres notes) | Lecture seule |

**Formateur — règle restrictive** :
```sql
-- Le formateur ne voit QUE les threads liés à ses sessions
CREATE POLICY "formateur_read_threads" ON crm_email_threads
FOR SELECT TO authenticated
USING (
  has_centre_access(centre_id)
  AND EXISTS (
    SELECT 1 FROM crm_email_links el
    JOIN session_inscriptions si ON si.session_id = el.entity_id
    JOIN sessions s ON s.id = si.session_id
    WHERE el.thread_id = crm_email_threads.id
      AND el.entity_type = 'session'
      AND s.formateur_id = (SELECT id FROM formateurs WHERE user_id = auth.uid())
  )
);
```

---

## D. Flux de synchronisation Gmail (corrigé)

### Sync incrémentale (cron toutes les 2 min)
```
1. Edge Function `sync-gmail-inbox` (cron)
2. Pour chaque account actif du centre :
   a. Lire last_history_id
   b. Si premier sync → full sync (messages des 30 derniers jours, LIMIT 500)
   c. Sinon → users.history.list(startHistoryId) — incrémental
   d. Pour chaque message ajouté :
      - gmail.messages.get(id, format=full)
      - Dédup via UNIQUE(centre_id, provider, provider_message_id)
      - Upsert thread (crm_email_threads)
      - Insert message (crm_email_messages)
      - Télécharger PJ → bucket `crm-email-attachments/{centre_id}/`
      - Calculer SHA-256 par PJ
      - Auto-rattachement (lookup email → contacts/prospects)
   e. Mettre à jour last_history_id + last_sync_at
3. Cron de secours : si last_sync_at > 10 min ET sync_status != 'syncing' → force full resync
```

### Gestion erreurs sync
- Token expiré → refresh via oauth_refresh_token
- Refresh échoué → sync_status = 'error', sync_error = message, notification admin
- Rate limit Gmail → backoff exponentiel, retry au prochain cron
- historyId invalidé (trop ancien) → full resync automatique

---

## E. Logique d'envoi / réponse (corrigée — Gmail API)

### Répondre à un thread
```
1. Utilisateur compose réponse dans l'Inbox CRM
2. Edge Function `send-gmail-reply`
   a. Construire le message MIME (RFC 2822)
   b. Injecter headers : In-Reply-To, References, threadId
   c. gmail.users.messages.send() avec threadId
   d. Insérer dans crm_email_messages (direction: 'outbound', source_system: 'gmail')
   e. Mettre à jour thread (last_message_at, snippet, message_count)
   f. Logger dans contact_historique si rattaché
```

### Nouveau message depuis le CRM (hors thread)
```
1. Depuis une fiche contact/prospect → "Envoyer un email"
2. Edge Function `send-gmail-message`
   a. gmail.users.messages.send() (nouveau thread)
   b. Créer crm_email_threads + crm_email_messages
   c. Auto-rattacher via crm_email_links
```

### Resend — périmètre maintenu
- Rappels J-7/J-1 automatiques
- Emails de factures/relances
- Documents à signer
- Enquêtes satisfaction
- Aucun lien avec l'Inbox CRM

---

## F. Logique documentaire PJ (renforcée)

### Cycle de vie d'une PJ
```
Email reçu
  └→ PJ extraite → crm_email_attachments (statut brut)
       ├→ Reste pièce jointe email (aucune action)
       └→ Action "Promouvoir en document" :
            1. Vérifier anti-doublon (sha256_hash vs contact_documents existants)
            2. Si doublon → alerter l'utilisateur, proposer lien ou abandon
            3. Si nouveau → copier vers bucket documents/{centre_id}/
            4. Insérer dans contact_documents ou pedagogical_documents
            5. Mettre à jour promoted_to_document_id + promoted_at + promoted_by
            6. Logger dans audit_logs
```

---

## G. MVP vs Hors MVP

### ✅ MVP (Phase 1)
- Table `crm_email_accounts` (1 compte Gmail par centre)
- Tables `crm_email_threads`, `crm_email_messages`, `crm_email_attachments`
- Table `crm_email_links` (rattachement auto par email + manuel)
- Table `crm_email_notes`
- Edge Function `sync-gmail-inbox` (sync incrémentale cron)
- Edge Function `send-gmail-reply` (réponse dans thread)
- UI Inbox : liste threads + filtres (statut, non-lu, assigné)
- UI Thread : vue conversation chronologique
- UI : changer statut, assigner, marquer lu/non-lu
- UI : ajouter note interne
- UI : rattacher manuellement à une entité
- Auto-rattachement par email (contact/prospect)
- RLS complète par centre_id
- Permissions admin + staff
- Timeline email dans fiches contact/prospect
- Stockage PJ dans bucket isolé par centre
- Visualisation PJ inline

### 🔜 V2
- Réponse riche (éditeur HTML, pièces jointes sortantes)
- Nouveau message hors thread depuis fiche
- Promotion PJ → document métier
- Permissions formateur (lecture restreinte)
- Auto-rattachement IA (analyse contenu)
- Rattachement à session/facture/devis/groupe payeur
- Outlook / Microsoft 365
- Règles automatiques (auto-assign, auto-tag)
- Recherche full-text dans les emails
- Notifications temps réel (nouveau mail)
- Statistiques inbox (temps de réponse, volume)
- Archivage automatique (threads traités > 30j)

### ❌ Hors périmètre
- Webmail complet (dossiers, labels, filtres avancés)
- Multi-comptes personnels par utilisateur
- Calendrier / événements
- Chat / messagerie instantanée
- Campagnes marketing email

---

## H. Plan d'implémentation progressif

| Phase | Contenu | Estimation |
|-------|---------|------------|
| 1 | Migration DB : 6 tables + RLS + index | 1 étape |
| 2 | Bucket storage `crm-email-attachments` | 1 étape |
| 3 | Edge Function `sync-gmail-inbox` + OAuth | 1 étape |
| 4 | Edge Function `send-gmail-reply` | 1 étape |
| 5 | Config.toml + cron sync | 1 étape |
| 6 | UI Inbox (liste threads) | 1 étape |
| 7 | UI Thread (conversation) | 1 étape |
| 8 | Auto-rattachement + UI liens | 1 étape |
| 9 | Timeline email dans fiches | 1 étape |
| 10 | Tests + QA non-régression | 1 étape |

---

## I. Check-list QA / non-régression

- [ ] Aucune modification des tables existantes (contacts, prospects, sessions, factures…)
- [ ] Aucun impact sur les Edge Functions email existantes (send-automated-emails, send-signature-email…)
- [ ] EmailComposerModal existant inchangé
- [ ] Routes existantes intactes
- [ ] RLS vérifié via linter après migration
- [ ] Isolation centre_id sur toutes les nouvelles tables
- [ ] Pas de fuite de données cross-centre
- [ ] Gmail tokens stockés de façon sécurisée (Vault)
- [ ] Sync idempotente (relance sans doublon)
- [ ] PJ stockées dans sous-dossier centre_id
