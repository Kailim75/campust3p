
-- Blockage audit trail table
CREATE TABLE public.blockage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('BLOCKER', 'WARNING', 'INFO')),
  message TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_type TEXT CHECK (resolution_type IN ('auto_fix', 'manual', 'bypass')),
  justification TEXT,
  impact_score INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.blockage_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies using centre isolation
CREATE POLICY "Users can view blockage logs for their centre"
ON public.blockage_logs FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.has_centre_access(centre_id)
);

CREATE POLICY "Users can insert blockage logs for their centre"
ON public.blockage_logs FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR public.has_centre_access(centre_id)
  OR centre_id IS NULL
);

CREATE POLICY "Users can update blockage logs for their centre"
ON public.blockage_logs FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.has_centre_access(centre_id)
);

-- Index for performance
CREATE INDEX idx_blockage_logs_centre_entity ON public.blockage_logs (centre_id, entity_type, entity_id);
CREATE INDEX idx_blockage_logs_severity ON public.blockage_logs (severity, resolved_at);
