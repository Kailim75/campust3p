
-- ═══════════════════════════════════════════════════════════════
-- Table: ia_action_logs — Traçabilité des actions IA Director
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE public.ia_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  centre_id UUID REFERENCES public.centres(id),
  anomaly_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ia_action_logs ENABLE ROW LEVEL SECURITY;

-- Policies: centre-scoped access for admin/staff
CREATE POLICY "Users can view their centre action logs"
ON public.ia_action_logs
FOR SELECT
TO authenticated
USING (
  public.is_super_admin()
  OR public.has_centre_access(centre_id)
);

CREATE POLICY "Users can create action logs for their centre"
ON public.ia_action_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_super_admin()
  OR public.has_centre_access(centre_id)
);

CREATE POLICY "Users can update their centre action logs"
ON public.ia_action_logs
FOR UPDATE
TO authenticated
USING (
  public.is_super_admin()
  OR public.has_centre_access(centre_id)
);

-- Index for performance
CREATE INDEX idx_ia_action_logs_centre_id ON public.ia_action_logs(centre_id);
CREATE INDEX idx_ia_action_logs_anomaly_id ON public.ia_action_logs(anomaly_id);
CREATE INDEX idx_ia_action_logs_created_at ON public.ia_action_logs(created_at DESC);
