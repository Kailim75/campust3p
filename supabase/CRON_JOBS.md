# Jobs planifiés (pg_cron) — état de référence

Les jobs ci-dessous vivent dans la base (table `cron.job`), pas dans les
migrations : ils ont été créés via le dashboard / l'éditeur SQL. Ce fichier
est la **référence versionnée** de leur configuration. Après toute
modification d'un job, mettre ce fichier à jour.

Vérifier l'état réel : `SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;`

**État au 10/09/2026 : 8 jobs, tous actifs.**

> **Fait le 10/09/2026** : `sync-gmail-inbox-every-5min` (9ᵉ job, en pause
> depuis le 21/07) a été supprimé par `cron.unschedule`, et l'agent Lovable a
> désinstallé les 7 edge functions devenues sans appelant : `sync-gmail-inbox`,
> `send-gmail-reply`, `send-gmail-new`, `promote-attachment`,
> `download-email-attachment`, `gmail-thread-actions` et `crm-analysis`.
> Les tables `crm_email_*` sont conservées, dormantes — aucun écran ne les lit
> plus, et il n'existe plus de moyen de reconnecter un compte Gmail.

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
| `signature-reminders-daily` | `30 6 * * *` | `signature-reminders` | Relance signatures J-3 + passage à `expire` — job créé et actif (cf. l'état en tête de fichier) |

*(`sync-gmail-inbox-every-5min`, 9ᵉ job historique, a été supprimé le
10/09/2026 en même temps que la fonction qu'il appelait — voir l'encadré en
tête de fichier.)*

## Secret des crons (`CRON_SECRET`) — ACTIF depuis le 10/09/2026

> **Fait le 10/09/2026, vers 11h15 UTC.** Le secret `CRON_SECRET` est créé et
> déclaré dans les secrets des edge functions, et les **8 jobs pg_cron portent
> l'en-tête `x-cron-secret`**. La garde est active en production.
>
> **Vérification faite le jour même**, sur `send-convocation-cron?dryRun=true` :
> appel **avec** l'en-tête → **200** ; appel **sans** l'en-tête → **401**.
>
> Ce qui suit n'est donc plus une activation à faire, mais la procédure de
> référence : elle a été suivie ce jour-là, et doit l'être à nouveau, dans le
> même ordre, pour toute **rotation** du secret.

Depuis le 09/09/2026 (audit du 13/08, P1 : crons déclenchables par quiconque
avec l'URL + la clé anon publique), chaque fonction cron passe par la garde
`_shared/cron-auth.ts` : le secret `CRON_SECRET` étant configuré, l'en-tête
`x-cron-secret` est exigé (401 sinon).

⚠️ **Deux variantes de garde — le mode transition n'est PAS universel :**

| Variante | Fonctions | `CRON_SECRET` absent |
|---|---|---|
| `checkCronSecret` (tolérante) | les 7 crons purs | appel **accepté** avec un avertissement dans les logs (mode transition — sans objet depuis le 10/09/2026 : le secret existe, l'en-tête est exigé) |
| `cronSecretMatches` (STRICTE) | `send-automated-emails` **uniquement** | voie cron **refusée**, repli sur la garde JWT admin/staff → le job pg_cron reçoit 401 |

`send-automated-emails` est le seul cas mixte : elle sert à la fois le job
`daily-automated-emails` et les envois manuels du CRM. Sa voie cron n'est
qu'une alternative au JWT, donc pas de mode transition — sinon retirer le
secret rouvrirait la fonction à quiconque connaît l'URL (`verify_jwt = false`).
Depuis le 10/09/2026 ses deux chemins sont **exclusifs** : avec
`x-cron-secret`, seule la campagne automatique tourne (tout corps contenant
`recipients` / `to` / `type` est refusé en 403) ; avec un JWT admin/staff,
seuls les envois manuels sont acceptés (un corps non reconnu renvoie 400 au
lieu de déclencher la campagne du jour).

**L'ordre compte** : tant que le secret n'existe pas, l'en-tête est ignoré (il
ne casse rien) ; dès qu'il existe, tout appel sans en-tête est refusé en 401.
On ajoute donc l'en-tête AVANT de créer le secret — l'inverse couperait les
7 crons tolérants pendant tout l'intervalle (relances horaires et jobs
quotidiens tombant dans la fenêtre, sans autre alerte que les logs des
fonctions). `send-automated-emails` échappe à ce raisonnement : étant en
variante stricte, sa voie cron ne s'ouvre qu'une fois le secret créé.

### Procédure de référence — suivie le 10/09/2026, à rejouer pour toute rotation

1. Générer un secret fort (ex. `openssl rand -hex 32`) et le garder de côté,
   **sans le déclarer encore**. Mettre à jour chaque job pour envoyer
   l'en-tête : `cron.schedule` étant idempotent sur le nom, reprendre la
   commande de chaque job en ajoutant `"x-cron-secret":"<CRON_SECRET>"` aux
   headers (cf. modèle ci-dessous). Les crons continuent de tourner.
2. Déclarer alors le secret dans les secrets des edge functions sous le nom
   `CRON_SECRET` (agent Lovable). La garde devient active immédiatement.
3. Vérifier **tout de suite**, sans attendre le lendemain : un appel manuel
   avec l'en-tête **et `?dryRun=true`** doit répondre 200, le même appel sans
   en-tête doit répondre 401. Toujours passer par `?dryRun=true` :
   `send-convocation-cron`, `signature-reminders` et — depuis le 10/09/2026 —
   `send-automated-emails` renvoient alors le décompte de ce qui **serait**
   envoyé, sans appeler Resend ni écrire dans `email_logs`. Sans ce paramètre,
   la vérification envoie de vrais emails aux candidats.

Fonctions concernées (**8**) : `alma-reconcile-cron`, `send-daily-report`,
`send-convocation-cron`, `signature-reminders`, `send-exam-reminders`,
`generate-notifications`, `process-payment-reminders` et
`send-automated-emails` (variante stricte — voir le tableau ci-dessus).

✅ `alma-reconcile-cron` a aussi un appelant **front** : le panneau
« Réconciliation Alma » (`src/components/finances/AlmaCronMonitorPanel.tsx`)
l'invoque depuis le CRM avec le JWT de l'utilisateur, sans en-tête
`x-cron-secret`. Ce bouton aurait répondu 401 dès l'étape 2 ; le correctif est
passé avant (#82 — la fonction accepte le JWT d'un admin comme alternative au
secret), il a donc survécu à l'activation du 10/09/2026. Point à re-vérifier
avant toute rotation.

## `send-automated-emails` — panne silencieuse, décision du 10/09/2026, redéploiement en attente

**Découvert le 10/09/2026, en vérifiant l'activation de `CRON_SECRET`.** La
fonction répondait **401 depuis le 14/01/2026** : le job `daily-automated-emails`
porte la clé anon, alors que la fonction exigeait `auth.getUser()` + un rôle
admin/staff. Une clé anon n'est pas un utilisateur — l'échec était structurel,
sans aucun rapport avec la bascule du secret.

Conséquence sur toute la période : **aucune relance de paiement J-7 ni aucun
rappel de formation J-7/J-1 n'est parti automatiquement.** (Les rappels
d'examen, eux, continuaient de partir : `send-exam-reminders` n'a pas de garde
JWT et tourne bien à 09:00 UTC.)

