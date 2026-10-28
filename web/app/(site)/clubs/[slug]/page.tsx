// A club (CMS entry) with its strength over time and, per discipline, its strength history and
// ranked players.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import LineChart, { type ChartSeries } from "@/components/charts/LineChart";
import PoolName from "@/components/format/PoolName";
import SeasonLabel from "@/components/format/SeasonLabel";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { WeekChange } from "@/components/rankings/RankMovement";
import JsonLd from "@/components/seo/JsonLd";
import Card from "@/components/ui/Card";
import Disclosure from "@/components/ui/Disclosure";
import Loading from "@/components/ui/Loading";
import Section from "@/components/ui/Section";
import Tabs from "@/components/ui/Tabs";
import { ROW, TEXT_LINK } from "@/components/ui/styles";
import { getClubHistory, getClubPlayers, getClubsFile } from "@/data/clubs";
import { getClubBySlug, getClubEntries } from "@/data/sanity";
import { plural, t } from "@/messages/i18n";
import type { ClubEntry, ClubHistory, ClubHistoryPool, ClubsFile, Pool } from "@/types";
import { clubRule } from "@/utils/clubs";
import { logoSrc } from "@/utils/clubs";
import { EMPTY, num, seasonLabel, signed } from "@/utils/format";
import { clubHref, playerHref } from "@/utils/hrefs";
import { absoluteUrl, pageMetadata } from "@/utils/metadata";
import { POOLS, POOL_KEYS } from "@/utils/pools";
import { strongestClubsHref } from "@/utils/rankings";

// A few clubs are prerendered at build; the rest are rendered on their first visit and then served
// from the cache until the data or the club content changes (ISR).
export async function generateStaticParams() {
  const clubs = (await getClubEntries()).slice(0, 5);
  return clubs.length ? clubs.map((c) => ({ slug: c.slug })) : [{ slug: "_" }];
}

export async function generateMetadata({ params }: PageProps<"/clubs/[slug]">): Promise<Metadata> {
  const club = await getClubBySlug(decodeURIComponent((await params).slug));
  if (!club) return { title: t("clubs.metadata.club") };
  const details = [club.fullName !== club.title ? club.fullName : null, club.region].filter(Boolean).join(", ");
  return pageMetadata({ title: club.title, description: t("seo.descriptions.club", { name: club.title, details: details ? ` (${details})` : "" }), path: clubHref(club.slug), image: { url: `${clubHref(club.slug)}/preview.png`, alt: t("seo.imageAlt.club") } });
}

export default function ClubPage(props: PageProps<"/clubs/[slug]">) {
  return (
    <Suspense fallback={<Loading label={t("clubs.loading")} section />}>
      <Content params={props.params} />
    </Suspense>
  );
}

