# Jobs planifiés (pg_cron) — état de référence

Les jobs ci-dessous vivent dans la base (table `cron.job`), pas dans les
migrations : ils ont été créés via le dashboard / l'éditeur SQL. Ce fichier
est la **référence versionnée** de leur configuration. Après toute
modification d'un job, mettre ce fichier à jour.

Vérifier l'état réel : `SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;`

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
| `sync-gmail-inbox-every-5min` | `*/5 * * * *` | `sync-gmail-inbox` | Synchronisation Gmail |

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
    headers := '{"Content-Type":"application/json","apikey":"<ANON_KEY>"}'::jsonb,
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
