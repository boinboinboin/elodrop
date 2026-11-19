-- Push notifications' rules (supabase/migrations/*_push.sql). Run with `pnpm dlx supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email, created_at, aud, role) values
  ('00000000-0000-0000-0000-0000000000d1', 'd1@example.com', now(), 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000d2', 'd2@example.com', now(), 'authenticated', 'authenticated');

create function pg_temp.as_user(id text) returns void language sql as $$
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', json_build_object('sub', id, 'role', 'authenticated')::text, true)
$$;
create function pg_temp.as_owner() returns void language sql as $$
  select set_config('role', 'postgres', true), set_config('request.jwt.claims', '', true)
$$;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select lives_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth, lang) values ('00000000-0000-0000-0000-0000000000d1', 'https://push.example/1', 'key', 'secret', 'en')$$, 'a device is added');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000d2', 'https://push.example/2', 'key', 'secret')$$, '42501', null, 'not for someone else');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000d1', 'http://push.example/3', 'key', 'secret')$$, '23514', null, 'only https endpoints');
select throws_ok($$select * from push_sent$$, '42501', null, 'the function''s memory is out of reach');
select throws_ok($$select * from push_seen$$, '42501', null, 'both tables');

select pg_temp.as_owner();
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000d2', 'https://push.example/2', 'key', 'secret');
insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  select '00000000-0000-0000-0000-0000000000d1', 'https://push.example/many-' || n, 'key', 'secret' from generate_series(1, 9) n;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select is((select count(*)::integer from push_subscriptions), 10, 'a member sees only their own devices');
select throws_ok($$insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ('00000000-0000-0000-0000-0000000000d1', 'https://push.example/11', 'key', 'secret')$$, 'P0001', 'too_many_devices', 'at most 10 devices');
select lives_ok($$delete from push_subscriptions where endpoint = 'https://push.example/2'$$, 'deleting someone else''s device does nothing');

select pg_temp.as_owner();
delete from auth.users where id = '00000000-0000-0000-0000-0000000000d2';
select is((select count(*)::integer from public.push_subscriptions where user_id = '00000000-0000-0000-0000-0000000000d2'), 0, 'a deleted account''s devices go with it');

select * from finish();
rollback;
