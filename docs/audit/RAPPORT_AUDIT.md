# Rapport d'audit — CRM T3P Campus

**Date :** 13 août 2026
**Périmètre :** dépôt `campust3p` (front React/Vite/TS + Supabase via Lovable Cloud), état `main` au commit `33f87eea`.
**Méthode :** audit statique en lecture seule, 9 axes analysés en parallèle, chaque constat prouvé par `fichier:ligne`. Les constats critiques (P0/P1) ont été **contre-vérifiés** un à un dans le code. Aucun fichier de code n'a été modifié ; les seuls fichiers produits sont les trois livrables de `docs/audit/`.

---

## 1. Résumé exécutif

Le CRM est un outil **mûr, riche et globalement bien construit** : parcours métier quasi complets (de l'inscription à l'archivage), automatisations réelles (inscription/facturation express, relances, émargement horodaté), RLS multi-tenant en place partout, base de données solide (262 index, enums), et une dette **honnêtement documentée**. Il rend déjà de grands services au quotidien.

Mais l'audit révèle **quatre failles de sécurité critiques (P0)** à corriger en priorité — la plus grave permettant, à partir d'un simple lien de signature, de lire des données personnelles et de falsifier une signature électronique sans être connecté. Deux d'entre elles sont sans effet aujourd'hui (un seul centre existe) mais deviendront des fuites entre centres **dès l'ouverture du 2ᵉ centre**, déjà prévue. Côté usage quotidien, le point le plus dangereux n'est pas visible : **quand un chargement échoue, l'écran affiche « tout est à jour »** au lieu d'une erreur, et **certaines actions (présence, pièce reçue) échouent en silence**. Enfin, le pilotage Qualiopi affiche « 0 % conforme » en permanence alors que les preuves existent déjà en base.

