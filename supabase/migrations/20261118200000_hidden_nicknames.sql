-- Hiding a member's nickname from everyone else (a rude one, say): the owner sets `hidden` in the dashboard (Table
-- editor → profiles), never the member (no grant on the column). A hidden member's ideas show without a nickname, and
-- they're left out of EloStonk's leaderboards, leagues' tables and statistics (*_elostonk.sql); they can still sign in
-- and play. Rude words in new nicknames and league names are refused by `blocked_words`, which the owner adds to
-- (Table editor → blocked_words: lowercase, matched anywhere in the name).
alter table public.profiles add column hidden boolean not null default false;

create or replace view public.ideas_public as
  select i.id, i.title, i.body, i.status, i.created_at, (select count(*) from public.votes v where v.idea_id = i.id)::integer as votes,
    (select p.nickname from public.profiles p where p.user_id = i.author and not p.hidden) as author
  from public.ideas i
  where i.status in ('open', 'planned', 'done');
