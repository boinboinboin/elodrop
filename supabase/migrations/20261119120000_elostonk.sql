-- EloStonk, the fantasy game (README: "EloStonk"): each member picks 5 players (18 or older), one of them captain
-- (counted twice), for each round; a round runs Friday to Thursday and locks at its Friday 00:00 in Norway. A player's
-- points in a round come from the pipeline (pipeline/elostonk.mjs: how much better than expected they did), imported
-- here every night from the public data bucket (stonk_import), so no secret is needed anywhere.
--
-- A squad is saved for the next round only (the database decides which), and carries over: a member's squad for a
-- round is the one they saved last before it locked. Everyone's squads, scores and the picks' statistics are shown by
-- nickname once a round has locked, never before, so nobody copies anyone.

insert into public.settings (key, value) values
  -- The youngest age a player can be picked at (pipeline/elostonk.mjs MIN_AGE)
  ('stonk_min_age', '18'),
  -- Where the game's files are (the site's data bucket)
  ('data_url', '"https://data.elodrop.no"')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------------------------------------------------
-- Rounds: a round is known by its Friday; it locks at that Friday 00:00 in Norway
-- ---------------------------------------------------------------------------------------------------------------------
/** The round a moment is in: its Friday (in Norway) */
create or replace function public.stonk_round_of(moment timestamptz) returns date
language sql stable set search_path = '' as $$
  select d - ((extract(isodow from d)::integer - 5 + 7) % 7)
  from (select (moment at time zone 'Europe/Oslo')::date as d) x
$$;
/** The round squads are saved for now: the one after the round under way (which has locked) */
create or replace function public.stonk_next_round() returns date
language sql stable set search_path = '' as $$
  select public.stonk_round_of(now()) + 7
$$;

