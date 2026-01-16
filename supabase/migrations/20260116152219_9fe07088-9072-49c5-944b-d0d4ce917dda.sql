-- Table pour les logs de l'assistant IA
CREATE TABLE public.ai_assistant_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_message TEXT NOT NULL,
  assistant_response TEXT NOT NULL,
  action TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_assistant_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own AI logs"
ON public.ai_assistant_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI logs"
ON public.ai_assistant_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Index pour performance
CREATE INDEX idx_ai_logs_user_id ON public.ai_assistant_logs(user_id);
CREATE INDEX idx_ai_logs_created_at ON public.ai_assistant_logs(created_at DESC);