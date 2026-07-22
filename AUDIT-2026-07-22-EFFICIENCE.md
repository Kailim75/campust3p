# Audit d'efficience — 22 juillet 2026

> Exécuté selon `PROMPT-EFFICIENCE.md`. Sources : audit_logs,
> contact_historique, email_logs, relance_paiement_config/queue (SQL en
> production, 14 derniers jours), analytics Lovable (7 jours), parcours UI
> vérifiés dans le code et en production. Auditeur : Claude.

## 1. Cartographie du travail réel (14 derniers jours)

**Qui** : un seul compte humain actif (katikarim3@gmail.com, 578 actions
journalisées ; le reste = système). Si l'assistante travaille dans le CRM,
c'est sous le compte du directeur.

**Quand** : bureau classique — pic 10 h–16 h (14 h : 107 actions, 11 h :
105, 16 h : 89). L'usage nocturne mobile existe mais reste marginal en
volume.

**Où** (visites 7 j) : Sessions 39 · Contacts 29 · Aujourd'hui 22 ·
Finances 10 · Inbox 3. La fiche session est le poste de travail n° 1.

| Tâche récurrente | Volume 14 j | Constat |
|---|---|---|
| Pointage « Fait » un par un (hub) | **464 clics** | L'activité CRM dominante. ~33/jour. Aucun « tout marquer », et des items qui ne se résolvent pas seuls quand la condition disparaît. |
| Envoi de documents | 87 emails | Flux actif et fluide (envoi en lot existant). |
| Demandes de signature | 60 (+18 rappels **automatiques**) | Flux actif, rappels déjà automatisés. |
| Facturation | forte activité cette semaine | Express adopté immédiatement (constaté en prod le 22/07 à 1 h du matin). |
| Relances de paiement | **0 envoyée** | 37 factures en retard, 23 292 € à recouvrer. Moteur automatique complet (config + file + cron horaire + suivi d'ouverture) : **jamais activé** (0 config active). |
| Relances documents CMA | **1 envoyée** | 176 dossiers incomplets. L'outil de relance **en lot** existe dans le hub (BlocCma : sélection + « Relancer N ») mais ne sert pas. |
| Notes sur fiches | 25 | Normal. |

## 2. Améliorations proposées (par gain × fréquence ÷ effort)

### P1 — Réveiller les relances de paiement automatiques 🔴 décision requise
Le moteur est construit de bout en bout et dort. 23 292 € en retard, zéro
relance manuelle ou automatique en 14 jours. Proposition : activer avec des
réglages doux (1ʳᵉ relance à J+7 après échéance, 2 relances maximum
espacées de 10 jours, exclusion des repassages et des CPF/OPCO si voulu),
**précédée d'un dryRun** montrant au directeur la liste exacte de ce qui
partirait. Les boutons manuels restent. Effort : ~1 h. Gain : du cash, et
plus besoin d'y penser.

### P2 — Tuer le pointage manuel (464 clics/14 j)
a) **« Tout marquer fait »** par bloc avec sélection — le motif existe déjà
dans BlocCma (« Traiter N »), le généraliser aux autres blocs du hub.
b) **Auto-résolution** : un item dont la cause disparaît (document reçu,
facture payée, résultat saisi) doit se clore seul, comme le fait déjà le
moteur du parcours d'examen. Passage en revue type d'item par type d'item.
Effort : a) ~1 h, b) ~½ journée. Gain : ~15-20 clics/jour + charge mentale.

### P3 — Industrialiser la chasse aux pièces CMA
176 dossiers incomplets, 1 relance en 14 jours — la chasse se fait hors
outil (téléphone ?) ou ne se fait pas. L'outil en lot existe déjà dans le
hub. Selon la réponse du directeur (voir questions) : le rendre visible
depuis Apprenants (filtre « dossier incomplet » + relance en lot depuis la
liste), et/ou proposer une relance automatique douce hebdomadaire pour les
pièces manquantes (même modèle que P1, avec dryRun). Effort : ½ journée.

### P4 — Inscription Express complète et visible
Le flux « créer le contact + l'inscrire à une session » existe
(ExpressEnrollmentDialog) mais est caché sur le Dashboard (Plus/Pilotage)
et s'arrête avant la facturation. Proposition : le rendre accessible depuis
l'en-tête global (là où vit « Nouvel apprenant ») et enchaîner en option la
facturation express pré-remplie. Le parcours « nouveau stagiaire » devient
UN flux au lieu de trois surfaces. Effort : 2-3 h.

## 3. Quick wins (< 1 h chacun, sans décision)
1. « Tout marquer fait » sur les blocs à pointage pur (P2a).
2. Inscription Express dans l'en-tête global (première moitié de P4).
3. Palette ⌘K : retirer « Ouvrir l'inbox » (surface retirée du CRM).
4. DryRun des relances de paiement → liste concrète pour trancher P1.

## 4. Ce qui est déjà efficient — à ne pas toucher
- **Facturation depuis la session** (après les chantiers du 21-22/07) :
  express 1 clic, groupée à cases, repassage « déjà payé », Encaisser/
  Relancer sur chaque ligne. Adopté dans l'heure. Rien à ajouter.
- **Parcours d'examen** : détection automatique + boutons d'action. Le
  modèle du genre (étape calculée, jamais saisie).
- **Documents et signatures** : envois en lot actifs, rappels de signature
  automatiques déjà en route (18 envoyés sans intervention humaine).
- **Performance** : pages à 1-2 s, non bloquant au quotidien.

## 5. Questions au directeur (avec recommandation)
1. **L'assistante travaille-t-elle sous ton compte ?** Un seul compte actif
   dans les traces. Recommandation : lui créer son propre compte (droits et
   traçabilité — qui a encaissé quoi) ; coût nul, 10 minutes.
2. **Relances de paiement automatiques : GO ?** Recommandation : oui, avec
   les réglages doux de P1 et le dryRun d'abord — tu valides la liste avant
   la toute première salve, ensuite ça vit seul.
3. **La chasse aux pièces CMA se fait comment aujourd'hui ?** Téléphone,
   WhatsApp, pas du tout ? La réponse décide de la forme de P3 (visibilité
   du bouton existant vs relance automatique).
4. Rappels des décisions déjà en attente : ~95 inscrits jamais facturés
   (bouton fiable désormais, session par session) ; 55 brouillons (5 099 €).

## Verdict d'honnêteté (§ clause du prompt)
Le socle est sain et les chantiers de juillet ont rendu les surfaces
principales efficientes — la facturation notamment n'appelle plus rien.
Les gisements restants ne sont pas dans les écrans mais dans **deux moteurs
dormants** (relances de paiement, relances CMA) et **un excès de pointage
manuel**. Si les quatre propositions ci-dessus sont faites, le CRM aura
atteint, à mon estimation, le point où chaque heure d'amélioration
supplémentaire rapporterait moins qu'une heure de travail économisée — le
bon moment pour s'arrêter.
