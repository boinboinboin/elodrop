// The season's players (pipeline/eliteserien-forecast.mjs): matches won against the wins expected from their ratings
// right before each match, the 10 most above and below (players with at least 3 matches, or fewer early in the
// season), and the biggest upsets: the matches won with the smallest chance, each a link to its tie.
import Team from "@/components/clubs/Team";
import Card from "@/components/ui/Card";
import Link from "@/components/ui/Link";
import { ROW } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast, Pool } from "@/types";
import { playerHref, teamMatchHref } from "@/utils/hrefs";

const POOLS: Record<string, Pool> = { MensSingles: "men", WomensSingles: "women", MensDoubles: "mensDoubles", WomensDoubles: "womensDoubles", MixedDoubles: "mixedDoubles" };

export default async function SeasonPlayers({ forecast, clubs }: { forecast: EliteserienForecast; clubs: Record<string, ClubEntry> }) {
  const { t, num, signed, chance, date, poolCodes } = await getI18n();
  // At least 3 matches, or as many as the most played so far
  const min = Math.min(3, Math.max(0, ...forecast.players.map((p) => p.games)));
  const regulars = forecast.players.filter((p) => p.games >= min);
  const lists = [
    { key: "above" as const, list: regulars.filter((p) => p.diff > 0).slice(0, 10) },
    { key: "below" as const, list: [...regulars].reverse().filter((p) => p.diff < 0).slice(0, 10) },
  ];
  const names = (list: { id: number; name: string }[], pool: Pool) =>
    list.map((p, i) => (
      <span key={p.id}>
        {i > 0 && " / "}
        <Link href={playerHref(p.id, pool)} className="hover:text-blue-600">{p.name}</Link>
      </span>
    ));
  return (
    <>
      <p className="text-gray-700 mb-4 max-w-3xl">{t("eliteserien.players.intro", { min })}</p>
      <div className="grid gap-6 lg:grid-cols-2">
        {lists.map(({ key, list }) => (
          <Card key={key}>
            <h3 className="text-xl mb-4">{t(`eliteserien.players.${key}`)}</h3>
            <table className="w-full text-left">
              <thead className="text-sm text-gray-600 border-b border-gray-200">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-normal">{t("eliteserien.review.players.player")}</th>
                  <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.review.players.won")}</th>
                  <th scope="col" className="py-2 pr-4 font-normal text-right">{t("eliteserien.review.players.expected")}</th>
                  <th scope="col" className="py-2 font-normal text-right">{t("eliteserien.review.players.difference")}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id} className={ROW}>
                    <td className="py-2 pr-4">
                      <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link>
                      <span className="block mt-0.5 text-sm text-gray-600"><Team name={p.team} clubs={clubs} size={4} /></span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">{t("eliteserien.review.players.wonOf", { won: p.won, games: p.games })}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{num(p.expected, 1)}</td>
                    <td className="py-2 text-right tabular-nums font-semibold">{signed(p.diff, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
      {forecast.upsets.length > 0 && (
        <Card className="mt-6">
          <h3 className="text-xl mb-1">{t("eliteserien.players.upsets")}</h3>
          <p className="text-sm text-gray-600 mb-4">{t("eliteserien.players.upsetsIntro")}</p>
          <ul>
            {forecast.upsets.map((u) => {
              const pool = POOLS[u.discipline] ?? "men";
              return (
                <li key={`${u.matchId}-${u.game}`} className={`${ROW} py-2 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-baseline`}>
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-gray-600 mr-2">{poolCodes[pool]}</span>
                    {names(u.winners, pool)} <span className="text-gray-500">{t("eliteserien.players.against")}</span> {names(u.losers, pool)}
                    <span className="block text-sm text-gray-600">
                      <Link href={teamMatchHref(u.matchId)} className="hover:text-blue-600">{u.team} – {u.opponent}</Link> · {date(u.day, "dayMonth")} · <span className="tabular-nums">{u.score.replaceAll("/", "–").replaceAll(",", ", ")}</span>
                    </span>
                  </span>
                  <span className="tabular-nums font-semibold">{t("eliteserien.players.upsetChance", { chance: chance(u.chance) })}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </>
  );
}
