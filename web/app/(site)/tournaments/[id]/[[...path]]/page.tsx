// One tournament's draws, draw luck and, once played, how the predictions turned out
// (pipeline/upcoming.mjs). Two views: the events (/tournaments/<id> the first, /<class>/<pool> another,
// /<class>/<pool>/<order> in another table order) and the summary (/tournaments/<id>/summary). Each
// is a static page, rendered on its first visit and cached until the next data update.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import PoolName from "@/components/format/PoolName";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import EntryNames from "@/components/tournaments/EntryNames";
import EventResult from "@/components/tournaments/EventResult";
import PredictionStats from "@/components/tournaments/PredictionStats";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import LinkTabs from "@/components/ui/LinkTabs";
import Loading from "@/components/ui/Loading";
import ScrollRow from "@/components/ui/ScrollRow";
import Section from "@/components/ui/Section";
import { Stat } from "@/components/ui/StatCard";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import Tabs from "@/components/ui/Tabs";
import { getClubMap } from "@/data/sanity";
import { getTournament, getTournamentsIndex } from "@/data/tournaments";
import { plural, rich, t } from "@/messages/i18n";
import type { ClubEntry, Entry, Tournament, TournamentEvent } from "@/types";
import { date, dateRange, EMPTY, num, pct, place, signed, toneClass } from "@/utils/format";
import { tournamentHref } from "@/utils/hrefs";
import { parseId } from "@/utils/parse";
import { isSingles } from "@/utils/pools";
import {
  type Order,
  allEntries,
  entryCount,
  eventHref,
  eventsByClass,
  eventTitle,
  formatDescription,
  noLuck,
  onlyWinners,
  orders,
  pickView,
  rounds,
  tableRows,
} from "@/utils/tournament";

const strong = (text: ReactNode) => <strong className="font-semibold">{text}</strong>;

// Every tournament's first event is prerendered; the other events and the summaries on their first visit
export async function generateStaticParams() {
  const tournaments = (await getTournamentsIndex())?.tournaments ?? [];
  return tournaments.length ? tournaments.map((tour) => ({ id: String(tour.cup2000Id), path: [] })) : [{ id: "0", path: [] }];
}

export async function generateMetadata({ params }: PageProps<"/tournaments/[id]/[[...path]]">): Promise<Metadata> {
  const id = parseId((await params).id);
  const tour = id !== null ? await getTournament(id) : null;
  return { title: tour?.name ?? t("tournaments.metadata.tournament") };
}

export default function TournamentPage(props: PageProps<"/tournaments/[id]/[[...path]]">) {
  return (
    <Suspense fallback={<Loading label={t("tournaments.page.loading")} section />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/tournaments/[id]/[[...path]]">, "params">) {
  const { id: param, path = [] } = await params;
  const id = parseId(param);
  if (id === null) notFound();
  const [tour, clubs] = await Promise.all([getTournament(id), getClubMap()]);
  if (!tour) notFound();
  const shown = pickView(tour, path);
  if (!shown) notFound();
  const { view } = shown;

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("layout.nav.tournaments"), href: "/tournaments" }, { label: tour.name }]} />
        <h1 className="h1 mt-4">{tour.name}</h1>
        {tour.startDate && <p className="text-2xl text-gray-700 mt-2">{dateRange(tour.startDate, tour.endDate, true)}</p>}
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <a href={`https://www.cup2000.dk/turnerings-system/Vis-turneringer/?tournamentid=${tour.cup2000Id}`} className={TEXT_LINK} rel="noopener">{t("tournaments.page.cup2000")}</a>
          {tour.portalenId && <span className="text-gray-600">{t("tournaments.page.portalen", { id: tour.portalenId })}</span>}
        </p>
        {tour.cancelled && <p className="mt-4 inline-block px-3 py-2 border border-red-700 text-red-700">{rich("tournaments.page.cancelled", { strong }, { reason: tour.cancelled })}</p>}
        {/* Two views: the event tables (default) and the tournament's summary */}
        <LinkTabs
          label={t("tournaments.page.views")}
          className="flex gap-2 mt-6"
          current={view}
          tabs={[
            { key: "events", href: tournamentHref(tour.cup2000Id), label: t("tournaments.page.events") },
            { key: "summary", href: tournamentHref(tour.cup2000Id, "summary"), label: t("tournaments.page.summary") },
          ]}
        />
      </Section>
      {shown.view === "summary" ? <Summary tour={tour} clubs={clubs} /> : <Events tour={tour} clubs={clubs} eventIndex={shown.event} requestedOrder={shown.order} />}
    </>
  );
}

