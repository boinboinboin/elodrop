-- EloStonk's rounds lock at their Friday 14:00 in Norway, not 00:00 (web/utils/rounds.ts lockOf, in step): a squad can
-- be changed until Friday afternoon, before the weekend's tournaments. The round a moment is in is the Friday of the
-- moment 14 hours earlier (Norwegian time; a clock change is always on a Sunday, so never in between). A round's
-- matches are still those of its days, Friday to Thursday (pipeline/elostonk.mjs roundOf), so a match on Friday before
-- 14:00 counts for the squads that lock after it.

/** The round a moment is in: the Friday of its last lock (Friday 14:00 in Norway) */
create or replace function public.stonk_round_of(moment timestamptz) returns date
language sql stable set search_path = '' as $$
  select d - ((extract(isodow from d)::integer - 5 + 7) % 7)
  from (select ((moment at time zone 'Europe/Oslo') - interval '14 hours')::date as d) x
$$;

-- The squads that counted and the picks' statistics also right after the lock (13:05 UTC: 14:05 in winter, 15:05 in
-- summer), so the round's squads are shown that Friday afternoon, not the next morning
select cron.schedule('stonk-refresh-lock', '5 13 * * 5', $$select public.stonk_refresh(false)$$);
