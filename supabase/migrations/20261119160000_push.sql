-- Push notifications (README: "Notifications"): a member who turns them on gets one on their phone when a tournament
-- draw on Elodrop first includes the player they've said is them ("This is me"), once per tournament. The site saves
-- each device's push subscription here (web/utils/push.ts); the Edge Function push-draws (supabase/functions) checks
-- the data bucket for new draws every 30 minutes through the night, called by the cron job below, and sends them.

-- Where the Edge Functions answer (the cron job calls push-draws there)
insert into public.settings (key, value) values ('functions_url', '"https://reqhakesmbkdqnvdyqhb.supabase.co/functions/v1"')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------
-- A member's devices: one push subscription each (the browser's endpoint and keys), in the page's language
-- ---------------------------------------------------------------------------------------------------------------------
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  lang text not null default 'nb' check (lang in ('nb', 'en')),
  created_at timestamptz not null default now(),
  last_sent_at timestamptz
);
create index on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "own devices: read" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "own devices: add" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "own devices: remove" on public.push_subscriptions for delete using (user_id = auth.uid());
grant select, delete on public.push_subscriptions to authenticated;
grant insert (user_id, endpoint, p256dh, auth, lang) on public.push_subscriptions to authenticated;

-- At most 10 devices a member (a device turning it on again replaces its row: the site deletes the old one first)
create or replace function public.check_push_subscription() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.push_subscriptions where user_id = new.user_id) >= 10 then
    raise exception 'too_many_devices' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger check_push_subscription before insert on public.push_subscriptions for each row execute function public.check_push_subscription();

-- ---------------------------------------------------------------------------------------------------------------------
-- The function's memory: who has been told about which tournament, and the tournament files it has read (by their
-- fetchedAt in the tournaments index: a file read again only when its draw was fetched again)
-- ---------------------------------------------------------------------------------------------------------------------
create table public.push_sent (
  user_id uuid not null references auth.users (id) on delete cascade,
  cup2000_id integer not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, cup2000_id)
);
create table public.push_seen (
  cup2000_id integer primary key,
  fetched_at text not null
);
alter table public.push_sent enable row level security;
alter table public.push_seen enable row level security;
-- No policies: only the function (the service role) reads and writes them
grant select, insert, update, delete on public.push_sent, public.push_seen to service_role;
grant select, update, delete on public.push_subscriptions to service_role;
grant select on public.profiles, public.settings to service_role;

-- ---------------------------------------------------------------------------------------------------------------------
-- Every 30 minutes through the night (UTC 00:00–05:30, Norway 01:00–07:30), while the nightly run publishes: the call
-- returns at once (pg_net), the function does the rest
-- ---------------------------------------------------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;
select cron.schedule('push-draws', '*/30 0-5 * * *', $$
  select net.http_post(url := (select value #>> '{}' from public.settings where key = 'functions_url') || '/push-draws', body := '{}'::jsonb)
$$);

revoke execute on function public.check_push_subscription() from public, anon, authenticated;
