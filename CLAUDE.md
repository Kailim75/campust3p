# CLAUDE.md — T3P Campus

CRM multi-tenant pour centres de formation de chauffeurs (Taxi, VTC, VMDTR).
Stack : React 18 + Vite + TypeScript + Tailwind + shadcn/Radix, Supabase
via **Lovable Cloud** (Postgres + RLS par `centre_id`, edge functions Deno),
emails Resend, paiements Alma. **Repo synchronisé avec Lovable** — voir
« Règles Lovable ».

## Règles Lovable (impératives)

- Ne jamais restructurer l'arborescence, renommer des dossiers, ni changer
  la stack ou l'outillage de build (Vite, Tailwind, ESLint, configs TS).
- Ne jamais travailler en parallèle d'une session d'édition Lovable active.
- Petits commits réversibles, un lot à la fois, PR relue avant merge.
- **Le sync GitHub ne déploie PAS les edge functions** : après un merge qui
  modifie `supabase/functions/`, demander à l'agent Lovable de redéployer
  (« Redéploie X — le code est à jour dans le repo, ne modifie aucun
  fichier »).
- **Les migrations du repo ne s'appliquent PAS automatiquement**, et
  l'éditeur SQL du panneau Cloud refuse le DDL (« Request cancelled »).
  Tout changement de schéma passe par l'agent Lovable (qui crée et applique
  la migration). Les SELECT et `cron.schedule` passent, eux, par l'éditeur
  SQL du panneau Cloud.
- Le développeur local n'a PAS de compte Supabase : la base n'est
  accessible que via le panneau Cloud de Lovable (app desktop ou web).

## Zones sensibles — NE PAS TOUCHER sans accord explicite

- **Flux de signature électronique** (`SignaturePage`,
  `public-sign-document`, `resolve-signing-token`, `send-signature-email`) :
  correctif 401 sur les lots de documents suivi côté Lovable.
  Depuis le 09/09/2026, `public-sign-document` est le point d'entrée UNIQUE
  du flux public (actions get_info / list_related / get_document_url / sign /
  refuse, gardées par access_token ou signing_token) ; les RPC `*_public` de
  signature sont révoquées pour anon et authenticated (migration
  `20260909230000`) — ne pas les réintroduire.
- **Trigger `trg_lock_signed_signature_request`** sur `signature_requests` :
  gèle les demandes signées. Aucune migration ne doit le désactiver.
  Corollaire : tout batch qui modifie `signature_requests` ne doit cibler
  que des lignes non signées (voir `signature-reminders`).
