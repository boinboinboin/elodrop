// One tournament's draws, draw luck and, once played, how the predictions turned out
// (pipeline/upcoming.mjs). Two views: the events (/tournaments/<id> the first, /<class>/<pool> another,
// /<class>/<pool>/<order> in another table order) and the summary (/tournaments/<id>/summary). Each
// is a static page, rendered on its first visit and cached until the next data update.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import PoolName from "@/components/PoolName";
import PredictionStats from "@/components/PredictionStats";
import Tabs from "@/components/Tabs";
import { getClubMap } from "@/lib/clubs";
import { getTournament, getTournamentsIndex } from "@/lib/data";
import { dateRange, num, pct, place, signed } from "@/lib/format";
import { type Order, allEntries, eventHref, eventsByClass, formatDescription, noLuck, onlyWinners, orders, pickView, rounds, tableRows } from "@/lib/tournament";
import type { ClubEntry, Entry, Tournament, TournamentEvent } from "@/lib/types";

// Every tournament's first event is prerendered; the other events and the summaries on their first visit
export async function generateStaticParams() {
  const tournaments = (await getTournamentsIndex())?.tournaments ?? [];
  return tournaments.length ? tournaments.map((t) => ({ id: String(t.cup2000Id), path: [] })) : [{ id: "0", path: [] }];
}

export async function generateMetadata({ params }: PageProps<"/tournaments/[id]/[[...path]]">): Promise<Metadata> {
  const { id } = await params;
  const t = /^\d+$/.test(id) ? await getTournament(Number(id)) : null;
  return { title: t?.name ?? "Tournament" };
}

