"use client";

// What's new with what the member follows, on the front page's Following card (a few of each) and the account page (all
// of it): the followed players (and their own) drawn in a tournament soon, with their chance of winning the event
// (tournaments/drawn.json); their latest results (the players' summaries' `recent`); and each followed club's next and
// last team matches (team-matches/clubs.json). Each part shows only when it has something. Filled in the browser, so
// the pages stay the same for everyone.
import type { PlayerSummary } from "@/app/api/players/[id]/summary/route";
import { useClubTeamMatches, useDrawn } from "@/components/account/useFollowed";
import { Teaser } from "@/components/home/HomeCard";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { useI18n } from "@/messages/client";
import type { ClubFixture, ClubResult } from "@/types";
import { toneClass } from "@/utils/format";
import { clubHref, playerHref, teamDivisionHref, teamMatchHref } from "@/utils/hrefs";
import { eventHref, eventTitle } from "@/utils/tournament";

// A row of a part's list, as the site's tables' rows
const ITEM = "py-2 border-b border-gray-100 last:border-0";
const LINK = "link hover:text-blue-600";

/** The member's own player first, then the followed ones */
const everyone = (players: PlayerSummary[], me: PlayerSummary | null) => [...(me ? [me] : []), ...players];

/** The players drawn in a tournament not over yet: soonest first, at most `limit` */
export function FollowedDraws({ players, me, limit }: { players: PlayerSummary[]; me: PlayerSummary | null; limit?: number }) {
  const i18n = useI18n();
  const { t, chance, dateRange } = i18n;
  const list = everyone(players, me);
  const drawn = useDrawn(list.length > 0);
  if (!drawn) return null;
  const items = list
    .flatMap((p) => (drawn.players[p.id] ?? []).map(([cup2000Id, className, pool, win]) => ({ p, cup2000Id, className, pool, win, tournament: drawn.tournaments[cup2000Id] })))
    .filter((x) => x.tournament)
    .sort((a, b) => a.tournament[1].localeCompare(b.tournament[1]) || a.p.name.localeCompare(b.p.name, "nb"));
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <Teaser>{t("account.following.comingUp")}</Teaser>
      <ul>
        {items.slice(0, limit).map(({ p, cup2000Id, className, pool, win, tournament: [name, start, end] }) => (
          <li key={`${p.id}-${cup2000Id}-${className}-${pool}`} className={ITEM}>
            <p>
              <Link href={playerHref(p.id, pool)} className={`${LINK} font-semibold`}>{p.name}</Link>{" "}
              <span className="text-sm text-gray-600 whitespace-nowrap" title={t("account.following.toWinTitle")}>
                {t("account.following.toWin", { chance: chance(win) })}
              </span>
            </p>
            <p className="text-sm text-gray-600">
              <Link href={eventHref(cup2000Id, { className, pool })} className={LINK}>
                {name} · {eventTitle(i18n, { className, pool })}
              </Link>{" "}
              · <span className="whitespace-nowrap">{dateRange(start, end)}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The players' newest matches of the last two weeks, newest first, at most `limit` (a match two of them played, once) */
export function FollowedResults({ players, me, limit }: { players: PlayerSummary[]; me: PlayerSummary | null; limit?: number }) {
  const { t, date, signed } = useI18n();
  const seen = new Set<string>();
  const items = everyone(players, me)
    .flatMap((p) => (p.recent ?? []).map((m) => ({ p, m })))
    .sort((a, b) => b.m.day.localeCompare(a.m.day))
    .filter(({ p, m }) => {
      // Partners both followed: their match once, under the first of them
      const key = `${m.day}|${m.event}|${m.score}|${[p.id, m.partner?.id ?? 0].sort().join("+")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (!items.length) return null;
  return (
    <div className="mt-5">
      <Teaser>{t("account.following.latest")}</Teaser>
      <ul>
        {items.slice(0, limit).map(({ p, m }, i) => {
          const opponents = m.opponents.map((o) => o.name).join(" / ");
          const verb = m.result === 1 ? "won" : m.result === 0 ? "lost" : "drew";
          return (
            <li key={i} className={ITEM}>
              <p>
                <Link href={playerHref(p.id, m.pool)} className={`${LINK} font-semibold`}>{p.name}</Link>
                {m.partner && <span className="text-gray-600"> / {m.partner.name}</span>} {t(`account.following.${verb}`, { opponents })}{" "}
                <span className="text-sm tabular-nums text-gray-600 whitespace-nowrap">{m.score}</span>
              </p>
              <p className="text-sm text-gray-600">
                {date(m.day, "dayMonth")} · {m.href ? <Link href={m.href} className={LINK}>{m.event}</Link> : m.event}{" "}
                <span className={`tabular-nums whitespace-nowrap ${toneClass(m.change)}`}>{signed(m.change, 0)}</span>
                {m.upset && (
                  <span title={t("account.following.upsetTitle")}>
                    {" "}
                    <Badge className="align-middle">{t("account.following.upset")}</Badge>
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** A team's club: "Haugerud 2" → "Haugerud" (as the pipeline's ties' homeClub) */
const clubOf = (team: string) => team.replace(/\s+\d+$/, "").trim();

/**
 * Each followed club, with its next fixtures and last results (`fixtures` and `results` of each at most); a club without
 * team matches this season (or before the file is loaded) by its name only
 */
export function FollowedClubMatches({ clubs, fixtures = 1, results = 1 }: { clubs: { slug: string; name: string }[]; fixtures?: number; results?: number }) {
  const { t, date } = useI18n();
  const file = useClubTeamMatches(clubs.length > 0);
  if (!clubs.length) return null;
  const shown = clubs.map((c) => ({ ...c, matches: file?.clubs[c.name] ?? { fixtures: [], results: [] } }));
  const day = (time: string) => date(time.slice(0, 10), "dayMonth") + (time.length > 10 ? ` ${time.slice(11, 16)}` : "");
  const division = (d: { division: string; divisionSlug: string | null }) =>
    d.divisionSlug && file ? <Link href={teamDivisionHref(file.season, d.divisionSlug)} className={LINK}>{d.division}</Link> : d.division;
  const fixture = (f: ClubFixture) => (
    <>
      {f.home} – {f.away} <span className="text-sm text-gray-600">· {day(f.time)} · {division(f)}</span>
    </>
  );
  const result = (r: ClubResult, club: string) => {
    // The club's side: won, lost or drawn, in the site's colours for a gain and a loss
    const side = clubOf(r.home) === club ? 1 : 2;
    const tone = r.winner === 0 ? 0 : r.winner === side ? 1 : -1;
    return (
      <>
        <Link href={teamMatchHref(r.matchId)} className={LINK}>
          {r.home} <span className={`tabular-nums font-semibold ${toneClass(tone)}`}>{r.score[0]}–{r.score[1]}</span> {r.away}
        </Link>{" "}
        <span className="text-sm text-gray-600">· {date(r.day, "dayMonth")} · {division(r)}</span>
        {r.upset && (
          <span title={t("account.following.upsetTitle")}>
            {" "}
            <Badge className="align-middle">{t("account.following.upset")}</Badge>
          </span>
        )}
      </>
    );
  };
  return (
    <div className="mt-5">
      <Teaser>{t("account.following.clubs")}</Teaser>
      <ul>
        {shown.map(({ slug, name, matches }) => (
          <li key={slug} className={ITEM}>
            <Link href={clubHref(slug)} className={`${LINK} font-semibold`}>{name}</Link>
            {matches.fixtures.slice(0, fixtures).map((f) => (
              <p key={`f${f.matchId}`} className="mt-1">
                <span className="text-sm text-gray-600">{t("account.following.next")}: </span>
                {fixture(f)}
              </p>
            ))}
            {matches.results.slice(0, results).map((r) => (
              <p key={`r${r.matchId}`} className="mt-1">
                <span className="text-sm text-gray-600">{t("account.following.last")}: </span>
                {result(r, name)}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
