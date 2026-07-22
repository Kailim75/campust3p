# Prompt d'audit d'efficience — T3P Campus

> À exécuter par Claude sur demande du directeur (« applique le prompt
> d'efficience »). Complémentaire de `PROMPT-AUDIT.md` (santé générale du
> CRM) : ici on n'audite pas l'outil, on audite **le travail quotidien du
> directeur et de son assistante** et ce que l'outil pourrait faire à leur
> place. Version 1 — 22/07/2026.

## Mission

Identifier, chiffrer et prioriser tout ce qui peut **réduire le temps, les
clics et la charge mentale** de l'équipe (2 personnes : le directeur et son
assistante, non techniques, usage quotidien y compris mobile de nuit).
L'objectif n'est pas d'ajouter des fonctionnalités : c'est d'en retirer du
travail. Si une tâche récurrente peut être automatisée, pré-remplie,
regroupée ou supprimée, elle doit apparaître dans le rapport.

**Clause d'honnêteté** : si un domaine est déjà efficient, l'écrire tel
quel et passer au suivant. Un rapport qui invente des améliorations pour
remplir des sections est un mauvais rapport. « Rien à signaler » est une
conclusion acceptable — pour un domaine comme pour l'ensemble.

## Méthode — dérouler les journées réelles, pas les écrans

Travailler en production (t3pcampus.net, connecté, cmd+shift+R avant tout
constat), avec les chiffres vérifiés par SQL (éditeur du panneau Cloud)
quand une volumétrie est invoquée. Jamais de chiffre au jugé.

### 1. Reconstituer les tâches récurrentes réelles

S'appuyer sur les traces (audit_logs, contact_historique, email_logs,
factures/paiements récents, horodatages des actions de la semaine écoulée)
pour établir la liste des tâches effectivement faites par l'équipe, leur
fréquence réelle et leur plage horaire. En particulier :

- inscription d'un nouvel apprenant (du premier contact au dossier complet) ;
- chasse aux pièces CMA et relances documentaires ;
- facturation, encaissement, relances de paiement ;
- préparation d'une session (documents, convocations, émargement) ;
- clôture d'une session (résultats, attestations, satisfaction, Qualiopi) ;
- suivi du parcours d'examen (résultats, convocations, boîtes Outlook) ;
- traitement des prospects et relances commerciales ;
- ce qui se fait de nuit sur mobile (ce qui est fait à 2 h du matin est un
  signal fort de ce qui n'attend pas — ou de ce qui déborde).

### 2. Pour chaque tâche, mesurer le coût actuel

Dérouler soi-même le parcours dans l'UI et compter : nombre de clics,
d'écrans traversés, de champs saisis à la main **alors que le CRM connaît
déjà la valeur**, d'allers-retours entre pages, de copier-coller. Noter le
temps estimé × la fréquence relevée = coût mensuel. C'est cette colonne qui
priorise, pas l'élégance de la solution.

### 3. Chercher systématiquement ces gisements

- **Re-saisie** : toute donnée tapée deux fois quelque part (le CRM l'a
  déjà → pré-remplir, comme la facturation express).
- **Navigation** : toute action qui oblige à quitter l'écran où l'info est
  apparue (l'action doit vivre où le besoin naît, comme Encaisser/Relancer
  sur les lignes).
- **Mémoire humaine** : tout ce que l'équipe doit « penser à faire » sans
  que le CRM le rappelle (le moteur du parcours d'examen est le modèle :
  étape calculée, jamais saisie).
- **Lots absents** : toute action répétée N fois à la main qui pourrait
  être groupée avec sélection (modèle : facturation groupée à cases).
- **Signal noyé** : tout écran où l'important n'est pas au-dessus du pli,
  ou tout compteur qui mélange l'urgent et le bruit.
- **Automatisations dormantes** : fonctions déjà construites mais
  inactives ou méconnues (file de relances de paiement, rappels, modes
  dryRun…) — vérifier leur état réel avant de proposer de les activer.
- **Double travail humain/CRM** : vérifications faites à la main alors
  qu'un contrôle automatique existe ou coûterait peu.

### 4. Confronter aux habitudes constatées

Le rapport doit distinguer ce que l'équipe fait **avec** l'outil, **à côté
de** l'outil (Excel, papier, mémoire, WhatsApp ?) et **contre** l'outil
(contournements). Les deux derniers sont les gisements les plus rentables.
Interroger le directeur si un usage réel est invisible dans les traces.

## Garde-fous (identiques à PROMPT-AUDIT.md)

- Zones interdites et dettes arbitrées : voir CLAUDE.md (signature
  électronique, policies durcies, SECURITY DEFINER différés, leads sans
  centre_id) — ne pas les redécouvrir ni les « corriger ».
- Toute proposition doit être réversible, livrable en petits lots
  (PR → merge → publication → vérification en prod connecté), et ne rien
  casser des règles canoniques déjà en place (définitions de retard, reste
  à encaisser, repli legacy des factures, exonération repassage).
- Ne pas proposer ce qui dépend d'une décision produit en attente sans la
  rappeler comme telle (fusion doublons, brouillons, prospects anciens).

## Livrable

Un rapport court (format AUDIT-AAAA-MM-JJ-EFFICIENCE.md dans le repo) :

1. **Cartographie des tâches récurrentes** : tableau tâche × fréquence
   relevée × coût actuel estimé (clics/temps) × qui la fait.
2. **Améliorations proposées**, triées par (temps économisé × fréquence) ÷
   effort — chacune avec : le geste actuel, le geste cible, l'économie
   estimée, l'effort (heures), et si elle touche des données (migration ?).
3. **Quick wins** (< 1 jour, sans décision à prendre) prêts à lancer.
4. **Ce qui est déjà efficient** — dit explicitement, domaine par domaine.
5. **Questions au directeur** : uniquement celles qui bloquent une
   amélioration, avec la recommandation de Claude pour chacune.

Après validation du directeur (« ok », « lance », choix des lots), exécuter
selon le protocole habituel : lots réversibles, vérifications complètes
(eslint/tsc/vitest/build + rendu réel connecté), merge + publication +
vérification prod sans redemander.
