-- Elodrop's user accounts (README: "User accounts"). The browser talks to these tables directly with the anon key, so
-- every rule that matters is here, in row-level security and triggers, not in the site's code: what a user may read
-- and write, the age limit, how often a claim may change, and the limits on suggestions and error reports.
--
-- Nothing here is public about a user but a nickname, and only where they take part (Release 3's leaderboards): no
-- real names, no claims, no follows.

-- ---------------------------------------------------------------------------------------------------------------------
-- Settings the owner switches in the dashboard (Table editor → settings)
-- ---------------------------------------------------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null
);
insert into public.settings (key, value) values
  ('reports_enabled', 'true'),
  -- Accounts are for 15 and over (personopplysningsloven § 5 is 13 today; 15 is proposed, and needs no parental
  -- consent either way). web/utils/account.ts has the same number for the sign-up page.
  ('min_age', '15');
alter table public.settings enable row level security;
create policy "settings are public" on public.settings for select using (true);

create or replace function public.setting(name text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select value from public.settings where key = name
$$;

-- Words a nickname may not contain (lowercase), added by the owner; seeded with names that would pass for the site's own
create table public.blocked_words (word text primary key check (word = lower(word)));
insert into public.blocked_words (word) values ('elodrop'), ('admin'), ('moderator'), ('support');
alter table public.blocked_words enable row level security;
-- No policies: only the owner (dashboard) and the functions below read it

-- ---------------------------------------------------------------------------------------------------------------------
-- Profiles: one per account, made after sign-in once the age gate is passed
-- ---------------------------------------------------------------------------------------------------------------------
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null check (char_length(nickname) between 3 and 20 and nickname !~ '[[:cntrl:]]' and nickname = btrim(nickname)),
  -- Only the year is kept: the sign-up page asks for the date and checks the age with it, then sends the year
  birth_year integer not null,
  -- "This is me": private, only ever read by the user themselves
  player_id integer,
  player_claimed_at timestamptz,
  -- Error reports: switched off after two declined
  can_report boolean not null default true,
  declined_reports integer not null default 0,
  -- Set by the owner in the dashboard (Table editor → profiles), never by the user: their suggestions are shown at once
  -- and not limited, their reports skip the ages and the caps, their "This is me" the 30 days' wait
  trusted boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index profiles_nickname_key on public.profiles (lower(nickname));

alter table public.profiles enable row level security;
create policy "own profile: read" on public.profiles for select using (user_id = auth.uid());
create policy "own profile: create" on public.profiles for insert with check (user_id = auth.uid());
create policy "own profile: change" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- What a user may write: never can_report, trusted, the counts or the dates
revoke insert, update on public.profiles from anon, authenticated;
grant insert (user_id, nickname, birth_year) on public.profiles to authenticated;
grant update (nickname, player_id) on public.profiles to authenticated;

create or replace function public.is_trusted(account uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select trusted from public.profiles where user_id = account), false)
$$;

create or replace function public.check_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  min_age integer := (public.setting('min_age'))::integer;
begin
  -- A coarse check on the year (the sign-up page checks the date): never refuses someone old enough
  if new.birth_year > extract(year from now())::integer - min_age or new.birth_year < 1900 then
    raise exception 'too_young' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.blocked_words w where position(w.word in lower(new.nickname)) > 0) then
    raise exception 'nickname_blocked' using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.player_id := null;
    new.player_claimed_at := null;
  elsif new.player_id is distinct from old.player_id then
    -- The claim may change once every 30 days (clearing it is always allowed, and so is the first claim; a trusted
    -- account's any time)
    if new.player_id is not null and old.player_claimed_at is not null and old.player_claimed_at > now() - interval '30 days' and not old.trusted then
      raise exception 'claim_too_soon' using errcode = 'P0001';
    end if;
    new.player_claimed_at := case when new.player_id is null then old.player_claimed_at else now() end;
  end if;
  return new;
end
$$;
create trigger check_profile before insert or update on public.profiles for each row execute function public.check_profile();

-- ---------------------------------------------------------------------------------------------------------------------
-- Following players and clubs
-- ---------------------------------------------------------------------------------------------------------------------
create table public.follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('player', 'club')),
  -- A player's id or a club's slug
  target text not null check (char_length(target) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target)
);
alter table public.follows enable row level security;
create policy "own follows: read" on public.follows for select using (user_id = auth.uid());
create policy "own follows: add" on public.follows for insert with check (user_id = auth.uid());
create policy "own follows: remove" on public.follows for delete using (user_id = auth.uid());