⚠️ **Au premier passage à 08:00 UTC qui suivra le redéploiement, la campagne du
jour partira pour de bon**, dans les limites fixées par les interrupteurs
ci-dessous : rappels de formation J-7/J-1 et rappel d'examen pratique J-7 à tous
les candidats concernés ce jour-là. **Aucune relance de paiement ne partira DE
CETTE FONCTION** (l'autre chemin de relance, hors interrupteur, est décrit sous
le tableau ci-dessous). Vérifier d'abord le volume attendu avec `?dryRun=true`.

### État des 4 blocs automatiques — décision du directeur du 10/09/2026

| Bloc | État | Ce qui part |
|---|---|---|
| Relance de paiement J-7 | 🔴 **ÉTEINT** | **rien** — la table `factures` n'est même pas lue |
| Rappel de formation J-7 | 🟢 **ALLUMÉ** | sessions `a_venir`/`complet` démarrant dans 7 jours, **hors corbeille** → à **toutes les inscriptions sauf `annule` et `report`** (statut vide ou inconnu compris), **hors inscriptions supprimées** |
| Rappel de formation J-1 | 🟢 **ALLUMÉ** | sessions `a_venir`/`complet` démarrant demain, **hors corbeille** → même population qu'en J-7 |
| Rappel d'examen pratique J-7 | 🟢 **ALLUMÉ** | examens pratiques `planifie` dans 7 jours (`examens_pratique` n'a pas de colonne `deleted_at` : rien à écarter) |

