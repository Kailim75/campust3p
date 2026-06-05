
# Plan — Contrat d'accompagnement à la conduite (Taxi / VTC)

Objectif : générer, prévisualiser, envoyer et signer un contrat lié à un **produit autonome** (Taxi 249 € / VTC 190 €), sans rattachement obligatoire à une session de formation, en réutilisant 100 % de l'infrastructure existante.

---

## 1. État actuel (audit)

| Domaine | Existant | Réutilisable ? |
|---|---|---|
| Produits/services | Table `produits_services` (hook `useProduitsServices`) avec `type`, `prix_ht`, `tva_percent`, `metadata` JSONB, `sku` | ✅ Oui (créer 2 produits catalogue) |
| Lignes de facture | `facture_lignes` (description, prix, lien `catalogue_formation_id`) | ✅ Oui (lien souple via `description` / `metadata`) |
| Factures hors session | `factures` déjà liées à `contact_id` sans obligation de `session_id` (mémoire « Forfait invoice management ») | ✅ Oui |
| Documents générés | `generated_documents_v2` lié à `contact_id` + `session_id` **optionnel** + `template_id` + `metadata` JSONB | ✅ Oui (session_id NULL autorisé) |
| Templates | `template_studio_templates` (Template Studio V2) typés par `type` (ex: `contrat`, `convention`…) | ✅ Étendre via nouveau `type` |
| Envois | `document_envois` lié à `contact_id` (+ `session_id` optionnel) | ✅ Oui |
| Signatures | `signature_requests` lié à `contact_id` + `generated_document_id` | ✅ Oui |
| Historique contact | `useDocumentWorkflow({ contactId })` agrège tout | ✅ Oui (déjà fonctionnel sans session) |
| Génération PDF | `pdfResolver` → V2 (Template Studio) prioritaire | ✅ Oui |

**Conclusion audit** : l'infrastructure documentaire supporte déjà nativement les documents sans session. Aucune table n'est manquante.

---

## 2. Migration nécessaire ?

**Non, aucune migration de schéma n'est requise.**

