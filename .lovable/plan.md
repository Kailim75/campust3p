# Raccourcis d'actions — En-tête fiche apprenant

## Objectif
Ajouter une barre d'actions claire et hiérarchisée en haut de la fiche apprenant, sans dupliquer la logique métier ni modifier de données. Les actions réutilisent les handlers/dialogs déjà présents dans `ApprenantDetailContent.tsx`.

## État actuel
Dans `ApprenantDetailContent.tsx`, la zone "Quick CTA actions" (lignes ~480–630) affiche déjà 8–10 boutons à plat (Appeler, Email, WhatsApp, Note, Inscrire, Paiement, Doc, Chevalet, Att. présence, Enquête). Problèmes :
- Pas de hiérarchie visuelle (action principale vs secondaires).
- Sur écran étroit, la rangée wrap sur 3–4 lignes.
- Aucune confirmation avant inscription pour un contact SmartOF (`is_historical_import = true`).

## Cible
Une seule barre `ApprenantHeaderActions` :
1. **Bouton primaire** : « Nouvelle action » (DropdownMenu) listant toutes les actions.
2. **Actions rapides inline** (visibles ≥ `md`) : Email, WhatsApp, Note, Inscrire session, Paiement, Doc, Examen.
3. **Menu « Plus »** (DropdownMenu, icône `MoreHorizontal`) : Appeler, Chevalet, Att. présence, Enquête, Générer doc avancé. Sur mobile (`< md`) toutes les actions secondaires basculent dans « Plus ».
4. **Garde-fou SmartOF** : avant d'ouvrir `SessionAssignDialog`, si `contact.is_historical_import === true`, afficher un `AlertDialog` :
   > « Ce contact est un ancien apprenant importé de SmartOF. Confirmez-vous qu'il revient pour une nouvelle formation ? »
   Sur confirmation → ouverture normale du dialog existant. Aucune écriture DB, aucun changement de `statut_apprenant`.

## Fichiers concernés
- **Créé** : `src/components/apprenants/ApprenantHeaderActions.tsx` — composant présentation pur, reçoit les handlers en props.
- **Modifié** : `src/components/apprenants/ApprenantDetailContent.tsx` — remplace la rangée actuelle de boutons par `<ApprenantHeaderActions ... />` ; ajoute un `useState` `smartofConfirmOpen` pour intercepter le clic « Inscrire session » quand `is_historical_import`.

Aucun autre fichier modifié. Aucune migration. Aucun changement de KPI, RLS, schéma, statuts.

## Composants/handlers réutilisés
| Action | Handler/Dialog existant |
|---|---|
| Email | `openComposer` (`useEmailComposer`) + `EmailComposerModal` |
| WhatsApp | `openWhatsApp` (`@/lib/phone-utils`) |
| Appeler | `window.open('tel:…')` + `setCallLogOpen` |
| Note | `setActiveTab('suivi')` (onglet Historique/Notes) |
| Inscrire session | `setShowAssignDialog(true)` → `SessionAssignDialog` |
| Paiement | `setActiveTab('paiements')` |
| Générer document | `setShowGenerateDoc(true)` → `GenerateDocumentDialog` |
| Examen | `setActiveTab('examens')` |
| Chevalet | `setChevaletOpen(true)` → `ChevaletEditorDialog` |
| Att. présence | logique existante `generateDocument('attestation_presence', …)` |
| Enquête | `setEnqueteDialogOpen(true)` → `SendEnqueteDialog` |

## Risques
- **R1** Régression visuelle de l'en-tête → mitigé en gardant la même densité (boutons `size="sm"`, mêmes icônes lucide).
- **R2** Clic « Inscrire » accidentel sur SmartOF → l'AlertDialog bloque toute ouverture sans confirmation ; aucun appel DB n'est déclenché avant `SessionAssignDialog`.
- **R3** Wrap mobile → testé à 375 px via menu « Plus ».
- **R4** Action manquante après refactor → recensement 1-pour-1 ci-dessus.

## Plan de rollback
Purement frontend, 1 commit. Revert = restaurer la rangée `flex-wrap` actuelle dans `ApprenantDetailContent.tsx` et supprimer `ApprenantHeaderActions.tsx`. Aucune donnée à nettoyer.

## Tests manuels
1. Desktop ≥ 1280 px : 7 actions inline visibles + bouton « Nouvelle action » + menu « Plus ».
2. Mobile 375 px : seuls « Nouvelle action » + « Plus » visibles, le menu contient toutes les actions.
3. Cliquer chaque action ouvre le bon dialog/onglet (cf. table ci-dessus), aucun appel réseau d'écriture déclenché par le clic seul.
4. Contact SmartOF (`is_historical_import = true`) → clic « Inscrire session » ouvre l'AlertDialog ; Annuler ne fait rien ; Confirmer ouvre `SessionAssignDialog`.
5. Contact classique → clic « Inscrire session » ouvre directement `SessionAssignDialog` (pas de confirmation).
6. KPI dashboard + KPI apprenants actifs inchangés (vérification visuelle avant/après).
7. `statut_apprenant` inchangé après ouverture/fermeture sans validation des dialogs.
8. Bandeau SmartOF + bandeau infos manquantes toujours affichés sous l'en-tête.