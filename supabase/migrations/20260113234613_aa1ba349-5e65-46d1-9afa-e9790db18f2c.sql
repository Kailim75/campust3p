-- Ajouter les colonnes pour les alertes de rappel
ALTER TABLE public.contact_historique 
ADD COLUMN alerte_active boolean DEFAULT false,
ADD COLUMN date_rappel timestamp with time zone DEFAULT NULL,
ADD COLUMN rappel_description text DEFAULT NULL;