Justifications :
- `generated_documents_v2.session_id` est déjà nullable.
- `document_envois.session_id` est déjà nullable.
- `signature_requests` n'exige pas de session.
- Le nouveau `type` de document (`contrat_conduite`) est une simple valeur texte dans `template_studio_templates.type` et `generated_documents_v2.document_type` (string libre, pas d'enum DB).
- Les 2 produits Taxi/VTC sont créés via **insert de données** (pas de schéma) — table `produits_services` existante.

⚠️ Une seule action data optionnelle (insert pur, validée séparément) :
- Insertion des 2 produits catalogue (`produits_services`) par `centre_id`.
- Insertion des 2 templates publiés dans `template_studio_templates`.

Aucune ALTER TABLE, aucune RLS modifiée.

---

## 3. Architecture cible

### 3.1 Données

Les 2 produits sont identifiés par un `sku` stable :
- `ACC-CONDUITE-TAXI` — 249 € TTC — durée 120 min
- `ACC-CONDUITE-VTC` — 190 € TTC — durée 120 min

Stockés avec `metadata` :
```json
{ "filiere": "taxi" | "vtc",
  "categorie_doc": "contrat_conduite",
  "vehicule_examen_inclus": true,
  "prix_catalogue_ttc": 249 }
```

### 3.2 Liens du contrat généré

`generated_documents_v2` ligne créée avec :
- `contact_id` : obligatoire
- `centre_id` : obligatoire
- `session_id` : **NULL** (volontaire)
- `document_type` : `"contrat_conduite"`
- `template_id` : id du template Taxi ou VTC
- `metadata` JSONB :
  ```json
  {
    "filiere": "taxi" | "vtc",
    "produit_sku": "ACC-CONDUITE-TAXI",
    "facture_id": "uuid|null",
    "facture_ligne_id": "uuid|null",
    "prix_ttc": 249,
    "montant_paye": 0,
    "reste_a_payer": 249,
    "date_conduite": "2026-...",
    "date_examen": "2026-...",
    "lieu_rdv": "...",
    "accompagnateur_id": "uuid|null",
    "prix_catalogue_ttc": 249,
    "prix_alert": false
  }
  ```

### 3.3 Garde-fous

- Pas de session créée.
- Pas de modification de facture.
- Pas de changement de `statut_apprenant`.
- Validation `prix_ttc !== prix_catalogue_ttc` ⇒ alerte UI + champ `justification_prix` obligatoire (stocké dans `metadata`).
- Type `contrat_conduite` **distinct** de `contrat` (session) → impossible de mélanger avec le contrat de formation classique dans `pdfResolver` et la matrice session.
- Liste blanche produits = `[ACC-CONDUITE-TAXI, ACC-CONDUITE-VTC]`. Tout autre SKU est refusé côté UI.

---

## 4. Templates à créer (Template Studio V2)

Deux templates publiés, indépendants du `contrat` de session :

| Nom | Type | Filière |
|---|---|---|
| Contrat d'accompagnement à la conduite — Taxi | `contrat_conduite` | `taxi` |
| Contrat d'accompagnement à la conduite — VTC | `contrat_conduite` | `vtc` |

Variables disponibles (mappées via `template-renderer`) :
```
{{contact.nom}} {{contact.prenom}} {{contact.email}} {{contact.telephone}}
{{contact.adresse}} {{contact.code_postal}} {{contact.ville}}
{{centre.raison_sociale}} {{centre.adresse}} {{centre.siret}} {{centre.numero_da}}
{{produit.filiere}}              -> "Taxi" | "VTC"
{{produit.intitule}}             -> "Accompagnement à la conduite Taxi"
{{produit.duree}}                -> "2 heures"
{{produit.contenu}}              -> texte descriptif
{{produit.vehicule_examen}}      -> "Mise à disposition du véhicule le jour de l'examen"
{{produit.prix_ttc}}             -> 249 / 190
{{paiement.montant_paye}}
{{paiement.reste_a_payer}}
{{seance.date_conduite}}         -> optionnel
{{seance.date_examen}}           -> optionnel
{{seance.lieu_rdv}}              -> optionnel
{{seance.accompagnateur}}        -> optionnel
{{contrat.conditions_annulation}}
{{contrat.date}}
{{signature.apprenant}}
{{signature.centre}}
```

Les variables optionnelles s'affichent en « À planifier » si vides.

---

## 5. Fichiers concernés

### Nouveaux (10)
- `src/lib/documents/conduite/produitsCatalogue.ts` — SKU + prix catalogue + métadonnées filière (source de vérité front)
- `src/lib/documents/conduite/contratConduiteVariables.ts` — builder des variables template
- `src/lib/documents/conduite/contratConduiteValidator.ts` — validation prix vs catalogue + justification
- `src/hooks/useContratConduite.ts` — hook create / preview / save into `generated_documents_v2`
- `src/components/conduite/ContratConduiteDialog.tsx` — wizard 1 dialog (filière → liens facture → dates/lieu/accompagnateur → preview → actions)
- `src/components/conduite/ContratConduitePreview.tsx` — rendu HTML via `template-renderer`
- `src/components/conduite/ContratConduiteButton.tsx` — bouton déclencheur (fiche contact + fiche facture)
- `supabase/seeds/contrat_conduite_templates.sql` — **fichier seed local, non exécuté automatiquement** (proposé pour insertion manuelle validée)
- `src/lib/documents/conduite/__tests__/validator.test.ts`
- `src/lib/documents/conduite/__tests__/variables.test.ts`

### Modifiés (4, additif uniquement)
- `src/lib/documents/documentUtils.ts` — ajouter `"contrat_conduite"` au type `DocumentType` + label « Contrat d'accompagnement conduite »
- `src/components/contacts/ContactDetailDrawer.tsx` (ou équivalent fiche contact) — insertion du bouton `ContratConduiteButton`
- `src/components/facturation/FactureDetailDrawer.tsx` (ou équivalent) — insertion du bouton si une ligne contient un SKU Taxi/VTC
- `src/lib/document-workflow/documentBlockConfig.ts` — déclaration du bloc d'affichage `contrat_conduite` (catégorie "Conduite" pour l'historique)

