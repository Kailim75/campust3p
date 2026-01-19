-- Add code_rs column to centre_formation table
ALTER TABLE public.centre_formation 
ADD COLUMN IF NOT EXISTS code_rs TEXT;