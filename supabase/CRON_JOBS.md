# Jobs planifiés (pg_cron) — état de référence

Les jobs ci-dessous vivent dans la base (table `cron.job`), pas dans les
migrations : ils ont été créés via le dashboard / l'éditeur SQL. Ce fichier
est la **référence versionnée** de leur configuration. Après toute
modification d'un job, mettre ce fichier à jour.

Vérifier l'état réel : `SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;`

**État au 21/07/2026 : 9 jobs, dont 8 actifs et 1 en pause** (`sync-gmail-inbox-every-5min`).

> **À faire (10/09/2026)** : le 9ᵉ job, `sync-gmail-inbox-every-5min`, n'a plus
> de fonction à appeler — l'Inbox CRM et les 6 edge functions Gmail ont été
> supprimées du repo. Le supprimer pour de bon (`SELECT cron.unschedule(3);`,
> ou `cron.unschedule('sync-gmail-inbox-every-5min')`) et demander à l'agent
> Lovable de désinstaller les fonctions `sync-gmail-inbox`, `send-gmail-reply`,
> `send-gmail-new`, `promote-attachment`, `download-email-attachment` et
> `gmail-thread-actions` (le sync GitHub ne désinstalle rien). Les tables
> `crm_email_*` sont conservées, dormantes — aucun écran ne les lit plus.

## Mettre un job en pause (plutôt que le supprimer)

`cron.alter_job` suspend l'exécution **sans perdre la définition** — la
commande, la planification et le jobid sont conservés, la réactivation tient
en une ligne. À préférer systématiquement à `cron.unschedule`, qui détruit la
définition et oblige à la recréer de mémoire.

```sql
SELECT cron.alter_job(<jobid>, active := false);  -- pause
SELECT cron.alter_job(<jobid>, active := true);   -- reprise
```

Les horaires sont en **UTC** (Paris = UTC+1 hiver / UTC+2 été).

| Job | Planification | Fonction appelée | Rôle |
|---|---|---|---|
| `alma-reconcile-daily` | `15 3 * * *` | `alma-reconcile-cron` | Réconciliation paiements Alma |
| `daily-automated-emails` | `0 8 * * *` | `send-automated-emails` | Emails automatiques quotidiens |
| `daily-crm-report-7h30` | `30 5 * * *` | `send-daily-report` | Rapport CRM quotidien |
| `exam-reminders-daily` | `0 9 * * *` | `send-exam-reminders` | Rappels d'examens |
| `generate-notifications-daily` | `0 5 * * *` | `generate-notifications` | Notifications internes (cloche) — créé le 11/07/2026 ; depuis le 17/07/2026 inclut les alertes de parcours d'examen (type `parcours` : résultat non reçu ≥ 35 j, convocation CMA non reçue ≥ 28 j, seuils de `src/lib/parcours-examen.ts`) |
| `process-payment-reminders-hourly` | `0 * * * *` | `process-payment-reminders` | File de relances de paiement (aussi dans la migration `20260114004035`) |
| `send-convocation-cron-daily` | `0 8 * * *` | `send-convocation-cron` | Convocations automatiques J-7 |
| `signature-reminders-daily` | `30 6 * * *` | `signature-reminders` | Relance signatures J-3 + passage à `expire` — **à créer après déploiement de la fonction** (voir ci-dessous) |
| `sync-gmail-inbox-every-5min` | `*/5 * * * *` | `sync-gmail-inbox` | Synchronisation Gmail — **EN PAUSE depuis le 21/07/2026** (`active = false`), **à supprimer** : l'Inbox CRM et la fonction `sync-gmail-inbox` n'existent plus depuis le 10/09/2026. Ne pas le réactiver (il appellerait une fonction absente ; aucun écran n'affiche plus les emails, aucun moyen de reconnecter un compte Gmail). `SELECT cron.unschedule(3);` |

## Secret des crons (`CRON_SECRET`) — activation

Depuis le 09/09/2026 (audit du 13/08, P1 : crons déclenchables par quiconque
avec l'URL + la clé anon publique), chaque fonction cron passe par la garde
`_shared/cron-auth.ts` : si le secret `CRON_SECRET` est configuré dans les
secrets des edge functions, l'en-tête `x-cron-secret` est exigé (401 sinon).
Tant qu'il n'est pas configuré, les appels sont acceptés avec un avertissement
dans les logs (mode transition — aucune automatisation coupée).

**L'ordre compte** : tant que le secret n'existe pas, l'en-tête est ignoré (il
ne casse rien) ; dès qu'il existe, tout appel sans en-tête est refusé en 401.
On ajoute donc l'en-tête AVANT de créer le secret — l'inverse couperait les
7 crons pendant tout l'intervalle (relances horaires et jobs quotidiens
tombant dans la fenêtre, sans autre alerte que les logs des fonctions).

Activation, dans cet ordre :
1. Générer un secret fort (ex. `openssl rand -hex 32`) et le garder de côté,
   **sans le déclarer encore**. Mettre à jour chaque job pour envoyer
   l'en-tête : `cron.schedule` étant idempotent sur le nom, reprendre la
   commande de chaque job en ajoutant `"x-cron-secret":"<CRON_SECRET>"` aux
   headers (cf. modèle ci-dessous). Les crons continuent de tourner.
2. Déclarer alors le secret dans les secrets des edge functions sous le nom
   `CRON_SECRET` (agent Lovable). La garde devient active immédiatement.
3. Vérifier **tout de suite**, sans attendre le lendemain : un appel manuel
   avec l'en-tête doit répondre 200 (`?dryRun=true` sur `send-convocation-cron`
   ou `signature-reminders`), le même appel sans en-tête doit répondre 401.

Fonctions concernées : `alma-reconcile-cron`, `send-daily-report`,
`send-convocation-cron`, `signature-reminders`, `send-exam-reminders`,
`generate-notifications`, `process-payment-reminders`. Le test manuel
`?dryRun=true` reste possible en envoyant l'en-tête.

⚠️ `alma-reconcile-cron` a aussi un appelant **front** : le panneau
« Réconciliation Alma » (`src/components/finances/AlmaCronMonitorPanel.tsx`)
l'invoque depuis le CRM avec le JWT de l'utilisateur, sans en-tête
`x-cron-secret`. Ce bouton se met donc à répondre 401 dès l'étape 2, à moins
que la fonction n'accepte le JWT d'un admin comme alternative au secret
(correctif traité dans un autre lot) — vérifier ce point avant de créer le
secret, ou prévenir l'équipe.

## Modèle de création d'un job

`cron.schedule` est idempotent sur le nom : relancer la commande met à jour
le job existant. La clé `apikey` est la clé **anon publique** du projet
(déjà présente dans le bundle front et la migration `20260114004035`).

```sql
SELECT cron.schedule(
  'signature-reminders-daily',
  '30 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/signature-reminders',
    headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);
```

## signature-reminders — prérequis et test

1. La fonction `supabase/functions/signature-reminders/` doit être déployée
   (elle l'est automatiquement quand Lovable synchronise le repo).
2. Tester d'abord à blanc : appeler la fonction avec `?dryRun=true` et
   vérifier le compte `expired` / `reminded` retourné.
3. Créer le job seulement après un dry-run concluant.

Garde-fous de la fonction : ne modifie que des demandes `envoye` (jamais une
demande signée — gel par `trg_lock_signed_signature_request`), ne crée aucun
token, une seule relance par demande (dédup `email_logs.metadata`).