### Non touchés (verrouillés)
- `generateContratFormation*` (session)
- `generateConventionFormation*` (session)
- `useSessionDocumentMatrix`
- Matrice documents session
- `pdfResolver` (la résolution par bucket fonctionne déjà)
- Toutes les tables/RLS
- Toutes les factures existantes

---

## 6. Interface cible

**Bouton « Générer contrat accompagnement conduite »** visible :
- depuis la fiche contact ;
- depuis une facture si une ligne contient un produit Taxi/VTC.

Dialog en 4 étapes :
1. Filière (Taxi / VTC) — pré-rempli si lancé depuis ligne facture
2. Liens optionnels (facture + ligne) — déduits ou choisis
3. Détails séance (dates conduite/examen, lieu RDV, accompagnateur) — tous optionnels
4. Aperçu PDF + actions : `Télécharger` · `Envoyer par email` · `Demander signature`

Toute alerte de prix bloque tant que `justification_prix` n'est pas saisie.

---

## 7. Historique et timeline

Aucun travail spécifique : `useDocumentWorkflow({ contactId })` agrège déjà `generated_documents_v2` + `document_envois` + `signature_requests` filtrés sur `contact_id`. Le nouveau `document_type` apparaît automatiquement dans :
- onglet Documents de la fiche contact ;
- historique des envois ;
- timeline apprenant (via `useUnifiedSuivi`) ;
- fiche facture si `metadata.facture_id` renseigné (ajout d'un filtre simple côté UI facture).

---

## 8. Risques

| Risque | Mitigation |
|---|---|
| Confusion avec `contrat` de session | Type distinct `contrat_conduite`, libellé clair, jamais proposé dans la matrice session |
| Prix incohérent vs catalogue | Validator + alerte UI + justification obligatoire stockée dans metadata |
| Document rattaché par erreur à une session | `session_id` forcé à NULL côté hook, pas de UI pour le renseigner |
| Templates non publiés | Détection au montage du dialog, message d'erreur explicite |
| Variable manquante (date examen non connue) | Rendu « À planifier » côté template, jamais bloquant |
| Régression matrice documents session | Aucune modification de `useSessionDocumentMatrix` / `documentEligibility` / `track-requirements` |

---

## 9. Plan de rollback

Aucun changement destructif. Rollback = suppression des nouveaux fichiers + retrait des 2 ajouts UI (boutons) + retrait de la valeur `contrat_conduite` dans `documentUtils.ts`. Les éventuels documents déjà générés (`generated_documents_v2`) restent en base sans impact (soft delete possible). Les 2 produits seedés peuvent être passés en `statut='archive'`.

---

## 10. Tests à effectuer

Unitaires :
- `validator` : 249 € OK / 200 € ⇒ alerte / justification absente ⇒ erreur
- `variables` : mapping correct des champs optionnels en « À planifier »
- `produitsCatalogue` : SKU autorisés uniquement

Manuels :
- Génération Taxi 249 € depuis fiche contact (sans facture)
- Génération VTC 190 € depuis facture avec ligne `ACC-CONDUITE-VTC`
- Prix manuel ≠ catalogue ⇒ alerte + justification obligatoire
- Aperçu PDF rendu via Template Studio V2
- Téléchargement PDF
- Envoi email (via `document_envois`)
- Demande de signature électronique (via `signature_requests`)
- Apparition dans historique documents contact
- Apparition dans timeline apprenant
- Apparition dans fiche facture liée
- **Régression** : un contrat de session classique reste inchangé
- **Régression** : matrice documents session inchangée
- **Régression** : pack audit ZIP inchangé

---

## 11. Phasage d'application (après validation)

1. Phase A — Socle code (sans données) : nouveaux fichiers + 4 modifs additives. Le bouton est visible mais inactif tant que les templates n'existent pas (message explicite).
2. Phase B — Seed validé séparément : insert des 2 produits + 2 templates publiés (proposé via `supabase--insert` avec validation utilisateur).
3. Phase C — Tests manuels selon §10.

---

**Aucune modification n'est appliquée tant que ce plan n'est pas validé.**
