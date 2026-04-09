
CREATE OR REPLACE FUNCTION public.check_email_antiflood(p_recipient_email TEXT, p_type TEXT, p_window_minutes INT DEFAULT 5)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.email_logs
    WHERE recipient_email = p_recipient_email
      AND type = p_type
      AND status = 'sent'
      AND created_at > (now() - (p_window_minutes || ' minutes')::interval)
  );
$$;
