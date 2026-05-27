CREATE TABLE public.email_snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID NOT NULL,
  user_id UUID NULL,
  scope TEXT NOT NULL DEFAULT 'centre' CHECK (scope IN ('centre','personal')),
  shortcut TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID NULL
);

CREATE INDEX idx_email_snippets_centre ON public.email_snippets(centre_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_email_snippets_user ON public.email_snippets(user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_email_snippets_shortcut_scope ON public.email_snippets(centre_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(shortcut)) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_snippets TO authenticated;
GRANT ALL ON public.email_snippets TO service_role;

ALTER TABLE public.email_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View centre or own snippets"
ON public.email_snippets FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND has_centre_access(centre_id)
  AND (scope = 'centre' OR user_id = auth.uid())
);

CREATE POLICY "Insert snippets in own centre"
ON public.email_snippets FOR INSERT TO authenticated
WITH CHECK (
  has_centre_access(centre_id)
  AND (
    (scope = 'personal' AND user_id = auth.uid())
    OR (scope = 'centre' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')))
  )
);

CREATE POLICY "Update own or centre snippets if staff"
ON public.email_snippets FOR UPDATE TO authenticated
USING (
  has_centre_access(centre_id)
  AND (
    (scope = 'personal' AND user_id = auth.uid())
    OR (scope = 'centre' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')))
  )
);

CREATE POLICY "Delete own or centre snippets if staff"
ON public.email_snippets FOR DELETE TO authenticated
USING (
  has_centre_access(centre_id)
  AND (
    (scope = 'personal' AND user_id = auth.uid())
    OR (scope = 'centre' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'staff')))
  )
);

CREATE TRIGGER update_email_snippets_updated_at
BEFORE UPDATE ON public.email_snippets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();