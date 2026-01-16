-- Add new contact statuses for the pipeline
-- First, let's add the new enum values to the contact_statut enum

ALTER TYPE public.contact_statut ADD VALUE IF NOT EXISTS 'En formation théorique';
ALTER TYPE public.contact_statut ADD VALUE IF NOT EXISTS 'Examen T3P programmé';
ALTER TYPE public.contact_statut ADD VALUE IF NOT EXISTS 'T3P obtenu';
ALTER TYPE public.contact_statut ADD VALUE IF NOT EXISTS 'En formation pratique';
ALTER TYPE public.contact_statut ADD VALUE IF NOT EXISTS 'Examen pratique programmé';
ALTER TYPE public.contact_statut ADD VALUE IF NOT EXISTS 'Abandonné';