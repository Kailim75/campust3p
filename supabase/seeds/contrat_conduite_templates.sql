-- ═══════════════════════════════════════════════════════════════
-- SEED MANUEL — Templates "contrat_conduite" (Taxi / VTC)
-- ⚠️ Fichier non exécuté automatiquement. À insérer manuellement
--    via l'outil supabase--insert après validation utilisateur.
-- ═══════════════════════════════════════════════════════════════
-- Remplacer <CENTRE_ID> par l'UUID du centre cible avant insertion.
-- ═══════════════════════════════════════════════════════════════

-- 1. Produits catalogue (table produits_services)
INSERT INTO public.produits_services (centre_id, nom, sku, type, prix_ht, tva_percent, statut, duree_minutes, metadata, description_courte)
VALUES
  ('<CENTRE_ID>', 'Accompagnement conduite Taxi', 'ACC-CONDUITE-TAXI', 'forfaitaire',
   207.50, 20, 'actif', 120,
   '{"filiere":"taxi","categorie_doc":"contrat_conduite","vehicule_examen_inclus":true,"prix_catalogue_ttc":249}'::jsonb,
   '2 h d''accompagnement + véhicule examen inclus'),
  ('<CENTRE_ID>', 'Accompagnement conduite VTC', 'ACC-CONDUITE-VTC', 'forfaitaire',
   158.33, 20, 'actif', 120,
   '{"filiere":"vtc","categorie_doc":"contrat_conduite","vehicule_examen_inclus":true,"prix_catalogue_ttc":190}'::jsonb,
   '2 h d''accompagnement + véhicule examen inclus')
ON CONFLICT DO NOTHING;

-- 2. Templates Template Studio V2 (publié)
-- Le body_html ci-dessous est minimal — à enrichir dans Template Studio.
INSERT INTO public.template_studio_templates (
  centre_id, name, type, status, is_active, body_html, metadata
)
VALUES
  ('<CENTRE_ID>', 'Contrat accompagnement conduite — Taxi', 'contrat_conduite',
   'published', true,
   '<h1>Contrat d''accompagnement à la conduite — examen Taxi</h1>
    <p>Entre {{centre_raison_sociale}} (SIRET {{centre_siret}}) et {{contact_prenom}} {{contact_nom}}.</p>
    <h2>Prestation</h2>
    <p>{{produit_intitule}} — durée : {{produit_duree}}.</p>
    <p>{{produit_contenu}}</p>
    <p><strong>{{produit_vehicule_examen}}</strong></p>
    <h2>Prix</h2>
    <p>Prix TTC : <strong>{{paiement_prix_ttc}}</strong>. Payé : {{paiement_montant_paye}}. Reste : {{paiement_reste_a_payer}}.</p>
    <h2>Planning</h2>
    <ul>
      <li>Conduite : {{seance_date_conduite}}</li>
      <li>Examen : {{seance_date_examen}}</li>
      <li>Lieu RDV : {{seance_lieu_rdv}}</li>
      <li>Accompagnateur : {{seance_accompagnateur}}</li>
    </ul>
    <h2>Conditions d''annulation</h2>
    <p>{{contrat_conditions_annulation}}</p>
    <p>Fait le {{contrat_date}}.</p>',
   '{"filiere":"taxi"}'::jsonb),
  ('<CENTRE_ID>', 'Contrat accompagnement conduite — VTC', 'contrat_conduite',
   'published', true,
   '<h1>Contrat d''accompagnement à la conduite — examen VTC</h1>
    <p>Entre {{centre_raison_sociale}} (SIRET {{centre_siret}}) et {{contact_prenom}} {{contact_nom}}.</p>
    <h2>Prestation</h2>
    <p>{{produit_intitule}} — durée : {{produit_duree}}.</p>
    <p>{{produit_contenu}}</p>
    <p><strong>{{produit_vehicule_examen}}</strong></p>
    <h2>Prix</h2>
    <p>Prix TTC : <strong>{{paiement_prix_ttc}}</strong>. Payé : {{paiement_montant_paye}}. Reste : {{paiement_reste_a_payer}}.</p>
    <h2>Planning</h2>
    <ul>
      <li>Conduite : {{seance_date_conduite}}</li>
      <li>Examen : {{seance_date_examen}}</li>
      <li>Lieu RDV : {{seance_lieu_rdv}}</li>
      <li>Accompagnateur : {{seance_accompagnateur}}</li>
    </ul>
    <h2>Conditions d''annulation</h2>
    <p>{{contrat_conditions_annulation}}</p>
    <p>Fait le {{contrat_date}}.</p>',
   '{"filiere":"vtc"}'::jsonb)
ON CONFLICT DO NOTHING;
