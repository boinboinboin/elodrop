-- EloStonk leagues (README: "EloStonk"): short invite codes, and public leagues anyone can join. Safe to run again.
--
--   - An invite code is 4 letters and digits, without the look-alikes (no 0/O, 1/I): 32 symbols, about a million
--     codes, typed in any case. The leagues' long codes are replaced (once: a code already short is kept), so links
--     shared before stop working; their members stay.
--   - Short codes can be guessed, so wrong codes are limited: 10 an hour per account. A wrong code returns null
--     instead of an error, so the try is kept (an error would roll it back).
--   - A league is private (as before: joined with its code) or public (`is_public`, chosen by the owner when making it
--     and changed by them later): listed for everyone signed in (stonk_public_leagues: the name and how many are in
--     it, not the code nor who), and joined without a code (join_public_league).

-- ---- Short codes ----
create or replace function public.new_league_code() returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  symbols constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea;
  code text;
begin
  loop
    bytes := extensions.gen_random_bytes(4);
    code := '';
    for i in 0..3 loop
      code := code || substr(symbols, get_byte(bytes, i) % 32 + 1, 1);
    end loop;
    exit when not exists (select 1 from public.stonk_leagues where invite_code = code);
  end loop;
  return code;
end
$$;
alter table public.stonk_leagues alter column invite_code set default public.new_league_code();
do $$
declare
  l record;
begin
  for l in select id from public.stonk_leagues where invite_code !~ '^[A-HJ-NP-Z2-9]{4}$' loop
    update public.stonk_leagues set invite_code = public.new_league_code() where id = l.id;
  end loop;
end
$$;

-- ---- Public leagues ----
alter table public.stonk_leagues add column if not exists is_public boolean not null default false;
grant insert (name, owner, is_public), update (name, is_public) on public.stonk_leagues to authenticated;

-- The public leagues not full, the most members first. A view runs as its owner, so it lists leagues one isn't in.
create or replace view public.stonk_public_leagues as
  select l.id, l.name, m.members
  from public.stonk_leagues l
  cross join lateral (select count(*)::integer as members from public.stonk_league_members where league_id = l.id) m
  where l.is_public and m.members < 100
  order by m.members desc, l.created_at;
revoke all on public.stonk_public_leagues from anon, authenticated;
grant select on public.stonk_public_leagues to authenticated;

-- ---- Joining ----
-- Wrong codes tried, per account (only the functions read and write them)
create table if not exists public.stonk_league_tries (
  user_id uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now()
);
create index if not exists stonk_league_tries_user on public.stonk_league_tries (user_id, at);
alter table public.stonk_league_tries enable row level security;
revoke all on public.stonk_league_tries from anon, authenticated;

-- Adding the signed-in member to a league: at most 100 members, and 20 leagues per member (not callable by itself)
create or replace function public.add_league_member(league bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
begin
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

/** Join a league by its code: its id, or null for a wrong code (10 wrong codes an hour at most) */
create or replace function public.join_league(code text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  league bigint;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  delete from public.stonk_league_tries where user_id = auth.uid() and at < now() - interval '1 hour';
  if (select count(*) from public.stonk_league_tries where user_id = auth.uid()) >= 10 then
    raise exception 'too_many_tries' using errcode = 'P0001';
  end if;
  select id into league from public.stonk_leagues where invite_code = upper(regexp_replace(code, '\s', '', 'g'));
  if league is null then
    insert into public.stonk_league_tries (user_id) values (auth.uid());
    return null;
  end if;
  return public.add_league_member(league);
end
$$;

/** Join a public league, without its code */
create or replace function public.join_public_league(league bigint) returns bigint
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'no_profile' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.stonk_leagues where id = league and is_public) then
    raise exception 'league_not_found' using errcode = 'P0001';
  end if;
  return public.add_league_member(league);
end
$$;

/** The owner makes a new invite code: the old one stops working */
create or replace function public.renew_league_code(league bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare
  code text := public.new_league_code();
begin
  update public.stonk_leagues set invite_code = code where id = league and owner = auth.uid();
  if not found then
    raise exception 'not_owner' using errcode = 'P0001';
  end if;
  return code;
end
$$;

-- new_league_code is the column's default, so the member making a league runs it
revoke execute on function public.new_league_code(), public.add_league_member(bigint), public.join_league(text), public.join_public_league(bigint), public.renew_league_code(bigint) from public, anon;
revoke execute on function public.add_league_member(bigint) from authenticated;
grant execute on function public.new_league_code(), public.join_league(text), public.join_public_league(bigint), public.renew_league_code(bigint) to authenticated;