Aucun de ces points n'est un défaut de fondation. Ce sont des correctifs ciblés, la plupart à effort faible ou moyen. **Priorité absolue : les 4 P0 de sécurité et de perte de données**, puis la fiabilité perçue de l'interface (états d'erreur, feedback), puis le pilotage Qualiopi.

---

## 2. Tableau de scoring

| Axe | Note | Justification en une phrase |
|---|---|---|
| **Architecture & code** | **6,5/10** | Fondations saines (registre de navigation, TanStack Query, `lib/` testée) mais god-components de 1000+ lignes, duplication de logique financière avec incohérence de calcul, et ~3 800 lignes mortes. |
| **Sécurité** | **4,5/10** | Socle RLS multi-tenant cohérent et non régressé, mais **deux P0 confirmés** (RPC de signature ouvertes à `anon`, export ZIP cross-tenant) + un cluster de fuites cross-tenant latentes au 2ᵉ centre. |
| **Base de données** | **7/10** | Schéma mature (index, enums, FK) ; à traiter avant montée en charge : numérotation de facture non scindée par centre et FK de tables-lignes sans index. |
| **Performance** | **6/10** | Navigation interne rapide, mais ~397 Ko gz de librairies inutiles préchargées au démarrage (artefact de bundling prouvé) + une icône PWA de 811 Ko. |
| **UX & facilité d'usage** ⭐ | **6,5/10** | Parcours express excellents, mais **aucun état d'erreur** (un échec s'affiche comme « vide »), écritures silencieuses, emails en 1 clic sans filet, et 3 mots pour « apprenant ». |
| **Couverture métier** | **7,5/10** | Cycle T3P réellement couvert avec des briques rares (émargement horodaté, convocation auto) ; pilotage Qualiopi manuel/déconnecté et récupération de points absente. |
| **Maintenabilité** | **6,5/10** | Soft-delete + Corbeille + audit trigger de qualité, mais zéro test sur les zones à risque (RLS, edge, mutations), aucun suivi d'erreurs front, et suppressions dures irréversibles. |

**Note transverse — rigueur TypeScript : 5/10** (902 `any`, dont des `(supabase as any)` sur des tables pourtant typées).

---

## 3. Constats

Format : `[Priorité][Axe] Titre` — Localisation / Constat / Impact / Recommandation / Effort.
Priorités : **P0** critique (faille exploitable, perte de données, risque légal) · **P1** majeur · **P2** modéré · **P3** confort.
Efforts : **XS** <1 h · **S** <½ j · **M** 1–3 j · **L** >3 j.

---

### 3.1 SÉCURITÉ

#### [P0][SECU] RPC de signature électronique ouvertes à `anon` sans jeton — fuite de données et falsification de signature
- **Localisation :** `supabase/migrations/20260226001744_…:122,153-160` puis `20260627213356_…:3-60` (`get_related_signature_docs`, renvoie `access_token`, `GRANT … TO anon`), `20260310221055_…:4-56` (`get_signature_request_public`), `20260310184107_…` (`sign_document_public`), `20260226001744_…:87` (`refuse_document_public`). Consommées par `src/pages/SignaturePage.tsx:213,264,347`.
- **Constat (vérifié) :** ces 4 fonctions sont `SECURITY DEFINER` (elles contournent la RLS), accordées à `anon`, et **ne prennent qu'un UUID en paramètre** — donc aucune vérification de jeton n'est possible. Aucun `REVOKE` n'existe dans le dépôt. Chaîne d'exploitation à partir du seul UUID présent dans une URL de signature (`/signature/:id`) : `get_signature_request_public(id)` → nom/prénom/email + chemins de stockage → `get_related_signature_docs(contact_id)` → **tous** les documents du contact avec leur `access_token` (le secret de lecture) → `sign_document_public(id, url_attaquant)` fait passer le document à `signe`. Le trigger de gel `trg_lock_signed_signature_request` ne protège pas la **première** signature. La refonte d'avril (edge functions à jeton) a créé un chemin sûr **sans jamais révoquer** ces RPC parallèles.
- **Impact :** un tiers non authentifié qui détient un UUID de signature (distribué par email aux signataires) peut lire des données personnelles, exfiltrer les jetons d'accès de tous les documents d'un contact, et **falsifier/refuser une signature sur un document à valeur juridique**. Atteinte à l'intégrité juridique des documents signés + RGPD.
- **Recommandation :** `REVOKE EXECUTE … FROM anon, authenticated` sur les 4 fonctions (via l'agent Lovable) ; router `SignaturePage` exclusivement par les edge functions à jeton (`resolve-signing-token`/`public-sign-document`) ; retirer `access_token` de la sortie de `get_related_signature_docs` ; rotation des `access_token` existants.
- **Effort :** S

#### [P0][SECU] `export-audit-pack` — export ZIP cross-tenant (aucun cloisonnement par centre)
- **Localisation :** `supabase/functions/export-audit-pack/index.ts:72` (client `service_role`), `:79` (contrôle de rôle `admin`/`staff` **global, tous centres**), `:98-117` (requête `generated_documents_v2` filtrée uniquement par `sessionId`/`contactId` du client).
- **Constat (vérifié) :** un grep sur toute la fonction ne trouve **aucune** mention de `centre_id`/`user_centres`. La requête tourne en `service_role` (RLS contournée) et fait confiance à un ID fourni par le client.
- **Impact :** un `admin`/`staff` d'un centre A qui connaît un `contactId`/`sessionId` d'un centre B télécharge en ZIP tous ses documents (contrats, conventions, factures, attestations = PII lourde). Latent en mono-centre, exploitable dès le 2ᵉ centre.
- **Recommandation :** résoudre le `centre_id` de l'appelant côté serveur (via `user_centres`, comme le fait déjà `prospect-scoring`), filtrer la requête sur ce centre et vérifier que `session`/`contact` y appartient.
- **Effort :** S

#### [P0][SECU] Suppressions dures de données financières et de conformité — perte irréversible, sans audit
- **Localisation :** `src/hooks/useTresorerie.ts:165` (`transactions_bancaires`), `src/hooks/useQualiopiPreuves.ts:53` (`qualiopi_preuves`), `src/hooks/useFactureLignes.ts:144,168` (`facture_lignes`), `src/components/apprenants/tabs/DocumentsTab.tsx:113` (`contact_documents`, pourtant soft-deletable), + `useQualiopiAudits.ts:69`, `useQualiopiActions.ts:68`, `useFormateurs.ts:403,487`, `useSeancesConduite.ts:154`, `useCartesProfessionnelles.ts:124`, `useFinancialCockpit.ts:224,252`.
- **Constat (vérifié) :** ces `.delete()` durs frappent des tables **sans colonne `deleted_at` ni ligne d'audit** — en contradiction directe avec `CLAUDE.md:57` (« soft-delete… ; jamais de DELETE direct »). Pour `contact_documents`, l'infrastructure de soft-delete existe (`useSoftDelete.ts:12`) mais est court-circuitée à cet endroit.
- **Impact :** une fausse manip supprime définitivement des transactions bancaires, des preuves Qualiopi (risque en audit), des lignes de facture (pilotent les totaux) ou une pièce d'un candidat — sans réversibilité pratique (seul recours = restauration PITR globale, à confirmer côté Supabase).
- **Recommandation :** basculer ces suppressions vers `soft_delete_record` (après ajout des colonnes `deleted_at/by/reason` par l'agent Lovable) ou, a minima, attacher le trigger d'audit pour rendre `old_data` récupérable. Prioriser `transactions_bancaires`, `qualiopi_preuves`, `facture_lignes`.
- **Effort :** M

#### [P0/P1][SECU] `soft_delete_record` / `restore_record` — `SECURITY DEFINER` sans contrôle de rôle ni de centre
- **Localisation :** `supabase/migrations/20260309024438_…:8-37` (`soft_delete_record`), `20260509104943_…:141-168` (`restore_record`).
- **Constat (vérifié) :** les deux fonctions sont `SECURITY DEFINER`, ne vérifient **que la liste blanche de tables** (`sessions, contacts, session_inscriptions, factures, paiements, contact_documents, prospects, devis, emargements, document_templates, catalogue_formations, email_templates, generated_documents_v2`) — **aucun** `has_role`, `has_centre_access`, ni même `auth.uid() IS NOT NULL`. Aucun `REVOKE` dans le dépôt : par défaut PostgreSQL accorde `EXECUTE` à `PUBLIC`.
- **Impact :** tout utilisateur connecté à faible privilège (ex. `formateur`), voire `anon`, peut soft-supprimer/restaurer n'importe quel enregistrement métier par UUID, y compris d'un autre centre → escalade de privilèges + perte de données cross-tenant. **P0 si le grant par défaut `PUBLIC` est en place** (norme Supabase) — à confirmer.
- **Recommandation :** ajouter en tête un contrôle `IF NOT (is_admin_or_staff() AND has_centre_access(<centre du record>)) THEN RAISE EXCEPTION` ; poser un `REVOKE EXECUTE … FROM anon` explicite.
- **Effort :** S

#### [P0][METIER/QUALIOPI] Le pilotage des 32 indicateurs Qualiopi est manuel et déconnecté des données réelles
> (Classé aussi en Sécurité/conformité car risque réglementaire.)
- **Localisation :** `supabase/migrations/20260116163440_…:8` (`statut DEFAULT 'non_conforme'`), `src/hooks/useQualiopiIndicateurs.ts:24,36` (seule écriture = `updateStatut` manuel), face à `src/hooks/useQualiopiCentreData.ts` (calcule déjà `hasEmargement/hasConvention/hasSatisfaction/hasCertificats`, `scoreConformite`, `problemes` par session).
- **Constat (vérifié) :** les 32 indicateurs sont seedés `non_conforme` et ne changent que si un humain clique ligne par ligne. En parallèle, `useQualiopiCentreData` sait déjà mesurer la conformité opérationnelle réelle — mais **cette mesure ne met jamais à jour le statut des indicateurs**. Le « Qualiopi 0 % conforme » du tableau de bord est un artefact d'absence de saisie, pas un reflet du terrain.
- **Impact :** tableau de conformité faux par défaut ; à J-30 d'un audit, le directeur ré-évalue 32 lignes à la main alors que la preuve existe déjà. Charge mentale + risque d'oubli.
- **Recommandation :** dériver automatiquement `qualiopi_indicateurs.statut` depuis `useQualiopiCentreData`/`qualiopi_preuves` (ex. indicateur émargement = conforme si 100 % des sessions ont un émargement), en laissant l'override manuel en complément.
- **Effort :** M

#### [P1][SECU] `download-email-attachment` — IDOR : confiance au `centreId` du client, aucune identité vérifiée
- **Localisation :** `supabase/functions/download-email-attachment/index.ts:16-30` (aucun `getUser`), `:22` (`service_role`), `:25,37` (`attachmentId` + `centreId` pris du body client), `:48-52` (URL signée).
- **Constat (vérifié) :** la fonction ne vérifie **aucune identité** et filtre `crm_email_attachments` par le couple `id`/`centre_id` fourni par l'appelant. Elle n'est pas déclarée dans `config.toml` → si le gateway est en `verify_jwt=false`, l'endpoint est **totalement public** (deviendrait P0).
- **Impact :** accès cross-tenant aux pièces jointes email (souvent pièces d'identité, CMA). Atténuation actuelle : la synchro Gmail est en pause et l'Inbox retirée → données largement dormantes.
- **Recommandation :** vérifier le JWT dans le code, résoudre le `centre_id` via `user_centres`, ignorer tout `centreId` client, déclarer `verify_jwt=true` dans `config.toml`.
- **Effort :** S

#### [P1][SECU] Fonctions cron entièrement non authentifiées (aucun secret interne)
- **Localisation :** `supabase/config.toml` (bloc CRON, `verify_jwt=false`), `supabase/CRON_JOBS.md` (appel avec `apikey:"<ANON_KEY>"`), et les fonctions `alma-reconcile-cron`, `send-daily-report`, `send-convocation-cron`, `signature-reminders`, `send-exam-reminders`, `generate-notifications`, `process-payment-reminders` — aucune ne lit de secret/bearer interne (seules mentions de `authorization` = en-têtes CORS).
- **Constat (vérifié) :** ces fonctions sont publiques et déclenchables par quiconque dispose de l'URL + de la clé anon (toutes deux publiques, présentes dans le bundle front).
- **Impact :** envoi forcé d'emails réels à des candidats (convocations, relances) → atteinte réputation domaine + coût Resend ; bascule de statuts (`signature-reminders` passe des demandes à `expire`) ; runs de réconciliation Alma. Abus de ressources / intégrité des données.
- **Recommandation :** ajouter un `CRON_SECRET` (header `Authorization: Bearer …` ou `x-cron-secret`) vérifié en tête de chaque cron via une garde partagée dans `_shared`, injecté par pg_cron ; rejeter sinon.
- **Effort :** M

#### [P1][SECU] `incoming-webhook` — authentification « fail-open » + injection via `centre_id` du payload
- **Localisation :** `supabase/functions/incoming-webhook/index.ts:20-29` (auth), `:51-68` (`centre_id` du payload / fallback 1er centre), `:255-289` (insertion de paiement).
- **Constat (vérifié) :** `if ((DRIVEFLOW_API_KEY || WEBHOOK_SECRET) && !isAuthenticated) return 401` — si **aucun** des deux secrets n'est configuré en environnement, la condition est fausse et l'endpoint devient **public**. Le `centre_id` provient du payload, et l'event `payment_received` insère un paiement avec `montant`/`facture_id` contrôlés par l'appelant. Le secret est aussi accepté en query string (`?secret=`, journalisé).
- **Impact :** si secret non configuré → création publique de contacts/inscriptions et **faux paiements** ; même avec secret → injection de contacts dans n'importe quel centre.
- **Recommandation :** fail-closed (exiger qu'un secret soit configuré, sinon 500) ; valider le `centre_id` contre une allowlist liée à la clé ; refuser le secret en query.
- **Effort :** S

#### [P1][SECU] `public-sign-document` — le fallback « token nul » expose les documents déjà signés
- **Localisation :** `supabase/functions/public-sign-document/index.ts:26-40` (`verifySigningToken` retourne `"ok"` si `storedToken` est nul), `:88` (`get_document_url` s'appuie dessus), `:198` (`signing_token: null` posé après signature).
- **Constat (vérifié) :** après signature, le token est mis à `null` ; or un token nul fait passer la vérification. Sur un document déjà signé, un appel `get_document_url` avec le seul `signatureId` renvoie une URL signée fraîche vers le PDF signé (contrat + image de signature). Le comportement est un fallback **legacy documenté** (`:21-24`) que l'équipe prévoit de durcir — dette assumée, pas un oubli.
- **Impact :** contournement du contrôle d'accès sur les documents signés pour quiconque obtient le `signatureId`.
- **Recommandation :** exiger un token non nul pour `get_document_url` ; ne pas annuler le token après signature (ou introduire un token de lecture distinct) ; vérifier statut/expiration sur `get_document_url`.
- **Effort :** S

#### [P1][SECU] Tables sans isolation par centre — fuite cross-tenant latente au 2ᵉ centre
- **Localisation :** policies `role-only` (`has_role` sans filtre centre) sur — **financier :** `charges`, `versements`, `transactions_bancaires`, `tresorerie_alertes/soldes`, `financial_cash_manual/costs/months`, `budget_previsionnel`, `parametres_financiers` ; **templates :** `email_templates`, `document_templates`, `document_template_files` ; **qualiopi :** `qualiopi_actions/audits/indicateurs` ; **divers :** `objectifs`, `reclamations`, `compte_rendu_seance`, `workflows`, `workflow_executions`, `contact_duplicate_block_log`. (À comparer à `factures`/`paiements`, bien scindées par `has_facture_centre_access` en `20260717224714_…`.)
- **Constat (vérifié en table récapitulative) :** la campagne de durcissement de juillet a cloisonné le graphe de contacts mais a laissé ces tables en admin/staff tous centres — plusieurs ont pourtant une colonne `centre_id` inexploitée.
- **Impact :** nul aujourd'hui (1 centre) ; dès le 2ᵉ centre, l'admin/staff du centre A verra la comptabilité, les modèles, les réclamations, les CR de séance et les workflows du centre B.
- **Recommandation :** avant l'onboarding du 2ᵉ centre, ajouter `AND has_centre_access(centre_id)` (ou jointure parent) sur ces policies. Prioriser le bloc financier et `reclamations`/`compte_rendu_seance` (PII).
- **Effort :** M

#### [P2][SECU] `delete-user` & `list-users` — actions admin non scopées au centre
- **Localisation :** `supabase/functions/delete-user/index.ts:46-57,78` ; `list-users/index.ts:46-61`.
- **Constat :** `delete-user` vérifie un rôle `admin` **global** puis supprime n'importe quel `userId` ; `list-users` renvoie tous les utilisateurs de tous les centres.
- **Impact :** en multi-tenant, un admin d'un centre peut supprimer les comptes d'un autre centre et énumérer tous les utilisateurs. Latent en mono-centre.
- **Recommandation :** scoper via `user_centres` (cible dans le même centre que l'appelant) ; filtrer `list-users`.
- **Effort :** M

#### [P2][SECU] Fonctions authentifiées mais sans contrôle de rôle ni de centre
- **Localisation :** `send-signature-email/index.ts:46-59`, `sync-driveflow/index.ts:36-63` (exfiltre le contact vers un webhook externe), `execute-workflow/index.ts:33-40` (aucun contrôle interne), `alma-payment/index.ts:23-30`.
- **Constat :** ces fonctions se contentent du JWT (ou du gateway) et opèrent en `service_role` sur des ID/données clients sans re-lier au centre ni vérifier le rôle.
- **Impact :** tout utilisateur authentifié peut déclencher des emails, changer des statuts, pousser des PII vers l'externe, cross-centre.
- **Recommandation :** ajouter contrôle de rôle + résolution serveur du `centre_id` et filtrage des ressources.
- **Effort :** M

#### [P2][SECU] `track-link` / `track-open` — open redirect (pas d'allowlist de domaine)
- **Localisation :** `supabase/functions/track-link/index.ts:19-27` (`safeUrl` ne valide que le protocole), `:35-125` (redirect 302).
- **Constat :** `GET /track-link?u=<base64url(https://evil.com)>` redirige vers n'importe quelle URL.
- **Impact :** open redirect exploitable en phishing (lien « de confiance » du domaine → site malveillant).
- **Recommandation :** allowlister les domaines de destination, ou ne rediriger que vers des chemins relatifs connus.
- **Effort :** S

#### [P2][SECU] `promote-attachment` — `contactId` non vérifié contre le centre
- **Localisation :** `supabase/functions/promote-attachment/index.ts:63-74` (centre OK), `:154-168` (insert `contact_documents` avec `contactId` client non validé).
- **Constat :** le `centreId` est bien contrôlé mais le `contactId` fourni n'est jamais vérifié comme appartenant à ce centre.
- **Impact :** un admin/staff peut injecter un document dans le dossier d'un contact d'un autre centre.
- **Recommandation :** vérifier `contacts.centre_id == centreId` avant copie/insert.
- **Effort :** XS

#### [P2][SECU] `alma-webhook` — vérification de signature en mode dégradé permanent
- **Localisation :** `supabase/functions/alma-webhook/index.ts:18-37,90-97`.
- **Constat :** si `ALMA_WEBHOOK_SECRET` absent ou header `x-alma-signature` absent, la signature est acceptée ; même en cas de mismatch, on continue. Atténué par la ré-vérification via l'API Alma (`:133-146`) qui empêche de forger un état « payé ».
- **Impact :** rejeu/spam possibles (mitigés par l'idempotence `reference=ALMA-<id>`).
- **Recommandation :** une fois le secret configuré côté Alma, passer en rejet strict.
- **Effort :** S

#### [P2][SECU] Bucket `produits-photos` resté public malgré la privatisation de ses policies
- **Localisation :** `supabase/migrations/20260509104943_…:171` (`INSERT … 'produits-photos', true`) ; `20260616095544_…:119-126` (policies réservées aux rôles).
- **Constat :** l'intention (juin) était de rendre les photos privées, mais le flag bucket n'a jamais été repassé à `false` → un bucket `public=true` sert les objets **sans passer par RLS**.
- **Impact :** les photos de produits restent lisibles par tout Internet malgré le durcissement affiché (sensibilité faible).
- **Recommandation :** `UPDATE storage.buckets SET public=false WHERE id='produits-photos'` + `createSignedUrl`.
- **Effort :** XS

#### [P2][SECU] `getPublicUrl` employé sur des buckets privés (liens cassés ou bucket rendu public)
- **Localisation :** `src/hooks/useContactDocuments.ts:140` (`contact-documents`), `src/hooks/useSignatures.ts:179` (`signatures`), `src/hooks/useEmargements.ts:112` + `src/components/learner/LearnerEmargementTab.tsx:84` (`signatures`/`emargements`), `src/components/settings/CentreFormationSettings.tsx:145` (`centre-formation-assets`).
- **Constat :** ces buckets sont créés `public=false`. `getPublicUrl` sur un bucket privé renvoie une URL non autorisée (400) — **soit** les liens sont cassés (bug fonctionnel), **soit** un bucket a été basculé public au dashboard pour « faire marcher » ces URL, auquel cas pièces d'identité (`contact-documents`), documents signés et feuilles d'émargement deviennent lisibles par simple URL, sans authentification. Le bucket `emargements` n'est créé par aucune migration (flag public inconnu). **À confirmer par `SELECT id, public FROM storage.buckets;`**
- **Impact :** fuite potentielle de données personnelles / documents signés si l'un de ces buckets est public.
- **Recommandation :** confirmer que ces buckets sont privés ; remplacer ces `getPublicUrl` par `createSignedUrl` à durée courte.
- **Effort :** S

#### [P2][SECU] Pas de rate-limiting sur les endpoints publics
- **Localisation :** `api-v1`, `public-sign-document`, `resolve-signing-token`, `incoming-webhook`, `alma-webhook`, crons, `track-link/open`.
- **Constat :** aucune limitation de débit ni anti-rejeu applicatif ; `resolve-signing-token`/`public-sign-document` permettent le bruteforce de tokens sans limite.
- **Impact :** bruteforce de tokens/clés, DoS, abus d'envoi d'emails.
- **Recommandation :** rate-limit (par IP / clé / ressource) + compteur d'échecs.
- **Effort :** M

#### [P2][SECU] `generated_documents_legacy` — documents PII sans isolation par centre
- **Localisation :** créée `20260114202420_…`, policies finales « admin or staff » sans filtre centre.
- **Constat :** table héritée (remplacée par `generated_documents_v2`) contenant d'anciens documents nominatifs, lisibles admin/staff tous centres.
- **Recommandation :** purger/archiver, ou ajouter l'isolation via `contact_id`. À défaut, confirmer qu'elle est vide.
- **Effort :** S

#### [P2][SECU] Signature publique : `ip_signature` jamais renseignée (valeur probante)
- **Localisation :** `supabase/functions/public-sign-document/index.ts:190-200` (UPDATE sans IP) ; `sign_document_public` force `ip_signature = NULL` (`20260310184107_…:35`). Le portail interne, lui, pose l'IP (`src/hooks/useSignatures.ts:188`).
- **Constat :** le chemin **public** (celui réellement utilisé par les signataires) ne capture jamais l'IP, alors que la colonne existe.
- **Impact :** preuve de signature affaiblie (horodatage + user-agent seulement) — fragilise la valeur probante en cas de litige.
- **Recommandation :** capturer `x-forwarded-for` dans `public-sign-document` et l'écrire dans `ip_signature`.
- **Effort :** XS

#### [P3][SECU] Divers durcissements
- **CORS `*` en dur** sur ~30 fonctions + fallback `*` dans `_shared/cors.ts:44-65` (risque limité, auth par bearer) — généraliser `getCorsHeaders`, définir `ALLOWED_ORIGINS`. **Effort M.**
- **Fuites d'infos :** préfixes de clés loggés (`send-enquete-email/index.ts:34`, `alma-payment/index.ts:47`), `error.message` brut renvoyé au client (`incoming-webhook:389`, `generate-facturx:201`…) — messages génériques, logs serveur uniquement. **Effort S.**
- **Policies `TO public`** au lieu de `authenticated` (`document_instances`, `produit_categories_select`, `relance_paiement_config/queue`) — `anon` est filtré en pratique par `has_centre_access`, mais surface inutilement large. **Effort XS.**
- **URL signée d'un an** dans `SendDocumentsToContactDialog.tsx` (365 j) — réduire. **Effort XS.**

---

### 3.2 RGPD

#### [P2][RGPD] Rétention documentée mais non appliquée (aucune purge automatisée)
- **Localisation :** registre Art. 30 avec `delais_conservation` (`src/components/superadmin/pages/SuperAdminGdprRegister.tsx:628-631`) ; aucun job de purge dans `supabase/CRON_JOBS.md` (9 jobs, aucun de rétention) ; soft-delete conservé indéfiniment.
- **Constat :** les durées de conservation sont saisies mais rien ne les applique techniquement.
- **Recommandation :** cron de purge/anonymisation après échéance par catégorie (contacts inactifs, logs, tracking).
- **Effort :** M

#### [P2][RGPD] PII persistée dans les logs, helper de redaction inutilisé
- **Localisation :** `_shared/redact.ts` importé dans **1 seule fonction sur 45** (`sync-driveflow`) ; ~223 `console.*` bruts ; emails en clair (`send-signature-email:189,289`, `alma-webhook:122,351`…) ; `email_tracking_events` stocke `ip_address` + `user_agent` liés à `contact_id` (`track-link:76-86`).
- **Constat :** emails et IP (donnée personnelle) journalisés/persistés sans redaction ni rétention ; le helper construit n'est pas adopté.
- **Recommandation :** adopter `redactPayload/redactEmail` ; définir une rétention sur `email_tracking_events`/`email_logs`/`audit_logs` ; justifier la base légale du tracking IP.
- **Effort :** M

#### [P2][RGPD] Transferts de PII vers sous-traitants sans garde-fou centre
- **Localisation :** `sync-driveflow/index.ts:63-80` (contact → webhook DriveFlow, sans rôle ni scoping) ; `ia-action-plan/index.ts:25`, `ia-predictive-analysis/index.ts:21` (prospects/historique → LLM).
- **Recommandation :** recenser ces flux dans le registre Art. 30 ; DPA à jour ; pseudonymiser les données envoyées au LLM ; scoper `sync-driveflow`.
- **Effort :** M

#### [P3][RGPD] Consentement marketing par contact non tracé
- **Localisation :** aucun flag de consentement marketing trouvé sur `contacts` (seul `accepte_facture_electronique` existe).
- **Recommandation :** si des communications non contractuelles sont envoyées, ajouter un flag de consentement + date + source + lien de désinscription.
- **Effort :** S

> **Points RGPD conformes (à créditer) :** `export_contact_data` (droit d'accès) et `anonymize_contact` (effacement) sont **durcis** (`SECURITY DEFINER` + rôle + `has_centre_access` + audit — `migrations/20260305135411_…:9-93`) ; registre des traitements Art. 30, registre des violations (Art. 33/34), acceptations de charte présents.

---

### 3.3 ARCHITECTURE & QUALITÉ DE CODE

#### [P1][ARCHI] Duplication du calcul « reste à encaisser » avec incohérence de clamp (bug latent)
- **Localisation :** clampé (`Math.max(0, …)`) dans `src/components/sessions/SessionFinancialSummary.tsx:42,44`, `SessionFinancesTabContent.tsx:103` ; **non clampé** dans `src/components/facturation/AnalyseParSession.tsx:142` (`totalFacture - totalEncaisse`), `src/components/apprenants/tabs/ResumeTab.tsx:94` (`totalFacture - totalPaye`), `PaiementsTab.tsx:138`, `ApprenantTableRow.tsx:47`, `ApprenantDetailContent.tsx:185`, `useDashboardStats.ts:200`. Helper local non exporté `useDashboardData.ts:411`. **Vérifié : aucune fonction centralisée dans `src/lib/`.**
- **Impact :** une facture en trop-perçu affiche un reste **négatif** sur certains écrans et **0 €** sur d'autres — chiffres financiers incohérents entre vues.
- **Recommandation :** extraire `computeResteAEncaisser(facture)` + `computeTotalPaye(paiements)` dans `src/lib/facture-payer-utils.ts`, figer le clamp, remplacer les inline, ajouter un test.
- **Effort :** M

#### [P1][ARCHI] `(supabase as any)` sur des tables pourtant typées — sécurité de type jetée
- **Localisation :** `src/hooks/useTemplateStudioV2.ts` (**49 `any`**, `(supabase as any).from(...)` lignes 138-302), `GenerateDocumentModal.tsx:324`, `PresentationLeadForm.tsx:40` (`"leads" as any`), `useProduitsServices.ts:67-117`, `PaymentReminderTrackingPanel.tsx:80`, `PrevisionnelTab.tsx:98,626`.
- **Constat :** ces tables **existent** dans les types générés (`types.ts`). Les `as any` sont des contournements périmés qui désactivent le typage sur toute la chaîne d'appel (colonnes, payload d'insert, retour).
- **Impact :** zéro vérification sur des mutations d'écriture ; un renommage de colonne casse silencieusement à l'exécution.
- **Recommandation :** supprimer les `as any`, typer via `Tables<"...">`.
- **Effort :** M

#### [P2][ARCHI] God-components mêlant fetch, calcul et rendu
- **Localisation :** `aujourdhui/AujourdhuiPage.tsx` (1030 l., 16 `useState`, 23 `any`) + son hook `useAujourdhuiData.ts` (617 l., 38 `any`) ; `apprenants/ApprenantDetailContent.tsx` (805 l., 6 `supabase.from` directs en `Promise.all` L138-147) ; `sessions/SessionParcoursTab.tsx` (1110 l.) ; `tresorerie/ImportBancaireTab.tsx` (817 l.) ; `settings/SettingsPage.tsx` (809 l.).
- **Impact :** difficiles à tester/faire évoluer ; surface de conflit élevée.
- **Recommandation :** extraire la logique de calcul vers `src/lib/` (pur, testable) et le fetch vers des hooks dédiés, laisser le `.tsx` orchestrer. (Sans restructurer l'arborescence.)
- **Effort :** L

#### [P2][ARCHI] Code mort / dormant (~3 830 lignes)
- **Localisation :** `src/components/inbox/` (18 fichiers, 3 398 l., 0 import externe — dormant **documenté**, `navigationRegistry.ts:57`), `src/hooks/useInboxStats.ts` (mort), `useInboxRealtime.ts` (mort transitif), `src/components/template-studio-v2/` (2 fichiers, 432 l., mort accidentel). *À ne pas confondre : `useTemplateStudioV2.ts` et `dashboard/` sont vivants.*
- **Recommandation :** supprimer `template-studio-v2/` + `useInboxStats.ts` ; trancher (réactiver ou archiver hors `src/`) pour l'inbox.
- **Effort :** S (+ décision produit inbox)

#### [P2][ARCHI] Deux systèmes de toast montés en parallèle
- **Localisation :** `src/App.tsx:146-147` monte `<Toaster/>` (Radix) **et** `<Sonner/>`. Sonner : ~234 fichiers ; Radix `useToast` : 5 fichiers (`CRMAnalysisTab.tsx`, `PresentationLeadForm.tsx`).
- **Impact :** deux toasts au style/position différents selon l'écran + une lib bundlée pour rien.
- **Recommandation :** migrer ces 2 fichiers vers Sonner, retirer `@radix-ui/react-toast` et `<Toaster/>`.
- **Effort :** S

#### [P2][ARCHI] Une seule error boundary, à la racine, malgré le lazy-loading des pages
- **Localisation :** unique `AppErrorBoundary` montée en `src/App.tsx:148` ; aucune autre dans `src/`.
- **Impact :** un crash de rendu dans n'importe quelle page remonte à la racine → tout le CRM tombe (pas d'isolation par zone).
- **Recommandation :** ajouter des boundaries au niveau du shell de route dans `Index.tsx` (par hub).
- **Effort :** S

#### [P2][ARCHI] Triple implémentation du formatage monétaire
- **Localisation :** `src/lib/format-currency.ts` (`formatEur`, 10 fichiers), `src/lib/formatFinancial.ts` (`formatEuro`, 18 fichiers), + 22 fichiers en `Intl.NumberFormat`/`toLocaleString` ad hoc.
- **Impact :** rendus divergents (arrondis, symbole, espace insécable).
- **Recommandation :** garder un seul helper, réexporter l'autre en alias, remplacer progressivement les inline.
- **Effort :** S

#### [P2][ARCHI] Formulaires majoritairement ad hoc (react-hook-form minoritaire)
- **Localisation :** 70 composants `*Dialog/*Form`, dont **11** seulement en `useForm` ; `zodResolver` dans 12 fichiers. Ad hoc : `PaiementsPage.tsx` (18 `useState`), `SignaturePage.tsx` (18), `ProspectsPage.tsx` (19).
- **Impact :** validation incohérente, plus de bugs de saisie et de code répétitif.
- **Recommandation :** standardiser les nouveaux formulaires sur RHF + zod ; migrer en priorité les formulaires financiers/inscription.
- **Effort :** L (progressif)

#### [P3][ARCHI] Divers
- **Fetch Supabase direct dans 35 composants** (98 occurrences) hors couche hooks → migrer vers `src/hooks/`. **Effort M.**
- **Types manuels dupliquant les types générés** (`interface Facture` `useFactures.ts:11`, `Prospect` `useProspects.ts:8`) → dériver de `Tables<>`. **Effort S.**
- **6 `catch {}`** dont 5 sur `localStorage` (bénins). **Effort XS.**

---

### 3.4 BASE DE DONNÉES

#### [P1][BDD] Numérotation de facture globale (non scindée par centre) + race condition
- **Localisation :** `supabase/migrations/20260113225936_…:12` (`numero_facture TEXT NOT NULL UNIQUE`, global) et `:58-75` (`generate_numero_facture` = `SELECT COALESCE(MAX(...),0)+1 FROM public.factures`, **sans filtre `centre_id` ni verrou**).
- **Constat (vérifié) :** séquence `FAC-YYYY-NNNN` partagée entre centres + `MAX()+1` sans verrou = deux créations concurrentes tirent le même numéro (la 2ᵉ échoue sur le `UNIQUE`).
- **Impact :** numéros non contigus par centre + fuite du volume de l'autre centre (incompatible avec la séquence continue par émetteur exigée) ; échec de création de facture sous concurrence. Risque décuplé à l'ouverture du 2ᵉ centre.
- **Recommandation :** scoper génération **et** unicité par `centre_id` (`WHERE centre_id = …` + index unique `(centre_id, numero_facture)`), via l'agent Lovable, avant l'onboarding du 2ᵉ centre.
- **Effort :** M

#### [P1][BDD] Clés étrangères de tables « lignes/enfants » sans index
- **Localisation (vérifié : 0 index dans les migrations) :** `facture_lignes.facture_id` (FK `ON DELETE CASCADE`), `devis_lignes.devis_id`, `versements.paiement_id`.
- **Impact :** scan séquentiel à chaque join/`.eq`, et chaque `DELETE`/CASCADE sur la facture parente scanne toute la table enfant. Dégrade linéairement avec le volume.
- **Recommandation :** `CREATE INDEX` sur ces trois FK. **À confirmer d'abord** qu'ils n'ont pas été créés au dashboard (hors migrations).
- **Effort :** XS

#### [P2][BDD] Statuts en texte libre sans `CHECK` ni enum (tables chaudes)
- **Localisation :** `session_inscriptions.statut` (`…0310:54`, 45 usages front), `examens_pratique.statut` / `examens_t3p.statut` (`…1348:87`), `document_envois.statut` (`…1617:11`), `progression_pedagogique.statut`. (À comparer à `sessions`/`factures`/`devis` qui utilisent bien des enums.)
- **Impact :** valeurs divergentes silencieuses (`'inscrit'` vs `'Inscrit'`) → filtres et KPI faux.
- **Recommandation :** ajouter `CHECK (statut IN (...))` (pas un renommage, conforme Lovable).
- **Effort :** S

#### [P2][BDD] `centre_id NOT NULL` sans clé étrangère vers `centres`
- **Localisation :** `produits_services` (`…4943:36`), `produit_categories`, `email_snippets`, `facture_pdp_transmissions`, `invoice_transmission_logs`, `contact_requalification_log`.
- **Impact :** `centre_id` orphelin possible ; intégrité référentielle multi-tenant non garantie en base.
- **Recommandation :** ajouter la FK (après vérification des valeurs orphelines).
- **Effort :** S

#### [P2][BDD] Tables à `centre_id` sans index sur `centre_id` (volume)
- **Localisation :** `crm_email_messages`, `email_tracking_events`, `audit_logs`, `action_logs` (+ petites tables `reclamations`, `satisfaction_reponses`, `qualiopi_*`, `objectifs`, `workflows`).
- **Impact :** scan séquentiel filtré par RLS sur les tables qui grossissent.
- **Recommandation :** index `centre_id` sur les tables à volume (confirmer le volume d'abord).
- **Effort :** S

#### [P2][BDD] Agrégations et listes chargées en entier côté client
- **Localisation :** `useFactures.ts:105-155` (toutes les factures + jointures profondes + toute la table `paiements`, sans pagination — alors que `useFacturesPaginated` existe) ; `useDashboardData.ts:217-289` (`factures`/`paiements`/`contact_documents` sans borne ; inscriptions `.limit(1000)` avec `TODO(P2)`) ; `useContacts.ts:124-154` (tous les contacts pour ~6 nombres) ; `useEnrichedContacts.ts:53-94` (7 tables entières).
- **Impact :** payload et mémoire navigateur croissants avec la volumétrie ; soutient le coût « 39-55 requêtes/page ».
- **Recommandation :** agréger côté serveur (RPC/vues — plusieurs existent déjà : `centres_stats`, `session_inscription_counts`, `v_factures_enriched`) ; brancher les variantes paginées.
- **Effort :** M à L

#### [P2][BDD] État métier dénormalisé dans les notes `[AUTO]` (lu par regex)
- **Localisation :** ~15 emplacements — `ActionJournal.tsx:38`, `useAujourdhuiData.ts:81,337`, `CMATab.tsx:74-77` (`titre.startsWith('[AUTO]')`, `titre.like.*[AUTO]*`). Dette reconnue `CLAUDE.md §5.1`.
- **Impact :** source de vérité ambiguë et fragile ; `titre.like.*[AUTO]*` a un joker en tête → non indexable → scan séquentiel de `contact_historique`.
- **Recommandation :** s'appuyer sur les colonnes structurées (`auto_category`, `statut_cma`) comme seule source ; réserver `titre` à l'affichage.
- **Effort :** M (chantier déjà cadré)

#### [P3][BDD] Divers
- **Token de signature `signing_token`** nullable, index partiel **non unique** — passer en `UNIQUE` (défense en profondeur, zone sensible → via Lovable). **Effort XS.**
- **`generated_documents_legacy`** encore lue au runtime (`useDocumentSystemState`, `pdfResolver`) — finaliser la migration v2. **Effort M.**
- **Migrations** mêlant DDL et DML de backfill (48 migrations DML) ; idempotence partielle — documenter les migrations de backfill. **Effort S.**

---

### 3.5 PERFORMANCE

#### [P1][PERF] ~397 Ko gz de librairies inutiles préchargées au démarrage (artefact de bundling)
- **Localisation :** `dist/index.html:46-47` (`modulepreload` de `pdf-vendor` et `charts-vendor`), `vite.config.ts:126-143` (`manualChunks`).
- **Constat (vérifié sur le `dist/` réel) :** Rollup a placé le helper `__vitePreload` **dans** le chunk `pdf-vendor` (jsPDF + html2canvas + docxtemplater + jszip + pizzip, 285 Ko gz) et un helper dans `charts-vendor` (recharts, 112 Ko gz). Comme presque chaque `import()` paresseux passe par ce helper, le chunk d'entrée doit importer ces vendors **statiquement** → ils sont téléchargés et évalués **avant** que l'app démarre, alors qu'aucun ne sert au premier écran. Preuve que c'est un artefact : `xlsx-vendor` (419 Ko), qui n'a pas reçu le helper, reste bien lazy.
- **Impact :** ~397 Ko gz (1,36 Mo brut) de gaspillage sur le chemin critique = ~51 % du JS eager, à chaque premier chargement / post-déploiement. Le correctif seul ferait passer le JS eager de ~771 à ~375 Ko gz.
- **Recommandation :** passer `manualChunks` en forme fonction pour sortir le helper (`\0vite/preload-helper`) et isoler jsPDF/recharts dans des chunks référencés uniquement par des pages lazy ; `build.modulePreload.resolveDependencies` pour filtrer ces vendors. Valider avec `rollup-plugin-visualizer` puis relire `dist/index.html`.
- **Effort :** M

#### [P1][PERF] framer-motion (39 Ko gz) réellement sur le chemin critique
- **Localisation :** `src/pages/Index.tsx:8` (`PageTransition` enveloppe chaque page), `:10,:12`, `src/components/MainApp.tsx:8`.
- **Constat :** ici l'import statique est authentique (composants montés au boot). L'animation de transition (opacity + 8px) ne justifie pas 117 Ko bruts.
- **Recommandation :** remplacer `PageTransition` par une transition CSS pure + lazifier `OnboardingWizard`/`OnboardingChecklist`.
- **Effort :** M

#### [P2][PERF] `MainApp` tire Index + SuperAdmin + Onboarding + AIAssistant en statique
- **Localisation :** `src/App.tsx:29` (`lazy(Index)` **jamais rendu** = code mort) vs `src/components/MainApp.tsx:2,3,8` (imports statiques) ; `App.tsx:15` (`AIAssistant` monté d'emblée). Chunk `index` = 181 Ko gz.
- **Impact :** le chunk d'entrée embarque, pour tout utilisateur, `SuperAdminApp` (super-admin only), l'assistant IA et le drawer d'aide (react-markdown).
- **Recommandation :** lazifier `SuperAdminApp`, `OnboardingWizard`, `AIAssistant`, `HelpCenterDrawer` ; supprimer le `lazy(Index)` mort ; revoir `manualChunks` (react-dom a fui dans `index`).
- **Effort :** S à M

#### [P2][PERF] `FinancesPage` : 647 Ko (chunk le plus lourd), 6 onglets importés en statique
- **Localisation :** `src/components/finances/FinancesPage.tsx:7-12`.
- **Impact :** ouvrir Finances télécharge les 6 onglets d'un coup (dont `pdfjs-dist` et recharts).
- **Recommandation :** `React.lazy` par onglet avec `Suspense` dans chaque `<TabsContent>`.
- **Effort :** M

#### [P2][PERF] `public/pwa-192x192.png` pèse 811 Ko (précaché par le service worker)
- **Localisation :** `public/pwa-192x192.png` (811 Ko vs `pwa-512x512.png` = 13 Ko), précaché (`vite.config.ts:53`).
- **Recommandation :** ré-exporter en 192×192 optimisé (pngquant/oxipng) → ~10-15 Ko. Gain quasi gratuit.
- **Effort :** XS

#### [P2][PERF] Requêtes redondantes non dédupliquées
- **Localisation :** `src/lib/shared-queries.ts` (pattern de dédup) utilisé dans **4 fichiers seulement** ; mêmes tables tirées sous des clés différentes (`["contacts"]`, `["contacts","enriched"]`, `["contacts","paginated"]`…) donc non partagées par React Query.
- **Recommandation :** étendre `shared-queries` aux pages qui co-montent contacts/factures/paiements ; à terme, RPC/vue pré-agrégée.
- **Effort :** L

#### [P3][PERF] Divers
- **react-icons** importé pour **une seule** icône (`SiWhatsapp`, 10 fichiers) → SVG inline, retirer la dépendance. **Effort XS.**
- **canvas-confetti** eager (`OnboardingChecklist.tsx:4`) → `import()` dynamique ; **`value` de contextes non mémoïsés** (`NavigationContext:36`, `CentreContext:48-56`) → `useMemo`. **Effort XS.**

---

### 3.6 UX & FACILITÉ D'UTILISATION ⭐ (priorité n°1)

#### [P1][UX] Aucun état d'erreur : un chargement qui échoue s'affiche comme « vide »
- **Localisation :** seule `src/components/sessions/SessionsPage.tsx:182-184` gère `error`. Partout ailleurs les hooks retournent `[]` et l'échec ne remonte qu'en toast fugace : `RappelsPage.tsx:45` (pas de `isError` → « Aucun retard »), `ExamensTab.tsx:50`, Apprenants, Prospects, Finances, Paiements, Signatures. L'`AppErrorBoundary` ne capte que les crashes de rendu, pas les rejets de requête.
- **Impact :** **le point le plus dangereux pour ce CRM.** Si la requête « impayés » échoue (réseau, RLS), la secrétaire voit « Tout est à jour » et cesse de relancer. Un échec est présenté comme une bonne nouvelle.
- **Recommandation :** exposer `isError` dans les hooks de liste et afficher un encart « Impossible de charger — Réessayer » sur au minimum Rappels, Paiements, Apprenants, Aujourd'hui.
- **Effort :** M

#### [P1][UX] Écritures quotidiennes qui échouent en silence
- **Localisation :** mutations avec `onSuccess` mais **sans `onError`** : `FormationTab.tsx:61-73` (`updatePresence` — présence/absence), `CMATab.tsx:91-106` (`markReceived` — pièce CMA reçue), `InboxCrmPage:176`. Hooks entiers sans `onError` : `useTresorerie`, `useFinancialData`, `useNotifications`, `useLegalDocuments`, `useSecurityCharter`, `useGdprProcessingRegister`.
- **Impact :** la secrétaire coche « pièce reçue » ou « présent », rien ne signale un échec ; elle croit le dossier à jour, l'info a disparu le lendemain → érosion de la confiance.
- **Recommandation :** `onError: () => toast.error("…")` systématique, en priorité présence et pièces CMA.
- **Effort :** S

#### [P1][UX] Emails clients partant en un clic, sans aperçu ni confirmation
- **Localisation :** `ResultatsFormationCard.tsx:139,164` (félicitations → apprenant), `FactureDetailSheet.tsx:652` (facture PDF), `DevisDetailSheet.tsx:497` (devis), `AlmaPaymentSection.tsx:235` (lien de paiement), `SignaturesPage`/`SignaturesTrackingPanel.tsx:189` (relance). À comparer à `PaiementsPage.tsx:903` qui, elle, est protégée par un `AlertDialog` (commentaire `:280` : « un envoi direct au clic serait un piège à mauvais clic »).
- **Impact :** un mauvais clic = un email réel (facture, félicitations, relance) parti au mauvais destinataire, irréversible côté client.
- **Recommandation :** appliquer le même `AlertDialog` de confirmation à ces envois, a minima facture et félicitations.
- **Effort :** S/M

#### [P1][UX] Vocabulaire : trois mots pour la même personne (« apprenant » / « stagiaire » / « contact »)
- **Localisation :** `SessionInscritsTable.tsx` — titre « **Stagiaires** »:411, placeholder « **apprenant** »:423, « Aucun **stagiaire** »:480 ; `ContactFormDialog.tsx` « **apprenant** »:316,1090 vs `ExpressEnrollmentDialog.tsx` « **Stagiaire** »:396,695 ; `FactureFormDialog.tsx` « **Contact** »:381. Nav : « Apprenants ». (Comptes : apprenant 455, stagiaire 140, candidat 37.)
- **Impact :** charge cognitive quotidienne, doute (« stagiaire = apprenant ? »), formation des nouvelles secrétaires ralentie.
- **Recommandation :** figer un terme par cycle de vie (prospect → **apprenant**), bannir « stagiaire »/« contact » de l'UI (garder « contact » côté code/table). Commencer par le module Sessions.
- **Effort :** M

#### [P2][UX] Le fil d'Ariane est construit mais jamais affiché
- **Localisation :** `src/components/layout/AppBreadcrumb.tsx` (hiérarchie complète), rendu par `Header` seulement si `activeSection` + `onNavigate` sont passés (`Header.tsx:73`). Or les ~22 pages appellent `<Header title subtitle/>` **sans** ces props (`SessionsPage.tsx:123`, `ApprenantsPage.tsx:217`, `RappelsPage.tsx:134`…).
- **Impact :** la secrétaire ne voit qu'un titre, jamais le fil d'Ariane — aucun repère « où suis-je / remonter d'un niveau ». Fonctionnalité développée mais invisible.
- **Recommandation :** passer `activeSection`/`onNavigate` au `Header` (via le `NavigationProvider` déjà en place).
- **Effort :** M

#### [P2][UX] Recherche globale (⌘K) : entrées mortes vers l'Inbox débranchée
- **Localisation :** `src/components/layout/CommandPalette.tsx:37` (nav « Inbox ») et `:236-239` (« Ouvrir l'inbox »). L'Inbox a été retirée → `onNavigate("inbox")` tombe sur `default:` = Dashboard (masqué en sidebar pour un profil `staff` → écran « interdit » sans explication).
- **Recommandation :** retirer les entrées « Inbox » / « Ouvrir l'inbox » de la palette.
- **Effort :** XS

#### [P2][UX] Messages d'erreur bruts de Supabase montrés à la secrétaire
- **Localisation :** ~40 endroits affichent `error.message` (souvent en anglais) : `useSessionMutations.ts:174`, `FactureExpressDialog.tsx:102`, `PaiementsPage.tsx:305`, `Auth.tsx:56,153`, `FusionContactsDialog.tsx:51`, `useTemplateStudioV2.ts` (11×).
- **Impact :** message type « new row violates row-level security policy… » face à un utilisateur non technique = blocage anxiogène.
- **Recommandation :** mapper vers des messages FR clairs ; ne jamais afficher `error.message` nu.
- **Effort :** M

#### [P2][UX] Actions dangereuses : filet incohérent
- **Localisation :** désinscription d'un stagiaire au clic sans confirmation ni « annuler » visible (`InscritTableRow.tsx:348` → `useSessionMutations.ts:145-177`) ; `SoftDeleteConfirmDialog.tsx` (aperçu d'impact via `get_delete_impact`) **importé nulle part** ; suppressions sans confirmation (`TemplateLibraryV2.tsx:231` hard delete, `DevisPage.tsx:327`, sessions depuis `SessionsKanban/GroupedTable/CardMobile`) ; `window.confirm` natif (`SessionInscritsTable.tsx:138`, `SessionParcoursTab.tsx:700,843,943`, `FormationsPage.tsx:138`).
- **Recommandation :** brancher `SoftDeleteConfirmDialog` sur les suppressions à impact ; confirmation + toast « Annuler » pour la désinscription ; remplacer `window.confirm` par `AlertDialog`.
- **Effort :** S/M

#### [P2][UX] Deux systèmes de notification en parallèle
- (Voir aussi 3.3.) `App.tsx:146-147` — migrer les 2 écrans Radix vers Sonner. **Effort S.**

#### [P2][UX] Formulaires longs sans protection contre la perte de saisie
- **Localisation :** `ExpressEnrollmentDialog.tsx` (4 étapes, `Dialog onOpenChange`:378 sans garde), `FactureFormDialog.tsx` (lignes), `SessionFormDialog.tsx` (~40 champs). Radix ferme sur clic extérieur/Échap → tout perdu. `FactureExpressDialog` bloque déjà via `!pending` (`:109`).
- **Recommandation :** garde de fermeture « modifications non enregistrées » quand le formulaire est *dirty* + brouillon `localStorage`.
- **Effort :** M

#### [P2][UX] Validation seulement à la soumission
- **Localisation :** `ContactFormDialog.tsx:125`, `FactureFormDialog.tsx:127`, `SessionFormDialog.tsx:92` — `useForm` sans `mode` (défaut `onSubmit`).
- **Recommandation :** `mode: "onBlur"` sur les 3 formulaires cœur. **Effort XS.**

#### [P2][UX] Mobile : le tableau des inscrits d'une session n'a pas de vue carte
- **Localisation :** `SessionInscritsTable.tsx:432-484` (colonnes masquées en cascade, pas de variante carte comme `ApprenantsPage`). Le directeur utilise le CRM sur téléphone (fait avéré).
- **Recommandation :** réutiliser le pattern `md:hidden` + carte inscrit exposant CMA/facture/statut.
- **Effort :** M

#### [P2][UX] Statut d'inscription mis à jour 100 % manuellement, ligne par ligne
- **Localisation :** `SessionInscritsTable.tsx:299-315` (`handleStatutChange`/`handleDossierChange` par ligne), alors que l'émargement et l'envoi groupés existent.
- **Recommandation :** action groupée « passer les sélectionnés en Confirmé/Présent ».
- **Effort :** S

#### [P2][A11y] Boutons icône sans nom accessible + sélecteurs `<Card onClick>` non clavier
- **Localisation :** ~180 `size="icon"` pour ~91 `aria-label` (muets : `FactureFormDialog.tsx:575-583`, `SessionInscritsTable.tsx:425`) ; sélecteurs `<Card onClick>` du parcours d'inscription non focusables (`ExpressEnrollmentDialog.tsx:467-563`). Contre-exemple exemplaire : `InscritTableRow.tsx:277-328`.
- **Impact :** lecteur d'écran muet + pas d'infobulle ; inscription inutilisable au clavier.
- **Recommandation :** `aria-label` systématique sur les boutons icône ; `role="radio"` + `tabIndex` + `onKeyDown` sur les cartes de sélection.
- **Effort :** S

#### [P2][A11y] Contraste du CTA orange sous le seuil AA
- **Localisation :** `index.css:39-41` (`--cta: 26 83% 52%` + texte blanc ≈ **3,1:1** < 4,5:1) ; badge « CF » 11 px `Sidebar.tsx:286`.
- **Recommandation :** assombrir le CTA quand il porte du texte, ou réserver l'orange au texte large/gras. Vérifier au contrast-checker.
- **Effort :** S

#### [P2][UX] Ruptures de parcours depuis « Rappels »
- **Localisation :** `RappelsPage.tsx:76-89` — un rappel « session »/« signature » **quitte** la page (navigation plein écran, perte du filtre/scroll), alors que « paiement »/« dossier » ouvrent une fiche en overlay.
- **Recommandation :** ouvrir la session en `SessionDetailSheet` en overlay.
- **Effort :** M

#### [P3][UX] Divers
- **Vocabulaire :** anglicismes de pilotage (`PipelinePage` « Leads »:337, `AidePage` « Dashboard »:10 alors que la nav dit « Tableau de bord ») → harmoniser. **Effort XS.**
- **Cohérence visuelle :** couleurs en dur `QualiopiCriteres.tsx:141-142` (`#22c55e/#f97316/#ef4444` au lieu de tokens) ; flyers `marketing/` sur une charte print distincte (à clarifier). **Effort XS/S.**
- **Saisie de résultat d'examen** : geste parfait (`ExamensTab.tsx:322`) mais 5 clics d'accès → permettre la saisie inline dans le bloc « Résultats à vérifier » d'Aujourd'hui (2 clics). **Effort M.**
- **Palette ⌘K** : « Planifier une session »/« Nouvelle facture » naviguent au lieu de créer (`CommandPalette.tsx:228,232`) → ouvrir le dialogue ou renommer. **Effort S.**
- **Inscription express** : étape « Pièces » optionnelle compressible (4 → 3 étapes). **Effort S.**
- **États vides** absents sur Aujourd'hui/Dashboard (sous-titre seul). **Effort S.**

> **Encadré — Les 5 changements qui simplifieraient le plus la vie des utilisateurs** (voir aussi `QUICK_WINS.md`) :
> 1. **Afficher une vraie erreur** quand un chargement échoue (au lieu de « vide »/« tout est à jour ») — fiabilité perçue. **M**
> 2. **Feedback sur les écritures silencieuses** (présence, pièce CMA reçue) : un toast d'échec systématique. **S**
> 3. **Confirmation avant l'envoi d'un email client** (facture, félicitations) — supprime le piège du mauvais clic. **S**
> 4. **Un seul mot pour l'apprenant** (bannir « stagiaire »/« contact » de l'écran Sessions). **M**
> 5. **Nettoyer les entrées mortes ⌘K (Inbox)** + **valider les formulaires `onBlur`**. **XS**

---

### 3.7 COUVERTURE MÉTIER (T3P / Qualiopi)

*(Le P0 « pilotage Qualiopi déconnecté » est en 3.1.)*

#### [P1][METIER] Stages de récupération de points : activité réglementée absente (placeholder mort et piégeux)
- **Localisation :** `src/constants/formations.ts:1194` (type `RECUPERATION_POINTS`), `:1143` (tarif 250) — mais `getProgramme/getPrerequis/getObjectifs` renvoient `[]` (branche `default`, `:1249-1307`), `getTarif` renvoie **0 €** (`:1308`), l'enum DB `formation_type` ne contient pas ce type, `documentMatrix.ts` n'a aucune entrée.
- **Constat :** un type + un prix orphelins, non créables comme session. Régime réglementaire totalement différent (agrément préfectoral, animateurs BAFM + psychologue, 14 h sans examen).
- **Impact :** si le centre vend ces stages, tout se fait hors outil ; un devis calculé sortirait à 0 €.
- **Recommandation :** soit retirer le placeholder mort (CORRECTIF, **XS**), soit modéliser l'activité (ÉVOLUTION, **L**).
- **Type :** ÉVOLUTION PRODUIT (+ correctif du placeholder).

#### [P1][METIER] Pas de dossier de preuve Qualiopi « clé en main »
- **Localisation :** `supabase/functions/export-audit-pack/index.ts` ne lit que `generated_documents_v2` (PDF déjà générés) ; `PackAuditModal.tsx` produit un récap à part. Ni l'un ni l'autre ne consolide les **preuves natives** : émargements horodatés (`emargements`), satisfaction (`satisfaction_reponses`), réclamations (`reclamations`), preuves par indicateur (`qualiopi_preuves`). L'émargement n'est exportable qu'à l'unité (DOCX).
- **Impact :** l'auditeur demande, par indicateur, un faisceau de preuves ; il faut recomposer le dossier à la main depuis 3-4 exports hétérogènes.
- **Recommandation :** un « pack de preuve » unique par centre/période (émargements PDF horodatés + synthèse satisfaction/NPS + registre réclamations + preuves par indicateur).
- **Type :** ÉVOLUTION PRODUIT — **Effort M.**

#### [P2][METIER] Positionnement et évaluations formatives non structurés
- **Localisation :** enum `pedagogical_document_type = 'test_positionnement'`, `complianceEngine.ts` (contrôle regex du template) ; aucune table de résultats de positionnement. Pratique bien structurée (`examens_pratique` + `grilles_evaluation`).
- **Impact :** preuve « positionnement réalisé » = fichier joint ; impossible d'agréger un score d'entrée (critère 2, ind. 8).
- **Recommandation :** table de positionnement structurée reliée à l'inscription. **Type ÉVOLUTION — Effort S/M.**

#### [P2][METIER] Critère 6 (veilles légale/handicap/métier) sans registre dédié
- **Localisation :** recherche `veille` = 0 module structuré ; preuves via upload libre dans `qualiopi_preuves`.
- **Recommandation :** mini-registre de veille daté (source, date, impact, action) rattaché aux indicateurs 23-25. **Type ÉVOLUTION — Effort S.**

#### [P3][METIER] Nommage trompeur : le module « requalification » = nettoyage de données legacy
- **Localisation :** `src/lib/requalification/categories.ts` (catégories `…_smartof`) — reclasse les contacts importés de l'ancien outil, rien à voir avec la requalification/mobilité réglementaire.
- **Recommandation :** clarifier le libellé/la doc. **Type CORRECTIF — Effort XS.**

> **Cycle de vie T3P — couverture :** Lead ✅ · Inscription ✅ · Convention/devis ✅ · Convocation ✅ (auto J-7) · Émargement ✅✅ (horodaté + IP + user-agent + trigger d'audit) · Évaluations/examens ⚠️ (pratique structurée, positionnement = document) · Résultat ✅ · Attestation ✅ · Facturation ✅ (Factur-X + FEC) · Encaissement ✅ (Alma/CPF) · Satisfaction ✅✅ (boucle fermée, chaud/froid, NPS) · Archivage ✅.
> **Multi-activité** bien modélisée (TAXI/VTC/VMDTR/continue/mobilité, initial 5 pièces vs continue 3) ; **absente : récupération de points.**

---

### 3.8 TESTS, MAINTENABILITÉ, EXPLOITATION

*(Le P0 « suppressions dures » est en 3.1.)*

#### [P1][MAINT] Aucun suivi d'erreurs front en production
- **Localisation :** `grep sentry` = 0 ; unique dispositif = `AppErrorBoundary.tsx:24-31` (`console.error` seul).
- **Impact :** une erreur de rendu chez l'utilisateur (type React #310 déjà vécu le 21/07) est invisible côté équipe tant qu'elle n'est pas signalée. Pour un directeur non technique, un crash silencieux peut durer des jours.
- **Recommandation :** brancher `componentDidCatch` sur un collecteur (Sentry ou insertion `client_errors` via edge function).
- **Effort :** S

#### [P1][MAINT] Zones critiques sans aucun test
- **Localisation :** 18 fichiers de test, 161 `it/test`, tous de **logique pure**. Non testés : isolation RLS multi-tenant (`grep centre_id/rls` dans les tests = 0), 50 edge functions (0 test), flux de signature, réconciliation Alma edge, toutes les mutations base, `complianceEngine.ts` (36 Ko), `parseBankPdf.ts` (13 Ko). La commission Alma, elle, est bien couverte (asymétrie).
- **Impact :** les régressions les plus coûteuses (fuite inter-centres, signature rejouable, calcul de reste dû faux) passeraient au vert.
- **Recommandation :** (1) harnais d'intégration RLS (deux centres) ; (2) tests Deno sur 3-4 edge functions sensibles ; (3) tests de table sur `facture-payer-utils`/`relance-paiement`/`useSessionFinancials`.
- **Effort :** L

#### [P2][MAINT] Outillage de test incomplet
- **Localisation :** `package.json:6-11` (aucun script `test`), pas de `@vitest/coverage-v8` (couverture non mesurable), `@testing-library/user-event` **absent** (tests d'interaction impossibles).
- **Recommandation :** ajouter `@vitest/coverage-v8` + `user-event`, un script `"test": "vitest run"` et un seuil de couverture sur `src/lib/`.
- **Effort :** S

#### [P2][MAINT] Logs edge non structurés, helper de redaction quasi inutilisé
- **Localisation :** `_shared/redact.ts` importé dans **1 fonction sur 45** ; ~223 `console.*` bruts sans niveau/corrélation.
- **Recommandation :** généraliser `redactPayload` aux fonctions manipulant du client ; préfixer les logs `[fonction] niveau`.
- **Effort :** M

#### [P2][MAINT] Audit applicatif solide mais partiel sur les tables sensibles
- **Localisation :** trigger `audit_trigger_function()` (`20260114114222_…:37`) sur **14 tables** ; **manquent** `facture_lignes`, `transactions_bancaires`, `formateur_factures`, `qualiopi_preuves/audits/actions`, `seances_conduite`, `cartes_professionnelles`, `financial_costs`, `contact_documents`.
- **Impact :** les modifications/suppressions sur ces tables (financières, conformité) ne laissent aucune trace « qui/quand/quoi ».
- **Recommandation :** étendre le trigger aux tables financières et Qualiopi manquantes (réutilise la fonction existante).
- **Effort :** S

#### [P2][MAINT] README = boilerplate ; pas de seed de démo
- **Localisation :** `README.md` (placeholders génériques), le vrai savoir vit dans `CLAUDE.md` (machine sans Node natif, `bun.lock`, contrainte Lovable) ; `supabase/seeds/` = 1 fichier (gabarits), aucun seed de données de démo.
- **Recommandation :** réécrire le README pour pointer vers `CLAUDE.md` ; ajouter un mini-seed anonymisé.
- **Effort :** S

#### [P3][MAINT] Documentation proliférante à la racine (14 fichiers, genres mélangés)
- **Localisation :** `AMELIORATIONS.md`, `AUDIT_CRM_T3P.md` (périmé : parle de RLS à durcir, déjà livré), `CLAUDE.md:108` (« 59+ tests » vs 161 réels), `AMELIORATIONS.md` (« 7 jobs » vs `CRON_JOBS.md` « 9 »)…
- **Recommandation :** déplacer les instantanés datés dans `docs/archive/`, corriger les compteurs, index en tête de README.
- **Effort :** S

---

## 4. À confirmer manuellement (invérifiable statiquement)

Ces points nécessitent l'état réel de la base en ligne ou l'app en fonctionnement (accès via le panneau Cloud Lovable / DevTools).

1. **`verify_jwt` réel du gateway** pour les fonctions non déclarées dans `config.toml` — **critique pour `download-email-attachment`** (public → P0 si `false`) et les trackers/crons.
2. **Grants `EXECUTE` par défaut** sur `soft_delete_record`/`restore_record` et les 4 RPC de signature (défaut `PUBLIC`/`anon` non révoqué → détermine si le P1 soft-delete devient P0).
3. **Existence réelle des index** sur `facture_lignes.facture_id`, `devis_lignes.devis_id`, `versements.paiement_id` et `centre_id` sur les grosses tables (peuvent avoir été créés au dashboard hors migrations) : `SELECT * FROM pg_indexes WHERE tablename IN (...)`.
4. **RLS `ENABLE` réellement active** sur les tables créées via dashboard (`envois_groupes`, 13 tables `lms_*`).
5. **Flag `public` runtime des buckets** (le dépôt indique `produits-photos=true`).
6. **Politique de sauvegarde / PITR** Supabase (rétention, fenêtre de restauration) — déterminant pour le risque des suppressions dures.
7. **Secrets configurés en prod** : `ALMA_WEBHOOK_SECRET`, `WEBHOOK_SECRET`/`DRIVEFLOW_API_KEY` (sinon `incoming-webhook` fail-open), `CRON_SECRET` (inexistant).
8. **Couverture de tests réelle** : installer `@vitest/coverage-v8` puis `vitest run --coverage`.
9. **Comportement de `generate_numero_facture`** en conditions concurrentes ; existence de doublons/orphelins avant l'ouverture du 2ᵉ centre.
10. **Mesures de performance runtime** : Lighthouse (mobile 4G, cache froid) sur `/dashboard` avant/après le correctif P1 ; nombre de requêtes Supabase/page.
11. **`generated_documents_legacy`** : confirmer qu'elle est vide/inactive.

---

## Annexe — Cartographie (Phase 0)

- **Volume :** 843 fichiers `src/` (~185 000 lignes), 227 migrations, ~50 edge functions, ~127 tables + 6 vues + ~90 RPC, 9 crons pg_cron (8 actifs).
- **Hubs :** Aujourd'hui · Apprenants · Sessions · Finances · Rappels. **Menu Plus :** Pilotage (Tableau de bord, Prospects, Signatures), Production (Catalogue, Forfaits, Formateurs, Partenaires), Qualité, Administration (Automations, Sécurité, Corbeille, Doublons, Requalification).
- **Navigation :** registre `src/config/navigationRegistry.ts` + switch `Index.tsx` + routes `App.tsx` (test de cohérence `navigationRegistry.test.ts`).
- **Données :** hooks TanStack Query (`src/hooks/`), logique pure dans `src/lib/` (14 fichiers testés). Multi-tenant `centre_id` + RLS. Soft-delete via `soft_delete_record` + Corbeille.
