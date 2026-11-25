-- Match stories' rules (supabase/migrations/*_match_stories.sql), as the browser meets them. Run with
-- `pnpm dlx supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- An old account with a profile, a new one with a profile, an old one without, and a trusted new one
insert into auth.users (id, email, created_at, aud, role) values
  ('00000000-0000-0000-0000-0000000000e1', 'e1@example.com', now() - interval '10 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e2', 'e2@example.com', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e3', 'e3@example.com', now() - interval '10 days', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000e4', 'e4@example.com', now(), 'authenticated', 'authenticated');
insert into public.profiles (user_id, nickname, birth_year) values
  ('00000000-0000-0000-0000-0000000000e1', 'StoryTeller', 1990),
  ('00000000-0000-0000-0000-0000000000e2', 'NewTeller', 1990),
  ('00000000-0000-0000-0000-0000000000e4', 'TrustedTeller', 1990);
update public.profiles set trusted = true where user_id = '00000000-0000-0000-0000-0000000000e4';

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)
$$;
create function pg_temp.story(author text, match_key text, status text default null) returns void language sql as $$
  insert into public.story_submissions (author, match_key, match_summary, story)
  values (author::uuid, match_key, '2019-01-11 · Bygdø RT 13: A – B 26-24', 'In the third set the intensity got too much for her.')
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select lives_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e1', 'T6084 20814 vs 22113')$$, 'a member sends in a story');
select is((select status from story_submissions where match_key = 'T6084 20814 vs 22113'), 'pending', 'it waits for the owner');
select throws_ok($$insert into story_submissions (author, match_key, match_summary, story, status) values ('00000000-0000-0000-0000-0000000000e1', 'T1 1 vs 2', 'x', repeat('a', 40), 'published')$$, '42501', null, 'not published by its author');
select throws_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e2', 'T1 1 vs 2')$$, '42501', null, 'not in someone else''s name');
select throws_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e1', 'T6084 20814 vs 22113')$$, 'P0001', 'story_twice', 'one story per match each');
select throws_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e1', 'not a key')$$, '23514', null, 'only a match key');
select throws_ok(
  $$insert into story_submissions (author, match_key, match_summary, story) values ('00000000-0000-0000-0000-0000000000e1', 'T1 1 vs 2', 'x', 'Too short.')$$,
  '23514', null, 'a story of at least 30 characters'
);
select throws_ok(
  $$insert into story_submissions (author, match_key, match_summary, story, source_url) values ('00000000-0000-0000-0000-0000000000e1', 'T1 1 vs 2', 'x', repeat('a', 40), 'javascript:alert(1)')$$,
  '23514', null, 'a source only as a web address'
);
select lives_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e1', 'TP12623 -1+16979 vs 16976+25381')$$, 'Profixio doubles, with a player without a page');
select lives_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e1', 'L13279.2 24320 vs 46511')$$, 'a league match');
select throws_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e1', 'T2 1 vs 2')$$, 'P0001', 'too_many_stories', 'at most 3 waiting');
select is((select count(*)::integer from story_submissions), 3, 'a member sees their own');
select throws_ok($$update story_submissions set status = 'published'$$, '42501', null, 'and can''t change them');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
select throws_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e2', 'T1 1 vs 2')$$, 'P0001', 'account_too_new', 'a new account waits 3 days');
select is((select count(*)::integer from story_submissions), 0, 'nor sees anyone else''s');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e4');
select lives_ok($$select pg_temp.story('00000000-0000-0000-0000-0000000000e4', 'T1 1 vs 2')$$, 'a trusted account doesn''t wait');

select * from finish();
rollback;
