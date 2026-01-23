-- Table pour stocker les alertes traitées/dismissées
CREATE TABLE public.dismissed_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reason TEXT,
  UNIQUE(alert_id, user_id)
);

-- Index pour les recherches rapides
CREATE INDEX idx_dismissed_alerts_user ON public.dismissed_alerts(user_id);
CREATE INDEX idx_dismissed_alerts_alert ON public.dismissed_alerts(alert_id);

-- Enable RLS
ALTER TABLE public.dismissed_alerts ENABLE ROW LEVEL SECURITY;

-- Policies: users can manage their own dismissed alerts
CREATE POLICY "Users can view their dismissed alerts"
ON public.dismissed_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss alerts"
ON public.dismissed_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can restore dismissed alerts"
ON public.dismissed_alerts
FOR DELETE
USING (auth.uid() = user_id);

-- Fonction pour nettoyer les anciennes alertes dismissées (> 90 jours)
CREATE OR REPLACE FUNCTION public.cleanup_old_dismissed_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM dismissed_alerts
  WHERE dismissed_at < now() - INTERVAL '90 days';
END;
$$;