DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.session_inscriptions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.factures; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.paiements; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.sessions REPLICA IDENTITY FULL;
ALTER TABLE public.session_inscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.factures REPLICA IDENTITY FULL;
ALTER TABLE public.paiements REPLICA IDENTITY FULL;