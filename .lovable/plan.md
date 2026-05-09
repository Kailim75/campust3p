## Module Catalogue Produits & Services

Module ambitieux à découper en plusieurs sprints. Voici une proposition de plan en 5 sprints livrables indépendamment, avec une première version fonctionnelle dès le sprint 1.

### Sprint 1 — Fondations Catalogue (Produits/Services génériques)
**Objectif** : pouvoir créer/vendre n'importe quel produit ou service au-delà des formations, et le facturer.

Base de données :
- Table `produits_services` (multi-tenant `centre_id` + soft delete) : nom, sku, description courte/longue, catégorie, sous-catégorie, tags[], type (`unitaire`, `horaire`, `journalier`, `forfaitaire`, `abonnement`, `consommable`, `location`), unité, prix_ht, tva_percent, statut (`actif`/`inactif`/`brouillon`/`archive`), photos[], gestion_stock (bool), stock_actuel, seuil_alerte, caution_montant, metadata jsonb.
- Table `produit_categories` (paramétrable par centre, hiérarchique parent_id).
- Table `produit_tarifs` : prix multiples (public, pro, partenaire, préférentiel) + remises volume.
- RLS strictes par `centre_id`, triggers `auto_set_centre_id`, audit log.

UI :
- Nouvelle entrée navigation `Catalogue > Produits & Services` (séparée du catalogue formations existant).
- Page liste avec filtres (catégorie, type, statut), recherche, tri, pagination.
- Modale création/édition produit avec onglets (Général, Tarifs, Stock, Photos).
- Action "Dupliquer".
- Réutilisation des composants existants (`CatalogueArticleCard` adapté).

Intégration facturation :
- Extension de `facture_lignes` et `devis_lignes` pour accepter `produit_service_id` (en plus de `catalogue_formation_id`).
- Sélecteur produit dans le formulaire devis/facture existant.
- Mention TVA correctement appliquée (formation exonérée vs location TVA 20%).

### Sprint 2 — Module Location de Salle
- Table `ressources_location` (type=`salle`/`vehicule`) : capacité, équipements jsonb, surface, photos, adresse, plan_acces.
- Table `reservations_ressource` : ressource_id, contact_id, date_debut, date_fin (avec créneau horaire), statut (`option`/`confirmee`/`en_cours`/`terminee`/`annulee`), tarif_applique, options jsonb (pause café, ménage, technicien), caution_recue.
- Détection de conflits via contrainte `tstzrange` + exclusion GIST.
- UI calendrier hebdo/mensuel par ressource (réutilisation FullCalendar déjà présent dans planning).
- Tarifs par durée : heure / demi-journée / journée / week-end / forfait.
- État des lieux entrée/sortie avec upload photos (bucket Storage privé).
- Génération auto contrat de location (Template Studio, nouveau type `contrat_location`).

### Sprint 3 — Tarification avancée & Stock
- Remises volume (paliers de quantité), tarifs par segment client, tarifs partenaires.
- Pour produits physiques : mouvements de stock (`stock_mouvements`), seuils d'alerte → notifications, réapprovisionnement.
- Pour locations : workflow caution (perçue → restituée → retenue partielle).

### Sprint 4 — Reporting & Pipeline commercial
- Dashboard "Ventes annexes" : CA par catégorie, top produits, marge, taux d'occupation salles/véhicules.
- Pipeline commercial dédié (réutilisation logique prospects).
- Vue 360° client : croisement formations + locations + produits.

### Sprint 5 — Industrialisation
- Import/export CSV en masse.
- Paramétrage taux TVA centralisé.
- Modèles de contrats par type de produit.
- Droits par rôle (commercial / compta / direction) — extension `user_roles`.
- Export comptable FEC enrichi avec ventilation par catégorie produit.

### Détails techniques
- Multi-tenant strict : tous les nouveaux objets héritent `centre_id` via trigger.
- Soft delete (`deleted_at`/`deleted_by`) sur toutes les tables.
- RLS via `has_centre_access(centre_id)` et `has_role()`.
- Storage : nouveau bucket `produits-photos` (public) + `etat-des-lieux` (privé).
- Réutilisation maximale des hooks existants (`useDevis`, `useFactures`, `useEmailComposer`, Template Studio).
- Aucune modification du schéma existant `catalogue_formations` — le nouveau module est additif.

### Question avant de commencer
Le périmètre total représente plusieurs jours de travail. Je propose de **commencer par le Sprint 1** (catalogue générique + intégration devis/facture) qui apporte déjà 80% de la valeur opérationnelle. Confirmez-vous ce découpage, ou voulez-vous prioriser autre chose (par exemple démarrer directement par la location de salle qui semble être le cas d'usage prioritaire) ?
