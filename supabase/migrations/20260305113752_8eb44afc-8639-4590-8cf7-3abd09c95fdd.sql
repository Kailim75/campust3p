
-- Table leads pour le formulaire de contact commercial
CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  centre_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  volume text,
  message text,
  source text DEFAULT 'presentation'
);

-- RLS: insertion publique (formulaire sans login), lecture admin/staff uniquement
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert leads"
  ON public.leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admin/staff can read leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
