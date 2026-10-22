// How the draw predictions turned out (pipeline/upcoming.mjs evaluation): played events, the
// favourites who won against the number expected, the winners' average predicted chance and the
// slope of results against draw luck.
import StatCard from "@/components/ui/StatCard";
import { t } from "@/messages/i18n";
import type { Evaluation } from "@/types";
import { num } from "@/utils/format";

export function luckFit(ev: Evaluation) {
  const r = ev.luck.rounds;
  return {
    slope: r.xx > 0 ? r.xy / r.xx : null,
    correlation: r.xx > 0 && r.yy > 0 ? r.xy / Math.sqrt(r.xx * r.yy) : null,
    n: r.n,
  };
}

const Of = ({ children }: { children: string }) => <span className="text-base font-normal text-gray-500">{children}</span>;

export default function PredictionStats({ ev, totalEvents }: { ev: Evaluation; totalEvents?: number }) {
  const { slope, n } = luckFit(ev);
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <StatCard label={t("tournaments.predictions.eventsPlayed")}>
        {num(ev.events)}
        {totalEvents !== undefined && <Of>{` ${t("tournaments.predictions.ofTotal", { total: totalEvents })}`}</Of>}
      </StatCard>
      <StatCard label={t("tournaments.predictions.favouritesWon")} detail={t("tournaments.predictions.expected", { count: ev.favouritesExpected.toFixed(1) })}>
        {ev.favouritesWon} <Of>{t("tournaments.predictions.ofTotal", { total: ev.winners })}</Of>
      </StatCard>
      <StatCard label={t("tournaments.predictions.winnersChance")} detail={t("tournaments.predictions.onAverage")}>
        {ev.winners ? Math.round((ev.winnerChance / ev.winners) * 100) : 0}%
      </StatCard>
      {slope !== null && (
        <StatCard label={t("tournaments.predictions.luckShowed")} title={t("tournaments.predictions.luckShowedTitle")} detail={t("tournaments.predictions.overEntries", { count: num(n) })}>
          {slope.toFixed(2)}×
        </StatCard>
      )}
    </dl>
  );
}
