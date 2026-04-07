
-- Table for custom CRM labels per centre
CREATE TABLE public.crm_label_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID NOT NULL REFERENCES public.centres(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'gray',
  is_system BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(centre_id, name)
);

-- Enable RLS
ALTER TABLE public.crm_label_definitions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view labels of their centres"
ON public.crm_label_definitions FOR SELECT TO authenticated
USING (public.has_centre_access(centre_id));

CREATE POLICY "Admins can manage labels"
ON public.crm_label_definitions FOR INSERT TO authenticated
WITH CHECK (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
);

CREATE POLICY "Admins can update labels"
ON public.crm_label_definitions FOR UPDATE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
);

CREATE POLICY "Admins can delete non-system labels"
ON public.crm_label_definitions FOR DELETE TO authenticated
USING (
  public.has_centre_access(centre_id)
  AND is_system = false
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff') OR public.is_super_admin())
);

-- Timestamp trigger
CREATE TRIGGER update_crm_label_definitions_updated_at
BEFORE UPDATE ON public.crm_label_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index
CREATE INDEX idx_crm_label_definitions_centre ON public.crm_label_definitions(centre_id);
