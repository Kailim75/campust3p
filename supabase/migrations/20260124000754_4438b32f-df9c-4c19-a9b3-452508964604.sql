
-- =============================================
-- CRÉER TABLE lms_answers
-- =============================================

CREATE TABLE public.lms_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.lms_questions(id) ON DELETE CASCADE NOT NULL,
  texte TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  ordre INTEGER DEFAULT 0,
  explication TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour performance
CREATE INDEX idx_lms_answers_question ON public.lms_answers(question_id);

-- Activer RLS
ALTER TABLE public.lms_answers ENABLE ROW LEVEL SECURITY;

-- Policy Admin
CREATE POLICY "Admin full access lms_answers" ON public.lms_answers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policy Staff
CREATE POLICY "Staff read lms_answers" ON public.lms_answers FOR SELECT USING (public.has_role(auth.uid(), 'staff'));
