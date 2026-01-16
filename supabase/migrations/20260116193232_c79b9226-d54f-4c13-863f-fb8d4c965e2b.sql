-- Table pour l'historique des actions IA (audit trail)
CREATE TABLE IF NOT EXISTS public.ai_actions_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action_type TEXT NOT NULL,
  action_name TEXT NOT NULL,
  parameters JSONB,
  result JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS
ALTER TABLE public.ai_actions_audit ENABLE ROW LEVEL SECURITY;

-- Policies - only admin/staff can view audit logs
CREATE POLICY "Admins et staff peuvent voir l'audit IA"
ON public.ai_actions_audit
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'staff')
  )
);

-- Policy for insert (service role only via edge function)
CREATE POLICY "Service role peut insérer audit"
ON public.ai_actions_audit
FOR INSERT
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_ai_actions_audit_user_id ON public.ai_actions_audit(user_id);
CREATE INDEX idx_ai_actions_audit_executed_at ON public.ai_actions_audit(executed_at DESC);
CREATE INDEX idx_ai_actions_audit_action_type ON public.ai_actions_audit(action_type);