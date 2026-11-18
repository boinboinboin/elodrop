"use client";

// The account page's Overview tab: the member's own numbers, from /api/players/<their player>/dashboard
// (utils/dashboard.ts), in four parts, each left out when it has nothing: the next tournament they're drawn in (their
// events, partner, seed, group and chances), their recent weeks (each tournament and the team matches, with the
// matches), a season in review (any season they played) and their career and form. Only what the player page doesn't
// show already. Without a claimed player: a way to the Settings tab to choose who they are.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { SplitBar } from "@/components/head-to-head/SplitBar";
import MatchTable from "@/components/players/MatchTable";
import Disclosure from "@/components/ui/Disclosure";
import Link from "@/components/ui/Link";
import ScrollRow from "@/components/ui/ScrollRow";
import StatCard from "@/components/ui/StatCard";
import { BUTTON, TEXT_LINK, toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { I18n } from "@/messages/i18n";
import type { Dashboard, NextTournament, Partner, Record3, SeasonReview, Week, Who } from "@/utils/dashboard";
import { seasonLabel, toneClass } from "@/utils/format";
import { headToHeadHref, playerHref, tournamentHref } from "@/utils/hrefs";
import { eventHref, eventTitle } from "@/utils/tournament";

const loaded = new Map<string, Promise<Dashboard | null>>();
/** The numbers, in the page's language (the badges' titles), once per visit */
const loadDashboard = (id: number, lang: string) => {
  const key = `${id}:${lang}`;
  if (!loaded.has(key))
    loaded.set(
      key,
      fetch(`/api/players/${id}/dashboard?lang=${lang}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    );
  return loaded.get(key)!;
};

const H2 = "text-2xl mb-3";
const PART = "mt-10 first:mt-0";
const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Oslo" });
const rate = (r: Record3) => (r.wins + r.losses + r.draws ? (r.wins + r.draws / 2) / (r.wins + r.losses + r.draws) : 0);

export default function Overview() {
  const { t, lang } = useI18n();
  const { profile } = useAccount();
  const id = profile?.player_id ?? null;
  const [data, setData] = useState<{ id: number; dashboard: Dashboard | null } | null>(null);

  useEffect(() => {
    if (id === null) return;
    let live = true;
    loadDashboard(id, lang).then((dashboard) => live && setData({ id, dashboard }));
    return () => {
      live = false;
    };
  }, [id, lang]);

  if (id === null)
    return (
      <div className="max-w-3xl">
        <p className="text-lg text-gray-700 mb-4">{t("account.overview.noClaim")}</p>
        <Link href="/account?tab=settings" className={`${BUTTON} inline-block px-4 py-2`}>{t("account.overview.pickYourself")}</Link>
      </div>
    );
  if (!data || data.id !== id) return <p className="text-gray-600">{t("account.overview.loading")}</p>;
  const d = data.dashboard;
  if (!d) return <p className="text-gray-600">{t("account.errors.unknown")}</p>;
  const next = d.next.filter((n) => (n.endDate ?? n.startDate) >= today());

  return (
    <div>
      {next.length > 0 && (
        <section className={PART}>
          <h2 className={H2}>{t("account.overview.next.title")}</h2>
          <div className="grid grid-cols-1 gap-4">
            {next.map((n) => (
              <NextCard key={n.cup2000Id} next={n} me={id} />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2 max-w-3xl">{t("account.overview.next.note")}</p>
        </section>
      )}
      {d.weeks.length > 0 && (
        <section className={PART}>
          <h2 className={H2}>{t("account.overview.weeks.title")}</h2>
          <div className="grid grid-cols-1 gap-4">
            {d.weeks.map((w) => (
              <WeekCard key={w.from} week={w} links={d.tournamentLinks} />
            ))}
          </div>
        </section>
      )}
      {d.seasons.length > 0 && <SeasonPart seasons={d.seasons} />}
      <CareerPart dashboard={d} me={id} />
    </div>
  );
}

const names = (list: Who[]) => list.map((p) => p.name).join(" / ");
const recordText = (t: I18n["t"], r: Record3) => (r.draws ? t("account.overview.weeks.recordWithDraws", { ...r }) : t("account.overview.weeks.record", { ...r }));

function NextCard({ next, me }: { next: NextTournament; me: number }) {
  const i18n = useI18n();
  const { t, plural, pct, signed, dateRange } = i18n;
  const days = Math.round((Date.parse(next.startDate) - Date.parse(today())) / 86_400_000);
  return (
    <article className="bg-white p-4 md:p-6">
      <h3 className="text-xl">
        <Link href={tournamentHref(next.cup2000Id)} className="hover:text-blue-600">{next.name}</Link>
      </h3>
      <p className="text-gray-600 mb-4">
        {dateRange(next.startDate, next.endDate)} · {days > 0 ? plural("account.overview.next.inDays", days) : t("account.overview.next.today")}
      </p>
      <div className="space-y-6">
        {next.events.map((e) => (
          <div key={`${e.className}-${e.pool}`} className="border-t border-gray-200 pt-4">
            <h4 className="text-lg">
              <Link href={eventHref(next.cup2000Id, e)} className="hover:text-blue-600">{eventTitle(i18n, e)}</Link>
            </h4>
            <p className="text-sm text-gray-600">
              {e.partner && (
                <>
                  {t("account.overview.next.with")}
                  {e.partner.id ? <Link href={playerHref(e.partner.id, e.pool)} className={TEXT_LINK}>{e.partner.name}</Link> : e.partner.name}
                  {" · "}
                </>
              )}
              {e.seed ? t("account.overview.next.seed", { seed: e.seed }) : t("account.overview.next.unseeded")} · {plural("account.overview.next.entries", e.entries)}
            </p>
            <dl className="grid grid-cols-2 gap-4 mt-3 max-w-md">
              <div>
                <dt className="text-sm text-gray-600">{t("account.overview.next.winChance")}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{pct(e.winChance)}</dd>
              </div>
              {e.luck !== null && (
                <div>
                  <dt className="text-sm text-gray-600">{t("account.overview.next.luck")}</dt>
                  <dd className={`text-2xl font-semibold tabular-nums ${toneClass(e.luck)}`}>{signed(e.luck)}</dd>
                </div>
              )}
            </dl>
            {e.group && e.group.opponents.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">{t("account.overview.next.group")}</p>
                <ul className="space-y-3">
                  {e.group.opponents.map((o) => (
                    <li key={o.players.map((p) => p.id ?? p.name).join()}>
                      <div className="flex justify-between gap-3 text-sm mb-1">
                        <span className="tabular-nums">
                          <strong className="text-base">{pct(o.chance)}</strong> {t("account.overview.next.you")}
                        </span>
                        <span className="text-right min-w-0">
                          {o.players.map((p, i) => (
                            <span key={p.id ?? p.name}>
                              {i > 0 && " / "}
                              {p.id ? <Link href={p.id === me ? playerHref(p.id) : headToHeadHref(me, p.id, e.pool)} className="hover:text-blue-600">{p.name}</Link> : p.name}
                            </span>
                          ))}{" "}
                          <span className="text-gray-600 tabular-nums">{o.rating}</span>
                        </span>
                      </div>
                      <SplitBar chance={o.chance} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </article>
  );
}

function WeekCard({ week, links }: { week: Week; links: Record<string, number> }) {
  const { t, dateRange, pools, signed, chance } = useI18n();
  return (
    <article className="bg-white p-4 md:p-6">
      <h3 className="text-sm text-gray-600 mb-2">{dateRange(week.from, week.to)}</h3>
      <div className="space-y-5">
        {week.groups.map((g) => (
          <div key={`${g.kind}-${g.name}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <h4 className="text-lg">
                {g.kind === "teamMatches" ? t("account.overview.weeks.teamMatches") : g.cup2000Id ? <Link href={tournamentHref(g.cup2000Id)} className="hover:text-blue-600">{g.name}</Link> : g.name}
              </h4>
              <span className="text-xl font-semibold tabular-nums">{recordText(t, g.record)}</span>
            </div>
            <p className="text-sm text-gray-700 flex flex-wrap gap-x-4">
              {Object.entries(g.change).map(([pool, change]) => (
                <span key={pool}>
                  {pools[pool as keyof typeof pools]} <span className={`tabular-nums ${toneClass(change!)}`}>{signed(change!, 0)}</span>
                </span>
              ))}
            </p>
            {g.bestWin && <p className="text-sm text-gray-600">{t("account.overview.weeks.bestWin", { names: names(g.bestWin.opponents), chance: chance(g.bestWin.chance) })}</p>}
            <Disclosure summary={t("account.overview.weeks.matches")} className="mt-2">
              <div className="mt-2">
                <MatchTable matches={g.matches} embedded tournamentLinks={links} />
              </div>
            </Disclosure>
          </div>
        ))}
      </div>
    </article>
  );
}

