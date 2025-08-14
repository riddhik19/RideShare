-- Enable pg_cron and pg_net extensions for scheduled notifications
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule notification processor to run every 5 minutes
SELECT cron.schedule(
  'process-ride-notifications',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://rulcdamqrvmkuwzugvcs.supabase.co/functions/v1/notification-processor',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1bGNkYW1xcnZta3V3enVndmNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NzEwMjIsImV4cCI6MjA2ODE0NzAyMn0.Dq9x0Nc6sIS1ZroQ5dHoAQo0JyZR1U-qh1kQnm7oIF8"}'::jsonb,
        body:='{"scheduled": true}'::jsonb
    ) as request_id;
  $$
);