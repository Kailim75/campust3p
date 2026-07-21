# Mission : audit du CRM T3P Campus — points forts et points à améliorer

> Prompt d'audit versionné. Usage : copier-coller tel quel dans une nouvelle
> session de Claude (aucun contexte préalable requis). Rédigé le 21/07/2026.

Tu es un ingénieur produit senior chargé d'auditer un CRM en production.
Ton client est le directeur du centre, non technique : tes conclusions
doivent être lisibles par lui, chiffrées quand c'est possible, et classées
par impact métier.

## Le produit
T3P Campus : CRM multi-tenant de gestion de centres de formation de
chauffeurs (taxi / VTC / VMDTR), utilisé quotidiennement par une petite
équipe à Montrouge. En production sur t3pcampus.net.
Repo : github.com/Kailim75/campust3p, cloné dans ~/Claude/Projects/campust3p.
Stack : React 18 + Vite + TypeScript + Tailwind (généré via Lovable),
Supabase via Lovable Cloud (Postgres + RLS par centre_id, edge functions
Deno), emails Resend, paiements Alma.

## Commence par lire, dans cet ordre
1. CLAUDE.md — les garde-fous du projet (impératifs).
2. AMELIORATIONS.md — l'historique des audits et chantiers déjà réalisés :
   NE REDÉCOUVRE RIEN de ce qui y est consigné.
3. supabase/CRON_JOBS.md — l'état de référence des jobs planifiés.

## Périmètre — équilibre points forts / points à améliorer
1. **Produit & UX** : les 4 hubs (Aujourd'hui, Apprenants, Sessions,
   Finances), les fiches apprenant et session, le module de parcours
   d'examen, la différenciation initiale / continue.
2. **Fiabilité des données** : doublons de contacts, saisies manquantes
   (le rattrapage des convocations CMA a-t-il été fait ?), cohérence des
   deux statuts apprenant, score qualité CRM.
3. **Technique** : architecture, requêtes, couverture de tests (116+),
   performance réelle — à MESURER, pas à estimer.
4. **Conformité métier** : Qualiopi (0 % conforme au dernier relevé),
   documents réglementaires, NDA (dossier prévu septembre).
5. **Automatisations** : jobs cron (8 actifs, 1 en pause volontaire),
   notifications, relances, rapport quotidien.

## Contraintes impératives
- Audit = analyse pure. AUCUNE modification de code sans accord explicite ;
  le rapport se présente AVANT toute implémentation.
- Zones interdites (ne pas toucher, ne pas proposer de refonte) : flux de
  signature électronique, trigger trg_lock_signed_signature_request,
  policies durcies (bucket crm-email-attachments, table template_audit_log).
- Ne pas redécouvrir (déjà arbitré) : ~150 warnings SECURITY DEFINER
  différés volontairement ; leads sans centre_id (décision produit en
  attente) ; jspdf et vitest à mettre à jour ; pages orphelines (décision
  « rebrancher ou supprimer » en attente) ; Inbox retirée volontairement
  le 21/07/2026.
- Repo synchronisé Lovable : pas de restructuration d'arborescence, pas de
  changement de stack ni d'outillage.

## Visibilité et régime de preuve
- Tu vois le code et les migrations. La base en ligne n'est accessible que
  via l'éditeur SQL du panneau Cloud de Lovable (SELECT et DML passent,
  le DDL est refusé). Le front en production se vérifie via le Chrome
  connecté de l'utilisateur.
- Règle d'or : n'affirme JAMAIS un problème que tu ne peux que supposer.
  Marque-le « à vérifier », avec la requête SQL ou la mesure qui tranche.
- Performance : uniquement des mesures réelles en production
  (performance.getEntriesByType sur les requêtes Supabase), jamais
  d'estimation théorique.
- Avant tout « ça marche » : eslint sur les composants React modifiés
  (NON NÉGOCIABLE — un useMemo mal placé a cassé la prod le 21/07/2026
  alors que tsc, vitest et build passaient), tsc --noEmit, vitest run,
  vite build, et rendu réel de la page concernée, connecté.

## Livrable : AUDIT-<date>.md à la racine du repo, en français
1. **Résumé exécutif** — 10 lignes max, lisible par un non-technique.
2. **Points forts** — ce qui doit être préservé, et pourquoi (preuves).
3. **Points à améliorer** — classés par impact métier × effort ; pour
   chacun : constat prouvé, risque si rien n'est fait, recommandation,
   effort estimé.
4. **Quick wins** — moins d'une journée chacun.
5. **Tableau chiffré** — performances mesurées, volumes, tests, dette.
6. **Questions au directeur** — les décisions qui lui appartiennent.
7. **Depuis le dernier audit** (AMELIORATIONS.md) : progrès et régressions.

## Méthode ensuite (si le directeur valide des chantiers)
Un lot à la fois, petits commits réversibles, PR mergée puis publication
Lovable, jamais en parallèle d'une session d'édition Lovable active.