function SeasonPart({ seasons }: { seasons: SeasonReview[] }) {
  const { t, plural, pct, num, pools, signed, date } = useI18n();
  const [picked, setPicked] = useState(seasons[0].season);
  const s = seasons.find((x) => x.season === picked) ?? seasons[0];
  const games = s.record.wins + s.record.losses + s.record.draws;
  return (
    <section className={PART}>
      <h2 className={H2}>{t("account.overview.season.title")}</h2>
      {/* Newest first, sideways when they don't fit (no scrollbar: the site's ScrollRow) */}
      <div role="group" aria-label={t("account.overview.season.pick")} className="mb-4">
        <ScrollRow>
          {seasons.map((x) => (
            <button
              key={x.season}
              type="button"
              aria-pressed={x.season === s.season}
              aria-current={x.season === s.season || undefined}
              onClick={() => setPicked(x.season)}
              className={`shrink-0 ${toggleClass(x.season === s.season, "sm")}`}
            >
              {seasonLabel(x.season, true)}
            </button>
          ))}
        </ScrollRow>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("account.overview.season.matches")} detail={t("account.overview.season.winRate", { pct: pct(rate(s.record)) })}>
          {recordText(t, s.record)}
        </StatCard>
        <StatCard label={t("account.overview.season.underdog")} title={t("account.overview.season.underdogHelp")} detail={t("account.overview.season.underdogHelp")}>
          {recordText(t, s.underdog)}
        </StatCard>
        <StatCard label={t("account.overview.season.decider")} title={t("account.overview.season.deciderHelp")} detail={t("account.overview.season.deciderHelp")}>
          {recordText(t, s.decider)}
        </StatCard>
        <StatCard label={t("account.overview.season.events")} detail={s.teamMatches ? plural("account.overview.season.eventsDetail", s.teamMatches) : undefined}>
          {num(s.tournaments)}
        </StatCard>
      </dl>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="bg-white p-4">
          <h3 className="text-sm text-gray-600 mb-2">{t("account.overview.season.rating")}</h3>
          <ul>
            {Object.entries(s.pools).map(([pool, p]) => {
              const change = p!.start !== null && p!.end !== null ? p!.end - p!.start : null;
              return (
                <li key={pool} className="flex justify-between gap-3 py-0.5">
                  <span className="text-gray-700">{pools[pool as keyof typeof pools]}</span>
                  <span className="tabular-nums whitespace-nowrap">
                    {p!.end !== null ? num(p!.end) : "–"} {change !== null && change !== 0 && <span className={`text-sm ${toneClass(change)}`}>{signed(change, 0)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="bg-white p-4">
          <h3 className="text-sm text-gray-600 mb-2">{t("account.overview.season.partner")}</h3>
          {s.partner ? <PersonLine p={s.partner} kind="together" /> : <p className="text-gray-400">–</p>}

        </div>
        <div className="bg-white p-4">
          <h3 className="text-sm text-gray-600 mb-2">{t("account.overview.season.opponents")}</h3>
          <ul className="space-y-1">
            {s.opponents.map((o) => (
              <li key={o.id}>
                <PersonLine p={o} kind="against" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {s.badges.length > 0 && (
        <div className="bg-white p-4 mt-4">
          <h3 className="text-sm text-gray-600 mb-3">{plural("account.overview.season.badges", s.badges.length)}</h3>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {s.badges.map((b, i) => (
              <li key={`${b.title}-${b.date}-${i}`} className="flex items-center gap-3 min-w-0">
                {b.art ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.art} alt="" className={`w-10 h-10 object-contain shrink-0${b.artInvert ? " dark-invert" : ""}`} />
                ) : (
                  <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-full bg-gray-200" />
                )}
                <span className="min-w-0">
                  <span className="block font-semibold">{b.title}</span>
                  <span className="block text-sm text-gray-600">{date(b.date)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!games && <p className="text-gray-600 mt-2">{t("account.overview.season.none")}</p>}
    </section>
  );
}

function PersonLine({ p, kind, me }: { p: { id: number | null; name: string; matches: number; wins: number; losses: number }; kind: "together" | "against"; me?: number }) {
  const { t } = useI18n();
  return (
    <span className="flex flex-wrap justify-between gap-x-3">
      {p.id ? (
        <Link href={me && kind === "against" ? headToHeadHref(me, p.id) : playerHref(p.id)} className="font-semibold hover:text-blue-600">{p.name}</Link>
      ) : (
        <span className="font-semibold">{p.name}</span>
      )}
      <span className="text-sm text-gray-600 tabular-nums">{t(kind === "together" ? "account.overview.career.together" : "account.overview.career.against", { matches: p.matches, wins: p.wins, losses: p.losses })}</span>
    </span>
  );
}

function CareerPart({ dashboard, me }: { dashboard: Dashboard; me: number }) {
  const { t, pct, date, num, pools } = useI18n();
  const c = dashboard.career;
  if (!c.form.length) return null;
  const last: Record3 = { wins: 0, losses: 0, draws: 0 };
  for (const f of c.form) {
    if (f.result === 1) last.wins++;
    else if (f.result === 0) last.losses++;
    else last.draws++;
  }
  return (
    <section className={PART}>
      <h2 className={H2}>{t("account.overview.career.title")}</h2>
      <div className="bg-white p-4 mb-4">
        <h3 className="text-sm text-gray-600 mb-2">
          {t("account.overview.career.form")} <span className="text-gray-500">· {t("account.overview.career.formHelp")}</span>
        </h3>
        <ol className="flex gap-1.5">
          {c.form.map((f, i) => {
            const result = f.result === 1 ? "win" : f.result === 0 ? "loss" : "draw";
            const text = `${t(`account.overview.result.${result}`)}: ${names(f.opponents)}, ${f.score} · ${pools[f.pool]} · ${date(f.day)}`;
            return (
              <li key={i} title={text} className={`w-7 h-7 flex items-center justify-center text-xs font-semibold text-white ${result === "win" ? "bg-green-700" : result === "loss" ? "bg-red-700" : "bg-gray-500"}`}>
                <span aria-hidden="true">{t(`account.overview.result.${result}`).slice(0, 1)}</span>
                <span className="sr-only">{text}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label={t("account.overview.career.lastTen")} detail={t("account.overview.career.careerRate", { pct: pct(rate(c.record)) })}>
          {pct(rate(last))}
        </StatCard>
        {c.longestStreak && (
          <StatCard label={t("account.overview.career.streak")} detail={t("account.overview.career.streakDetail", { from: date(c.longestStreak.from), to: date(c.longestStreak.to) })}>
            {num(c.longestStreak.wins)}
          </StatCard>
        )}
        <StatCard label={t("account.overview.career.underdog")} title={t("account.overview.season.underdogHelp")} detail={pct(rate(c.underdog))}>
          {recordText(t, c.underdog)}
        </StatCard>
        <StatCard label={t("account.overview.career.decider")} title={t("account.overview.season.deciderHelp")} detail={pct(rate(c.decider))}>
          {recordText(t, c.decider)}
        </StatCard>
      </dl>
      {(c.partners.doubles.length > 0 || c.partners.mixed.length > 0 || c.nemeses.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <PeopleCard title={t("account.overview.career.partnersDoubles")} people={c.partners.doubles} kind="together" me={me} />
          <PeopleCard title={t("account.overview.career.partnersMixed")} people={c.partners.mixed} kind="together" me={me} />
          <PeopleCard title={t("account.overview.career.nemeses")} help={t("account.overview.career.nemesisHelp")} people={c.nemeses} kind="against" me={me} />
        </div>
      )}
    </section>
  );
}

/** A short list of people (the top 3) in a white box, with "–" when there's none */
function PeopleCard({ title, help, people, kind, me }: { title: string; help?: string; people: Partner[]; kind: "together" | "against"; me: number }) {
  return (
    <div className="bg-white p-4">
      <h3 className="text-sm text-gray-600 mb-2">{title}</h3>
      {people.length ? (
        <ol className="space-y-1">
          {people.map((p) => (
            <li key={p.id}>
              <PersonLine p={p} kind={kind} me={me} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-gray-400">–</p>
      )}
      {help && <p className="text-xs text-gray-500 mt-2">{help}</p>}
    </div>
  );
}
