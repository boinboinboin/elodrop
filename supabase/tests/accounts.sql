-- The accounts' rules (supabase/migrations/*_accounts.sql), as the browser meets them: as anon and as signed-in users.
-- Run with `pnpm dlx supabase test db` (the local stack running).
begin;
create extension if not exists pgtap with schema extensions;
select plan(48);

-- Three users: an old account (40 days), a new one, and a third for reports about the same player
insert into auth.users (id, email, created_at, aud, role) values
  ('00000000-0000-0000-0000-00000000000a', 'old@example.com', now() - interval '40 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000b', 'new@example.com', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-00000000000c', 'third@example.com', now() - interval '40 days', 'authenticated', 'authenticated');

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)
$$;

-- ---- Profiles ----
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$insert into profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-00000000000a', 'Kid', extract(year from now())::int - 10)$$,
  'P0001', 'too_young', 'a birth year under the age limit is refused'
);
select throws_ok(
  $$insert into profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-00000000000a', 'TheElodropTeam', 1990)$$,
  'P0001', 'nickname_blocked', 'a nickname passing for the site is refused'
);
select lives_ok(
  $$insert into profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-00000000000a', 'Shuttle', 1990)$$,
  'a profile is made'
);
select throws_ok(
  $$insert into profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-00000000000b', 'Other', 1990)$$,
  '42501', null, 'a profile for someone else is refused'
);
select throws_ok($$update profiles set can_report = false$$, '42501', null, 'can_report is not the user''s to change');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$insert into profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-00000000000b', 'shuttle', 1995)$$,
  '23505', null, 'a nickname taken in another case is refused'
);
select lives_ok($$insert into profiles (user_id, nickname, birth_year) values ('00000000-0000-0000-0000-00000000000b', 'Newbie', 1995)$$, 'a second profile');
select is((select count(*)::int from profiles), 1, 'a user reads only their own profile');

-- ---- Usernames ----
select throws_ok($$update profiles set nickname = 'two words'$$, '23514', null, 'a username with a space is refused');
select lives_ok($$update profiles set nickname = 'Nybø_2'$$, 'Norwegian letters, digits and _ are fine, and the first change is free');
select throws_ok($$update profiles set nickname = 'Newer'$$, 'P0001', 'username_too_soon', 'the next change waits 30 days');
select lives_ok($$update profiles set nickname = 'NYBØ_2'$$, 'capitals alone can change any time');
select pg_temp.as_owner();
update public.profiles set nickname = 'Renamed' where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select is((select nickname from profiles), 'Renamed', 'the owner can still rename anyone in the dashboard');

-- ---- The claim ----
select lives_ok($$update profiles set player_id = 100$$, 'the first claim');
select throws_ok($$update profiles set player_id = 101$$, 'P0001', 'claim_too_soon', 'the claim can''t change within 30 days');
select lives_ok($$update profiles set player_id = null$$, 'clearing the claim is allowed');
select throws_ok($$update profiles set player_id = 101$$, 'P0001', 'claim_too_soon', 'claiming again after clearing waits too');

-- ---- Follows ----
select lives_ok($$insert into follows (user_id, kind, target) values ('00000000-0000-0000-0000-00000000000b', 'player', '7')$$, 'following a player');
select throws_ok($$insert into follows (user_id, kind, target) values ('00000000-0000-0000-0000-00000000000a', 'player', '7')$$, '42501', null, 'following for someone else is refused');

select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from follows), 0, 'another user''s follows can''t be read');

