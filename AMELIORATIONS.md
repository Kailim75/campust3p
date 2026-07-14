# AMÉLIORATIONS — T3P Campus

**Date :** 9 juillet 2026 · **Périmètre :** analyse du code et des migrations uniquement (pas d'accès à la base Supabase en ligne — les points dépendant de l'état runtime sont marqués **« à vérifier »** avec la requête de contrôle).

> **Mise à jour du 10 juillet 2026 — vérifications runtime effectuées** (via le panneau Cloud de Lovable, en lecture seule) :
>
> - **Crons (§3.1) : 7 jobs actifs** côté serveur, créés via le dashboard (invisibles dans les migrations) : `send-convocation-cron-daily` (8h ✅ les convocations J-7 partent), `exam-reminders-daily` (9h), `daily-automated-emails` (8h), `daily-crm-report-7h30` (5h30), `process-payment-reminders-hourly`, `alma-reconcile-daily` (3h15), `sync-gmail-inbox-every-5min`. **Seul manquant : `generate-notifications`** — jamais planifié, la cloche de notifications internes ne se remplit donc jamais automatiquement.
> - **Index (§3.7) : confirmé.** `signature_requests` n'a que la pkey + l'index du signing_token (rien sur `contact_id`/`statut`) ; `factures` n'a aucun index sur `statut`/`date_echeance`. Aux volumes actuels, priorité basse.
> - **Volumes (§5.4) : base légère** — audit_logs 14 800, emargements 2 062, email_logs 1 927, document_envois 1 449, contact_documents 1 019, contact_historique 1 010, **signature_requests 740**, contacts 698, factures 452, session_inscriptions 411, paiements 215, sessions 77, prospects 68. → le chantier d'agrégation serveur (§5.4) **peut attendre** ; les 740 demandes de signature sans écran de suivi font des §4.1-§4.3 la priorité n°1.
> - **`statut_cma` (§4.5) : renseigné partout** (valide 534, docs_manquants 113, en_cours 1, aucun NULL) → l'unification de la source de vérité est directement faisable.
>
> **Réalisé depuis le rapport :** lot 1 (PR #3) = §3.2, §3.3, §3.4, §3.6 · lot 2 (PR #4) = §4.1, §4.2 + cron `generate-notifications-daily` · lot 3 (PR #5) = §4.3 (fonction `signature-reminders` déployée + cron `signature-reminders-daily`), §4.5, §3.5 + `supabase/CRON_JOBS.md` · lot 4 = §4.4 (identité multi-centre des convocations), §4.6 (notifications signatures), suppression des pages orphelines (§6.4 : décision « supprimer »).
>
> **Décisions directeur (11/07/2026) :** un 2e centre est prévu à moins de 12 mois (§6.1). Check-list d'onboarding d'un nouveau centre : renseigner `centres` (nom_commercial, adresse_complete, telephone, email, siret, nda) **et** `centres.settings` (`email_from_address`, `email_reply_to`, `qualiopi_numero`), sinon les envois automatiques replient sur l'identité legacy du 1er centre. Restent mono-centre, à corriger avant l'ouverture : `send-automated-emails` (chemin bulk, `centre_formation` limit(1)), `send-signature-email` et `signature-reminders` (adresse FROM en dur), génération PDF côté front (`useCentreFormation`).

**Zones exclues conformément au cadrage :** flux de signature électronique (bug 401 sur les lots en cours de correction côté Lovable — aucune refonte proposée ici, seules des actions *autour* du flux existant sont suggérées), trigger `trg_lock_signed_signature_request`, policies RLS durcies (`crm-email-attachments`, `template_audit_log`), absence de `centre_id` sur `leads` (décision produit en attente), warnings SECURITY DEFINER différés, mises à jour `jspdf`/`vitest`.

---

## 1. Résumé exécutif

Le CRM est **mature et bien outillé** : navigation par registre central, lazy-loading des sections, palette de commandes, hub « Aujourd'hui » riche (CMA, relances, préparation sessions), file de relances de paiement avec cron horaire, exports Excel/CSV existants. Le problème n'est pas le manque de fonctionnalités mais **des fonctionnalités débranchées ou incomplètes** : trois pages entières sont orphelines (suivi des signatures inclus), 6 des 7 fonctions « cron » ne sont planifiées dans aucune migration (dont l'envoi automatique des convocations J-7), et plusieurs états métier vivent dans des notes en texte libre parsées par regex.

**Les 3 meilleurs ratios impact/effort :**
1. **Vérifier et planifier les crons manquants** — si `send-convocation-cron` n'est pas planifié côté dashboard, les convocations J-7 ne partent pas ; une requête SQL de 10 secondes lève le doute (§3.1).
2. **Passer les envois groupés de documents de N appels réseau à 1** — le endpoint accepte déjà un tableau `recipients[]`, seul le front boucle (§3.2).
3. **Relance en un clic des signatures en attente** — rien n'existe aujourd'hui, ni manuel ni automatique, alors que la fonction d'envoi est réutilisable telle quelle (§4.1).

---

## 2. Top 10 priorisé

| # | Amélioration | Impact métier concret | Effort | Risque régression |
|---|---|---|---|---|
| 1 | Vérifier/planifier les 6 crons non planifiés (convocations J-7, rappels examens, notifications, rapport quotidien, réconciliation Alma) | Convocations et rappels partent seuls au lieu d'être faits à la main | ~1 h (après vérif.) | Faible — fonctions déjà écrites et testables en `dryRun` |
| 2 | Envoi groupé de documents : 1 appel bulk au lieu de N appels séquentiels | Envoi à 20 candidats : quasi instantané au lieu de ~1 min, avec rapport d'échecs fiable | ~2 h | Faible — le chemin bulk existe déjà côté serveur |
| 3 | Bouton « Relancer » sur une signature envoyée non signée | Plus besoin de recopier le lien et d'écrire un email à la main pour chaque retardataire | ½ j | Faible — réutilise `send-signature-email` sans toucher au flux de signature |
| 4 | Relance automatique des signatures à J-3 avant expiration | Zéro suivi manuel des signatures qui traînent | 1 j | Faible — nouveau cron isolé, ne modifie que des demandes non signées |
| 5 | Rebrancher (ou supprimer) les 3 pages orphelines : `SignaturesPage`, `DocumentsUnifiedPage`, `FacturationUnifiedPage` | Le suivi global des signatures redevient accessible ; sinon ~2 300 lignes de code mort en moins | ½ j | Faible — décision produit requise (§6.4) |
| 6 | Ne plus envoyer d'email « voici votre document » **sans** le document quand la PJ dépasse 5 Mo | Fin des convocations reçues sans convocation jointe | ~2 h | Faible |
| 7 | Badge « signatures en attente » dans la sidebar + bloc dans « Aujourd'hui » | Le directeur voit l'encours de signatures sans chercher | ½ j | Faible — patterns badges/blocs déjà en place |
| 8 | Export un clic des dossiers CMA incomplets depuis le bloc CMA | La liste de suivi CMA envoyée/imprimée sans ressaisie | ~2 h | Nul — lecture seule |
| 9 | Corriger l'identité du centre dans `send-convocation-cron` (actuellement `centre_formation` ligne 1 + fallback en dur) | PDF et emails de convocation corrects si un 2ᵉ centre ouvre | ½ j | Faible en mono-centre, indispensable avant multi-centre |
| 10 | Remplacer les états métier stockés en notes texte `[AUTO]` par des données structurées | Fiabilise « Carte Pro envoyée », « reporté jusqu'au », « à reprogrammer » — aujourd'hui cassables par une simple reformulation de titre | 2 j+ (chantier) | Moyen — migration progressive requise (§5.1) |

---

## 3. Quick wins (< ~2 h chacun)

### 3.1 Vérifier puis planifier les crons manquants
- **Problème constaté :** une seule fonction planifiée dans les migrations : `process-payment-reminders` (migration `20260114004035_…`, cron horaire). Les 6 autres fonctions conçues comme crons — `send-convocation-cron`, `send-automated-emails`, `send-exam-reminders`, `send-daily-report`, `generate-notifications`, `alma-reconcile-cron` — n'apparaissent dans **aucune** migration `cron.schedule`. Elles ont peut-être été planifiées via le dashboard Supabase (invisible depuis le repo).
- **À vérifier (SQL Editor Supabase) :**
  ```sql
  SELECT jobname, schedule, active, command FROM cron.job ORDER BY jobname;
  ```
- **Amélioration :** pour chaque cron absent, l'ajouter via une migration `cron.schedule` (comme celle des relances de paiement) afin que la planification soit versionnée et survive à une restauration. Tester d'abord `send-convocation-cron` avec `?dryRun=true&days=7`.
- **Bénéfice :** les convocations J-7 ([send-convocation-cron/index.ts](supabase/functions/send-convocation-cron/index.ts) est complet : anti-doublon, PDF joint, logs `document_envois` + `email_logs`) partent sans intervention humaine — c'est exactement le « travail manuel répétitif » que le directeur veut éliminer.
- **Ne touche pas :** le contenu des fonctions, le flux de signature, les RLS.

### 3.2 Envois groupés : un appel au lieu de N
- **Problème constaté :** [BulkSendDocumentsDialog.tsx:94-118](src/components/contacts/BulkSendDocumentsDialog.tsx:94) boucle `for (const contact of contactsWithEmail)` avec **une invocation de `send-automated-emails` par contact**, alors que la fonction traite déjà un envoi en lot : [send-automated-emails/index.ts:139](supabase/functions/send-automated-emails/index.ts:139) lit `body.recipients` (tableau). 20 candidats = 20 allers-retours réseau séquentiels, échecs comptés mais non détaillés.
- **Amélioration :** construire un seul `body.recipients[]` et faire un seul `functions.invoke`, afficher le détail des échecs retourné par la fonction.
- **Bénéfice :** envoi quasi instantané, rapport d'erreurs fiable par destinataire.
- **Ne touche pas :** la fonction edge (déjà compatible), le format des emails.

### 3.3 PJ trop volumineuse : ne pas envoyer l'email sans le document
- **Problème constaté :** [SessionDocumentsSendModal.tsx:170-173 et ~207](src/components/sessions/SessionDocumentsSendModal.tsx:170) — si le PDF dépasse 5 Mo : `toast.warning("Document trop volumineux (>5Mo). Envoi sans pièce jointe.")` puis **l'email part quand même, sans le document**. Le candidat reçoit « veuillez trouver votre convocation ci-joint » sans pièce jointe ; l'opérateur ne le voit que s'il lit le toast.
- **Amélioration :** exclure ce destinataire de l'envoi et le lister dans le récapitulatif d'erreurs (ou, plus tard, remplacer la PJ par un lien de téléchargement).
- **Bénéfice :** plus d'emails incohérents envoyés aux candidats.
- **Ne touche pas :** la génération PDF, les envois valides.

### 3.4 Suppressions en masse : arrêter d'avaler les erreurs
- **Problème constaté :** [ProspectsPage.tsx:295](src/components/prospects/ProspectsPage.tsx:295) `try { await deleteProspect.mutateAsync(id); … } catch {}` — boucle séquentielle, échec silencieux ; même motif dans [ContactsUnifiedPage.tsx:540-552](src/components/contacts/ContactsUnifiedPage.tsx:540). Le toast affiche « N supprimés » même si une partie a échoué (dans la variante ContactsUnifiedPage, le premier échec interrompt la boucle sans dire combien ont été traités).
- **Amélioration :** `Promise.allSettled` + toast différencié « X supprimés, Y échecs » (les suppressions passent par le RPC `soft_delete_record`, donc restaurables via la Corbeille — le parallélisme est sûr).
- **Bénéfice :** l'admin sait ce qui a réellement été supprimé.
- **Ne touche pas :** le RPC de soft-delete, la Corbeille.

### 3.5 Badge « Signatures en attente » dans la sidebar
- **Problème constaté :** [useSidebarBadges.ts](src/hooks/useSidebarBadges.ts) compte prospects, threads inbox et factures — mais aucun compteur de `signature_requests` au statut `envoye` non signé. Et comme la page de suivi global est orpheline (§4.2), **aucun écran du quotidien n'affiche l'encours de signatures**.
- **Amélioration :** ajouter un count `signature_requests` (statut `envoye`, non expiré) au hook, affiché sur la section qui héberge le suivi (selon la décision §6.4).
- **Bénéfice :** l'encours de signatures visible en permanence, sans clic.
- **Ne touche pas :** le flux de signature, les tables.

### 3.6 Export un clic des dossiers CMA incomplets
- **Problème constaté :** le bloc CMA d'« Aujourd'hui » ([useAujourdhuiData.ts:157-204](src/components/aujourdhui/useAujourdhuiData.ts:157)) calcule déjà, par candidat, les pièces manquantes, le track (initial/renouvellement) et l'urgence — mais il n'y a aucun export. Pour transmettre une liste de suivi CMA, l'équipe ressaisit. Les utilitaires existent pourtant ([useExportData.ts](src/hooks/useExportData.ts) : `exportToExcel`, `exportToCSV` ; `SessionParcoursTab.handleExportAdmis` exporte déjà les admis).
- **Amélioration :** bouton « Exporter » sur `BlocCma` réutilisant `exportToExcel` sur les `cmaItems` (nom, formation, pièces manquantes, téléphone, email, urgence).
- **Bénéfice :** liste d'admissibilité/suivi CMA prête en un clic.
- **Ne touche pas :** les données, le calcul CMA.

### 3.7 Index probablement manquants (à vérifier avant création)
- **Problème constaté :** dans les migrations, `signature_requests` n'a **aucun** index secondaire, et `factures` n'a pas d'index sur `(statut, date_echeance)` alors que ce couple est filtré partout (retards de paiement dans `useAujourdhuiData`, `generate-notifications`, badges sidebar).
- **À vérifier (les index ont pu être créés via le dashboard) :**
  ```sql
  SELECT tablename, indexname, indexdef FROM pg_indexes
  WHERE schemaname = 'public' AND tablename IN ('signature_requests','factures')
  ORDER BY tablename;
  ```
- **Amélioration :** si absents — `CREATE INDEX ON signature_requests(contact_id); CREATE INDEX ON signature_requests(statut);` et `CREATE INDEX ON factures(statut, date_echeance);` via migration.
- **Bénéfice :** listes et badges qui restent rapides quand les volumes grossissent.
- **Ne touche pas :** aucune donnée, aucune policy.

---

## 4. Améliorations moyennes (½ journée à 2 jours)

### 4.1 Relance manuelle des signatures en attente (½ j)
- **Problème constaté :** [SignaturesPage.tsx:351-368](src/components/signatures/SignaturesPage.tsx:351) ne propose « Envoyer » que pour le statut `en_attente` ; pour un document `envoye` non signé, il n'existe que « Copier le lien » et « Signer (test) ». [useSignatures.ts](src/hooks/useSignatures.ts) n'a aucune mutation de relance, et [send-signature-email/index.ts:21](supabase/functions/send-signature-email/index.ts:21) ne connaît que `signature_request | contrat_location`. Relancer un candidat = copier le lien + composer un email à la main.
- **Amélioration :** un item « Relancer par email » sur les demandes `envoye` non expirées, qui ré-invoque `send-signature-email` avec la demande existante (même token, même document). Optionnel : sujet préfixé « Rappel — ». Tracer la relance dans `email_logs` (déjà alimenté par la fonction).
- **Bénéfice :** relance en 1 clic au lieu de ~6 étapes manuelles ; historique conservé.
- **Ne touche pas :** le flux de signature lui-même (pas de nouveau token, pas de modification de `signature_requests`, donc aucun conflit avec le correctif 401 en cours ni avec le trigger de gel). **À coordonner :** ne pas déployer pendant une session d'édition Lovable sur ce flux.

### 4.2 Rebrancher le suivi des signatures et des documents (½ j + décision produit)
- **Problème constaté :** trois pages complètes ne sont importées nulle part : [SignaturesPage.tsx](src/components/signatures/SignaturesPage.tsx) (stats + table + [SignaturesTrackingPanel](src/components/signatures/SignaturesTrackingPanel.tsx) de suivi par session), [DocumentsUnifiedPage.tsx](src/components/documents/DocumentsUnifiedPage.tsx), [FacturationUnifiedPage.tsx](src/components/facturation/FacturationUnifiedPage.tsx). Aucune entrée dans [navigationRegistry.ts](src/config/navigationRegistry.ts) ni dans le switch d'[Index.tsx](src/pages/Index.tsx). Résultat : le seul suivi de signatures accessible est par session (`SessionDetailSheet` → matrice documentaire) — pas de vue transverse « tout ce qui attend une signature ».
- **Amélioration :** selon la réponse du directeur (§6.4) : soit ajouter une entrée de navigation (le registre rend l'ajout trivial : une ligne dans `NAV_REGISTRY` + un case dans `Index.tsx`), soit supprimer ces fichiers (~2 300 lignes) pour alléger la maintenance. Vu la valeur du `SignaturesTrackingPanel`, le rebranchement est recommandé pour au moins la partie signatures.
- **Bénéfice :** vue transverse des signatures en attente ; ou code mort en moins.
- **Ne touche pas :** le flux de signature, les autres routes.

### 4.3 Relance automatique avant expiration des signatures (1 j)
- **Problème constaté :** aucune fonction edge ne touche `signature_requests` côté automatisation (seules `send-signature-email`, `public-sign-document`, `resolve-signing-token` y accèdent). `generate-notifications` couvre examens, paiements, contacts, sessions — pas les signatures. Le statut « expiré » n'est d'ailleurs que **calculé à l'affichage** ([SignaturesPage.tsx:297,323](src/components/signatures/SignaturesPage.tsx:297)) : en base, la demande reste `envoye`.
- **Amélioration :** une nouvelle fonction cron (sur le modèle de `send-convocation-cron`) qui : (1) relance par email les demandes `envoye` dont `date_expiration` est à J-3, une seule fois (tracer dans `email_logs` avec un `template_used` dédié pour l'anti-doublon) ; (2) passe à `expire` les demandes `envoye` dont l'expiration est dépassée. Elle ne modifie **que** des lignes non signées — le trigger `trg_lock_signed_signature_request` gèle les signées et doit rester intact ; prévoir un test qui vérifie que le cron ignore toute ligne `signe`.
- **Bénéfice :** plus aucun suivi manuel des signatures qui traînent ; les stats de la page signatures deviennent justes (les « envoyées » ne comptent plus des demandes mortes).
- **Ne touche pas :** le flux de signature côté candidat, les demandes signées, le trigger de gel.

### 4.4 Identité du centre dans les convocations automatiques (½ j)
- **Problème constaté :** [send-convocation-cron/index.ts:126-138](supabase/functions/send-convocation-cron/index.ts:126) charge l'identité du centre avec `from("centre_formation").select("*").limit(1).single()` (commentaire : « on prend la 1ère ligne globale (legacy) ») et des fallbacks en dur `"Ecole T3P Montrouge"` / `"3 rue Corneille, 92120 Montrouge"` (lignes 32-33 et 131-134). En multi-centre, toutes les convocations PDF porteraient l'identité du premier centre.
- **Amélioration :** résoudre `centre_formation` par le `centre_id` de la session (comme c'est déjà fait pour `email_from_address` via la table `centres`, lignes 144-154), et sortir les valeurs par défaut dans la config du centre.
- **Bénéfice :** convocations juridiquement correctes quel que soit le centre émetteur.
- **Ne touche pas :** le contenu du PDF, l'anti-doublon, la planification.

### 4.5 Une seule source de vérité pour le statut CMA (1 j)
- **Problème constaté :** l'enum `statut_cma` existe (`docs_manquants | en_cours | valide | rejete`, visible dans [types.ts:9691](src/integrations/supabase/types.ts:9691)) et la colonne est même sélectionnée dans la requête — mais [useAujourdhuiData.ts:168-172](src/components/aujourdhui/useAujourdhuiData.ts:168) recatégorise chaque contact par string-matching sur le **libellé** du statut général : `statStr.includes("rejet") … statStr.includes("en cours")`. Deux sources de vérité qui peuvent diverger ; un nouveau libellé de statut casse silencieusement la catégorisation du bloc CMA.
- **Amélioration :** utiliser `c.statut_cma` comme source primaire, garder le string-matching en fallback temporaire avec un log, puis le retirer. Vérifier au préalable que `statut_cma` est bien renseigné en base :
  ```sql
  SELECT statut_cma, count(*) FROM contacts WHERE archived = false GROUP BY statut_cma;
  ```
- **Bénéfice :** le bloc CMA (cœur du pilotage quotidien) devient fiable et insensible aux libellés.
- **Ne touche pas :** l'enum, les écrans qui écrivent `statut_cma`.

### 4.6 Notifications internes sur les signatures (½ j)
- **Problème constaté :** [generate-notifications/index.ts](supabase/functions/generate-notifications/index.ts) crée des notifications pour examens T3P/pratique, paiements, contacts et sessions — rien pour les signatures (refus d'un document, expiration imminente).
- **Amélioration :** ajouter deux blocs au même modèle : `signature_requests.statut = 'refuse'` récents, et `envoye` avec expiration ≤ 3 jours.
- **Bénéfice :** l'équipe est prévenue d'un refus sans ouvrir la page signatures.
- **Ne touche pas :** la table `signature_requests` (lecture seule), le flux de signature.

### 4.7 Alléger le chargement du pipeline contacts (½ j)
- **Problème constaté :** [ContactsUnifiedPage.tsx:199](src/components/contacts/ContactsUnifiedPage.tsx:199) utilise `useContacts()` qui charge **tous** les contacts avec `select("*")` ([useContacts.ts:11-26](src/hooks/useContacts.ts:11)) — alors que la vue liste ([ContactsTable.tsx:87](src/components/contacts/ContactsTable.tsx:87)) utilise déjà `useContactsPaginated`. Le kanban a besoin de toutes les cartes, mais pas des ~30 colonnes par contact ; idem `BulkChevaletDialog` qui ne consomme que 4 champs.
- **Amélioration :** une variante `useContactsLight()` qui sélectionne uniquement `id, prenom, nom, email, statut, formation, created_at` pour le pipeline et les chevalets.
- **Bénéfice :** pipeline réactif même à 1 000+ contacts ; moins de données transférées à chaque invalidation de cache.
- **Ne touche pas :** la table, la vue liste paginée, le drag-and-drop.

---

## 5. Chantiers structurels (à planifier)

### 5.1 Sortir les états métier des notes texte `[AUTO]`
- **Constat :** plusieurs états du quotidien sont stockés comme **titres/contenus de notes** dans `contact_historique` puis reconstruits par regex dans [useAujourdhuiData.ts](src/components/aujourdhui/useAujourdhuiData.ts) :
  - reports d'action : parsing de `Bloc: …` et `Jusqu'au: YYYY-MM-DD` dans le contenu (lignes 78-91) ;
  - « info Carte Pro envoyée » : existence d'une note dont le titre contient `%Carte Pro%` (lignes 276-285) ;
  - « examen reprogrammé » : titre `LIKE '%[AUTO]%rogramm%'` (ligne 303).
  Une reformulation de titre, une faute de frappe ou une note manuelle contenant « Carte Pro » change le comportement du cockpit.
- **Proposition :** table `contact_workflow_flags` (`contact_id`, `flag` enum, `valid_until`, `metadata jsonb`, `created_by`) alimentée par les mêmes actions UI. Migration progressive : écrire dans les deux systèmes, basculer la lecture bloc par bloc, garder les notes comme trace humaine. Prérequis : inventaire exhaustif des écritures `[AUTO]` (`grep -rn '"\[AUTO\]' src`).
- **Bénéfice :** le hub « Aujourd'hui » devient déterministe ; les états deviennent requêtables (stats, exports).
- **Risque :** moyen — à faire bloc par bloc avec le double-write. **Ne touche pas :** l'historique existant (les notes restent).

### 5.2 Converger les deux générateurs PDF
- **Constat :** la génération documentaire existe **en double** : [src/lib/pdf-generator.ts](src/lib/pdf-generator.ts) (3 231 lignes, côté navigateur) et [supabase/functions/_shared/pdf-generator.ts](supabase/functions/_shared/pdf-generator.ts) (1 389 lignes, côté edge, utilisé par le cron de convocations et les envois automatiques). Même métier, deux implémentations : une évolution de maquette (mentions légales, NDA, Qualiopi) faite d'un seul côté produit des documents divergents selon qu'ils partent d'un envoi manuel ou automatique.
- **Proposition :** ne pas fusionner à court terme (risque élevé, et Lovable travaille sur le front). D'abord : (1) documenter la double implémentation en tête des deux fichiers ; (2) créer des tests « golden file » qui comparent les champs critiques (identité centre, montants, dates) générés par les deux chemins pour un même jeu de données ; (3) à moyen terme, extraire les *données* de chaque document (le contenu, pas le rendu) dans un module partagé.
- **Bénéfice :** fin du risque de convocations/attestations différentes selon le canal d'envoi.
- **Risque :** élevé si fusion brutale — d'où l'approche par tests d'abord. **Ne touche pas :** les templates du Template Studio.

### 5.3 Inventaire et retrait des systèmes redondants
- **Constat :** en plus des 3 pages orphelines (§4.2), coexistent `src/components/workflow/` (stepper d'inscription, utilisé) et `src/components/workflows/` (moteur d'automatisation, utilisé) — noms quasi identiques pour deux domaines différents ; `template-studio/` et `template-studio-v2/` ; `generated_documents_legacy` en base ; `useDashboardPeriod` **et** `useDashboardPeriodV2` ; `PaiementsPage` montée deux fois (via `FinancesPage` active et via `FacturationUnifiedPage` orpheline).
- **Proposition :** une passe d'inventaire (imports croisés) aboutissant à une liste « à supprimer / à renommer / à garder », validée par le directeur, puis suppression par petits lots réversibles. Sur un repo synchronisé Lovable, **pas de renommage de dossiers** — uniquement suppressions de fichiers non importés et commentaires d'orientation.
- **Bénéfice :** chaque futur développement (humain, Lovable ou Claude) cesse d'hésiter entre deux implémentations.
- **Risque :** faible si l'on se limite aux fichiers dont l'absence d'import est vérifiée.

### 5.4 Agréger les données du hub « Aujourd'hui » côté serveur
- **Constat :** [useAujourdhuiData.ts:30-57](src/components/aujourdhui/useAujourdhuiData.ts:30) charge en parallèle **l'intégralité** de `contacts`, `contact_documents`, `factures`, `paiements`, `session_inscriptions`, `examens_*`… puis croise tout en JavaScript. Idem pour [useDashboardData.ts](src/hooks/useDashboardData.ts) (797 lignes). Fonctionnel aujourd'hui ; à quelques milliers de contacts, le hub deviendra le point lent de chaque matinée.
- **À vérifier (volumétrie réelle) :**
  ```sql
  SELECT relname, n_live_tup FROM pg_stat_user_tables
  WHERE relname IN ('contacts','factures','paiements','session_inscriptions','contact_documents','contact_historique')
  ORDER BY n_live_tup DESC;
  ```
- **Proposition :** si les volumes le justifient, déplacer les croisements dans une fonction RPC Postgres (ou une vue) retournant directement les blocs (CMA, critiques, préparation sessions), le front gardant l'affichage. Découpage possible bloc par bloc.
- **Bénéfice :** hub instantané quel que soit le volume ; moins de logique dupliquée entre Dashboard et Aujourd'hui.
- **Risque :** moyen (logique métier à transposer en SQL) — à couvrir par comparaison des sorties avant/après sur données réelles.

### 5.5 Découper les composants > 800 lignes (opportuniste)
- **Constat :** [SessionParcoursTab.tsx](src/components/sessions/SessionParcoursTab.tsx) (1 108), [ContactFormDialog.tsx](src/components/contacts/ContactFormDialog.tsx) (1 098), [SendDocumentsToContactDialog.tsx](src/components/sessions/SendDocumentsToContactDialog.tsx) (1 005), [AujourdhuiPage.tsx](src/components/aujourdhui/AujourdhuiPage.tsx) (860), [PaiementsPage.tsx](src/components/paiements/PaiementsPage.tsx) (849). Le pattern de découpage existe déjà dans le projet (`sessions/inscrits/`, `aujourdhui/Bloc*.tsx`).
- **Proposition :** pas de chantier dédié — règle d'équipe : à chaque intervention sur l'un de ces fichiers, extraire le sous-bloc touché. Priorité à `SessionParcoursTab` (le plus central au quotidien).
- **Risque :** faible si découpage sans changement de comportement, un fichier à la fois.

---

## 6. Questions au directeur

1. **Multi-centre : horizon réel ?** Le modèle est multi-tenant (RLS par `centre_id`) mais plusieurs chemins supposent un centre unique (identité `centre_formation` « 1ère ligne » dans le cron de convocations §4.4, adresses en dur). Si un 2ᵉ centre est prévu à moins de 12 mois, le §4.4 devient prioritaire ; sinon il peut attendre.
2. **Convocations automatiques J-7 : la règle est-elle validée ?** La fonction n'envoie qu'aux inscriptions `statut = 'valide'` (dossier CMA validé) et **renvoie automatiquement** si la session a été modifiée après le dernier envoi. Confirmer ces deux règles avant de planifier le cron (§3.1) — notamment : faut-il convoquer les inscrits dont le dossier n'est pas encore validé ?
3. **Politique de relance des signatures :** combien de relances, à quel rythme (proposition : une relance manuelle libre + une automatique à J-3 avant expiration), et avec quel ton d'email ? Nécessaire avant §4.1/§4.3.
4. **Pages orphelines (§4.2) :** rebrancher le suivi global des signatures et la page documents unifiée dans la navigation, ou les supprimer ? (Recommandation : rebrancher au moins le suivi signatures.)
5. **Leads :** décision toujours en attente sur le rattachement à un centre — sans elle, aucune amélioration du module leads n'est proposée ici (conformément au cadrage).
6. **Notifications internes :** qui doit recevoir quoi ? `generate-notifications` crée des notifications in-app pour tous les admins ; faut-il un canal email quotidien (le `send-daily-report` existe déjà, non planifié) et pour quels rôles ?

---

## 7. Annexe — Proposition de `CLAUDE.md`

```markdown
# CLAUDE.md — T3P Campus

CRM multi-tenant pour centres de formation de chauffeurs (Taxi, VTC, VMDTR).
Stack : React 18 + Vite + TypeScript + Tailwind + shadcn/Radix, Supabase
(Postgres + RLS par `centre_id`, edge functions Deno), emails Resend,
paiements Alma. **Repo synchronisé avec Lovable** — voir « Règles Lovable ».

## Règles Lovable (impératives)
- Ne jamais restructurer l'arborescence, renommer des dossiers, ni changer
  la stack ou l'outillage de build (Vite, Tailwind, ESLint, configs TS).
- Ne jamais travailler en parallèle d'une session d'édition Lovable active.
- Petits commits réversibles, un lot à la fois.

## Zones sensibles — NE PAS TOUCHER sans accord explicite
- **Flux de signature électronique** (`SignaturePage`, `public-sign-document`,
  `resolve-signing-token`, `send-signature-email`) : correctif 401 en cours
  côté Lovable sur les lots de documents.
- **Trigger `trg_lock_signed_signature_request`** sur `signature_requests` :
  gèle les signatures posées. Aucune migration ne doit le désactiver ni le
  contourner.
- **Policies RLS durcies** : bucket `crm-email-attachments`, table
  `template_audit_log`. Ne pas élargir.
- Les ~150 warnings SECURITY DEFINER sont **différés volontairement** : ne
  pas « corriger » en masse.

## Architecture — repères
- Navigation : registre central `src/config/navigationRegistry.ts` +
  switch dans `src/pages/Index.tsx` (sections lazy-loadées). Une nouvelle
  page = une entrée registre + un case Index + test de cohérence
  (`src/config/__tests__/navigationRegistry.test.ts`).
- Données : hooks TanStack Query dans `src/hooks/` (un fichier par domaine).
  Version paginée quand elle existe (`useContactsPaginated`,
  `useFacturesPaginated`) — préférer ces variantes.
- Multi-tenant : `centre_id` sur presque toutes les tables, RLS active.
  Création d'enregistrement : passer par `getUserCentreId()`
  (`src/utils/getCentreId.ts`). Exception connue : `leads` n'a pas de
  `centre_id` (décision produit en attente — ne pas « corriger »).
- Suppression : soft-delete via RPC `soft_delete_record` (+ Corbeille),
  jamais de DELETE direct sur les tables métier.
- Documents PDF : DEUX générateurs (front `src/lib/pdf-generator.ts`,
  edge `supabase/functions/_shared/pdf-generator.ts`). Toute évolution de
  contenu documentaire doit être reportée dans les deux.
- Docs CMA : source de vérité `src/lib/cma-constants.ts` (types de pièces
  + alias). Ne pas introduire de nouveaux types de documents en texte libre.

## Base de données
- Migrations dans `supabase/migrations/` (214+). La base en ligne peut
  différer (modifs dashboard) : pour tout ce qui dépend du runtime (crons
  `cron.job`, index, policies), vérifier par SQL avant d'affirmer.
- Enums existants à réutiliser : `session_status`, `statut_cma`,
  `prospect_status`, `statut_apprenant`… — pas de nouveaux statuts en
  texte libre.
- Tout nouveau cron doit être planifié par migration `cron.schedule`
  (modèle : migration `20260114004035…`, relances de paiement).

## Vérifications avant de conclure « ça marche »
- `npx vitest run` (11 suites, ciblées lib/config).
- `npm run build` (le lint est permissif, le build attrape les erreurs TS).
- Pour les envois d'emails : utiliser les modes `dryRun` des fonctions
  (`send-convocation-cron` accepte `?dryRun=true&days=N`).

## Dettes connues (ne pas redécouvrir)
- `jspdf` et `vitest` à mettre à jour.
- Pages orphelines : `SignaturesPage`, `DocumentsUnifiedPage`,
  `FacturationUnifiedPage` (décision rebrancher/supprimer en attente).
- États métier en notes `[AUTO]` dans `contact_historique` (chantier de
  normalisation planifié — voir AMELIORATIONS.md §5.1).
```
