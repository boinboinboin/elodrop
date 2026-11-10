"use client";

// Chances over time (pipeline/eliteserien-forecast.mjs's snapshots: before the season, then after each tie played):
// one team's chances of the title, the top 4, 7th and 8th, from 0% to 100%, in the outcomes' colours (zones.ts), on
// the site's line chart with its detail box, which names the tie ("Day 1 · Moss – Haugerud 3–5"). Along the bottom
// a dot for each tie, and the days played, numbered ("Day 1", "Day 2") from the first, at each day's first tie. A
// row of buttons picks the team (the first in the table to begin with); an outcome the team has never had a chance
// of (under 0.5%) is left out.
import { useState } from "react";
import LineChart from "@/components/charts/LineChart";
import Swatch from "@/components/ui/Swatch";
import { toggleClass } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { EliteserienSnapshot } from "@/types";
import { ZONES, zoneColor } from "./zones";

export default function TrendChart({ history, teams }: { history: EliteserienSnapshot[]; teams: string[] }) {
  const { t } = useI18n();
  const [team, setTeam] = useState(teams[0]);
  // Each day's number, from the first day played
  const days = [...new Set(history.flatMap((h) => (h.day ? [h.day] : [])))];
  const dayOf = (h: EliteserienSnapshot) => days.indexOf(h.day!) + 1;
  const labels = history.map((h, i) => (!h.day ? t("eliteserien.trend.preseason") : history[i - 1]?.day !== h.day ? t("eliteserien.trend.day", { day: dayOf(h) }) : ""));
  const tips = history.map((h) =>
    !h.tie ? t("eliteserien.trend.before") : t("eliteserien.trend.tip", { day: dayOf(h), home: h.tie.home, away: h.tie.away, score: `${h.tie.score[0]}–${h.tie.score[1]}` }),
  );
  const series = ZONES.map((zone) => ({ zone, values: history.map((h) => h.teams[team]?.[zone] ?? 0) }))
    .filter((s, i, all) => Math.max(...s.values) >= 0.005 || (i === 1 && all.every((x) => Math.max(...x.values) < 0.005)))
    .map((s) => ({ label: t(`eliteserien.trend.${s.zone}`), from: "2000-01-03", values: s.values, color: zoneColor(s.zone) }));
  return (
    <div className="bg-white p-4 md:p-6">
      <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label={t("eliteserien.trend.team")}>
        {teams.map((name) => (
          <button key={name} type="button" onClick={() => setTeam(name)} aria-pressed={name === team} className={`${toggleClass(name === team, "sm")} cursor-pointer`}>
            {name}
          </button>
        ))}
      </div>
      {/* The chart gives several lines a legend; a single one gets it here, as its colour says which outcome it is */}
      {series.length === 1 && (
        <p className="flex items-center gap-1.5 mb-3 text-sm text-gray-700">
          <Swatch color={series[0].color} />
          {series[0].label}
        </p>
      )}
      <LineChart key={team} series={series} label={t("eliteserien.trend.label", { team })} percent labels={labels} tips={tips} dots />
    </div>
  );
}
