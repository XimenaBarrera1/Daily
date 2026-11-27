-- Run once in the Supabase SQL Editor after replacing both values below.
-- Store the deployed site's origin (no trailing slash) and the same random
-- CRON_SECRET configured in the app's production environment variables.

create extension if not exists pg_cron with schema pg_catalog;
create schema if not exists extensions;
create extension if not exists pg_net with schema extensions;

select vault.create_secret('https://YOUR-DEPLOYED-APP-DOMAIN', 'daily_app_url');
select vault.create_secret('REPLACE_WITH_THE_PRODUCTION_CRON_SECRET', 'daily_cron_secret');

select cron.schedule(
  'daily-process-reminders',
  '* * * * *',
  $$
    select net.http_get(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'daily_app_url')
        || '/api/cron/process-reminders',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'daily_cron_secret')
      ),
      timeout_milliseconds := 60000
    );
  $$
);
