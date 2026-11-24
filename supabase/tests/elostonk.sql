-- EloStonk's rules (supabase/migrations/*_elostonk.sql): squads, the lock, the carry-over, scores, leagues.
-- Run with `pnpm dlx supabase test db` (the local stack running).
begin;
create extension if not exists pgtap with schema extensions;
select plan(57);

insert into auth.users (id, email, created_at, aud, role) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@example.com', now() - interval '40 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000b2', 'b@example.com', now() - interval '40 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000c3', 'c@example.com', now() - interval '40 days', 'authenticated', 'authenticated');
insert into public.profiles (user_id, nickname, birth_year) values
  ('00000000-0000-0000-0000-0000000000a1', 'Alpha', 1990),
  ('00000000-0000-0000-0000-0000000000b2', 'Bravo', 1991);
-- Ten players, the seventh no longer pickable; clubs A, B and C, and some without a club
insert into public.stonk_players (player_id, name, club, gender, eligible) values
  (1, 'One', 'A', 'M', true), (2, 'Two', 'A', 'K', true), (3, 'Three', 'B', 'M', true), (4, 'Four', null, 'K', true),
  (5, 'Five', 'C', 'M', true), (6, 'Six', 'B', 'K', true), (7, 'Seven', 'A', 'M', false), (8, 'Eight', 'A', 'M', true),
  (9, 'Nine', null, 'M', true), (10, 'Ten', null, 'K', true);

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)
$$;

-- ---- Rounds ----
select is(public.stonk_round_of('2026-11-20 14:00+01'), '2026-11-20'::date, 'a round starts at its Friday 14:00');
select is(public.stonk_round_of('2026-11-20 13:59+01'), '2026-11-13'::date, 'Friday before 14:00 is still the last round');
select is(public.stonk_round_of('2026-11-27 13:59+01'), '2026-11-20'::date, 'and so is the next Friday morning');
select is(public.stonk_round_of('2026-11-20 13:30+00'), '2026-11-20'::date, 'Friday 14:30 in Norway is the new round (13:30 UTC)');
select is(public.stonk_round_of('2026-06-05 12:30+00'), '2026-06-05'::date, 'in summer time too (14:30 in Norway, 12:30 UTC)');

-- ---- Squads ----
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,4}', 1)$$, 'P0001', 'squad_invalid', 'four players are refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,1,2,3,4}', 1)$$, 'P0001', 'squad_invalid', 'a player twice is refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,4,5}', 6)$$, 'P0001', 'squad_invalid', 'a captain outside the squad is refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,4,7}', 1)$$, 'P0001', 'not_eligible', 'a player who can''t be picked is refused');
select lives_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', '2000-01-07', '{1,2,3,4,5}', 1)$$, 'a squad is saved');
select is((select round from stonk_picks), public.stonk_next_round(), 'for the next round, whatever the client said');
select pg_temp.as_owner();
alter table public.stonk_picks disable trigger check_picks;
update public.stonk_picks set updated_at = clock_timestamp() - interval '1 minute';
alter table public.stonk_picks enable trigger check_picks;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$update stonk_picks set players = '{1,2,3,4,6}', captain = 6$$, 'and changed before it locks');
select throws_ok($$update stonk_picks set captain = 1$$, 'P0001', 'too_fast', 'saving again within 2 seconds is braked');
select pg_temp.as_owner();
alter table public.stonk_picks disable trigger check_picks;
update public.stonk_picks set updated_at = clock_timestamp() - interval '1 minute';
alter table public.stonk_picks enable trigger check_picks;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000a1', current_date, '{1,2,3,5,6}', 5)
  on conflict (user_id, round) do update set user_id = excluded.user_id, round = excluded.round, players = excluded.players, captain = excluded.captain$$, 'and saved again as the site does (an upsert)');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000b2', current_date, '{1,2,3,4,5}', 1)$$, '42501', null, 'a squad for someone else is refused');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000c3', current_date, '{1,2,3,4,5}', 1)$$, 'P0001', 'no_profile', 'an account without a nickname can''t play');