export default function TournamentPage(props: PageProps<"/tournaments/[id]/[[...path]]">) {
  return (
    <Suspense fallback={<div className="base-container px-4 base-section text-gray-600">Loading tournament…</div>}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/tournaments/[id]/[[...path]]">, "params">) {
  const { id, path = [] } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const [t, clubs] = await Promise.all([getTournament(Number(id)), getClubMap()]);
  if (!t) notFound();
  const shown = pickView(t, path);
  if (!shown) notFound();
  const { view } = shown;

  return (
    <>
      <section className="base-section">
        <div className="base-container px-4">
          <Link href="/tournaments" className="text-gray-600 hover:text-black">&larr; Tournaments</Link>
          <h1 className="h1 mt-4">{t.name}</h1>
          {t.startDate && <p className="text-2xl text-gray-700 mt-2">{dateRange(t.startDate, t.endDate, true)}</p>}
          <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
            <a href={`https://www.cup2000.dk/turnerings-system/Vis-turneringer/?tournamentid=${t.cup2000Id}`} className="underline hover:text-blue-600" rel="noopener">Draw and results on Cup2000</a>
            {t.portalenId && <span className="text-gray-600">badmintonportalen tournament {t.portalenId}</span>}
          </p>
          {t.cancelled && (
            <p className="mt-4 inline-block px-3 py-2 border border-red-700 text-red-700">
              <strong className="font-semibold">Not played.</strong> {t.cancelled}. The draw and its luck are as they were published.
            </p>
          )}
          {/* Two views: the event tables (default) and the tournament's summary */}
          <nav className="flex gap-2 mt-6" aria-label="Views">
            {(["events", "summary"] as const).map((key) => (
              <Link
                key={key}
                href={`/tournaments/${t.cup2000Id}${key === "summary" ? "/summary" : ""}`}
                className={`px-4 py-2 border border-black transition-colors duration-200 ${view === key ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                aria-current={view === key ? "page" : undefined}
              >
                {key === "events" ? "Events" : "Summary"}
              </Link>
            ))}
          </nav>
        </div>
      </section>
      {shown.view === "summary" ? <Summary t={t} clubs={clubs} /> : <Events t={t} clubs={clubs} eventIndex={shown.event} requestedOrder={shown.order} />}
    </>
  );
}

/** An entry's players with their club logos and ratings; ≈ marks a rating estimated for someone without one in this discipline */
function EntryNames({ e, clubs }: { e: Pick<Entry, "players">; clubs: Record<string, ClubEntry> }) {
  return (
    <>
      {e.players.map((p, i) => {
        const logo = p.club ? clubs[p.club]?.logo : null;
        return (
          <span key={i}>
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo && <img src={logo} alt="" className="w-4 h-4 object-contain shrink-0" />}
              {p.id ? <Link href={`/players/${p.id}`} className="hover:text-blue-600">{p.name}</Link> : p.name}
              <span className="text-sm text-gray-500 tabular-nums" title={p.estimated ? "No rating in this discipline: estimated" : undefined}>
                {p.estimated ? "≈" : ""}{Math.round(p.rating)}
              </span>
            </span>
            {p.club && <span className={`block text-sm text-gray-600 ${logo ? "pl-5.5" : ""}`}>{p.club}</span>}
          </span>
        );
      })}
    </>
  );
}

// ---- Summary ----

function Summary({ t, clubs }: { t: Tournament; clubs: Record<string, ClubEntry> }) {
  const all = allEntries(t);
  // Luck in each event's own measure: places in events that place everyone (the X classes), else rounds
  const byLuck = all.filter((e) => e.luck).sort((a, b) => b.luck!.score - a.luck!.score);
  const champions = all.filter((e) => e.result?.win === 1).sort((a, b) => a.actual.win - b.actual.win);
  const ev = t.evaluation;
  type Item = (typeof all)[number];
  const lists: { id: string; title: string; entries: Item[]; kind: "winner" | "luck" }[] = [];
  if (champions.length) lists.push({ id: "surprises", title: "Most surprising winners", entries: champions.slice(0, 8), kind: "winner" });
  if (byLuck.length) {
    lists.push({ id: "luckiest", title: "Luckiest draws", entries: byLuck.slice(0, 8), kind: "luck" });
    lists.push({ id: "unluckiest", title: "Unluckiest draws", entries: [...byLuck].reverse().slice(0, 8), kind: "luck" });
  }
  // How it works: only what this tournament's events need
  const hasRounds = t.events.some((e) => !noLuck(e) && !e.placement);
  const hasPlacement = t.events.some((e) => e.placement);
  const hasSingle = t.events.some((e) => noLuck(e));

  return (
    <>
      {ev?.events > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            <h2 className="text-3xl mb-4">How the predictions turned out</h2>
            <PredictionStats ev={ev} totalEvents={t.events.length} />
            <p className="text-gray-700 max-w-3xl">
              The favourite is the entry with the best chance of winning the event with the actual draw. &ldquo;Luck showed in the results&rdquo;: each entry&apos;s rounds minus its fair-draw
              expectation, against its luck (a regression through zero). Near 1, a draw rated a round luckier gave about a round more; near 0, the luck didn&apos;t show.
            </p>
          </div>
        </section>
      )}
      {lists.length > 0 && (
        <section className="base-section">
          <div className="base-container px-4">
            {/* Surprising winners, luckiest and unluckiest draws: one box, one tab each */}
            <div className="bg-white p-4 md:p-6">
              <Tabs
                label="Lists"
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
                            <Link href={eventHref(t.cup2000Id, t.events[e.eventIndex])} className="block text-sm text-gray-600 hover:text-blue-600">
                              {e.eventLabel}{list.kind === "luck" && e.group ? ` · group ${e.group}` : ""}
                            </Link>
                          </div>
                          <div className="text-right tabular-nums whitespace-nowrap">
                            {list.kind === "winner" ? (
                              <>
                                <span className="text-xl font-semibold">{pct(e.actual.win)}</span>
                                <span className="block text-sm text-gray-600">chance before</span>
                              </>
                            ) : (
                              <>
                                <span className={`text-xl font-semibold ${e.luck!.score >= 0 ? "text-green-700" : "text-red-700"}`}>{signed(e.luck!.score)}</span>
                                <span className="block text-sm text-gray-600">{e.placement ? "places" : "rounds"}</span>
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  ),
                }))}
              />
            </div>
          </div>
        </section>
      )}
      <section className="base-section">
        <div className="base-container px-4">
          <h2 className="text-3xl mb-4">How it works</h2>
          <div className="max-w-3xl text-gray-700 space-y-2">
            <p>
              How lucky each player&apos;s draw is, from their ratings at the end of the week before the tournament. Every event is played out {num(t.runs)} times with each match decided by the players&apos;
              win chances, once with the actual draw and once with a fair draw: the same players drawn again at random, with the seeds (the strongest by rating: one per group, or 2–8 in a knockout) kept
              where they are.
            </p>
            <p>
              {hasRounds && (
                <>
                  <strong className="font-semibold">Rounds</strong> is how far a player is expected to get: one round for getting out of the group and one for every knockout round after that (a bye
                  counts too), and one more for winning. <strong className="font-semibold">Luck</strong> is the rounds expected with the actual draw minus with a fair one.{" "}
                </>
              )}
              {hasPlacement &&
                "In the X classes everyone gets a final place, so luck there is in places: eight players or pairs in two groups of four, the top two to cross-over semi-finals, the third-placed playing for 5th and the fourth-placed for 7th. "}
              {hasSingle && "Events with a single group (everyone plays everyone) or just two players or pairs have no luck: they only show each player's chance of winning."}
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

// ---- Events ----

function Events({ t, clubs, eventIndex, requestedOrder }: { t: Tournament; clubs: Record<string, ClubEntry>; eventIndex: number; requestedOrder: string | null }) {
  const event = t.events[eventIndex];
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

  return (
    <section className="base-section">
      <div className="base-container px-4">
        <nav className="grid gap-3 mb-8" aria-label="Events">
          {eventsByClass(t).map(({ className, events }) => (
            <div key={className} className="flex flex-wrap items-center gap-2">
              <span className="w-20 shrink-0 font-semibold">{className}</span>
              {events.map(({ i, e }) => (
                <Link
                  key={i}
                  href={eventHref(t.cup2000Id, e)}
                  className={`px-3 py-1 border border-black transition-colors duration-200 ${i === eventIndex ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                  aria-current={i === eventIndex ? "page" : undefined}
                >
                  <PoolName pool={e.pool} />
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <h2 className="text-3xl mb-1">{event.className} {event.poolLabel?.toLowerCase()}</h2>
        <p className="text-gray-700 mb-4">
          {event.entries.length} {event.pool === "men" || event.pool === "women" ? "players" : "pairs"}
          {formatDescription(event)}.{" "}
          {single && `${event.entries.length <= 2 ? "Just one match" : "Everyone plays everyone"}, so there is no draw luck. `}
          {winner && (
            <>
              <strong className="font-semibold">Won by {winner.players.map((p) => p.name).join(" / ")}</strong>, with a {pct(winner.actual.win)} chance before.
            </>
          )}
        </p>

        <dl className="grid gap-2 md:grid-cols-[auto_1fr] md:gap-x-6 mb-6 max-w-4xl text-gray-700">
          {knockoutColumn && (
            <>
              <dt className="font-semibold">Out of group</dt>
              <dd>The chance of finishing high enough in the group to reach the knockout{onlyWinners(event) ? ", which here means winning it" : ""}.</dd>
            </>
          )}
          <dt className="font-semibold">Wins event</dt>
          <dd>The chance of winning the whole event{event.knockout ? " (the final)" : " (the group)"}.</dd>
          {single ? (
            <>
              <dt className="font-semibold">Wins</dt>
              <dd>The matches the player is expected to win in the group, out of {max}.</dd>
            </>
          ) : placement ? (
            <>
              <dt className="font-semibold">Placement</dt>
              <dd>
                The expected final place, 1 to {event.entries.length}: the final decides 1st and 2nd, the losing semi-finalists share 3rd–4th (3.5 each), the third-placed in the groups play for 5th and
                6th and the fourth-placed for 7th and 8th.
              </dd>
            </>
          ) : (
            <>
              <dt className="font-semibold">Rounds</dt>
              <dd>
                How many rounds the player is expected to get through, out of {max}: {steps.join(", ")}. A bye counts as a round got through, so a player with a bye starts one round ahead.
              </dd>
            </>
          )}
          {!single && (
            <>
              <dt className="font-semibold">Luck</dt>
              <dd>
                {placement ? "The placement with a fair draw minus with the actual draw" : "Rounds with the actual draw minus with a fair draw"} (in brackets in each column): above zero, the draw helps;
                below, it hurts.
                {withdrawals &&
                  " Players who withdrew (lost by walkover) count too: the numbers are with them out from then on, against a fair draw with the same withdrawals. A * marks luck that withdrawals changed (hover for the split)."}
              </dd>
            </>
          )}
          {played && (
            <>
              <dt className="font-semibold">Result</dt>
              <dd>
                {single ? "Matches won, and who won the group" : placement ? "The final place" : "How far the player got"}, and against the expectation with the actual draw (once any withdrawn players were
                out).
              </dd>
            </>
          )}
        </dl>

        {toughest.length > 0 && (
          <p className="text-sm text-gray-600 mb-4">
            Strongest groups by average rating: {toughest.map((g) => `group ${g.number} (${g.rating})`).join(", ")}.
          </p>
        )}

        {keys.length > 1 && (
          <nav className="flex flex-wrap gap-2 mb-4" aria-label="Order">
            {keys.map((key) => (
              <Link
                key={key}
                href={eventHref(t.cup2000Id, event, key)}
                className={`px-3 py-1 text-sm border border-black transition-colors duration-200 ${order === key ? "bg-black text-white" : "hover:bg-black hover:text-white"}`}
                aria-current={order === key ? "true" : undefined}
              >
                {available[key]}
              </Link>
            ))}
          </nav>
        )}

        <div className="bg-white overflow-x-auto">
          <table className="w-full text-left">
            <thead className="text-sm text-gray-600 border-b border-gray-200">
              <tr>
                {numbered && <th scope="col" className="py-2 pl-4 pr-0 font-normal text-right">#</th>}
                <th scope="col" className="py-2 px-4 font-normal">{event.pool === "men" || event.pool === "women" ? "Player" : "Pair"}</th>
                {groupColumn && <th scope="col" className="py-2 px-4 font-normal text-right">Group</th>}
                <th scope="col" className="py-2 px-4 font-normal text-right" title="Sum of the players' ratings in doubles">Rating</th>
                {knockoutColumn && <th scope="col" className="py-2 px-4 font-normal text-right" title="Chance of reaching the knockout from the group: actual draw (fair draw)">Out of group</th>}
                <th scope="col" className="py-2 px-4 font-normal text-right" title={`Chance of winning the event${single ? "" : ": actual draw (fair draw)"}`}>Wins event</th>
                {single ? (
                  <th scope="col" className="py-2 px-4 font-normal text-right" title="Expected match wins">Wins <span className="whitespace-nowrap">of {max}</span></th>
                ) : placement ? (
                  <th scope="col" className="py-2 px-4 font-normal text-right" title="Expected final place: actual draw (fair draw)">Placement <span className="whitespace-nowrap">of {event.entries.length}</span></th>
                ) : (
                  <th scope="col" className="py-2 px-4 font-normal text-right" title="Rounds expected: actual draw (fair draw)">Rounds {max ? <span className="whitespace-nowrap">of {max}</span> : null}</th>
                )}
                {!single && <th scope="col" className="py-2 px-4 font-normal">Luck</th>}
                {played && <th scope="col" className="py-2 px-4 font-normal text-right">Result</th>}
              </tr>
            </thead>
            <tbody>
              {tableRows(event, order).map((row, i) =>
                "header" in row ? (
                  <tr key={`h${i}`} className="bg-gray-50 border-b border-gray-200">
                    <th scope="colgroup" colSpan={columns} className="py-2 px-4 text-left font-semibold">
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
      </div>
    </section>
  );
}

const RANK_LABELS: Record<number, string> = { 1: "Won the group", 2: "2nd in the group", 3: "3rd in the group", 4: "4th in the group" };
const Badge = ({ children, tone }: { children: ReactNode; tone: "green" | "red" | "gray" }) => (
  <span className={`inline-block mt-1 mr-1 text-xs px-1.5 py-0.5 border rounded ${tone === "green" ? "border-green-700 text-green-700" : tone === "red" ? "border-red-700 text-red-700" : "border-gray-500 text-gray-700"}`}>
    {children}
  </span>
);

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

  return (
    <tr className="border-b border-gray-100 last:border-0 align-top">
      {columns.numbered && <td className="py-2 pl-4 pr-0 text-right tabular-nums font-semibold">{standing}</td>}
      <td className="py-2 px-4">
        <EntryNames e={e} clubs={clubs} />
        {e.withdrew && <Badge tone="red">Withdrew</Badge>}
        {order === "group" && played && rank && marked.includes(rank) && <Badge tone={rank === 1 ? "green" : "gray"}>{RANK_LABELS[rank] ?? `${rank}. in the group`}</Badge>}
      </td>
      {columns.groupColumn && <td className="py-2 px-4 text-right tabular-nums">{e.group ?? "–"}</td>}
      <td className="py-2 px-4 text-right tabular-nums">{e.rating}</td>
      {columns.knockoutColumn && (
        <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
          {pct(ex.knockout)} <span className="block text-sm text-gray-500">({pct(fx.knockout)})</span>
        </td>
      )}
      <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
        {pct(ex.win)}
        {!single && <span className="block text-sm text-gray-500">({pct(fx.win)})</span>}
      </td>
      {single ? (
        <td className="py-2 px-4 text-right tabular-nums">{ex.wins.toFixed(2)}</td>
      ) : placement ? (
        <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
          {ex.place!.toFixed(2)} <span className="block text-sm text-gray-500">({fx.place!.toFixed(2)})</span>
        </td>
      ) : (
        <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
          {ex.progress.toFixed(2)} <span className="block text-sm text-gray-500">({fx.progress.toFixed(2)})</span>
        </td>
      )}
      {!single && (
        <td className="py-2 px-4 min-w-40">
          <span className={`tabular-nums font-semibold ${luck >= 0 ? "text-green-700" : "text-red-700"}`} title={withdrawalLuck ? `Draw ${signed(e.luck!.draw!)}, withdrawals ${signed(e.luck!.withdrawals!)}` : undefined}>
            {signed(luck)}
            {withdrawalLuck && <span className="text-gray-500">*</span>}
          </span>
          {/* Diverging bar from the middle: right for a lucky draw, left for an unlucky one */}
          <span className="mt-1 flex h-2" aria-hidden="true">
            <span className="w-1/2 flex justify-end">{luck < 0 && <span className="h-2 rounded-l bg-red-600" style={{ width: `${((Math.abs(luck) / maxLuck) * 100).toFixed(1)}%` }} />}</span>
            <span className="w-px bg-gray-400" />
            <span className="w-1/2">{luck > 0 && <span className="block h-2 rounded-r bg-green-600" style={{ width: `${((luck / maxLuck) * 100).toFixed(1)}%` }} />}</span>
          </span>
        </td>
      )}
      {played && r && (
        <td className="py-2 px-4 text-right tabular-nums whitespace-nowrap">
          {single ? (
            <>
              <span className={r.win ? "font-semibold" : ""}>{r.win ? "Won" : `${Math.round(r.wins)} ${Math.round(r.wins) === 1 ? "win" : "wins"}`}</span>
              <span className={`block text-sm ${r.wins >= ex.wins ? "text-green-700" : "text-red-700"}`}>{signed(r.wins - ex.wins, 1)} wins</span>
            </>
          ) : placement ? (
            <>
              <span className={r.place === 1 ? "font-semibold" : ""}>{place(r.place!)}</span>
              <span className={`block text-sm ${ex.place! - r.place! >= 0 ? "text-green-700" : "text-red-700"}`}>{signed(ex.place! - r.place!, 1)} places</span>
            </>
          ) : (
            <>
              <span className={r.win ? "font-semibold" : ""}>{Math.round(r.progress) === 0 ? (event.groups.length ? "group" : "first match") : (short[Math.round(r.progress) - 1] ?? Math.round(r.progress))}</span>
              <span className={`block text-sm ${r.progress >= ex.progress ? "text-green-700" : "text-red-700"}`}>{signed(r.progress - ex.progress, 1)} rounds</span>
            </>
          )}
        </td>
      )}
    </tr>
  );
}