async function Content({ params }: Pick<PageProps<"/clubs/[slug]">, "params">) {
  const entry = await getClubBySlug(decodeURIComponent((await params).slug));
  if (!entry) notFound();
  const [{ pools: history, players: names }, file] = await Promise.all([entry.nbfClubId ? getClubHistory(entry.nbfClubId) : Promise.resolve<ClubHistory>({ players: {}, pools: {} }), getClubsFile()]);
  const combinedStanding = file?.clubs.combined.find((c) => c.club === entry.title);
  const players = await Promise.all(POOL_KEYS.map((pool) => getClubPlayers(entry.title, pool)));

  return (
    <>
      <Section>
        <Breadcrumbs trail={[{ label: t("clubs.clubs"), href: "/clubs" }, { label: entry.title }]} />
        <JsonLd
          data={{
            "@type": "SportsOrganization",
            name: entry.title,
            ...(entry.fullName && entry.fullName !== entry.title ? { alternateName: entry.fullName } : {}),
            sport: "Badminton",
            url: absoluteUrl(clubHref(entry.slug)),
            ...(entry.logo ? { logo: entry.logo.startsWith("/") ? absoluteUrl(entry.logo) : entry.logo } : {}),
            ...(entry.website ? { sameAs: [entry.website] } : {}),
            address: { "@type": "PostalAddress", addressCountry: "NO", ...(entry.region ? { addressRegion: entry.region } : {}) },
          }}
        />
        <div className="flex items-center gap-6 mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {entry.logo && <img src={logoSrc(entry.logo, 20)} alt="" className="w-20 h-20 object-contain shrink-0" />}
          <div>
            <h1 className="h1">{entry.title}</h1>
            {entry.fullName && entry.fullName !== entry.title && <p className="text-2xl text-gray-700">{entry.fullName}</p>}
          </div>
        </div>
        <p className="text-gray-600 mt-4">
          {entry.region}
          {combinedStanding && (
            <>
              {" · "}
              <Link href="/clubs" className={TEXT_LINK}>{t("clubs.club.combinedRank", { rank: combinedStanding.rank })}</Link>
            </>
          )}
          {entry.website && (
            <>
              {" · "}
              <a href={entry.website} className={TEXT_LINK} rel="noopener">{entry.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
            </>
          )}
        </p>
      </Section>

      <OverTime history={history} />

      {/* One tab per discipline, as on the player page; the selected tab is kept in the URL (?discipline=mixedDoubles) */}
      <Section>
        <Tabs
          label={t("clubs.club.disciplines")}
          param="discipline"
          sticky
          tabs={POOL_KEYS.map((pool, i) => ({
            id: pool,
            label: <PoolName pool={pool} />,
            content: <Discipline pool={pool} entry={entry} history={history[pool] ?? null} names={names} file={file} players={players[i]} />,
          }))}
        />
      </Section>
    </>
  );
}

/** All disciplines together and the combined score, over time, with a table by season */
function OverTime({ history }: { history: Partial<Record<Pool | "combined", ClubHistoryPool>> }) {
  const series: (ChartSeries & { pool: Pool })[] = [];
  for (const pool of POOL_KEYS) {
    const h = history[pool];
    if (h && h.strength.length > 1) series.push({ pool, label: POOLS[pool], from: h.from, values: h.strength, ranks: h.rank, counts: h.clubs, slot: POOL_KEYS.indexOf(pool) });
  }
  const combined = history.combined ?? null;
  if (series.length < 2 && !combined) return null;
  const columns: { key: Pool | "combined"; label: string }[] = [...series.map((s) => ({ key: s.pool, label: s.label })), ...(combined ? [{ key: "combined" as const, label: t("clubs.club.combined") }] : [])];
  const seasons = new Map<number, Partial<Record<Pool | "combined", number | null>>>();
  for (const c of columns) for (const row of history[c.key]?.seasons ?? []) seasons.set(row.season, { ...seasons.get(row.season), [c.key]: row.strength });

  return (
    <Section title={t("clubs.club.overTime")} titleClassName="text-3xl mb-6">
      {series.length > 1 && (
        <Card title={t("clubs.club.allDisciplines")} subtitle={t("clubs.club.allDisciplinesText")} className="mb-6">
          <LineChart series={series} label={t("clubs.club.strength")} rankOf={t("clubs.club.clubs")} />
        </Card>
      )}
      {combined && combined.strength.length > 1 && (
        <Card title={t("clubs.club.combined")} subtitle={t("clubs.club.combinedText")} className="mb-6">
          <LineChart series={[{ label: t("clubs.club.combinedScore"), from: combined.from, values: combined.strength, ranks: combined.rank, counts: combined.clubs }]} label={t("clubs.club.combinedScore")} rankOf={t("clubs.club.clubs")} decimals={2} signed className="relative h-72" />
        </Card>
      )}
      {/* Table view of both charts: values at the end of each season (July to June) */}
      <Disclosure summary={t("clubs.club.strengthBySeason")}>
        <div className="overflow-x-auto">
          <table className="mt-2 text-left">
            <thead className="text-sm text-gray-600">
              <tr>
                <th scope="col" className="py-1 pr-3 sm:pr-6 font-normal">{t("common.table.season")}</th>
                {columns.map((c) => <th key={c.key} scope="col" className="py-1 pr-3 sm:pr-6 font-normal text-right whitespace-nowrap">{c.key === "combined" ? c.label : <PoolName pool={c.key} />}</th>)}
              </tr>
            </thead>
            <tbody className="text-sm sm:text-base">
              {[...seasons].sort(([a], [b]) => a - b).map(([season, row]) => (
                <tr key={season}>
                  <td className="py-1 pr-3 sm:pr-6 whitespace-nowrap"><SeasonLabel season={season} /></td>
                  {columns.map((c) => {
                    const v = row[c.key];
                    return (
                      <td key={c.key} className="py-1 pr-3 sm:pr-6 text-right tabular-nums">
                        {v == null ? <span className="text-gray-400">{EMPTY}</span> : c.key === "combined" ? signed(v, 2, "") : v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-600 mt-2">{t("clubs.club.seasonValues")}</p>
      </Disclosure>
    </Section>
  );
}

function Discipline({ pool, entry, history, names, file, players }: { pool: Pool; entry: ClubEntry; history: ClubHistoryPool | null; names: Record<string, string>; file: ClubsFile | null; players: Awaited<ReturnType<typeof getClubPlayers>> }) {
  const label = POOLS[pool];
  const standing = file?.clubs[pool].find((c) => c.club === entry.title);
  const rule = file?.clubStrength[pool];
  // The players or pairs counted each week, for the graph's detail box (pairs as "A + B"; a pair
  // with one player counts the other at the lowest rating, as the places not filled)
  const notes = history?.top?.map(([week, slots]): [number, string[]] => {
    const lines = slots.map((slot) => [...slot.map((id) => names[id] ?? ""), ...(rule?.pairs && slot.length === 1 ? [t("clubs.club.noPartner")] : [])].join(" + "));
    const unfilled = (rule?.slots ?? 0) - slots.length;
    return [week, unfilled > 0 ? [...lines, plural("clubs.club.unfilled", unfilled)] : lines];
  });
  return (
    <div>
      <h2 className="text-3xl mb-2">{label}</h2>
      {history && history.strength.length > 1 && rule && (
        <Card title={t("clubs.club.strengthHistory")} subtitle={t("clubs.club.strengthHistoryText", { rule: clubRule(rule) })} className="my-6">
          <LineChart series={[{ label: t("clubs.club.clubStrength"), from: history.from, values: history.strength, ranks: history.rank, counts: history.clubs, notes }]} label={t("clubs.club.clubStrength")} rankOf={t("clubs.club.clubs")} className="relative h-72" />
          {/* Table view of the chart: strength and rank at the end of each season, precomputed by rate.mjs */}
          <Disclosure summary={t("clubs.club.strengthBySeason")} className="mt-4">
            <table className="mt-2 text-left">
              <thead className="text-sm text-gray-600">
                <tr>
                  <th scope="col" className="py-1 pr-8 font-normal">{t("common.table.season")}</th>
                  <th scope="col" className="py-1 pr-8 font-normal text-right">{t("clubs.club.strengthAtEnd")}</th>
                  <th scope="col" className="py-1 font-normal">{t("clubs.club.rank")}</th>
                </tr>
              </thead>
              <tbody>
                {(history.seasons ?? []).map((s) => (
                  <tr key={s.season}>
                    <td className="py-1 pr-8">{seasonLabel(s.season)}</td>
                    <td className="py-1 pr-8 text-right tabular-nums">{s.strength}</td>
                    <td className="py-1 tabular-nums">{t("clubs.club.rankOf", { rank: s.rank ?? "", count: s.clubs ?? "" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Disclosure>
        </Card>
      )}
      {players.length === 0 ? (
        <p className="text-gray-600">{t("clubs.club.noPlayers", { club: entry.title, pool: t(`common.poolsInSentence.${pool}`) })}</p>
      ) : (
        <>
          <p className="text-gray-600 mb-6">
            {plural("clubs.club.rankedPlayers", players.length, { count: num(players.length) })}
            {standing && (
              <>
                {" · "}
                <Link href={strongestClubsHref(pool)} className={TEXT_LINK}>{t("clubs.club.strongestRank", { rank: standing.rank })}</Link> {t("clubs.club.strengthValue", { strength: Math.round(standing.strength) })}
              </>
            )}
          </p>
          <div className="bg-white overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b border-gray-200">
                <tr>
                  <th scope="col" className="py-3 px-4 font-normal text-right w-16">{t("common.table.rank")}</th>
                  <th scope="col" className="py-3 px-4 font-normal">{t("common.table.player")}</th>
                  <th scope="col" className="py-3 pl-4 pr-1.5 font-normal text-right">{t("common.table.rating")}</th>
                  <th scope="col" className="py-3 pr-4 font-normal w-14"><span className="sr-only">{t("common.table.changeSinceLastWeek")}</span></th>
                  <th scope="col" className="py-3 px-4 font-normal text-right hidden sm:table-cell">{t("common.table.matches")}</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id} className={`${ROW} hover:bg-gray-50`}>
                    <td className="py-3 px-4 text-right text-gray-600 tabular-nums">{p.rank}</td>
                    <td className="py-3 px-4">
                      <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link>
                      {pool === "mixedDoubles" && <span className="text-sm text-gray-600"> {t(p.gender === "K" ? "clubs.club.woman" : "clubs.club.man")}</span>}
                    </td>
                    <td className="py-3 pl-4 pr-1.5 text-right tabular-nums">{Math.round(p.rating)}</td>
                    <td className="py-3 pr-4 whitespace-nowrap"><WeekChange change={p.ratingChange} /></td>
                    <td className="py-3 px-4 text-right text-gray-700 tabular-nums hidden sm:table-cell">{num(p.matches)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-2">{t(pool === "mixedDoubles" ? "clubs.club.rankNoteMixed" : "clubs.club.rankNote", { pool: t(`common.poolsInSentence.${pool}`) })}</p>
        </>
      )}
    </div>
  );
}
