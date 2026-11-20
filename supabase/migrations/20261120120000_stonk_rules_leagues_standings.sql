-- EloStonk: squad rules for variety, the season's standings after each round, and leagues' round tables (README:
-- "EloStonk"). Safe to run again (as the catch-up before it).
--
--   - A squad has at most 2 players from one club (players without a club don't count) and at least one man and one
--     woman. Checked when a squad is saved, so squads saved before keep playing, carried over, until changed.
--   - The players' gender, from the pipeline's players.json (the 4th column), for that rule.
--   - Each member's season total, rank and round rank after every round (weekly, with the scores): the rank chart.
--   - Leagues: each round's table, round wins in the season's table, and the league's picks.

insert into public.settings (key, value) values
  -- The most players a squad can have from one club (web/components/elostonk/rules.ts MAX_PER_CLUB)
  ('stonk_max_per_club', '2')
on conflict (key) do nothing;

alter table public.stonk_players add column if not exists gender text;

-- The nightly import (as in *_stonk_catch_up.sql), now with the players' gender
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
  insert into public.stonk_players (player_id, name, club, gender, eligible, updated_at)
    select (p ->> 0)::integer, p ->> 1, p ->> 2, p ->> 3, true, now()
    from jsonb_array_elements(players -> 'players') p
  on conflict (player_id) do update set name = excluded.name, club = excluded.club, gender = excluded.gender, eligible = true, updated_at = now();

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

-- Saving a squad (as in *_stonk_catch_up.sql), with the variety rules after the players' check
create or replace function public.check_picks() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Always the next round: the one not yet locked (the client can't choose another)
  new.round := public.stonk_next_round();
  -- A brake on scripts: one save every 2 seconds (a person never notices); by the clock, not the transaction's start
  if tg_op = 'UPDATE' and old.updated_at > clock_timestamp() - interval '2 seconds' then
    raise exception 'too_fast' using errcode = 'P0001';
  end if;
  new.updated_at := clock_timestamp();
  if not exists (select 1 from public.profiles where user_id = new.user_id) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if cardinality(new.players) <> 5 or (select count(distinct p) from unnest(new.players) p) <> 5 or not (new.captain = any (new.players)) then
    raise exception 'squad_invalid' using errcode = 'P0001';
  end if;
  if (select count(*) from public.stonk_players where player_id = any (new.players) and eligible) <> 5 then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.stonk_players
    where player_id = any (new.players) and club is not null
    group by club
    having count(*) > (select (value #>> '{}')::integer from public.settings where key = 'stonk_max_per_club')
  ) then
    raise exception 'too_many_from_club' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.stonk_players where player_id = any (new.players) and gender = 'M')
    or not exists (select 1 from public.stonk_players where player_id = any (new.players) and gender = 'K') then
    raise exception 'needs_both_genders' using errcode = 'P0001';
  end if;
  return new;
end
$$;

/** Each member's season total, rank and round rank after every round they played (weekly, with the scores) */
create materialized view if not exists public.stonk_standings_mv as
  select season, round, user_id, total,
    rank() over (partition by season, round order by total desc)::integer as rank,
    count(*) over (partition by season, round)::integer as entries,
    rank() over (partition by season, round order by points desc)::integer as round_rank
  from (
    select season, round, user_id, points, sum(points) over (partition by season, user_id order by round)::numeric(10, 1) as total
    from public.stonk_scores_mv
  ) s;
create index if not exists stonk_standings_mv_season_user_id_idx on public.stonk_standings_mv (season, user_id);
revoke all on public.stonk_standings_mv from anon, authenticated;

/** The standings by nickname: a member's rank after each round, for their chart */
create or replace view public.stonk_standings as
  select s.season, s.round, pr.nickname, s.total, s.rank, s.entries, s.round_rank
  from public.stonk_standings_mv s
  join public.profiles pr on pr.user_id = s.user_id and not pr.hidden;
grant select on public.stonk_standings to anon, authenticated;

/** The worked-out tables again (as in *_stonk_catch_up.sql), the standings with the scores */
create or replace function public.stonk_refresh(weekly boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view public.stonk_squads_mv;
  refresh materialized view public.stonk_ownership_mv;
  if weekly then
    refresh materialized view public.stonk_scores_mv;
    refresh materialized view public.stonk_totals_mv;
    refresh materialized view public.stonk_standings_mv;
  end if;
end
$$;
revoke execute on function public.stonk_import(), public.stonk_refresh(boolean), public.check_picks() from public, anon, authenticated;

/** A league's table, for its members only: the season's points and round wins (the league's best score in a round, ties
 *  to each), weekly as the leaderboards */
create or replace view public.stonk_league_table as
  select m.league_id, t.season, pr.nickname, t.points, t.rounds, t.best,
    rank() over (partition by m.league_id, t.season order by t.points desc)::integer as rank,
    (select count(*)::integer from public.stonk_scores_mv s
      where s.user_id = m.user_id and s.season = t.season
        and s.points = (select max(o.points) from public.stonk_scores_mv o
          join public.stonk_league_members om on om.user_id = o.user_id and om.league_id = m.league_id
          join public.profiles op on op.user_id = o.user_id and not op.hidden
          where o.round = s.round)) as wins
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id and not pr.hidden
  join public.stonk_totals_mv t on t.user_id = m.user_id and t.season is not null
  where public.is_league_member(m.league_id);
grant select on public.stonk_league_table to authenticated;

/** A league's round tables, for its members only */
create or replace view public.stonk_league_round_scores as
  select m.league_id, s.round, s.season, pr.nickname, s.points, s.final
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id and not pr.hidden
  join public.stonk_scores_mv s on s.user_id = m.user_id
  where public.is_league_member(m.league_id);
grant select on public.stonk_league_round_scores to authenticated;

/** Who a league's members picked and made captain in each started round, for its members only (daily) */
create or replace view public.stonk_league_ownership as
  select m.league_id, q.round, p.player_id, sp.name,
    count(*)::integer as picks,
    count(*) filter (where q.captain = p.player_id)::integer as captains
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id and not pr.hidden
  join public.stonk_squads_mv q on q.user_id = m.user_id
  cross join lateral unnest(q.players) as p (player_id)
  left join public.stonk_players sp on sp.player_id = p.player_id
  where public.is_league_member(m.league_id)
  group by m.league_id, q.round, p.player_id, sp.name;
grant select on public.stonk_league_ownership to authenticated;
revoke all on public.stonk_league_round_scores, public.stonk_league_ownership from anon;
