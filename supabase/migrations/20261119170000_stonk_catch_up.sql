-- EloStonk's catch-up: 20261119120000_elostonk.sql was rewritten after its first version had been applied to
-- production, and a migration recorded as applied isn't run again, so production kept the first version: the players'
-- birth year (in the import too, which no longer matches the pipeline's players.json), plain views where the
-- leaderboards now read materialized ones, no stonk_refresh() or its cron jobs, no 2-second brake on saves and no
-- blocked words in league names. This brings any database to the file's current version; on one that has it already
-- (a fresh one, or local development) nothing changes but the views being made again, the same. Every statement can be
-- run again. Don't edit an applied migration: add a new one.

-- The first version's views (stonk_squads and those reading it); made again below, on the materialized views
drop view if exists public.stonk_league_people, public.stonk_league_table, public.stonk_ownership, public.stonk_locked_squads,
  public.stonk_alltime_table, public.stonk_season_table, public.stonk_round_scores, public.stonk_squads cascade;

-- The players' birth year isn't kept (the pipeline decides who can be picked)
alter table public.stonk_players drop column if exists birth_year;

-- Saving a squad: with the brake on scripts
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
  return new;
end
$$;

-- Scores and statistics, worked out ahead (materialized views), and the views everyone reads
/** The squads that counted in each round that has started, carried over from the round they were saved for (daily) */
create materialized view if not exists public.stonk_squads_mv as
  select r.round, s.user_id, s.players, s.captain
  from public.stonk_rounds r
  cross join lateral (
    select distinct on (p.user_id) p.user_id, p.players, p.captain
    from public.stonk_picks p
    where p.round <= r.round
    order by p.user_id, p.round desc
  ) s
  where r.round <= public.stonk_round_of(now());
create index if not exists stonk_squads_mv_round_user_id_idx on public.stonk_squads_mv (round, user_id);

/** How often each player was picked and made captain in each started round, out of the squads in it (daily) */
create materialized view if not exists public.stonk_ownership_mv as
  with squads as (select round, count(*) as total from public.stonk_squads_mv group by round)
  select q.round, p.player_id,
    count(*)::integer as picks,
    count(*) filter (where q.captain = p.player_id)::integer as captains,
    round(100.0 * count(*) / s.total, 1) as picked_pct,
    coalesce(pt.points, 0) as points
  from public.stonk_squads_mv q
  cross join lateral unnest(q.players) as p (player_id)
  join squads s on s.round = q.round
  left join public.stonk_points pt on pt.round = q.round and pt.player_id = p.player_id
  group by q.round, p.player_id, s.total, pt.points;
create index if not exists stonk_ownership_mv_round_idx on public.stonk_ownership_mv (round);

/** Each squad's points in each round (weekly) */
create materialized view if not exists public.stonk_scores_mv as
  select q.round,
    (case when extract(month from q.round) >= 7 then extract(year from q.round) else extract(year from q.round) - 1 end)::integer as season,
    q.user_id,
    coalesce(sum(pt.points * case when pt.player_id = q.captain then 2 else 1 end), 0)::numeric(8, 1) as points,
    r.final
  from public.stonk_squads_mv q
  join public.stonk_rounds r on r.round = q.round
  left join public.stonk_points pt on pt.round = q.round and pt.player_id = any (q.players)
  group by q.round, q.user_id, r.final;
create index if not exists stonk_scores_mv_round_idx on public.stonk_scores_mv (round);
create index if not exists stonk_scores_mv_season_idx on public.stonk_scores_mv (season);

/** Each member's season and all time: points, rounds played and the best round (weekly) */
create materialized view if not exists public.stonk_totals_mv as
  select season, user_id, sum(points)::numeric(10, 1) as points, count(*)::integer as rounds, max(points) as best
  from public.stonk_scores_mv group by season, user_id
  union all
  select null, user_id, sum(points)::numeric(10, 1), count(*)::integer, max(points)
  from public.stonk_scores_mv group by user_id;
create index if not exists stonk_totals_mv_season_idx on public.stonk_totals_mv (season);

-- None of them is read directly: only through the views below
revoke all on public.stonk_squads_mv, public.stonk_ownership_mv, public.stonk_scores_mv, public.stonk_totals_mv from anon, authenticated;

/** Each squad's points in each round, by nickname (the user's id stays inside) */
create view public.stonk_round_scores as
  select s.round, s.season, pr.nickname, s.points, s.final
  from public.stonk_scores_mv s
  join public.profiles pr on pr.user_id = s.user_id and not pr.hidden;
grant select on public.stonk_round_scores to anon, authenticated;

/** The season's table, ranked */
create view public.stonk_season_table as
  select t.season, pr.nickname, t.points, t.rounds, t.best, rank() over (partition by t.season order by t.points desc)::integer as rank
  from public.stonk_totals_mv t
  join public.profiles pr on pr.user_id = t.user_id and not pr.hidden
  where t.season is not null;
grant select on public.stonk_season_table to anon, authenticated;

/** All time, ranked */
create view public.stonk_alltime_table as
  select pr.nickname, t.points, t.rounds, t.best, rank() over (order by t.points desc)::integer as rank
  from public.stonk_totals_mv t
  join public.profiles pr on pr.user_id = t.user_id and not pr.hidden
  where t.season is null;
grant select on public.stonk_alltime_table to anon, authenticated;

/** Everyone's squad in each started round, by nickname (for the leaderboard's squads) */
create view public.stonk_locked_squads as
  select q.round, pr.nickname, q.players, q.captain
  from public.stonk_squads_mv q
  join public.profiles pr on pr.user_id = q.user_id and not pr.hidden;
grant select on public.stonk_locked_squads to anon, authenticated;

/** The picks' statistics, with the players' names */
create view public.stonk_ownership as
  select o.round, o.player_id, sp.name, o.picks, o.captains, o.picked_pct, o.points
  from public.stonk_ownership_mv o
  left join public.stonk_players sp on sp.player_id = o.player_id;
grant select on public.stonk_ownership to anon, authenticated;

-- Leagues: no blocked words in a new league's name, nor in a new name
create or replace function public.check_league() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.profiles where user_id = new.owner) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.blocked_words w where position(w.word in lower(new.name)) > 0) then
    raise exception 'name_blocked' using errcode = 'P0001';
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
create or replace function public.check_league_name() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.blocked_words w where position(w.word in lower(new.name)) > 0) then
    raise exception 'name_blocked' using errcode = 'P0001';
  end if;
  return new;
