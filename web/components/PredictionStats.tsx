// How the draw predictions turned out (pipeline/upcoming.mjs evaluation): played events, the
// favourites who won against the number expected, the winners' average predicted chance and the
// slope of results against draw luck.
import { num } from "@/lib/format";
import type { Evaluation } from "@/lib/types";

export function luckFit(ev: Evaluation) {
  const r = ev.luck.rounds;
  return {
    slope: r.xx > 0 ? r.xy / r.xx : null,
    correlation: r.xx > 0 && r.yy > 0 ? r.xy / Math.sqrt(r.xx * r.yy) : null,
    n: r.n,
  };
}

export default function PredictionStats({ ev, totalEvents }: { ev: Evaluation; totalEvents?: number }) {
  const { slope, n } = luckFit(ev);
  return (
    <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
      <div className="bg-white p-4">
        <dt className="text-sm text-gray-600">Events played</dt>
        <dd className="text-3xl font-semibold tabular-nums">
          {num(ev.events)}
          {totalEvents !== undefined && <span className="text-base font-normal text-gray-500"> of {totalEvents}</span>}
        </dd>
      </div>
      <div className="bg-white p-4">
        <dt className="text-sm text-gray-600">Favourites who won</dt>
        <dd className="text-3xl font-semibold tabular-nums">
          {ev.favouritesWon} <span className="text-base font-normal text-gray-500">of {ev.winners}</span>
        </dd>
        <dd className="text-sm text-gray-600">{ev.favouritesExpected.toFixed(1)} expected</dd>
      </div>
      <div className="bg-white p-4">
        <dt className="text-sm text-gray-600">Winners&apos; predicted chance</dt>
        <dd className="text-3xl font-semibold tabular-nums">{ev.winners ? Math.round((ev.winnerChance / ev.winners) * 100) : 0}%</dd>
        <dd className="text-sm text-gray-600">on average</dd>
      </div>
      {slope !== null && (
        <div className="bg-white p-4">
          <dt className="text-sm text-gray-600" title="Results minus the fair-draw expectation against luck, regression slope">Luck showed in the results</dt>
          <dd className="text-3xl font-semibold tabular-nums">{slope.toFixed(2)}×</dd>
          <dd className="text-sm text-gray-600">over {num(n)} entries (1 = as predicted)</dd>
        </div>
      )}
    </dl>
  );
}
