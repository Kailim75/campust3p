
# Audit navigation CRM — simplification UX sans casse

## 1. Navigation actuelle (source : `src/config/navigationRegistry.ts`)

**Hubs principaux (5)** : Aujourd'hui · Apprenants · Sessions · Finances · Inbox CRM  
**Plus / Pilotage commercial** : Pilotage (Dashboard `/`) · Prospects · Alertes  
**Plus / Production & catalogue** : Catalogue · Produits & Services · Formateurs · Planning conduite · Partenaires  
**Plus / Qualité & conformité** : Qualité · Attestations retard  
**Plus / Administration** : Automations · Sécurité · Corbeille · Doublons contacts · Requalification contacts  
**Footer** : Aide & mémo · Paramètres  

**Routes hors registre** (existantes mais hors sidebar) :
- `/ma-journee` (MaJourneePage)
- `/formateur` (FormateurPortal)
- `/actions` (ActionLogs)
- `/apprenants/portail` (LearnerPortal)
- `/contacts/:id` (ApprenantFullPage)
- Routes publiques : `/auth`, `/landing`, `/presentation`, `/onboarding`, `/install`, `/flyer*`, `/signature/*`, `/enquete/:token`, `/certificat`, `/reserver/:token`, `/mentions-legales`, `/politique-confidentialite`, `/reset-password`

## 2. Doublons / chevauchements détectés

| # | Pages | Chevauchement | Recommandation |
|---|---|---|---|
| D1 | **Aujourd'hui** (`/aujourdhui`) vs **Ma Journée** (`/ma-journee`) | Deux inbox opérationnelles d'actions du jour | Garder Aujourd'hui comme hub. Ma Journée devient vue alternative accessible via toggle ou route legacy (redirection douce). |
| D2 | **Pilotage** (Dashboard `/`) vs **Aujourd'hui** | Dashboard contient des KPI + actions du jour qui sont aussi dans Aujourd'hui | Pilotage = vue dirigeante (KPI macro), Aujourd'hui = opérationnel. Statu quo, mais clarifier les libellés via tooltip "Vue stratégique". |
| D3 | **Alertes** (`/alertes`) vs **Aujourd'hui** (bloc critiques) | Alertes système réapparaissent dans Aujourd'hui/BlocCritiques | Garder Alertes en "Plus / Pilotage" (vue admin). Lien direct depuis BlocCritiques. |
| D4 | **Apprenants** (`/contacts`) vs **Prospects** (`/prospects`) vs **Doublons contacts** vs **Requalification contacts** | 4 entrées sur le même domaine contact | Apprenants = hub. Prospects reste séparé (pipeline commercial). Doublons + Requalification = outils admin, OK dans "Plus / Administration". |
| D5 | **Catalogue** vs **Produits & Services** | Catalogue = formations CPF/Qualiopi. Produits = forfaits / vente libre | Renommer "Produits & Services" → **"Forfaits & extras"** pour lever l'ambiguïté. |
| D6 | **Qualité** vs **Attestations retard** | Attestations retard est une sous-vue qualité | Garder Attestations retard accessible mais comme onglet dans Qualité (à terme). Pour l'instant ne rien casser : conserver la route + le lien Plus. |
| D7 | **Inbox CRM** (emails) vs blocs RDV / relances dans Aujourd'hui | Émissions email visibles dans plusieurs endroits | Conserver. Inbox = correspondance entrante/sortante, Aujourd'hui = actions à faire. |

## 3. Navigation cible (déjà conforme à 95%)

L'architecture actuelle correspond DÉJÀ aux 5 hubs + 4 sous-sections demandés. Les ajustements proposés sont mineurs et **non destructifs** :

### Hubs (5)
| Actuel | Cible | Action |
|---|---|---|
| Aujourd'hui | **Aujourd'hui** | inchangé |
| Apprenants | **Apprenants** | inchangé (libellé "Apprenants" plus inclusif que "Apprentis") |
| Sessions | **Sessions** | inchangé |
| Finances | **Finances** | inchangé |
| Inbox CRM | **Inbox** | renommer label "Inbox CRM" → "Inbox" (path inchangé) |

