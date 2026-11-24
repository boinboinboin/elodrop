-- Ideas: an account can suggest from 3 days after it's made (was 7), with up to 3 waiting to be looked at (was 2).
-- Voting has no wait (the votes' policy only needs an open or planned idea). Safe to run again.

create or replace function public.check_idea() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- A trusted account's idea is shown at once, and not limited
  if public.is_trusted(new.author) then
    new.status := 'open';
    return new;
  end if;
  new.status := 'pending';
  if (select created_at from auth.users where id = new.author) > now() - interval '3 days' then
    raise exception 'account_too_new' using errcode = 'P0001';
  end if;
  if (select count(*) from public.ideas where author = new.author and status = 'pending') >= 3 then
    raise exception 'too_many_pending' using errcode = 'P0001';
  end if;
  return new;
end
$$;
revoke execute on function public.check_idea() from public, anon, authenticated;