-- ---------------------------------------------------------------------------------------------------------------------
-- The players who can be picked, and their points: imported from the pipeline's files, readable by anyone
-- ---------------------------------------------------------------------------------------------------------------------
create table public.stonk_players (
  player_id integer primary key,
  name text not null,
  club text,
  birth_year integer,
  -- In the newest file: 18 or older and active. A player no longer in it can't be picked again (a squad keeps them)
  eligible boolean not null default true,
  updated_at timestamptz not null default now()
);
create table public.stonk_rounds (
  round date primary key,
  -- No more late results to come (3 weeks after it ended)
  final boolean not null default false,
  imported_at timestamptz not null default now()
);
create table public.stonk_points (
  round date not null references public.stonk_rounds (round) on delete cascade,
  player_id integer not null,
  points numeric(7, 1) not null,
  matches integer not null,
  primary key (round, player_id)
);
alter table public.stonk_players enable row level security;
alter table public.stonk_rounds enable row level security;
alter table public.stonk_points enable row level security;
create policy "stonk players are public" on public.stonk_players for select using (true);
create policy "stonk rounds are public" on public.stonk_rounds for select using (true);
create policy "stonk points are public" on public.stonk_points for select using (true);
grant select on public.stonk_players, public.stonk_rounds, public.stonk_points to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Squads: one row per member and round they saved one for
-- ---------------------------------------------------------------------------------------------------------------------
create table public.stonk_picks (
  user_id uuid not null references auth.users (id) on delete cascade,
  round date not null,
  players integer[] not null,
  captain integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, round)
);
alter table public.stonk_picks enable row level security;
-- A member reads their own squads (everyone's are shown by nickname, once locked, through the views below)
create policy "own picks: read" on public.stonk_picks for select using (user_id = auth.uid());
create policy "own picks: save" on public.stonk_picks for insert with check (user_id = auth.uid());
-- Only the round not yet locked can change
create policy "own picks: change" on public.stonk_picks for update using (user_id = auth.uid() and round = public.stonk_next_round()) with check (user_id = auth.uid());
create policy "own picks: clear" on public.stonk_picks for delete using (user_id = auth.uid() and round = public.stonk_next_round());
grant select, delete on public.stonk_picks to authenticated;
-- All four for updating too: the site saves with an upsert (insert, or update on a conflict), which sets every column it
-- sends; the trigger sets the round again and the policy keeps the user their own
grant insert (user_id, round, players, captain), update (user_id, round, players, captain) on public.stonk_picks to authenticated;

create or replace function public.check_picks() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Always the next round: the one not yet locked (the client can't choose another)
  new.round := public.stonk_next_round();
  new.updated_at := now();
  if not exists (select 1 from public.profiles where user_id = new.user_id) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if cardinality(new.players) <> 5 or (select count(distinct p) from unnest(new.players) p) <> 5 or not (new.captain = any (new.players)) then
    raise exception 'squad_invalid' using errcode = 'P0001';
  end if;
  if (select count(*) from public.stonk_players where player_id = any (new.players) and eligible) <> 5 then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger check_picks before insert or update on public.stonk_picks for each row execute function public.check_picks();

-- ---------------------------------------------------------------------------------------------------------------------
-- Scores: each member's squad in each round under way or played (the newest saved before it), with its points
-- ---------------------------------------------------------------------------------------------------------------------
/** The squads that counted in each round that has started, carried over from the round they were saved for */
create view public.stonk_squads as
  select r.round, s.user_id, s.players, s.captain
  from public.stonk_rounds r
  cross join lateral (
    select distinct on (p.user_id) p.user_id, p.players, p.captain
    from public.stonk_picks p
    where p.round <= r.round
    order by p.user_id, p.round desc
  ) s
  where r.round <= public.stonk_round_of(now());
revoke all on public.stonk_squads from anon, authenticated;

/** Each squad's points in each round, by nickname (the user's id stays inside) */
create view public.stonk_round_scores as
  select q.round,
    (case when extract(month from q.round) >= 7 then extract(year from q.round) else extract(year from q.round) - 1 end)::integer as season,
    pr.nickname,
    coalesce(sum(pt.points * case when pt.player_id = q.captain then 2 else 1 end), 0)::numeric(8, 1) as points,
    r.final
  from public.stonk_squads q
  join public.profiles pr on pr.user_id = q.user_id
  join public.stonk_rounds r on r.round = q.round
  left join public.stonk_points pt on pt.round = q.round and pt.player_id = any (q.players)
  group by q.round, pr.nickname, r.final;
grant select on public.stonk_round_scores to anon, authenticated;

/** The season's table: points, rounds played and the best round, ranked */
create view public.stonk_season_table as
  select season, nickname, sum(points)::numeric(9, 1) as points, count(*)::integer as rounds, max(points) as best,
    rank() over (partition by season order by sum(points) desc)::integer as rank
  from public.stonk_round_scores
  group by season, nickname;
grant select on public.stonk_season_table to anon, authenticated;

/** All time */
create view public.stonk_alltime_table as
  select nickname, sum(points)::numeric(10, 1) as points, count(*)::integer as rounds, max(points) as best,
    rank() over (order by sum(points) desc)::integer as rank
  from public.stonk_round_scores
  group by nickname;
grant select on public.stonk_alltime_table to anon, authenticated;

/** Everyone's squad in each started round, by nickname, with each player's points (for the leaderboard's squads) */
create view public.stonk_locked_squads as
  select q.round, pr.nickname, q.players, q.captain
  from public.stonk_squads q
  join public.profiles pr on pr.user_id = q.user_id;
grant select on public.stonk_locked_squads to anon, authenticated;

/** How often each player was picked and made captain in each started round, out of the squads in it */
create view public.stonk_ownership as
  with squads as (select round, count(*) as total from public.stonk_squads group by round)
  select q.round, p.player_id, sp.name,
    count(*)::integer as picks,
    count(*) filter (where q.captain = p.player_id)::integer as captains,
    round(100.0 * count(*) / s.total, 1) as picked_pct,
    coalesce(pt.points, 0) as points
  from public.stonk_squads q
  cross join lateral unnest(q.players) as p (player_id)
  join squads s on s.round = q.round
  left join public.stonk_players sp on sp.player_id = p.player_id
  left join public.stonk_points pt on pt.round = q.round and pt.player_id = p.player_id
  group by q.round, p.player_id, sp.name, s.total, pt.points;
grant select on public.stonk_ownership to anon, authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- Leagues: a league of one's own, joined with its invite code
-- ---------------------------------------------------------------------------------------------------------------------
create table public.stonk_leagues (
  id bigint generated always as identity primary key,
  name text not null check (char_length(btrim(name)) between 3 and 40 and name !~ '[[:cntrl:]]'),
  owner uuid references auth.users (id) on delete set null,
  invite_code text not null unique default encode(extensions.gen_random_bytes(6), 'hex'),
  created_at timestamptz not null default now()
);
create table public.stonk_league_members (
  league_id bigint not null references public.stonk_leagues (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);
alter table public.stonk_leagues enable row level security;
alter table public.stonk_league_members enable row level security;

create or replace function public.is_league_member(league bigint) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.stonk_league_members where league_id = league and user_id = auth.uid())
$$;

-- Members see their leagues (the owner, the invite code to share) and each other
create policy "leagues: members read" on public.stonk_leagues for select using (public.is_league_member(id));
create policy "leagues: create" on public.stonk_leagues for insert with check (owner = auth.uid());
create policy "leagues: owner renames" on public.stonk_leagues for update using (owner = auth.uid()) with check (owner = auth.uid());
create policy "leagues: owner deletes" on public.stonk_leagues for delete using (owner = auth.uid());
create policy "league members: members read" on public.stonk_league_members for select using (public.is_league_member(league_id));
-- Leaving, or the owner removing someone
create policy "league members: leave or remove" on public.stonk_league_members for delete using (
  user_id = auth.uid() or exists (select 1 from public.stonk_leagues l where l.id = league_id and l.owner = auth.uid())
);
grant select, delete on public.stonk_leagues, public.stonk_league_members to authenticated;
grant insert (name, owner), update (name) on public.stonk_leagues to authenticated;

-- A new league: at most 10 owned; its owner joins it at once (and counts towards their 20 leagues)
create or replace function public.check_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where user_id = new.owner) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if (select count(*) from public.stonk_leagues where owner = new.owner) >= 10 then
    raise exception 'too_many_leagues' using errcode = 'P0001';
  end if;
  if (select count(*) from public.stonk_league_members where user_id = new.owner) >= 20 then
    raise exception 'too_many_leagues' using errcode = 'P0001';
  end if;
  return new;
end
$$;
create trigger check_league before insert on public.stonk_leagues for each row execute function public.check_league();
create or replace function public.join_own_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.stonk_league_members (league_id, user_id) values (new.id, new.owner);
  return new;
end
$$;
create trigger join_own_league after insert on public.stonk_leagues for each row execute function public.join_own_league();

-- Someone gone (left, removed or their account deleted): an empty league goes; a league without its owner passes to
-- the member there longest
create or replace function public.after_league_member() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.stonk_league_members where league_id = old.league_id) then
    delete from public.stonk_leagues where id = old.league_id;
  else
    update public.stonk_leagues l
      set owner = (select user_id from public.stonk_league_members where league_id = l.id order by joined_at limit 1)
      where l.id = old.league_id and (l.owner is null or l.owner = old.user_id);
  end if;
  return old;
