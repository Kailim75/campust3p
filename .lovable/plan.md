## Plan d'implémentation — Module Apprenants

### 1. Pagination serveur enrichie
- Étendre `useContactsPaginated` avec les enrichments (session, paiement, documents, exam, progression) en conservant les lookups par batch
- Mettre à jour `ApprenantsPage` pour utiliser la pagination au lieu de `useEnrichedContacts`
- Ajouter contrôles de pagination (précédent/suivant/total)
- Conserver tous les filtres existants (activité, formation, quick filters, recherche)

### 2. Cellule paiement plus lisible
- Remplacer `totalPaye€ / totalFacture€` par des labels sémantiques :
  - **Soldé** (vert) si payé ≥ facturé
  - **Partiel** (orange) avec montant restant
  - **Impayé** (rouge) si échéance passée
  - **Non facturé** (gris) si pas de facture
- Appliquer dans `ApprenantTableRow` et les cartes mobile

### 3. Page dédiée `/contacts/:id`
- Créer `ApprenantFullPage.tsx` qui réutilise `ApprenantDetailContent` existant dans un layout pleine page
- Ajouter la route `/contacts/:id` dans `App.tsx`
- Navigation retour vers `/contacts` avec préservation du contexte
- Header page avec nom + bouton retour

### 4. Quickview allégé
- Créer `ApprenantQuickView.tsx` — version résumée pour le Sheet :
  - Identité (avatar, nom, badges statut + formation)
  - Pipeline stepper compact
  - Info clé : session, paiement, dossier (1 ligne chacun)
  - CTA principal unique (prochaine étape workflow)
  - Boutons contact rapide (tel, email, WhatsApp)
  - **Bouton "Voir la fiche complète"** → navigue vers `/contacts/:id`
- Le Sheet utilise ce quickview au lieu de `ApprenantDetailContent`

### 5. Non-régression
- Tous les hooks existants préservés
- `ApprenantDetailContent` inchangé (réutilisé tel quel dans la page dédiée)
- Filtres, tri, mode expert, bulk actions préservés
- Mobile : cartes existantes + quickview drawer préservé
