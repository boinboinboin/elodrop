// The play-off picture (pipeline/eliteserien-forecast.mjs): for the title (1st to 4th) and for 5th to 8th, the semi-finals
// (1st v 4th, 2nd v 3rd) with each place's most likely teams while the regular season goes on, then the real pairings
// with their chances, then the results; the final and the match for 3rd (5th, 7th) the same. Under each, the teams'
// title (or relegation) chances. The final has the title's colour at its edge, the match for 7th the qualification's
// and relegation's (zones.ts).
import Team from "@/components/clubs/Team";
import Card from "@/components/ui/Card";
import { ROW } from "@/components/ui/styles";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast } from "@/types";
import { stageKey } from "./NextUp";
import { outcome } from "./share";
import { zoneColor } from "./zones";

type Bracket = EliteserienForecast["playoffs"][number];

export default async function Playoffs({ forecast, clubs }: { forecast: EliteserienForecast; clubs: Record<string, ClubEntry> }) {
  const { t, chance, pct } = await getI18n();
  const seedLine = (bracket: Bracket, seed: number) => {
    const s = bracket.seeds.find((x) => x.seed === seed);
    return (
      <span className="block" title={t("eliteserien.playoffs.seedTitle", { place: seed })}>
        <span className="text-gray-600 tabular-nums">{t("eliteserien.playoffs.seed", { place: seed })} </span>
        {s?.teams.map((x, i) => (
          <span key={x.team} className={i === 0 ? "" : "text-gray-600 text-sm"}>
            {i > 0 && " · "}
            {x.team} <span className="tabular-nums text-sm text-gray-600">{outcome(x.chance, chance, pct)}</span>
          </span>
        ))}
      </span>
    );
  };
  const side = (team: string | null, won: boolean) => (team ? <Team name={team} clubs={clubs} size={5} className={won ? "font-semibold" : ""} /> : null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {forecast.playoffs.map((bracket) => {
        const top = bracket.name === "1-4";
        const first = top ? 1 : 5;
        // Its teams' title or relegation chances, most first
        const key = top ? "champion" : "relegated";
        const chances = forecast.table.filter((row) => row[key] > 0).sort((a, b) => b[key] - a[key]);
        const edge = (stage: string) =>
          top && stage === "final" ? zoneColor("champion") : !top && stage === "third" ? `linear-gradient(${zoneColor("qualification")} 50%, ${zoneColor("relegated")} 50%)` : null;
        return (
          <Card key={bracket.name} title={t(top ? "eliteserien.playoffs.title14" : "eliteserien.playoffs.title58")}>
            <ul className="mt-3">
              {bracket.ties.map((tie) => {
                const semi = tie.stage === "semi1" || tie.stage === "semi2";
                const [a, b] = tie.stage === "semi1" ? [first, first + 3] : [first + 1, first + 2];
                return (
                  <li key={tie.stage} className={`${ROW} py-3 relative pl-3`}>
                    {/* The final: the title; the match for 7th: its winner qualifies, its loser is relegated */}
                    {(edge(tie.stage) && <span aria-hidden="true" className="absolute left-0 top-3 bottom-3 w-1 rounded-full" style={{ background: edge(tie.stage)! }} />) || null}
                    <span className="block text-sm text-gray-600 mb-1">
                      {t(`eliteserien.stages.${stageKey(tie.stage, bracket.name)}`)}
                      {!top && tie.stage === "third" && <> · {t("eliteserien.playoffs.seventh")}</>}
                    </span>
                    {tie.home && tie.away ? (
                      <span className="flex flex-wrap items-center justify-between gap-x-4">
                        <span className="flex flex-wrap items-center gap-x-2">
                          {side(tie.home, tie.winner === tie.home)}
                          <span className="text-gray-500">–</span>
                          {side(tie.away, tie.winner === tie.away)}
                        </span>
                        {tie.score ? (
                          <span className="text-lg font-semibold tabular-nums">{tie.score[0]}–{tie.score[1]}</span>
                        ) : (
                          tie.odds && <span className="text-sm text-gray-600 tabular-nums">{t("eliteserien.playoffs.winChance", { chance: chance(tie.odds.win) })}</span>
                        )}
                      </span>
                    ) : semi ? (
                      <>
                        {seedLine(bracket, a)}
                        {seedLine(bracket, b)}
                      </>
                    ) : (
                      <span className="text-gray-600">{t(tie.stage === "final" ? "eliteserien.playoffs.winners" : "eliteserien.playoffs.losers")}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {chances.length > 0 && (
              <p className="text-sm text-gray-700 mt-4">
                <span className="text-gray-600">{t(top ? "eliteserien.playoffs.titleChances" : "eliteserien.playoffs.relegationChances")}: </span>
                {chances.map((row, i) => (
                  <span key={row.team}>
                    {i > 0 && " · "}
                    {row.team} <span className="tabular-nums">{outcome(row[key], chance, pct)}</span>
                  </span>
                ))}
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}