end
$$;
create trigger after_league_member after delete on public.stonk_league_members for each row execute function public.after_league_member();

/** Join a league by its code: its id. At most 100 members, and 20 leagues per member */
create or replace function public.join_league(code text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  league bigint;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  select id into league from public.stonk_leagues where invite_code = lower(btrim(code));
  if league is null then
    raise exception 'league_not_found' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.stonk_league_members where league_id = league and user_id = auth.uid()) then
    return league;
  end if;
  if (select count(*) from public.stonk_league_members where league_id = league) >= 100 then
    raise exception 'league_full' using errcode = 'P0001';
  end if;
  if (select count(*) from public.stonk_league_members where user_id = auth.uid()) >= 20 then
    raise exception 'too_many_leagues' using errcode = 'P0001';
  end if;
  insert into public.stonk_league_members (league_id, user_id) values (league, auth.uid());
  return league;
end
$$;

/** The owner makes a new invite code: the old one stops working */
create or replace function public.renew_league_code(league bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  code text := encode(extensions.gen_random_bytes(6), 'hex');
begin
  update public.stonk_leagues set invite_code = code where id = league and owner = auth.uid();
  if not found then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  return code;
end
$$;

/** A league's table, for its members only: the season's points, and all time */
create view public.stonk_league_table as
  select m.league_id, s.season, s.nickname, s.points, s.rounds, s.best,
    rank() over (partition by m.league_id, s.season order by s.points desc)::integer as rank
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id
  join public.stonk_season_table s on s.nickname = pr.nickname
  where public.is_league_member(m.league_id);
grant select on public.stonk_league_table to authenticated;

/** A league's members by nickname, for its members */
create view public.stonk_league_people as
  select m.league_id, pr.nickname, m.joined_at, (l.owner = m.user_id) as owner
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id
  join public.stonk_leagues l on l.id = m.league_id
  where public.is_league_member(m.league_id);
grant select on public.stonk_league_people to authenticated;

-- ---------------------------------------------------------------------------------------------------------------------
-- The nightly import from the data bucket (pipeline/elostonk.mjs's files): the players who can be picked, and the
-- recent rounds' points (again until final). Idempotent: a missed night is caught up by the next.
-- ---------------------------------------------------------------------------------------------------------------------
create extension if not exists http with schema extensions;

create or replace function public.stonk_import() returns text
language plpgsql security definer set search_path = '' as $$
declare
  base text := (select value #>> '{}' from public.settings where key = 'data_url');
  res record;
  players jsonb;
  file jsonb;
  r text;
  imported integer := 0;
begin
  select status, content into res from extensions.http_get(base || '/elostonk/players.json');
  -- Not there yet (before the pipeline's first export with the game) or the bucket away: nothing changes tonight
  if res.status <> 200 then
    return format('players.json: %s, nothing imported', res.status);
  end if;
  players := res.content::jsonb;
  update public.stonk_players set eligible = false where eligible;
  insert into public.stonk_players (player_id, name, club, birth_year, eligible, updated_at)
    select (p ->> 0)::integer, p ->> 1, p ->> 2, (p ->> 4)::integer, true, now()
    from jsonb_array_elements(players -> 'players') p
  on conflict (player_id) do update set name = excluded.name, club = excluded.club, birth_year = excluded.birth_year, eligible = true, updated_at = now();

  for r in select jsonb_array_elements_text(players -> 'rounds') loop
    -- A final round is imported once
    continue when exists (select 1 from public.stonk_rounds where round = r::date and final);
    select status, content into res from extensions.http_get(base || '/elostonk/rounds/' || r || '.json');
    continue when res.status <> 200;
    file := res.content::jsonb;
    insert into public.stonk_rounds (round, final, imported_at) values (r::date, (file ->> 'final')::boolean, now())
      on conflict (round) do update set final = excluded.final, imported_at = now();
    delete from public.stonk_points where round = r::date;
    insert into public.stonk_points (round, player_id, points, matches)
      select r::date, key::integer, (value ->> 0)::numeric, (value ->> 1)::integer from jsonb_each(file -> 'points');
    imported := imported + 1;
  end loop;
  return format('%s players, %s rounds', jsonb_array_length(players -> 'players'), imported);
end
$$;
select cron.schedule('stonk-import', '0 4 * * *', $$select public.stonk_import()$$);

-- Not for calling through the API
revoke execute on function public.stonk_import(), public.check_picks(), public.check_league(), public.join_own_league(), public.after_league_member() from public, anon, authenticated;
grant execute on function public.join_league(text), public.renew_league_code(bigint) to authenticated;
revoke execute on function public.join_league(text), public.renew_league_code(bigint) from anon;
