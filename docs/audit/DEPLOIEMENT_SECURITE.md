# Déploiement du lot « durcissement sécurité » — mode d'emploi

**Branche :** `securite-durcissement` (commit unique) · **Prérequis :** la PR `quick-wins-ux` peut être mergée/publiée avant ou après, indépendamment.
**Pourquoi un ordre strict :** la page de signature publique appelle désormais de nouvelles actions de l'edge function `public-sign-document`. Si le front est publié **avant** que la fonction soit redéployée, les candidats ne peuvent plus ouvrir leurs liens de signature jusqu'au redéploiement. Et si la migration de révocation est appliquée **avant** la publication du front, idem. D'où les étapes ci-dessous, dans cet ordre.

---

## Étape 0 — Pousser les branches et merger (Karim)

Le push est bloqué depuis Claude ; à lancer depuis ce Mac :

```bash
cd ~/Claude/Projects/campust3p && DEVELOPER_DIR=/Library/Developer/CommandLineTools git push -u origin quick-wins-ux securite-durcissement audit-crm-2026-08-13
```

Puis sur GitHub : ouvrir et merger les PR (bouton vert) — `quick-wins-ux` d'abord si tu veux, puis `securite-durcissement`, et `audit-crm-2026-08-13` (rapport seul, aucun code).

## Étape 1 — Redéployer `public-sign-document` (agent Lovable)

Message à coller :

> Redéploie l'edge function **public-sign-document** — le code est à jour dans le repo (main), ne modifie aucun fichier.

Vérifier ensuite (`git fetch origin`) qu'aucun commit parasite n'est apparu sur `main`.

## Étape 2 — Publier le front (bouton **Publish** Lovable)

Puis, dans un onglet **navigation privée**, ouvrir un lien de signature récent (format `/signature/<id>/<token>`) : le document doit se charger et la liste « Autres documents » s'afficher. Un lien sans jeton affiche désormais « Lien de signature invalide » — c'est voulu.

## Étape 3 — Révoquer les RPC de signature (agent Lovable)

> Applique la migration **20260909230000_revoke_rpc_signature_anon.sql** telle quelle depuis le repo — ne modifie aucun fichier.

Re-tester un lien de signature après application (le front ne dépend plus des RPC).

## Étape 4 — Vérifier les secrets AVANT de redéployer `incoming-webhook`

`incoming-webhook` devient **fail-closed** : sans `WEBHOOK_SECRET` **ni** `DRIVEFLOW_API_KEY` configuré dans les secrets des edge functions, il répond 503 (au lieu d'être public). Demander à l'agent :

> Sans rien modifier, dis-moi si les secrets **WEBHOOK_SECRET** et/ou **DRIVEFLOW_API_KEY** sont définis pour les edge functions.

S'il n'y en a aucun et que le webhook est réellement utilisé (site web / DriveFlow), en créer un avant l'étape 5 et le renseigner côté émetteur (en-tête `x-webhook-secret` ou `X-API-KEY`). Le secret en query string (`?secret=`) n'est plus accepté.

## Étape 5 — Redéployer les autres fonctions (agent Lovable)

> Redéploie les edge functions **export-audit-pack, download-email-attachment, incoming-webhook, alma-reconcile-cron, send-daily-report, send-convocation-cron, signature-reminders, send-exam-reminders, generate-notifications, process-payment-reminders** — le code est à jour dans le repo, ne modifie aucun fichier.

Les crons continuent de fonctionner tels quels (mode transition : tant que `CRON_SECRET` n'existe pas, ils acceptent les appels avec un avertissement dans les logs).

## Étape 6 — Appliquer les deux autres migrations (agent Lovable)

> Applique telles quelles les migrations **20260909230100_soft_delete_guards.sql** puis **20260909230200_audit_triggers_tables_sensibles.sql** depuis le repo — ne modifie aucun fichier.

Vérifications :
- Mettre une fiche/facture de test à la corbeille depuis le CRM, puis la restaurer : doit fonctionner (admin/staff).
- Éditeur SQL : `SELECT count(*) FROM audit_logs WHERE table_name = 'facture_lignes';` doit augmenter après modification d'une ligne de facture.

## Étape 7 — Activer le secret des crons (optionnel mais recommandé, plus tard)

Procédure complète dans `supabase/CRON_JOBS.md` § « Secret des crons ». **L'ordre compte** : tant que `CRON_SECRET` n'existe pas, l'en-tête est ignoré ; dès qu'il existe, tout appel sans en-tête est refusé en 401.

1. Re-`cron.schedule` **d'abord** les 7 jobs avec l'en-tête `x-cron-secret` (sans effet tant que le secret n'existe pas).
2. Créer **ensuite** le secret `CRON_SECRET` (agent Lovable).
3. Vérifier immédiatement par un appel manuel : avec l'en-tête → 200, sans en-tête → 401.

Créer le secret d'abord couperait les 7 crons jusqu'à la mise à jour du dernier job (rapport quotidien, notifications, relances de paiement horaires perdus, visibles seulement dans les logs des fonctions).

Point d'attention : le panneau « Réconciliation Alma » du CRM appelle `alma-reconcile-cron` avec le JWT utilisateur et sans en-tête — il tombera en 401 à l'étape 2 si la fonction n'accepte pas le JWT admin en alternative au secret.

Tant que rien de tout cela n'est fait, rien ne change pour les automatisations.

## Étape 8 — Retirer les six fonctions Gmail (10/09/2026)

L'Inbox CRM a été supprimée (PR #77) : plus aucun écran n'appelle les fonctions Gmail, retirées du repo et de `supabase/config.toml`. Le sync GitHub ne désinstalle rien — il faut le demander :

> Désinstalle les edge functions **sync-gmail-inbox, send-gmail-reply, send-gmail-new, promote-attachment, download-email-attachment, gmail-thread-actions** — elles ont été retirées du repo, ne modifie aucun fichier.

Tant qu'elles restent déployées, `sync-gmail-inbox` (public, `verify_jwt=false`, aucun `getUser`) et l'IDOR `contactId` de `promote-attachment` (§3.3 du rapport) restent joignables avec la clé anon. `download-email-attachment` avait été durci à l'étape 5 la veille de la suppression de son dernier appelant : il part avec le lot.

Puis, dans l'éditeur SQL, supprimer le job devenu sans cible :

```sql
SELECT cron.unschedule('sync-gmail-inbox-every-5min');
```

Aucune table n'est supprimée : les données `crm_email_*` restent en base, dormantes.

---

## Retour arrière

- Révocation des RPC : réversible par `GRANT EXECUTE … TO anon, authenticated` (à ne faire qu'en dernier recours — cela rouvre la faille).
- Edge functions : redéployer la version précédente (`git revert` du commit puis « Redéploie X »).
- Garde-fous soft-delete : la migration ne modifie que les fonctions ; l'ancienne définition est dans `20260309024438` / `20260306223609`.

## Ce qui reste hors de ce lot (vague 3a du rapport)

Isolation par centre des tables financières/templates/Qualiopi, numérotation de facture par centre, `delete-user`/`list-users` scopés, `getPublicUrl` sur buckets privés à confirmer : à traiter avant l'ouverture du 2ᵉ centre.
