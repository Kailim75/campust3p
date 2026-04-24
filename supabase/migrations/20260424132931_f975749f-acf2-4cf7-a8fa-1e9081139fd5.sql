SELECT cron.schedule(
  'process-payment-reminders-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://zhgbbujqapcigmduuqiy.supabase.co/functions/v1/process-payment-reminders',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoZ2JidWpxYXBjaWdtZHV1cWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxNjgxNzYsImV4cCI6MjA4Mzc0NDE3Nn0.hWmdwvoCh8p-AwNfwRhLnQPOKTjZO_uJjBHPVrtcfgA"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $$
);