end
$$;
drop trigger if exists check_league_name on public.stonk_leagues;
create trigger check_league_name before update of name on public.stonk_leagues for each row execute function public.check_league_name();

/** A league's table, for its members only: the season's points (weekly, as the leaderboards) */
create view public.stonk_league_table as
  select m.league_id, t.season, pr.nickname, t.points, t.rounds, t.best,
    rank() over (partition by m.league_id, t.season order by t.points desc)::integer as rank
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id and not pr.hidden
  join public.stonk_totals_mv t on t.user_id = m.user_id and t.season is not null
  where public.is_league_member(m.league_id);
grant select on public.stonk_league_table to authenticated;

/** A league's members by nickname, for its members (a hidden nickname as hidden) */
create view public.stonk_league_people as
  select m.league_id, case when pr.hidden then null else pr.nickname end as nickname, m.joined_at, (l.owner = m.user_id) as owner
  from public.stonk_league_members m
  join public.profiles pr on pr.user_id = m.user_id
  join public.stonk_leagues l on l.id = m.league_id
  where public.is_league_member(m.league_id);
grant select on public.stonk_league_people to authenticated;

-- The nightly import, for the pipeline's players.json as it is now
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
  insert into public.stonk_players (player_id, name, club, eligible, updated_at)
    select (p ->> 0)::integer, p ->> 1, p ->> 2, true, now()
    from jsonb_array_elements(players -> 'players') p
  on conflict (player_id) do update set name = excluded.name, club = excluded.club, eligible = true, updated_at = now();

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

/**
 * The worked-out tables again: the squads and the statistics (daily, after the import), and with `weekly` the scores and
 * the leaderboards too (Mondays, once the weekend's results are in)
 */
create or replace function public.stonk_refresh(weekly boolean default false) returns void
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view public.stonk_squads_mv;
  refresh materialized view public.stonk_ownership_mv;
  if weekly then
    refresh materialized view public.stonk_scores_mv;
    refresh materialized view public.stonk_totals_mv;
  end if;
end
$$;
select cron.schedule('stonk-refresh-daily', '30 4 * * *', $$select public.stonk_refresh(false)$$);
select cron.schedule('stonk-refresh-weekly', '45 4 * * 1', $$select public.stonk_refresh(true)$$);

-- Not for calling through the API
revoke execute on function public.stonk_import(), public.stonk_refresh(boolean), public.check_picks(), public.check_league(), public.check_league_name(), public.join_own_league(), public.after_league_member() from public, anon, authenticated;
grant execute on function public.join_league(text), public.renew_league_code(bigint) to authenticated;
revoke execute on function public.join_league(text), public.renew_league_code(bigint) from anon;