### Plus / Pilotage commercial
- Pilotage (Dashboard) · Prospects · Alertes · **+ Ma Journée** (ajouter ici en alternative à Aujourd'hui)

### Plus / Production & catalogue
- Catalogue · **Forfaits & extras** (renommé) · Formateurs · Planning conduite · Partenaires

### Plus / Qualité & conformité
- Qualité · Attestations retard

### Plus / Administration
- Automations · Sécurité · Corbeille · Doublons contacts · Requalification contacts

## 4. Routes à conserver (aucune suppression)

100% des routes actuelles restent montées dans `src/App.tsx` (`APP_SECTION_PATHS`). Aucun changement à ce tableau.

Alias legacy déjà gérés via `legacyPaths` dans le registre + `resolveNavTarget()` :
- `/dashboard` → Pilotage
- `/apprenants` → Apprenants
- `/facturation`, `/paiements` → Finances
- `/parametres` → Paramètres

## 5. Routes à rediriger (ZÉRO)

Aucune redirection forcée. Le fallback intelligent `resolveNavTarget()` continue de résoudre les chemins inconnus (favoris cassés, vieux liens) vers le hub le plus pertinent — comportement déjà en place.

**Ma Journée** : route `/ma-journee` reste accessible. On ajoute simplement une entrée dans la sidebar (Plus / Pilotage) pour la rendre découvrable.

## 6. Libellés clarifiés (centre T3P)

| Avant | Après | Raison |
|---|---|---|
| Inbox CRM | **Inbox** | Plus court, contexte CRM implicite |
| Produits & Services | **Forfaits & extras** | Distingue de Catalogue (formations réglementées) |
| Pilotage (Dashboard) | **Tableau de bord** | "Pilotage" est le nom du sous-groupe, créait confusion |
| Doublons contacts | **Doublons** | Sous "Administration" le mot "contacts" est implicite |
| Requalification contacts | **Requalification** | idem |
| Attestations retard | **Attestations en retard** | grammaire |
| Aide & mémo | **Aide** | plus simple |

## 7. Visibilité par rôle

Pas de retrait de droits, juste un **masquage de l'item dans la sidebar** (la route reste accessible si l'utilisateur a l'URL). Implémentation via un champ optionnel `allowedRoles?: Role[]` dans `NavEntry`, filtré côté `Sidebar.tsx`.

| Entrée | dirigeant | admin | staff | formateur | apprenant |
|---|---|---|---|---|---|
| Aujourd'hui | ✓ | ✓ | ✓ | – (portail dédié) | – |
| Apprenants | ✓ | ✓ | ✓ | lecture session | – |
| Sessions | ✓ | ✓ | ✓ | ses sessions | – |
| Finances | ✓ | ✓ | ✓ | – | – |
| Inbox | ✓ | ✓ | ✓ | lecture session | – |
| Tableau de bord (Pilotage) | ✓ | ✓ | – | – | – |
| Prospects | ✓ | ✓ | ✓ | – | – |
| Alertes | ✓ | ✓ | ✓ | – | – |
| Ma Journée | ✓ | ✓ | ✓ | – | – |
| Catalogue | ✓ | ✓ | ✓ | lecture | – |
| Forfaits & extras | ✓ | ✓ | – | – | – |
| Formateurs | ✓ | ✓ | – | – | – |
| Planning conduite | ✓ | ✓ | ✓ | ses créneaux | – |
| Partenaires | ✓ | ✓ | – | – | – |
| Qualité | ✓ | ✓ | – | – | – |
| Attestations en retard | ✓ | ✓ | ✓ | – | – |
| Automations | ✓ | ✓ | – | – | – |
| Sécurité | ✓ | ✓ | – | – | – |
| Corbeille | – | ✓ | – | – | – |
| Doublons | – | ✓ | – | – | – |
| Requalification | – | ✓ | – | – | – |
| Paramètres | ✓ | ✓ | profil | profil | – |

**Formateur** : continue d'avoir son portail dédié `/formateur` (sidebar minimaliste actuelle).  
**Apprenant** : portail séparé `/apprenants/portail`, hors de cette sidebar.

## 8. Risques

| Risque | Mitigation |
|---|---|
| Renommage "Inbox CRM" → "Inbox" perdu si recherche utilisateur | tooltip + redirection inchangée |
| Renommage "Produits & Services" → "Forfaits & extras" | mémoire utilisateur ; ajouter `legacyPaths` n'est pas requis (path inchangé) |
| Masquage par rôle masque un item qu'un user croyait avoir | accès URL direct toujours fonctionnel ; afficher dans Aide la liste des sections |
| Ajout `allowedRoles` impacte le test `navigationRegistry.test.ts` | mettre à jour les snapshots en gardant l'ordre |
| Ma Journée ajouté en double avec Aujourd'hui | l'utiliser pour disambig clairement via icône/sous-titre |

## 9. Plan de rollback

- Aucune modif DB, aucune modif de route → rollback = revert des 3 fichiers TS suivants :
  - `src/config/navigationRegistry.ts` (libellés + champ `allowedRoles`)
  - `src/components/layout/Sidebar.tsx` (filtre par rôle)
  - `src/config/__tests__/navigationRegistry.test.ts` (snapshots)
- Aucune URL ne change. Aucun favori ne casse.
- Si le filtre par rôle pose problème : feature flag localStorage `nav_role_filter_enabled` permet de tout réafficher instantanément.

## 10. Tests à effectuer

**Automatisés**
- `navigationRegistry.test.ts` : 5 hubs max ✓ ; chaque entrée a path + pageName ✓ ; `resolveNavTarget` continue à résoudre `/dashboard`, `/apprenants`, `/facturation`, `/paiements`, `/parametres`.
- Nouveau test : `allowedRoles` filtre correctement par rôle.

**Manuels (chaque rôle)**
- dirigeant connecté → voit 5 hubs + tous les sous-groupes "Plus" sauf Corbeille/Doublons/Requalification.
- admin → voit tout.
- staff → ne voit pas Forfaits, Formateurs, Partenaires, Automations, Sécurité, Corbeille, Doublons, Requalification, Tableau de bord.
- formateur → reste sur `/formateur` (portail dédié) ; si bascule sur sidebar principale, ne voit que Sessions/Apprenants/Planning conduite/Catalogue/Inbox/Paramètres en lecture.
- apprenant → reste sur `/apprenants/portail`.

**Non-régression URL**
- `/dashboard` → ouvre Pilotage ✓
- `/apprenants` → ouvre Apprenants ✓
- `/facturation`, `/paiements` → ouvrent Finances ✓
- `/parametres` → ouvre Paramètres ✓
- `/inbox` → ouvre Inbox (libellé court) ✓
- Tout chemin random → `resolveNavTarget` redirige vers le bon hub ✓

## Synthèse exécutive

La navigation actuelle **est déjà à 95% conforme** à la cible demandée (5 hubs + 4 sous-sections Plus). Les changements sont **purement cosmétiques et de visibilité** :

1. **3 fichiers modifiés**, aucune route ajoutée/supprimée
2. **7 renommages** de libellés
3. **1 ajout** : Ma Journée dans Plus/Pilotage (route déjà existante)
4. **1 champ ajouté** : `allowedRoles?: Role[]` pour masquer par rôle
5. **0 redirection nouvelle** — `resolveNavTarget` fait déjà le job

Validez ce plan pour appliquer les modifications.