-- ---- Ideas and votes ----
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$insert into ideas (title, author) values ('A new idea here', '00000000-0000-0000-0000-00000000000b')$$, 'P0001', 'account_too_new', 'a new account can''t suggest yet');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select lives_ok($$insert into ideas (title, author) values ('Dark mode charts', '00000000-0000-0000-0000-00000000000a')$$, 'an old account suggests');
select is((select count(*)::int from ideas_public), 0, 'a suggestion is hidden until approved');
select throws_ok($$update ideas set status = 'open'$$, '42501', null, 'a user can''t approve their own idea');
select pg_temp.as_owner();
update ideas set status = 'open';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$insert into votes (user_id, idea_id) select '00000000-0000-0000-0000-00000000000b', id from ideas_public$$, 'a new account votes at once');
select throws_ok($$insert into votes (user_id, idea_id) select '00000000-0000-0000-0000-00000000000b', id from ideas_public$$, '23505', null, 'a second vote is refused');
select is((select votes from ideas_public), 1, 'the votes are counted for everyone');
select is((select author from ideas_public), 'Shuttle', 'an idea shows its author''s nickname');
select pg_temp.as_owner();
update public.profiles set hidden = true where nickname = 'Shuttle';
select is((select author from ideas_public), null, 'but not a hidden one');
update public.profiles set hidden = false where nickname = 'Shuttle';
select pg_temp.as_owner();
select is((select contact_ok from ideas where author = '00000000-0000-0000-0000-00000000000a'), false, 'contact is off unless ticked');
-- From 3 days old, with up to 3 waiting
update auth.users set created_at = now() - interval '2 days' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$insert into ideas (title, author) values ('Two days old idea', '00000000-0000-0000-0000-00000000000b')$$, 'P0001', 'account_too_new', 'an account 2 days old can''t suggest yet');
select pg_temp.as_owner();
update auth.users set created_at = now() - interval '3 days 1 hour' where id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$insert into ideas (title, author) values ('First waiting idea', '00000000-0000-0000-0000-00000000000b')$$, 'an account 3 days old suggests');
select lives_ok($$insert into ideas (title, author) values ('Second waiting idea', '00000000-0000-0000-0000-00000000000b')$$, 'a second waiting');
select lives_ok($$insert into ideas (title, author) values ('Third waiting idea', '00000000-0000-0000-0000-00000000000b')$$, 'a third waiting');
select throws_ok($$insert into ideas (title, author) values ('Fourth waiting idea', '00000000-0000-0000-0000-00000000000b')$$, 'P0001', 'too_many_pending', 'but not a fourth');
select pg_temp.as_owner();
delete from ideas where author = '00000000-0000-0000-0000-00000000000b';
update auth.users set created_at = now() where id = '00000000-0000-0000-0000-00000000000b';

-- ---- Reports ----
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$insert into reports (user_id, player_id, kind) values ('00000000-0000-0000-0000-00000000000b', 100, 'club')$$, 'P0001', 'account_too_new', 'a new account can''t report');

-- The old account's claim, 20 days ago (set as the owner: the user can't date it)
select pg_temp.as_owner();
update profiles set player_id = 200 where user_id = '00000000-0000-0000-0000-00000000000a';
update profiles set player_claimed_at = now() - interval '20 days' where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select throws_ok($$insert into reports (user_id, player_id, kind) values ('00000000-0000-0000-0000-00000000000a', 999, 'club')$$, 'P0001', 'not_your_player', 'a report about someone else is refused');
select lives_ok($$insert into reports (user_id, player_id, kind, note) values ('00000000-0000-0000-0000-00000000000a', 200, 'club', 'I moved to Bergen')$$, 'a report about oneself');
select throws_ok($$insert into reports (user_id, player_id, kind) values ('00000000-0000-0000-0000-00000000000a', 200, 'birthYear')$$, 'P0001', 'report_open', 'one open report at a time');

-- Two declined reports end reporting
select pg_temp.as_owner();
update reports set status = 'declined';
insert into reports (user_id, player_id, kind) values ('00000000-0000-0000-0000-00000000000a', 200, 'match');
update reports set status = 'declined' where status = 'open';
select is((select can_report from profiles where user_id = '00000000-0000-0000-0000-00000000000a'), false, 'two declined reports end reporting');

-- ---- A trusted account (set by the owner) ----
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select throws_ok($$update profiles set trusted = true$$, '42501', null, 'a user can''t make themselves trusted');
select pg_temp.as_owner();
update profiles set trusted = true where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$insert into ideas (title, author) values ('Trusted idea here', '00000000-0000-0000-0000-00000000000b')$$, 'a trusted new account suggests');
select is((select status from ideas where title = 'Trusted idea here'), 'open', 'and it is shown at once');
select lives_ok($$update profiles set player_id = 300$$, 'a trusted account changes its claim within 30 days');
select lives_ok($$insert into reports (user_id, player_id, kind) values ('00000000-0000-0000-0000-00000000000b', 300, 'club')$$, 'and reports from a new account at once');

-- ---- Deleting an account ----
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select lives_ok($$select delete_account()$$, 'a user deletes their account');
select pg_temp.as_owner();
select is((select count(*)::int from auth.users where id = '00000000-0000-0000-0000-00000000000b'), 0, 'the sign-in is gone');
select is(
  (select count(*)::int from follows where user_id = '00000000-0000-0000-0000-00000000000b')
  + (select count(*)::int from profiles where user_id = '00000000-0000-0000-0000-00000000000b')
  + (select count(*)::int from votes where user_id = '00000000-0000-0000-0000-00000000000b'),
  0, 'and every row of theirs'
);

select * from finish();
rollback;