// ---- Summary ----

function Summary({ tour, clubs }: { tour: Tournament; clubs: Record<string, ClubEntry> }) {
  const all = allEntries(tour);
  // Luck in each event's own measure: places in events that place everyone (the X classes), else rounds
  const byLuck = all.filter((e) => e.luck).sort((a, b) => b.luck!.score - a.luck!.score);
  const champions = all.filter((e) => e.result?.win === 1).sort((a, b) => a.actual.win - b.actual.win);
  const ev = tour.evaluation;
  type Item = (typeof all)[number];
  const lists: { id: string; title: string; entries: Item[]; kind: "winner" | "luck" }[] = [];
  if (champions.length) lists.push({ id: "surprises", title: t("tournaments.summary.surprises"), entries: champions.slice(0, 8), kind: "winner" });
  if (byLuck.length) {
    lists.push({ id: "luckiest", title: t("tournaments.summary.luckiest"), entries: byLuck.slice(0, 8), kind: "luck" });
    lists.push({ id: "unluckiest", title: t("tournaments.summary.unluckiest"), entries: [...byLuck].reverse().slice(0, 8), kind: "luck" });
  }
  // How it works: only what this tournament's events need
  const hasRounds = tour.events.some((e) => !noLuck(e) && !e.placement);
  const hasPlacement = tour.events.some((e) => e.placement);
  const hasSingle = tour.events.some((e) => noLuck(e));

  return (
    <>
      {ev?.events > 0 && (
        <Section title={t("tournaments.predictions.title")}>
          <PredictionStats ev={ev} totalEvents={tour.events.length} />
          <p className="text-gray-700 max-w-3xl">{t("tournaments.summary.predictionsExplained")}</p>
        </Section>
      )}
      {lists.length > 0 && (
        <Section>
          {/* Surprising winners, luckiest and unluckiest draws: one box, one tab each */}
          <Card>
            <Tabs
              label={t("tournaments.summary.lists")}
              param="list"
              className="mb-6"
              tabs={lists.map((list) => ({
                id: list.id,
                label: list.title,
                content: (
                  <ol className="grid gap-x-8 gap-y-4 md:grid-cols-2">
                    {list.entries.map((e, i) => (
                      <li key={i} className="flex justify-between gap-4">
                        <div>
                          <EntryNames e={e} clubs={clubs} />
                          <Link href={eventHref(tour.cup2000Id, tour.events[e.eventIndex])} className="block text-sm text-gray-600 hover:text-blue-600">
                            {e.eventLabel}{list.kind === "luck" && e.group ? ` · ${t("tournaments.summary.inGroup", { group: e.group })}` : ""}
                          </Link>
                        </div>
                        <div className="text-right tabular-nums whitespace-nowrap">
                          {list.kind === "winner" ? (
                            <>
                              <span className="text-xl font-semibold">{pct(e.actual.win)}</span>
                              <span className="block text-sm text-gray-600">{t("tournaments.summary.chanceBefore")}</span>
                            </>
                          ) : (
                            <>
                              <span className={`text-xl font-semibold ${toneClass(e.luck!.score)}`}>{signed(e.luck!.score)}</span>
                              <span className="block text-sm text-gray-600">{t(e.placement ? "tournaments.summary.places" : "tournaments.summary.rounds")}</span>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ),
              }))}
            />
          </Card>
        </Section>
      )}
      <Section title={t("tournaments.howItWorks.title")}>
        <div className="max-w-3xl text-gray-700 space-y-2">
          <p>{t("tournaments.howItWorks.simulation", { runs: num(tour.runs) })}</p>
          <p>{rich("tournaments.howItWorks.seeds", { strong }, { version: tour.rankingVersion ? t("tournaments.howItWorks.seedsVersion", { date: date(tour.rankingVersion) }) : "" })}</p>
          <p>
            {hasRounds && (
              <>
                {rich("tournaments.howItWorks.rounds", { strong })}{" "}
              </>
            )}
            {hasPlacement && `${t("tournaments.howItWorks.placement")} `}
            {hasSingle && t("tournaments.howItWorks.noLuck")}
          </p>
        </div>
      </Section>
    </>
  );
}

// ---- Events ----

/** The Seeds line of an event's explanation: by the ranking (how many, which list), by rating, or none */
function seedsText(event: TournamentEvent, version: string | null | undefined): string {
  const count = event.seeds.length;
  const text =
    event.seededBy !== "ranking"
      ? t("tournaments.legend.seedsByRating", { count })
      : count
        ? t("tournaments.legend.seedsByRanking", { count, version: version ? t("tournaments.legend.seedsRankingVersion", { date: date(version) }) : "" })
        : t("tournaments.legend.seedsNone", { version: version ? t("tournaments.legend.seedsNoneVersion", { date: date(version) }) : "" });
  return `${text}${count > 0 ? t("tournaments.legend.seedsMarked") : ""}.`;
}

function Events({ tour, clubs, eventIndex, requestedOrder }: { tour: Tournament; clubs: Record<string, ClubEntry>; eventIndex: number; requestedOrder: string | null }) {
  const event = tour.events[eventIndex];
  const single = noLuck(event);
  const { placement, played } = event;
  const winner = played ? event.entries.find((e) => e.result?.win === 1) : null;
  const { steps, short } = rounds(event);
  const max = event.maxRounds;
  const available = orders(event);
  const keys = Object.keys(available) as Order[];
  const order: Order = requestedOrder && requestedOrder in available ? (requestedOrder as Order) : keys[0];
  const grouped = event.groups.length > 1;
  const groupColumn = grouped && order !== "group";
  const numbered = order === "standings";
  const knockoutColumn = event.groups.length > 0 && event.knockout;
  const columns = (numbered ? 1 : 0) + 4 + (groupColumn ? 1 : 0) + (knockoutColumn ? 1 : 0) + (single ? 0 : 1) + (played ? 1 : 0);
  const maxLuck = single ? 1 : Math.max(0.01, ...event.entries.map((e) => Math.abs(e.luck?.score ?? 0)));
  const toughest = grouped ? [...event.groups].sort((a, b) => b.rating - a.rating).slice(0, 3) : [];
  const withdrawals = event.entries.some((e) => e.withdrew);
  const head = "hidden sm:table-cell py-2 px-4 font-normal text-right";
  const ofMax = (n: number) => <span className="whitespace-nowrap">{t("tournaments.table.ofMax", { max: n })}</span>;

  return (
    <Section>
      <nav className="grid grid-cols-1 gap-3 mb-8" aria-label={t("tournaments.event.nav")}>
        {eventsByClass(tour).map(({ className, events }) => (
          // One line per class: the disciplines scroll sideways when they don't fit beside the class name
          <div key={className} className="flex items-center gap-2">
            <span className="w-16 sm:w-20 shrink-0 font-semibold">{className}</span>
            <ScrollRow className="min-w-0 flex-1">
              {events.map(({ i, e }) => (
                <Link
                  key={i}
                  href={eventHref(tour.cup2000Id, e)}
                  className={`shrink-0 px-3 py-1 border border-black transition-colors duration-200 ${i === eventIndex ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                  aria-current={i === eventIndex ? "page" : undefined}
                >
                  <PoolName pool={e.pool} />
                </Link>
              ))}
            </ScrollRow>
          </div>
        ))}
      </nav>

      <h2 className="text-3xl mb-1">{eventTitle(event)}</h2>
      <p className="text-gray-700 mb-4">
        {entryCount(event)}
        {formatDescription(event)}.{" "}
        {single && `${t("tournaments.event.noLuck", { reason: t(event.entries.length <= 2 ? "tournaments.event.justOneMatch" : "tournaments.event.everyoneVsEveryone") })} `}
      </p>

      {winner && <EventResult event={event} winner={winner} clubs={clubs} />}

      <dl className="grid gap-2 md:grid-cols-[auto_1fr] md:gap-x-6 mb-6 max-w-4xl text-gray-700">
        {knockoutColumn && (
          <>
            <dt className="font-semibold">{t("tournaments.legend.outOfGroup")}</dt>
            <dd>{t(onlyWinners(event) ? "tournaments.legend.outOfGroupOnlyWinners" : "tournaments.legend.outOfGroupText")}</dd>
          </>
        )}
        <dt className="font-semibold">{t("tournaments.legend.winsEvent")}</dt>
        <dd>{t(event.knockout ? "tournaments.legend.winsEventKnockout" : "tournaments.legend.winsEventGroup")}</dd>
        {single ? (
          <>
            <dt className="font-semibold">{t("tournaments.legend.wins")}</dt>
            <dd>{t("tournaments.legend.winsText", { max })}</dd>
          </>
        ) : placement ? (
          <>
            <dt className="font-semibold">{t("tournaments.legend.placement")}</dt>
            <dd>{t("tournaments.legend.placementText", { count: event.entries.length })}</dd>
          </>
        ) : (
          <>
            <dt className="font-semibold">{t("tournaments.legend.rounds")}</dt>
            <dd>{t("tournaments.legend.roundsText", { max, steps: steps.join(", ") })}</dd>
          </>
        )}
        {!single && (
          <>
            <dt className="font-semibold">{t("tournaments.legend.luck")}</dt>
            <dd>
              {t(placement ? "tournaments.legend.luckPlacement" : "tournaments.legend.luckRounds")}
              {withdrawals && ` ${t("tournaments.legend.luckWithdrawals")}`}
            </dd>
          </>
        )}
        {!single && (
          <>
            <dt className="font-semibold">{t("tournaments.legend.seeds")}</dt>
            <dd>{seedsText(event, tour.rankingVersion)}</dd>
          </>
        )}
        {played && (
          <>
            <dt className="font-semibold">{t("tournaments.legend.result")}</dt>
            <dd>{t(single ? "tournaments.legend.resultSingle" : placement ? "tournaments.legend.resultPlacement" : "tournaments.legend.resultRounds")}</dd>
          </>
        )}
      </dl>

      {toughest.length > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          {t("tournaments.event.strongestGroups", { groups: toughest.map((g) => t("tournaments.event.strongestGroup", { number: g.number, rating: g.rating })).join(", ") })}
        </p>
      )}

      {keys.length > 1 && (
        <LinkTabs
          label={t("tournaments.event.order")}
          size="sm"
          className="flex flex-wrap gap-2 mb-4"
          current={order}
          tabs={keys.map((key) => ({ key, href: eventHref(tour.cup2000Id, event, key), label: available[key] }))}
        />
      )}

      {/* On phones the numbers go under each entry's names (EntryRow); from tablet width up, the table */}
      <div className="bg-white overflow-x-auto">
        <table className="w-full text-left">
          <thead className="text-sm text-gray-600 border-b border-gray-200">
            <tr>
              {numbered && <th scope="col" className="py-2 pl-2 sm:pl-4 pr-0 font-normal text-right">{t("tournaments.table.place")}</th>}
              <th scope="col" className="py-2 px-2 sm:px-4 font-normal">{t(isSingles(event.pool) ? "common.table.player" : "tournaments.table.pair")}</th>
              {groupColumn && <th scope="col" className={head}>{t("tournaments.table.group")}</th>}
              <th scope="col" className={head} title={t("tournaments.table.ratingTitle")}>{t("common.table.rating")}</th>
              {knockoutColumn && <th scope="col" className={head} title={t("tournaments.table.outOfGroupTitle")}>{t("tournaments.legend.outOfGroup")}</th>}
              <th scope="col" className={head} title={t(single ? "tournaments.table.winsEventTitle" : "tournaments.table.winsEventTitleFair")}>{t("tournaments.legend.winsEvent")}</th>
              {single ? (
                <th scope="col" className={head} title={t("tournaments.table.winsTitle")}>{t("tournaments.legend.wins")} {ofMax(max)}</th>
              ) : placement ? (
                <th scope="col" className={head} title={t("tournaments.table.placementTitle")}>{t("tournaments.legend.placement")} {ofMax(event.entries.length)}</th>
              ) : (
                <th scope="col" className={head} title={t("tournaments.table.roundsTitle")}>{t("tournaments.legend.rounds")} {max ? ofMax(max) : null}</th>
              )}
              {!single && <th scope="col" className="hidden sm:table-cell py-2 px-4 font-normal">{t("tournaments.legend.luck")}</th>}
              {played && <th scope="col" className={head}>{t("tournaments.legend.result")}</th>}
            </tr>
          </thead>
          <tbody>
            {tableRows(event, order).map((row, i) =>
              "header" in row ? (
                <tr key={`h${i}`} className="bg-gray-50 border-b border-gray-200">
                  <th scope="colgroup" colSpan={columns} className="py-2 px-2 sm:px-4 text-left font-semibold">
                    {row.header} {row.detail && <span className="font-normal text-sm text-gray-600">· {row.detail}</span>}
                  </th>
                </tr>
              ) : (
                <EntryRow key={i} entry={row.entry} place={row.place} event={event} order={order} clubs={clubs} columns={{ numbered, groupColumn, knockoutColumn }} maxLuck={maxLuck} short={short} />
              ),
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

/** A group place worth a badge in the group view ("Won the group", "2nd in the group") */
function groupRankLabel(rank: number): string {
  if (rank === 1 || rank === 2 || rank === 3 || rank === 4) return t(`tournaments.entry.groupRank.${rank}`);
  return t("tournaments.entry.groupRank.other", { rank });
}

function EntryRow({
  entry: e,
  place: standing,
  event,
  order,
  clubs,
  columns,
  maxLuck,
  short,
}: {
  entry: Entry;
  place?: number;
  event: TournamentEvent;
  order: Order;
  clubs: Record<string, ClubEntry>;
  columns: { numbered: boolean; groupColumn: boolean; knockoutColumn: boolean };
  maxLuck: number;
  short: string[];
}) {
  const single = noLuck(event);
  const { placement, played } = event;
  // Played events with withdrawals: the chances once the withdrawn players were out
  const ex = e.after ?? e.actual;
  const fx = e.fairAfter ?? e.fair;
  const luck = e.luck?.score ?? 0;
  const withdrawalLuck = Math.abs(e.luck?.withdrawals ?? 0) >= 0.01;
  // Played, in the group view: the group places that count (the ones going through; in the X classes all four)
  const rank = e.result?.groupRank ?? null;
  const marked = placement ? [1, 2, 3, 4] : (event.advance?.ranks ?? [1]);
  const r = e.result;
  // Seed number in the fair draw (0: not seeded); not shown where there's no draw luck
  const seed = single ? 0 : event.seeds.indexOf(event.entries.indexOf(e)) + 1;

  const expected = single
    ? { label: t("tournaments.legend.wins"), ex: ex.wins.toFixed(2), fair: null }
    : placement
      ? { label: t("tournaments.legend.placement"), ex: ex.place!.toFixed(2), fair: fx.place!.toFixed(2) }
      : { label: t("tournaments.legend.rounds"), ex: ex.progress.toFixed(2), fair: fx.progress.toFixed(2) };
  const luckValue = (
    <>
      <span className={`tabular-nums font-semibold ${toneClass(luck)}`} title={withdrawalLuck ? t("tournaments.entry.luckSplit", { draw: signed(e.luck!.draw!), withdrawals: signed(e.luck!.withdrawals!) }) : undefined}>
        {signed(luck)}
        {withdrawalLuck && <span className="text-gray-500">*</span>}
      </span>
      {/* Diverging bar from the middle: right for a lucky draw, left for an unlucky one */}
      <span className="mt-1 flex h-2" aria-hidden="true">
        <span className="w-1/2 flex justify-end">{luck < 0 && <span className="h-2 rounded-l bg-red-600" style={{ width: `${((Math.abs(luck) / maxLuck) * 100).toFixed(1)}%` }} />}</span>
        <span className="w-px bg-gray-400" />
        <span className="w-1/2">{luck > 0 && <span className="block h-2 rounded-r bg-green-600" style={{ width: `${((luck / maxLuck) * 100).toFixed(1)}%` }} />}</span>
      </span>
    </>
  );
  // The result and how it compares with the expectation (two lines)
  const result = r ? (
    single ? (
      <>
        <span className={r.win ? "font-semibold" : ""}>{r.win ? t("tournaments.entry.won") : plural("tournaments.entry.wins", Math.round(r.wins))}</span>
        <span className={`block text-sm ${toneClass(r.wins - ex.wins)}`}>{t("tournaments.entry.winsDiff", { diff: signed(r.wins - ex.wins, 1) })}</span>
      </>
    ) : placement ? (
      <>
        <span className={r.place === 1 ? "font-semibold" : ""}>{place(r.place!)}</span>
        <span className={`block text-sm ${toneClass(ex.place! - r.place!)}`}>{t("tournaments.entry.placesDiff", { diff: signed(ex.place! - r.place!, 1) })}</span>
      </>
    ) : (
      <>
        <span className={r.win ? "font-semibold" : ""}>
          {Math.round(r.progress) === 0 ? t(event.groups.length ? "tournaments.entry.group" : "tournaments.entry.firstMatch") : (short[Math.round(r.progress) - 1] ?? Math.round(r.progress))}
        </span>
        <span className={`block text-sm ${toneClass(r.progress - ex.progress)}`}>{t("tournaments.entry.roundsDiff", { diff: signed(r.progress - ex.progress, 1) })}</span>
      </>
    )
  ) : null;
  // A value with the fair-draw one after it in brackets (on its own line in the table)
  const withFair = (value: string, fair: string | null, inline: boolean) => (
    <>
      {value}
      {fair !== null && <span className={`${inline ? "" : "block "}text-sm text-gray-500`}>{inline ? " " : ""}({fair})</span>}
    </>
  );
  const cell = "hidden sm:table-cell py-2 px-4 text-right tabular-nums";

  return (
    <tr className={`${ROW} align-top`}>
      {columns.numbered && <td className="py-2 pl-2 sm:pl-4 pr-0 text-right tabular-nums font-semibold">{standing}</td>}
      <td className="py-2 px-2 sm:px-4">
        <EntryNames e={e} clubs={clubs} />
        {seed > 0 && (
          <Badge className="mt-1 mr-1">
            <span title={e.points ? t("tournaments.entry.rankingPoints", { points: num(e.points) }) : t("tournaments.entry.seededByRating")}>{t("tournaments.entry.seed", { seed })}</span>
          </Badge>
        )}
        {e.withdrew && (
          <Badge tone="red" className="mt-1 mr-1">
            {t("tournaments.entry.withdrew")}
          </Badge>
        )}
        {order === "group" && played && rank && marked.includes(rank) && (
          <Badge tone={rank === 1 ? "green" : "gray"} className="mt-1 mr-1">
            {groupRankLabel(rank)}
          </Badge>
        )}
        {/* Phones: the numbers under the names, labelled */}
        <dl className="sm:hidden mt-2 grid grid-cols-3 gap-x-3 gap-y-2 text-sm">
          {columns.groupColumn && <Stat label={t("tournaments.table.group")}>{e.group ?? EMPTY}</Stat>}
          <Stat label={t("common.table.rating")}>{e.rating}</Stat>
          {columns.knockoutColumn && <Stat label={t("tournaments.legend.outOfGroup")}>{withFair(pct(ex.knockout), pct(fx.knockout), true)}</Stat>}
          <Stat label={t("tournaments.legend.winsEvent")}>{withFair(pct(ex.win), single ? null : pct(fx.win), true)}</Stat>
          <Stat label={expected.label}>{withFair(expected.ex, expected.fair, true)}</Stat>
          {!single && <Stat label={t("tournaments.legend.luck")}>{luckValue}</Stat>}
          {played && result && <Stat label={t("tournaments.legend.result")}>{result}</Stat>}
        </dl>
      </td>
      {columns.groupColumn && <td className={cell}>{e.group ?? EMPTY}</td>}
      <td className={cell}>{e.rating}</td>
      {columns.knockoutColumn && <td className={`${cell} whitespace-nowrap`}>{withFair(pct(ex.knockout), pct(fx.knockout), false)}</td>}
      <td className={`${cell} whitespace-nowrap`}>{withFair(pct(ex.win), single ? null : pct(fx.win), false)}</td>
      <td className={`${cell} whitespace-nowrap`}>{withFair(expected.ex, expected.fair, false)}</td>
      {!single && <td className="hidden sm:table-cell py-2 px-4 min-w-40">{luckValue}</td>}
      {played && result && <td className={`${cell} whitespace-nowrap`}>{result}</td>}
    </tr>
  );
}
