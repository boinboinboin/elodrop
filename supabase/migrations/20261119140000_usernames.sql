-- Usernames (the column keeps its name, `nickname`): unique already, whatever the capitals (profiles_nickname_key), and
-- now also
--   - letters (Norwegian and other accented ones too), digits, _ . or -, 3 to 20 of them, no spaces: one word,
--     shown as is on leaderboards and with ideas
--   - changed at most once every 30 days, after a first change any time (a typo at sign-up); a change of capitals
--     only is always allowed, and a trusted account (the owner's) isn't held to it.
alter table public.profiles add column nickname_changed_at timestamptz;
alter table public.profiles add constraint profiles_username_format check (nickname ~ '^[A-Za-z0-9ÆØÅæøåÄÖÜäöüÉéÈèÊêÁáÀàÓóÒòÍíÚúÑñÇç_.-]{3,20}$');

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
    new.nickname_changed_at := null;
    return new;
  end if;
  -- The username: once every 30 days after the first change (capitals alone any time; a trusted account any time; the
  -- owner in the dashboard any time: no signed-in user there)
  if lower(new.nickname) <> lower(old.nickname) then
    if old.nickname_changed_at is not null and old.nickname_changed_at > now() - interval '30 days' and not old.trusted and auth.uid() is not null then
      raise exception 'username_too_soon' using errcode = 'P0001';
    end if;
    new.nickname_changed_at := now();
  end if;
  if new.player_id is distinct from old.player_id then
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
