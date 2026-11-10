// The next day's ties (pipeline/eliteserien-forecast.mjs): each with its time (and stage in the play-offs), the chances of
// a home win, a draw and an away win as one bar, the expected score, and what's at stake for each team: the chance
// (title, top 4, 7th or 8th) that changes most between winning and losing it.
import Team from "@/components/clubs/Team";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import { getI18n } from "@/messages/server";
import type { ClubEntry, EliteserienForecast, EliteserienStage, EliteserienStake } from "@/types";
import Swatch from "@/components/ui/Swatch";
import { outcome } from "./share";
import { zoneColor } from "./zones";

type Next = NonNullable<EliteserienForecast["next"]>;

/** A play-off stage's name: the 5–8 bracket's final and 3rd-place match are for 5th and 7th */
export const stageKey = (stage: EliteserienStage, bracket: string | null): EliteserienStage | "final58" | "third58" =>
  bracket === "5-8" && (stage === "final" || stage === "third") ? (stage === "final" ? "final58" : "third58") : stage;

export default async function NextUp({ next, clubs }: { next: Next; clubs: Record<string, ClubEntry> }) {
  const { t, num, chance, pct } = await getI18n();
  const stake = (team: string, s: EliteserienStake | null) => {
    if (!s) return null;
    const values = { team, outcome: t(`eliteserien.next.outcomes.${s.outcome}`), win: outcome(s.win, chance, pct), loss: outcome(s.loss, chance, pct) };
    return (
      <li key={team} className="flex items-baseline gap-2">
        <Swatch color={zoneColor(s.outcome)} className="w-3 h-1 relative -top-[0.2em]" />
        <span>{s.draw === null ? t("eliteserien.next.stake", values) : t("eliteserien.next.stakeDraw", { ...values, draw: outcome(s.draw, chance, pct) })}</span>
      </li>
    );
  };
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {next.ties.map((tie) => {
        const { odds } = tie;
        return (
          <Card key={tie.matchId}>
            <p className="flex items-center gap-2 text-sm text-gray-600 mb-2 tabular-nums">
              {tie.time.length > 10 && tie.time.slice(11, 16)}
              {tie.stage && <Badge>{t(`eliteserien.stages.${stageKey(tie.stage, tie.bracket)}`)}</Badge>}
            </p>
            <p className="flex flex-wrap items-center gap-x-2 text-lg">
              <Team name={tie.home} clubs={clubs} size={5} />
              <span className="text-gray-500">–</span>
              <Team name={tie.away} clubs={clubs} size={5} />
            </p>
            {/* The chances as one bar: home win, draw, away win */}
            <div className="flex h-2 mt-3 gap-0.5" aria-hidden="true">
              <span className="rounded-l-full" style={{ width: `${odds.win * 100}%`, background: "var(--color-chart-1)" }} />
              {odds.draw > 0 && <span style={{ width: `${odds.draw * 100}%`, background: "var(--color-gray-300)" }} />}
              <span className="rounded-r-full" style={{ width: `${odds.loss * 100}%`, background: "var(--color-chart-2)" }} />
            </div>
            <p className="flex justify-between gap-2 mt-1 text-sm tabular-nums">
              <span>{tie.home} {chance(odds.win)}</span>
              {odds.draw > 0 && <span className="text-gray-600">{t("eliteserien.next.draw")} {chance(odds.draw)}</span>}
              <span className="text-right">{tie.away} {chance(odds.loss)}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">{t("eliteserien.next.expected", { score: `${num(odds.expected, 1)}–${num(8 - odds.expected, 1)}` })}</p>
            {(tie.stakes.home || tie.stakes.away) && (
              <ul className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-700 space-y-1">
                {stake(tie.home, tie.stakes.home)}
                {stake(tie.away, tie.stakes.away)}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
