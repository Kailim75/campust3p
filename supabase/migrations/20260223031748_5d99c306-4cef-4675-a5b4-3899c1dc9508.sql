
ALTER TABLE public.creneaux_conduite DROP CONSTRAINT creneaux_conduite_type_seance_check;

ALTER TABLE public.creneaux_conduite ADD CONSTRAINT creneaux_conduite_type_seance_check 
CHECK (type_seance = ANY (ARRAY['conduite'::text, 'code'::text, 'examen_blanc'::text, 'evaluation'::text, 'conduite_ville'::text, 'conduite_preventive'::text, 'accompagnement_examen'::text]));
