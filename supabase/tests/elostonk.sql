-- EloStonk's rules (supabase/migrations/*_elostonk.sql): squads, the lock, the carry-over, scores, leagues.
-- Run with `pnpm dlx supabase test db` (the local stack running).
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

insert into auth.users (id, email, created_at, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com', now() - interval '40 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com', now() - interval '40 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@example.com', now() - interval '40 days', 'authenticated', 'authenticated');
insert into public.profiles (user_id, nickname, birth_year) values
  ('00000000-0000-0000-0000-0000000000a1', 'Alpha', 1990),
  ('00000000-0000-0000-0000-0000000000b2', 'Bravo', 1991);
-- Seven players, the seventh no longer pickable
insert into public.stonk_players (player_id, name, birth_year, eligible) values
  (1, 'One', 1990, true), (2, 'Two', 1990, true), (3, 'Three', 1990, true), (4, 'Four', 1990, true),
  (5, 'Five', 1990, true), (6, 'Six', 1990, true), (7, 'Seven', 2010, false);

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)
$$;

-- ---- Rounds ----
select is(public.stonk_round_of('2026-11-20 12:00+01'), '2026-11-20'::date, 'a Friday is its own round');
select is(public.stonk_round_of('2026-11-26 23:59+01'), '2026-11-20'::date, 'the next Thursday night is still in it');
select is(public.stonk_round_of('2026-11-19 23:30+00'), '2026-11-20'::date, 'Friday 00:30 in Norway is the new round (Thursday 23:30 UTC)');

-- ---- Squads ----
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,4}', 1)$$, 'P0001', 'squad_invalid', 'four players are refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,1,2,3,4}', 1)$$, 'P0001', 'squad_invalid', 'a player twice is refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,4,5}', 6)$$, 'P0001', 'squad_invalid', 'a captain outside the squad is refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,4,7}', 1)$$, 'P0001', 'not_eligible', 'a player who can''t be picked is refused');
select lives_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', '2000-01-07', '{1,2,3,4,5}', 1)$$, 'a squad is saved');
select is((select round from stonk_picks), public.stonk_next_round(), 'for the next round, whatever the client said');
select lives_ok($$update stonk_picks set players = '{1,2,3,4,6}', captain = 6$$, 'and changed before it locks');
select lives_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,5,6}', 5)
  on conflict (user_id, round) do update set user_id = excluded.user_id, round = excluded.round, players = excluded.players, captain = excluded.captain$$, 'and saved again as the site does (an upsert)');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000b2', current_date, '{1,2,3,4,5}', 1)$$, '42501', null, 'a squad for someone else is refused');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000c3', current_date, '{1,2,3,4,5}', 1)$$, 'P0001', 'no_profile', 'an account without a nickname can''t play');

-- ---- A locked round: squads saved weeks ago, carried over, and scored ----
select pg_temp.as_owner();
-- Alpha's squad saved for three rounds ago (as if then), Bravo's for two rounds ago
alter table public.stonk_picks disable trigger check_picks;
insert into public.stonk_picks (user_id, round, players, captain) values
  ('00000000-0000-0000-0000-0000000000a1', public.stonk_round_of(now()) - 21, '{1,2,3,4,5}', 1),
  ('00000000-0000-0000-0000-0000000000b2', public.stonk_round_of(now()) - 14, '{2,3,4,5,6}', 6);
alter table public.stonk_picks enable trigger check_picks;
insert into public.stonk_rounds (round, final) values (public.stonk_round_of(now()) - 14, true), (public.stonk_round_of(now()) - 7, false);
insert into public.stonk_points (round, player_id, points, matches) values
  (public.stonk_round_of(now()) - 14, 1, 50, 4), (public.stonk_round_of(now()) - 14, 6, -10, 2),
  (public.stonk_round_of(now()) - 7, 1, 20, 3), (public.stonk_round_of(now()) - 7, 2, 5, 1);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select points from stonk_round_scores where nickname = 'Alpha' and round = public.stonk_round_of(now()) - 14), 100.0, 'the captain counts twice (50 × 2)');
select is((select points from stonk_round_scores where nickname = 'Bravo' and round = public.stonk_round_of(now()) - 14), -20.0, 'points can be negative (−10 × 2)');
select is((select points from stonk_round_scores where nickname = 'Alpha' and round = public.stonk_round_of(now()) - 7), 45.0, 'a squad carries over to the next round (20 × 2 + 5)');
select is((select points from stonk_season_table where nickname = 'Alpha'), 145.0, 'the season adds the rounds up');
select is((select rank from stonk_season_table where nickname = 'Alpha'), 1, 'and ranks them');
select is((select count(*)::integer from stonk_picks), 1, 'others'' squads aren''t readable');
select is((select count(*)::integer from stonk_locked_squads where round = public.stonk_next_round()), 0, 'nor anyone''s squad for a round not yet locked');
select is((select picked_pct from stonk_ownership where player_id = 2 and round = public.stonk_round_of(now()) - 7), 100.0, 'a locked round''s picks are shown as shares');

-- ---- Leagues ----
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$insert into stonk_leagues (name, owner) values ('Friday club', '00000000-0000-0000-0000-0000000000a1')$$, 'a league is made, its owner in it');
select pg_temp.as_owner();
select set_config('test.code', (select invite_code from public.stonk_leagues limit 1), true);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::integer from stonk_leagues), 0, 'a league is hidden from those not in it');
select lives_ok($$select join_league(current_setting('test.code'))$$, 'joining with the code');
select is((select count(*)::integer from stonk_league_table where season = (select max(season) from stonk_season_table)), 2, 'both are on the league''s table');

select * from finish();
rollback;