-- ---- Variety: at most 2 from one club, at least one man and one woman ----
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000b2', current_date, '{1,2,8,3,4}', 1)$$, 'P0001', 'too_many_from_club', '3 from one club are refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000b2', current_date, '{1,3,5,8,9}', 1)$$, 'P0001', 'needs_both_genders', 'a squad of men only is refused');
select throws_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000b2', current_date, '{2,4,6,10,4}', 2)$$, 'P0001', 'squad_invalid', 'the players'' check comes first');
select lives_ok($$insert into stonk_picks (user_id, round, players, captain) values ('00000000-0000-0000-0000-0000000000b2', current_date, '{4,9,10,1,3}', 1)$$, 'players without a club don''t count as one club');
select lives_ok($$delete from stonk_picks where round = public.stonk_next_round()$$, 'and the squad is taken back');

-- ---- A locked round: squads saved weeks ago, carried over, and scored ----
select pg_temp.as_owner();
-- Alpha's squad saved for three rounds ago (as if then, before the variety rules: 3 from club A), Bravo's for two
-- rounds ago
alter table public.stonk_picks disable trigger check_picks;
insert into public.stonk_picks (user_id, round, players, captain) values
  ('00000000-0000-0000-0000-0000000000a1', public.stonk_round_of(now()) - 21, '{1,2,8,4,5}', 1),
  ('00000000-0000-0000-0000-0000000000b2', public.stonk_round_of(now()) - 14, '{2,3,4,5,6}', 6);
alter table public.stonk_picks enable trigger check_picks;
insert into public.stonk_rounds (round, final) values (public.stonk_round_of(now()) - 14, true), (public.stonk_round_of(now()) - 7, false);
insert into public.stonk_points (round, player_id, points, matches) values
  (public.stonk_round_of(now()) - 14, 1, 50, 4), (public.stonk_round_of(now()) - 14, 6, -10, 2),
  (public.stonk_round_of(now()) - 7, 1, 20, 3), (public.stonk_round_of(now()) - 7, 2, 5, 1);
select is((select count(*)::integer from public.stonk_round_scores), 0, 'scores wait for the weekly refresh');
select public.stonk_refresh(true);

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select points from stonk_round_scores where nickname = 'Alpha' and round = public.stonk_round_of(now()) - 14), 100.0, 'the captain counts twice (50 × 2)');
select is((select points from stonk_round_scores where nickname = 'Bravo' and round = public.stonk_round_of(now()) - 14), -20.0, 'points can be negative (−10 × 2)');
select is((select points from stonk_round_scores where nickname = 'Alpha' and round = public.stonk_round_of(now()) - 7), 45.0, 'a squad carries over to the next round (20 × 2 + 5), one saved before the rules too');
select is((select points from stonk_season_table where nickname = 'Alpha'), 145.0, 'the season adds the rounds up');
select is((select rank from stonk_season_table where nickname = 'Alpha'), 1, 'and ranks them');
select is((select count(*)::integer from stonk_picks), 1, 'others'' squads aren''t readable');
select is((select count(*)::integer from stonk_locked_squads where round = public.stonk_next_round()), 0, 'nor anyone''s squad for a round not yet locked');
select is((select picked_pct from stonk_ownership where player_id = 2 and round = public.stonk_round_of(now()) - 7), 100.0, 'a locked round''s picks are shown as shares');