- **Garde des factures émises** (`trg_garde_facture_emise` sur `factures`,
  `trg_garde_lignes_facture_emise` / `trg_garde_lignes_facture_emise_insert` sur
  `facture_lignes`, migration `20260912090100`) : décisions du directeur du
  11/09/2026 — une facture qui n'est plus un brouillon ne se supprime pas (ni
  DELETE, ni corbeille, ni TRUNCATE), ne redevient pas un brouillon, et son
  contenu est figé (montants, lignes, numéro, dates, coordonnées de l'acheteur).
  Aucune exemption de rôle : ni `service_role`, ni `super_admin`. Corollaires :
  - **aucune migration ne doit désactiver ces déclencheurs** :
    `ALTER TABLE public.factures DISABLE TRIGGER USER` (déjà fait une fois,
    migration `20260306223257`) et `SET session_replication_role = replica`
    désactivent aussi la garde. La seule désactivation ciblée admise est celle,
    atomique et antérieure à la garde, du rattrapage de `20260912090100`
    (`audit_factures`, `update_factures_updated_at`,
    `trg_sync_inscription_paiement_on_facture`) ;
  - le nom du déclencheur doit continuer à trier AVANT
    `trg_snapshot_facture_on_emission` : les `BEFORE` d'une même table tirent
    par ordre alphabétique, et la garde doit juger la demande de l'appelant
    avant que le snapshot ne complète quoi que ce soit ;
  - **chaque remplacement de déclencheur de ce lot tient dans UN bloc `DO`**
    (`EXECUTE 'DROP TRIGGER IF EXISTS …'` puis `EXECUTE 'CREATE TRIGGER …'`), et
    non en deux instructions. Un bloc `DO` est UNE instruction, donc atomique
    même si le moteur n'ouvre pas de transaction. Écrits en deux instructions,
    un arrêt entre les deux — lors d'un simple rejeu — retirerait une protection
    RÉELLEMENT EN PLACE, sans aucun signal : mesuré, la suppression physique
    d'une facture émise redevenait possible. Ne jamais « simplifier » ces blocs ;
  - `factures.created_at` est posé par le serveur
    (`trg_horodatage_creation_facture`) et ne se modifie plus : c'est la
    référence de la fenêtre de 15 minutes qui autorise la première saisie des
    lignes d'une facture créée déjà émise. Ne jamais l'écrire depuis le front,
    une edge function ou une migration. Un `created_at` envoyé à l'INSERT est
    **refusé**, pas écrasé (un import historique par `api-v1` POST perdrait
    sinon ses dates en silence) ; à l'UPDATE, la comparaison se fait à la
    milliseconde, parce qu'un client JSON renvoie l'horodatage arrondi. La
    colonne n'est PAS dans les colonnes figées de la garde : son déclencheur
    dédié la protège seul, avec un message qui nomme la colonne au lieu de
    conseiller d'annuler la facture ;
  - **montants dérivés** : `montant_ht` et `montant_tva` sont figés, à une
    exception près — le passage de `NULL` à une valeur ÉGALE À LA SOMME DES
    LIGNES de la facture (à 0,02 près), et seulement si elle a au moins une
    ligne. C'est le seul recours des factures créées déjà « emise » puis
    complétées par leurs lignes à la requête suivante (« Facture libre »,
    conversion d'un devis) : sans cela elles resteraient sans montant HT ni
    montant de TVA pour toujours. Ne pas retirer cette exception, et ne pas
    l'élargir à une saisie libre ;
  - `snapshot_facture_on_emission` (version 2) fige les coordonnées de
    l'acheteur à l'INSERT d'une facture hors brouillon et au passage
    brouillon → non brouillon, et ne les complète plus jamais ensuite. Le PDF
    d'une facture émise lit ces colonnes `buyer_*` ; la fiche contact n'est
    qu'un repli. Une fusion de contacts change le rattachement CRM, pas
    l'identité imprimée ;
  - la policy **`centre_delete_factures` doit rester en place**. Elle n'a pas
    été supprimée, et il ne faut pas la supprimer : une table sans policy de
    `DELETE` ne refuse pas un `DELETE` sous RLS — elle n'affecte simplement
    aucune ligne et renvoie « succès, 0 ligne ». L'écran afficherait
    « supprimée » alors que rien ne l'est. C'est la garde qui refuse, avec un
    message lisible ; la policy sert à ce que la garde soit atteinte ;
  - **transmission électronique et Factur-X** : `e_invoice_status`,
    `platform_*` et `facturx_xml` ne sont figés qu'à partir d'une transmission
    RÉELLE (statut de transmission renseigné ET `platform_reference_id` présent
    et ne commençant pas par `LOCAL-`). `submit-pdp` écrit aujourd'hui
    `e_invoice_status = 'envoye'` et une référence `LOCAL-<horodatage>` SANS
    rien transmettre : ces marques restent corrigeables, exprès. Cette
    tolérance est une **dette datée**, bornée par l'interrupteur
    `public.factures_transmission_simulee_toleree()` : tant qu'il vaut `true`,
    n'importe qui pouvant écrire `platform_reference_id` peut y poser
    `LOCAL-…` pour garder le bloc réécrivable. **Le lot « vraie PDP » doit, dans
    la MÊME migration que l'appel HTTP réel** : livrer la fonction
    `SECURITY DEFINER` qui pose l'accusé de la plateforme, remettre à zéro les
    marques `LOCAL-%` existantes, et passer cet interrupteur à `false`. À
    défaut, la transmission réelle sera bloquée dès le premier accusé (l'écran
    `PdpTransmissionPanel` resterait figé sur « envoye » et `generate-facturx`
    échouerait par un toast) ;
  - **aucun workflow ne doit annuler une facture ni la remettre en brouillon**
    (`update_status` → `factures.statut`). `execute-workflow` écrit avec la clé
    `service_role` : la garde refuserait, et `updateStatusAction` avale le refus
    sans interrompre l'exécution — l'échec serait invisible. La migration
    `20260912090100` refuse de s'appliquer tant qu'un tel workflow existe, et
    SIGNALE tout workflow actif qui écrit `factures.statut` : celui-là tombera
    en panne muette le jour où la facture visée est **annulée** (la garde y voit
    une réactivation et exige une personne connectée). Le vrai correctif est
    côté `execute-workflow` : `updateStatusAction` doit interrompre l'exécution
    au lieu de la poursuivre ;
  - **si l'application d'une migration de ce lot s'arrête en plein fichier**
    (le moteur de l'agent Lovable n'ouvre pas forcément de transaction) : ne
    rien annuler à la main. Lire le message, lever l'obstacle, rejouer le
    FICHIER ENTIER. L'en-tête de `20260912090100` liste, point d'arrêt par
    point d'arrêt, ce qui reste appliqué ;
  - **interrupteur `public.factures_annulation_manuelle_permise()`** : `true`
    tant que les avoirs n'existent pas (l'annulation manuelle d'une facture
    émise reste possible, tracée dans `audit_logs` sous
    `ANNULATION_MANUELLE` / `REACTIVATION_MANUELLE`, et réservée à une personne
    connectée ayant le rôle admin, staff ou super_admin — jamais une clé API ni
    un workflow ; la garde refuse explicitement `auth.role() = 'service_role'`,
    sans se contenter de l'absence de `sub` dans le jeton). La migration qui
    livrera l'avoir remplacera son corps par `SELECT false` ; rejouer
    `20260912090100` ne le remet PAS à `true` (la fonction n'est créée que si
    elle n'existe pas). Même règle pour
    `public.factures_transmission_simulee_toleree()` ;
  - **ce que la garde rend définitivement irréparable**, et qui a été compté
    avant d'appliquer : une facture non brouillon **sans aucune ligne** ne peut
    plus en recevoir, et n'aura donc jamais de montant HT ni de montant de TVA
    (54 factures au 11/09/2026, signalées par un `RAISE NOTICE` de la
    section 0j). C'est la conséquence assumée de la décision D2.
- **Policies RLS durcies** : bucket `crm-email-attachments`, table
  `template_audit_log`. Ne pas élargir.
- Les ~150 warnings SECURITY DEFINER sont **différés volontairement** : ne
  pas « corriger » en masse.
- `leads` n'a pas de `centre_id` : décision produit en attente — ne pas
  « corriger ».

## Architecture — repères

- Navigation : registre central `src/config/navigationRegistry.ts` +
  switch dans `src/pages/Index.tsx` + routes `APP_SECTION_PATHS` dans
  `src/App.tsx`. Une nouvelle page = entrée registre + case Index + path
  App ; le test `src/config/__tests__/navigationRegistry.test.ts` verrouille
  la cohérence.
- Données : hooks TanStack Query dans `src/hooks/` (un fichier par domaine).
  Préférer les variantes paginées (`useContactsPaginated`,
  `useFacturesPaginated`) et les selects de colonnes ciblées.
- Multi-tenant : `centre_id` sur presque toutes les tables, RLS active.
  Création d'enregistrement : passer par `getUserCentreId()`
  (`src/utils/getCentreId.ts`). **Un 2ᵉ centre est prévu** : check-list
  d'onboarding dans `AMELIORATIONS.md` (en-tête, décisions du 11/07/2026).
- Suppression : soft-delete via RPC `soft_delete_record` (+ Corbeille) pour
  les tables métier ; jamais de DELETE direct.
- Documents PDF : DEUX générateurs (front `src/lib/pdf-generator.ts`,
  edge `supabase/functions/_shared/pdf-generator.ts`). Toute évolution de
  contenu documentaire doit être reportée dans les deux.
- Docs CMA : source de vérité `src/lib/cma-constants.ts` (types de pièces +
  alias). Statut administratif : colonne enum `contacts.statut_cma`, seule
  source de vérité (pas de string-matching sur les libellés).
- Emails transactionnels : gabarit commun
  `supabase/functions/_shared/email-template.ts`, traçage systématique dans
  `email_logs` (avec `metadata` pour la déduplication).

## Base de données

- Migrations dans `supabase/migrations/`. La base en ligne peut différer
  (jobs créés au dashboard, index…) : pour tout ce qui dépend du runtime,
  vérifier par SELECT avant d'affirmer.
- **Jobs planifiés : référence versionnée dans `supabase/CRON_JOBS.md`**
  (9 jobs pg_cron, dont `sync-gmail-inbox-every-5min` à supprimer — sa
  fonction n'existe plus). Tout nouveau job : `cron.schedule` via l'éditeur
  SQL (idempotent sur le nom) + mise à jour de ce fichier.
- Enums existants à réutiliser : `session_status`, `statut_cma`,
  `prospect_status`, `statut_apprenant`… — pas de nouveaux statuts en texte
  libre.
- **Motif initplan RLS (18/07/2026)** : TOUTES les policies du schéma
  public (sauf `template_audit_log`, durcie et exclue volontairement)
  enveloppent les appels indépendants de la ligne en `(SELECT fn())`
  (has_role, is_admin_or_staff, is_super_admin…) — requête max mesurée
  3,8 s → 0,8 s. Toute NOUVELLE policy doit suivre ce motif ; les
  fonctions à argument de ligne (`has_centre_access(centre_id)`…) restent
  sans enveloppe. Migrations : `20260717224714…` (10 tables chaudes,
  explicite) puis `20260718120550…` (reste du schéma, programmatique et
  idempotente, avec assertion sur le total de policies).
- **Storage : cloisonnement par centre = premier segment du chemin**
  (`<centre_id>/<fichier>`, lu par `storage_object_centre_id`). Vrai pour tous
  les buckets, y compris `produits-photos` depuis le 10/09/2026 (migration
  `20260910123000`, scan Lovable) : un envoi sans ce préfixe est refusé.
- Dette connue : plusieurs états métier vivent encore dans des notes
  `[AUTO]` de `contact_historique` parsées par regex (chantier §5.1 du
  rapport `AMELIORATIONS.md`).

## Vérifications avant de conclure « ça marche »

- **`./node_modules/.bin/eslint <fichiers modifiés>` — NON NÉGOCIABLE sur
  tout composant React.** `tsc`, `vitest` et `vite build` ne détectent PAS
  les violations de l'ordre des hooks : un `useMemo` placé après un retour
  anticipé a cassé la page « Aujourd'hui » en production le 21/07/2026
  (React #310), alors que les trois passaient au vert. La règle
  `react-hooks/rules-of-hooks` l'attrape, elle, immédiatement.
- Corollaire : un composant qui a un `if (isLoading) return …` ne doit
  contenir AUCUN hook après ce retour — préférer une fonction pure hors
  du composant (cf. `buildPriorites` dans `AujourdhuiPage.tsx`).
- **Vérifier le rendu de la page réellement modifiée**, connecté : un
  contrôle « aucune erreur console » sur l'écran de connexion ne prouve
  rien pour un composant qui n'y est jamais monté.
- `./node_modules/.bin/tsc -p tsconfig.app.json --noEmit`
- `./node_modules/.bin/vitest run` (59+ tests, dont cohérence navigation)
- `node node_modules/vite/bin/vite.js build`
- Lockfile de référence unique : **`bun.lock`** (`bun install --frozen-lockfile`).
  `package-lock.json` (npm, désynchronisé) supprimé le 12/09/2026 — ne pas le
  régénérer. `bun.lockb` (ancien format binaire) subsiste, redondant avec `bun.lock`.
- Pour les envois d'emails : modes `dryRun` des fonctions cron
  (`send-convocation-cron`, `signature-reminders` et, depuis le 10/09/2026,
  `send-automated-emails` acceptent `?dryRun=true` — décompte de ce qui
  serait envoyé, sans appel Resend ni écriture dans `email_logs`).

## Dettes connues (ne pas redécouvrir)

- Crons : `CRON_SECRET` est configuré depuis le 10/09/2026 et les 8 jobs
  envoient l'en-tête `x-cron-secret`. **8 fonctions** concernées, dont
  `send-automated-emails` en variante **stricte** (`cronSecretMatches`) :
  pour elle, pas de mode transition — le tableau des deux variantes est
  dans `supabase/CRON_JOBS.md`.
- `send-automated-emails` répondait **401 depuis le 14/01/2026** (le job
  porte la clé anon, la fonction exigeait un vrai utilisateur) : aucune
  relance de paiement J-7 ni rappel de formation J-7/J-1 n'est parti
  automatiquement sur toute la période. Corrigée et **redéployée le
  10/09/2026** (dryRun du jour : 0 email, aucune session concernée).
- **Décision du directeur du 10/09/2026 — le centre n'a PAS de NDA** :
  « je ne souhaite pas faire apparaître cette mention sur les documents
  officiels ». Le champ « N° de déclaration d'activité » de Réglages ›
  Centre reste donc **vide et facultatif** (l'astérisque a été retiré ;
  le schéma zod le déclarait déjà `optional`). Conséquences dans le code :
  - garde unique `hasNda` / `hasSiret` (`src/lib/centre-to-company.ts`) —
    ne pas recréer de prédicat local : six gardes ad hoc plus permissives
    subsistent encore, à mutualiser ;
  - les gabarits HTML vivent **en base** (seedés, éditables) : le
    nettoyage se fait AU RENDU, par `stripNdaFromTemplate`
    (`src/lib/template-renderer.ts`). Tout nouveau moteur de rendu doit
    l'appeler, sinon la mention réapparaît ;
  - **règle de coupe en deux classes, à ne pas assouplir** : les libellés
    NOMINAUX (« NDA : », « N° DA ») partent partout ; les formulations
    VERBALES portant un sujet (« organisme déclaré sous le numéro ») ne
    partent QUE si le jeton termine son segment. Trois relecteurs ont
    prouvé qu'une heuristique plus large SUPPRIME du texte contractuel
    (sujet de clause, paragraphe entier, entité HTML scindée). **Ne jamais
    supprimer ce qui n'est pas la mention prime sur faire disparaître la
    mention** : un libellé orphelin est un défaut, une clause amputée une
    faute.
- **Aucune identité inventée** : `send-automated-emails` fabriquait un
  centre fictif (SIRET « 123 456 789 00012 », NDA « 11 75 12345 75 ») quand
  `centre_formation` était illisible, et ces valeurs alimentaient les PDF
  joints. Supprimé : plus de centre lisible ⇒ **500 + aucun envoi** plutôt
  qu'un document faux. À savoir avant un incident RLS : la campagne du jour
  ne partirait pas du tout.
- **Décision du directeur du 10/09/2026 — interrupteur par bloc** dans
  `send-automated-emails` (constante `BLOCS_AUTOMATIQUES_ACTIFS`, en tête du
  fichier) : relance de paiement J-7 **ÉTEINTE** (« le processus de relance
  n'est pas encore au point côté centre »), rappels de formation J-7 et J-1
  et rappel d'examen pratique J-7 **ALLUMÉS**. Un bloc éteint ne fait aucune
  requête, aucun envoi, aucune écriture dans `email_logs`, et se déclare
  `actif: false` dans le résumé JSON. Rallumer = une ligne à passer à `true`
  + redéploiement Lovable. Tableau et citations dans `supabase/CRON_JOBS.md`.
- `jspdf` et `vitest` à mettre à jour.
- Chemins encore mono-centre (à corriger avant l'ouverture du 2ᵉ centre) :
  `send-automated-emails` (bulk, `centre_formation` limit(1)),
  `send-signature-email` et `signature-reminders` (FROM en dur),
  génération PDF côté front (`useCentreFormation`).
- Historique complet des analyses et améliorations : `AMELIORATIONS.md`
  (lots 1 à 4 réalisés en juillet 2026, PR #3 à #6).