-- ---------------------------------------------------------------------------------------------------------------------
-- Ideas and votes: suggestions wait for the owner, who sets their status in the dashboard (a trusted account's are open
-- at once), and show their author's nickname
-- ---------------------------------------------------------------------------------------------------------------------
create table public.ideas (
  id bigint generated always as identity primary key,
  title text not null check (char_length(btrim(title)) between 5 and 80),
  body text not null default '' check (char_length(body) <= 500),
  status text not null default 'pending' check (status in ('pending', 'open', 'planned', 'done', 'declined')),
  author uuid references auth.users (id) on delete set null,
  -- The author lets the owner email them about it (unticked unless they tick it); the owner finds the address from
  -- `author` in the dashboard (Authentication → Users)
  contact_ok boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.ideas enable row level security;
-- A user sees their own suggestions (any status); everyone sees the rest through ideas_public
create policy "own ideas: read" on public.ideas for select using (author = auth.uid());
create policy "own ideas: suggest" on public.ideas for insert with check (author = auth.uid());
revoke insert, update, delete on public.ideas from anon, authenticated;
grant insert (title, body, author, contact_ok) on public.ideas to authenticated;

create or replace function public.check_idea() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- A trusted account's idea is shown at once, and not limited
  if public.is_trusted(new.author) then
    new.status := 'open';
    return new;
  end if;
  new.status := 'pending';
  if (select created_at from auth.users where id = new.author) > now() - interval '7 days' then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;
  if (select count(*) from public.ideas where author = new.author and status = 'pending') >= 2 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger check_idea before insert on public.ideas for each row execute function public.check_idea();

create table public.votes (
  user_id uuid not null references auth.users (id) on delete cascade,
  idea_id bigint not null references public.ideas (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, idea_id)
);
alter table public.votes enable row level security;
create policy "own votes: read" on public.votes for select using (user_id = auth.uid());
-- Only on ideas still open or planned (read past the ideas' own policy, which shows a user only their own)
create or replace function public.idea_votable(idea bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.ideas where id = idea and status in ('open', 'planned'))
$$;
create policy "own votes: vote" on public.votes for insert with check (user_id = auth.uid() and public.idea_votable(idea_id));
create policy "own votes: take back" on public.votes for delete using (user_id = auth.uid());

-- The ideas everyone sees, with their votes and their author's nickname (none once the account is deleted). A view runs as its owner, so it counts every
-- vote though each user can read only their own.
create view public.ideas_public as
  select i.id, i.title, i.body, i.status, i.created_at, (select count(*) from public.votes v where v.idea_id = i.id)::integer as votes,
    (select p.nickname from public.profiles p where p.user_id = i.author) as author
  from public.ideas i
  where i.status in ('open', 'planned', 'done');
grant select on public.ideas_public to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Error reports: only about the player one has claimed, from an account a month old, few and far between
-- ---------------------------------------------------------------------------------------------------------------------
create table public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  player_id integer not null,
  kind text not null check (kind in ('club', 'match', 'tournament', 'duplicate', 'birthYear')),
  -- What it's about, as picked from lists (the match, the other player); small
  detail jsonb not null default '{}' check (octet_length(detail::text) <= 400),
  note text not null default '' check (char_length(note) <= 280),
  status text not null default 'open' check (status in ('open', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index reports_user on public.reports (user_id, created_at);
create index reports_player_open on public.reports (player_id) where status = 'open';
alter table public.reports enable row level security;
create policy "own reports: read" on public.reports for select using (user_id = auth.uid());
create policy "own reports: send" on public.reports for insert with check (user_id = auth.uid());
revoke insert, update, delete on public.reports from anon, authenticated;
grant insert (user_id, player_id, kind, detail, note) on public.reports to authenticated;

create or replace function public.check_report() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  p public.profiles;
begin
  new.status := 'open';
  new.closed_at := null;
  if not coalesce((public.setting('reports_enabled'))::boolean, false) then
    raise exception 'reports_off' using errcode = 'P0001';
  end if;
  select * into p from public.profiles where user_id = new.user_id;
  if p is null or not p.can_report then
    raise exception 'reports_blocked' using errcode = 'P0001';
  end if;
  -- A trusted account skips the ages and the caps (still only about its own player)
  if p.trusted then
    if p.player_id is distinct from new.player_id then
      raise exception 'not_your_player' using errcode = 'P0001';
    end if;
    return new;
  end if;
  if (select created_at from auth.users where id = new.user_id) > now() - interval '30 days' then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;
  if p.player_id is distinct from new.player_id or p.player_claimed_at > now() - interval '14 days' then
    raise exception 'not_your_player' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.reports where user_id = new.user_id and status = 'open') then
    raise exception 'report_open' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reports where user_id = new.user_id and created_at > now() - interval '90 days') >= 3 then
    raise exception 'too_many_reports' using errcode = 'P0001';
  end if;
  if (select count(*) from public.reports where player_id = new.player_id and status = 'open') >= 2 then
    raise exception 'player_reported' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger check_report before insert on public.reports for each row execute function public.check_report();

-- The owner closes a report in the dashboard: the date is set, and a second declined report ends the user's reporting
create or replace function public.close_report() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status <> 'open' and old.status = 'open' then
    new.closed_at := now();
    if new.status = 'declined' then
      update public.profiles
        set declined_reports = declined_reports + 1, can_report = declined_reports + 1 < 2
        where user_id = new.user_id;
    end if;
  end if;
  return new;
end
$$;
create trigger close_report before update on public.reports for each row execute function public.close_report();

-- ---------------------------------------------------------------------------------------------------------------------
-- Deleting one's account: everything above goes with it (on delete cascade; suggestions stay, without an author)
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not_signed_in' using errcode = 'P0001';
  end if;
  delete from auth.users where id = auth.uid();
end
$$;
revoke execute on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- The trigger functions aren't for calling through the API
revoke execute on function public.check_profile(), public.check_idea(), public.check_report(), public.close_report(), public.is_trusted(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- What the browser's roles may touch at all, granted one by one: a hosted project doesn't expose new tables to the API
-- roles by itself (supabase/config.toml: auto_expose_new_tables = false, the same locally). Row-level security above
-- then decides which rows, and the column grants which columns may be written.
-- ---------------------------------------------------------------------------------------------------------------------
-- Everyone: the settings (whether reports are on) and the ideas everyone sees
grant select on public.settings to anon, authenticated;
grant select on public.ideas_public to anon, authenticated;

-- A signed-in user: their own rows
grant select on public.profiles to authenticated;
grant select, insert, delete on public.follows to authenticated;
grant select on public.ideas to authenticated;
grant select, insert, delete on public.votes to authenticated;
grant select on public.reports to authenticated;
-- Used by the votes' policy, which runs as the voter
grant execute on function public.idea_votable(bigint) to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Closed reports are kept 12 months (the privacy page says so), then deleted by a nightly job in the database
-- ---------------------------------------------------------------------------------------------------------------------
create extension if not exists pg_cron;
select cron.schedule('delete-closed-reports', '30 3 * * *', $$delete from public.reports where status <> 'open' and closed_at < now() - interval '12 months'$$);