> **Qui reçoit un rappel de formation — corrigé le 10/09/2026.** Les deux blocs
> filtraient `statut === "inscrit"`, une **liste blanche** sur une colonne de
> **texte libre** (`session_inscriptions.statut` : ni enum, ni CHECK, ni NOT
> NULL). Elle écartait **344 des 388 inscriptions actives** — `valide` (321),
> `encours` (16), `document` (7) — ainsi que les inscriptions **express**, qui
> naissent en `en_attente`. Un apprenant dont le dossier était *validé* ne
> recevait donc jamais son « votre formation commence demain ». Le filtre
> raisonne désormais par **exclusion** (`annule`, `report`), comme
> `send-daily-report` : un statut vide ou inconnu reçoit son rappel — mieux vaut
> un rappel de trop qu'un apprenant devant une porte close.

> ⚠️ **Ce tableau ne couvre QUE `send-automated-emails`. Il existe un SECOND
> chemin d'envoi de relances de paiement, que l'interrupteur ne touche pas.**
> Le job horaire **`process-payment-reminders-hourly`** (`0 * * * *`) appelle
> `supabase/functions/process-payment-reminders/index.ts`, qui **dépile la table
> `relance_paiement_queue`**. Il n'est pas piloté par le code mais par la donnée :
> **`relance_paiement_config.actif`** (colonne `boolean NOT NULL DEFAULT true`,
> migration `20260424132817` — donc **active par défaut**, par centre), réglable
> depuis Communications › Relances automatiques
> (`src/components/communications/RelancesAutoPanel.tsx`). La fonction repousse
> chaque élément de la file dont le centre a `actif = false` ; sinon elle envoie.
> **Son état réel en production est EN COURS DE VÉRIFICATION au 10/09/2026** —
> à trancher par SELECT, l'interrupteur `BLOCS_AUTOMATIQUES_ACTIFS` n'ayant
> aucune prise dessus :
>
> ```sql
> SELECT centre_id, actif, nb_relances_max FROM public.relance_paiement_config;
> SELECT statut, count(*) FROM public.relance_paiement_queue GROUP BY statut;
> ```
>
> Si l'intention est qu'**aucune** relance de paiement ne parte, éteindre le
> bloc J-7 ne suffit pas : il faut aussi `actif = false` sur ce centre, ou mettre
> le job en pause (`cron.alter_job`).

> **Décision de Karim (directeur), le 10/09/2026**, en deux temps :
> « Pour les mails de relance automatique de paiement je veux pas les activer
> maintenant car je sais que c'est pas encore optimal de notre côté. » puis
> « Faut allumer uniquement les rappels de formations et d'examen. »
>
> **Motif de l'extinction de la relance de paiement** : le processus de relance
> n'est pas encore au point côté centre.

L'interrupteur est la constante `BLOCS_AUTOMATIQUES_ACTIFS`, en tête de
`supabase/functions/send-automated-emails/index.ts`. **Rallumer un bloc = passer
sa ligne de `false` à `true`**, puis faire redéployer la fonction par l'agent
Lovable (le sync GitHub ne déploie pas les edge functions).

Un bloc éteint est sauté INTÉGRALEMENT : aucune requête à la base, aucun appel
à Resend, aucune écriture dans `email_logs`. Le résumé JSON le déclare
`actif: false` avec son motif et le liste dans `blocs_desactives` — ce qui le
distingue d'un bloc allumé n'ayant trouvé aucun destinataire (`actif: true,
envoyes: 0`). `?dryRun=true` ne décompte que les blocs allumés.

Ces interrupteurs ne concernent QUE la campagne automatique (voie
`x-cron-secret`). Les envois **manuels** déclenchés depuis le CRM (devis,
facture, lien Alma, documents de session — 13 écrans) passent par les branches
`recipients` et `to`/`type` et ne les consultent jamais.

Corollaire déjà traité dans le code : le bloc « rappel examen T3P J-7 » de
`send-automated-emails` faisait **doublon exact** avec `send-exam-reminders`
(même table, même date, même statut, même sujet — mais deux `email_logs.type`
différents, donc invisible à toute déduplication). Il a été retiré le
10/09/2026 ; `send-exam-reminders` reste seule propriétaire de ce rappel.

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
   *(Fait : `signature-reminders-daily` est actif, en-tête `x-cron-secret` compris.)*

Garde-fous de la fonction : ne modifie que des demandes `envoye` (jamais une
demande signée — gel par `trg_lock_signed_signature_request`), ne crée aucun
token, une seule relance par demande (dédup `email_logs.metadata`).