-- ---- Standings after each round ----
select is((select total from stonk_standings where nickname = 'Alpha' and round = public.stonk_round_of(now()) - 7), 145.0, 'the season''s total after a round adds the rounds so far');
select is((select total from stonk_standings where nickname = 'Bravo' and round = public.stonk_round_of(now()) - 7), -15.0, 'negative too (−20, then 5)');
select is((select rank from stonk_standings where nickname = 'Bravo' and round = public.stonk_round_of(now()) - 14), 2, 'each round has its season rank');
select is((select entries from stonk_standings where nickname = 'Bravo' and round = public.stonk_round_of(now()) - 14), 2, 'out of everyone who played it');
select is((select round_rank from stonk_standings where nickname = 'Alpha' and round = public.stonk_round_of(now()) - 7), 1, 'and its rank in the round itself');

-- ---- Hiding a nickname ----
select pg_temp.as_owner();
update public.profiles set hidden = true where nickname = 'Bravo';
select is((select count(*)::integer from public.stonk_season_table where nickname = 'Bravo'), 0, 'a hidden nickname is off the leaderboards');

-- ---- Leagues ----
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select lives_ok($$insert into stonk_leagues (name, owner) values ('Friday club', '00000000-0000-0000-0000-0000000000a1')$$, 'a league is made, its owner in it');
select throws_ok($$insert into stonk_leagues (name, owner) values ('The admin crew', '00000000-0000-0000-0000-00000000000a1')$$, '22P02', null, 'a malformed owner is refused');
select throws_ok($$insert into stonk_leagues (name, owner) values ('The admin crew', '00000000-0000-0000-0000-0000000000a1')$$, 'P0001', 'name_blocked', 'a league name with a blocked word is refused');
select pg_temp.as_owner();
update public.profiles set hidden = false where nickname = 'Bravo';
select set_config('test.code', (select invite_code from public.stonk_leagues limit 1), true);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select is((select count(*)::integer from stonk_leagues), 0, 'a league is hidden from those not in it');
select lives_ok($$select join_league(current_setting('test.code'))$$, 'joining with the code');
select is((select count(*)::integer from stonk_league_table where season = (select max(season) from stonk_season_table)), 2, 'both are on the league''s table');
select is((select wins from stonk_league_table where nickname = 'Alpha'), 2, 'with the rounds each won in the league');
select is((select count(*)::integer from stonk_league_round_scores), 4, 'each round''s table in the league');
select is((select picks from stonk_league_ownership where player_id = 2 and round = public.stonk_round_of(now()) - 7), 2, 'and who the league picked');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::integer from stonk_league_round_scores), 0, 'none of it for those not in the league');

-- ---- Short codes and public leagues (*_league_codes_public.sql) ----
select matches(current_setting('test.code'), '^[A-HJ-NP-Z2-9]{4}$', 'a code is 4 letters and digits, without look-alikes');
select pg_temp.as_owner();
insert into public.profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-0000000000c3', 'Charlie', 1992);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is((select count(*)::integer from stonk_public_leagues), 0, 'a private league isn''t listed');
select throws_ok($$select join_public_league((select id from public.stonk_leagues limit 1))$$, 'P0001', 'league_not_found', 'nor joined without its code');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
update stonk_leagues set is_public = true;
select is((select count(*)::integer from stonk_public_leagues), 0, 'only the owner makes it public');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
update stonk_leagues set is_public = true;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select is((select members from stonk_public_leagues), 2, 'a public league is listed, with its size');
select lives_ok($$select join_public_league((select id from stonk_public_leagues))$$, 'and joined without its code');
select is((select count(*)::integer from stonk_leagues), 1, 'the new member sees it');
select pg_temp.as_owner();
delete from public.stonk_league_members where user_id = '00000000-0000-0000-0000-0000000000c3';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select lives_ok($$select join_league(lower(current_setting('test.code')))$$, 'a code in small letters works');
select is(join_league('0000'), null::bigint, 'a wrong code joins nothing');
select is((select count(*)::integer from (select join_league('0000') from generate_series(1, 9)) t), 9, 'nine more wrong codes');
select throws_ok($$select join_league(current_setting('test.code'))$$, 'P0001', 'too_many_tries', 'then no more tries for an hour');

select * from finish();
rollback;
