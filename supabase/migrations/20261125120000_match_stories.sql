-- Match stories sent in by members (the stories page, web/components/stories/StoryForm.tsx): the match (its key and a
-- line about it), the story, where it comes from and whether to show the member's username. Each waits for the owner:
-- the Edge Function stories-to-sanity (supabase/functions) puts it in the Sanity Studio as a draft, called as soon as
-- one is sent in (the trigger below) and every hour (the cron job, also catching up on what the owner did: published
-- or deleted). The owner reads, tidies and publishes it in the Studio, or deletes the draft. The member sees where
-- their stories stand (`status`).
--   pending: sent in, not in the Studio yet · sent: a draft in the Studio · published · declined: the draft deleted

create table public.story_submissions (
  id bigint generated always as identity primary key,
  -- Kept when the account is deleted (the story may be published), without the author
  author uuid references auth.users (id) on delete set null,
  -- As web/utils/matchKey.ts: T<tournament> (TP: Profixio) or L<tie>, then the sides' player ids
  match_key text not null check (match_key ~ '^(TP?|L)[0-9]+(\.[0-9]+)? -?[0-9]+(\+-?[0-9]+)? vs -?[0-9]+(\+-?[0-9]+)?$'),
  match_summary text not null check (char_length(match_summary) between 1 and 300 and match_summary !~ '[[:cntrl:]]'),
  story text not null check (char_length(btrim(story)) between 30 and 2000),
  source_name text check (char_length(source_name) between 1 and 100 and source_name !~ '[[:cntrl:]]'),
  source_url text check (source_url ~ '^https?://[^[:space:]]+$' and char_length(source_url) <= 500),
  show_name boolean not null default true,
  lang text not null default 'nb' check (lang in ('nb', 'en')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'published', 'declined')),
  created_at timestamptz not null default now()
);
create index story_submissions_author on public.story_submissions (author);
create index story_submissions_waiting on public.story_submissions (status) where status in ('pending', 'sent');

alter table public.story_submissions enable row level security;
-- A member sees and sends in their own; nobody changes or deletes one through the API (the function does, as the service)
create policy "own stories: read" on public.story_submissions for select using (author = auth.uid());
create policy "own stories: send" on public.story_submissions for insert with check (author = auth.uid());
revoke insert, update, delete on public.story_submissions from anon, authenticated;
grant select on public.story_submissions to authenticated;
grant insert (author, match_key, match_summary, story, source_name, source_url, show_name, lang) on public.story_submissions to authenticated;

-- The rules: a member with a profile, whose account is at least 3 days old (a trusted one any time), with at most 3
-- waiting, one story per match each (unless the earlier one was declined). Every new one is pending.
create or replace function public.check_story() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Only in one's own name (the policy checks it too, but after this: nothing here should tell about another's stories)
  if auth.uid() is not null and new.author is distinct from auth.uid() then
    raise exception 'not_yours' using errcode = '42501';
  end if;
  new.status := 'pending';
  new.story := btrim(new.story);
  if not exists (select 1 from public.profiles where user_id = new.author) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if not public.is_trusted(new.author) and (select created_at from auth.users where id = new.author) > now() - interval '3 days' then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;
  if (select count(*) from public.story_submissions where author = new.author and status in ('pending', 'sent')) >= 3 then
    raise exception 'too_many_stories' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.story_submissions where author = new.author and match_key = new.match_key and status <> 'declined') then
    raise exception 'story_twice' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger check_story before insert on public.story_submissions for each row execute function public.check_story();

-- Into the Studio at once: the function is called when a story is sent in (pg_net: the insert doesn't wait for it)
create extension if not exists pg_net with schema extensions;
create or replace function public.story_to_studio() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform net.http_post(url := (select value #>> '{}' from public.settings where key = 'functions_url') || '/stories-to-sanity', body := '{}'::jsonb);
  return null;
end
$$;
create trigger story_to_studio after insert on public.story_submissions for each statement execute function public.story_to_studio();

revoke execute on function public.check_story(), public.story_to_studio() from public, anon, authenticated;

-- The function, as the service: the waiting stories and their authors' usernames, and their status
grant select, update on public.story_submissions to service_role;

-- Every hour: a story whose call failed, and what the owner did in the Studio (published, or the draft deleted)
select cron.schedule('stories-to-sanity', '10 * * * *', $$
  select net.http_post(url := (select value #>> '{}' from public.settings where key = 'functions_url') || '/stories-to-sanity', body := '{}'::jsonb)
$$);
