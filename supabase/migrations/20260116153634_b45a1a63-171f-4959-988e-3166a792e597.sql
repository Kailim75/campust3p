-- Table des workflows
CREATE TABLE public.workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  description TEXT,
  actif BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'contact_created', 'inscription_created', 'payment_received', 'exam_scheduled', 'status_changed', 'document_expired'
  trigger_conditions JSONB DEFAULT '{}', -- Conditions supplémentaires
  actions JSONB NOT NULL DEFAULT '[]', -- Liste d'actions à exécuter
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table des logs d'exécution
CREATE TABLE public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  trigger_data JSONB,
  status TEXT DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- RLS
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage workflows"
ON public.workflows FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can view executions"
ON public.workflow_executions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_workflows_trigger ON public.workflows(trigger_type) WHERE actif = true;
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);

-- Trigger updated_at
CREATE TRIGGER update_workflows_updated_at
BEFORE UPDATE ON public.workflows
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();