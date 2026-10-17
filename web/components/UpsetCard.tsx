// One upset: who beat whom with what win chance, each player's rating before the match, the
// rating gained or lost and their club; the score, discipline, event and day.
import Link from "next/link";
import Team from "./Team";
import { date, signed } from "@/lib/format";
import type { ClubEntry, Upset } from "@/lib/types";

export default function UpsetCard({ upset, rank, clubs }: { upset: Upset; rank?: number; clubs: Record<string, ClubEntry> }) {
  const chance = Math.round(upset.winChance * 100);
  return (
    <article className="bg-white p-4 md:p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        {rank && <span className="text-sm text-gray-500">#{rank}</span>}
        <p className="ml-auto text-right">
          <span className="text-3xl font-semibold tabular-nums">{chance < 1 ? "<1" : chance}%</span>
          <span className="block text-sm text-gray-600">chance of winning</span>
        </p>
      </div>
      {[upset.winners, upset.losers].map((side, s) => (
        <div key={s}>
          {s === 1 && <p className="text-sm text-gray-600 mt-2">beat</p>}
          <ul className={s === 0 ? "mt-2 text-lg" : ""}>
            {side.map((p) => (
              <li key={p.id}>
                <Link href={`/players/${p.id}`} className={`${s === 0 ? "font-semibold" : ""} hover:text-blue-600`}>{p.name}</Link>{" "}
                <span className="text-sm text-gray-500 tabular-nums" title="Rating before the match">{p.rating}</span>
                {p.change !== undefined && (
                  <span className={`text-sm font-semibold tabular-nums ${p.change >= 0 ? "text-green-700" : "text-red-700"}`} title={`Rating ${p.change >= 0 ? "gained" : "lost"}`}>
                    {" "}{signed(p.change, 1).replace("±", "+")}
                  </span>
                )}
                {p.club && (
                  <span className="block text-sm text-gray-600">
                    <Team name={p.club} clubs={clubs} size={4} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <p className="mt-2 tabular-nums">{upset.score}</p>
      <p className="mt-auto pt-3 text-sm text-gray-600">
        {upset.poolLabel} · {upset.event} · {date(upset.day)}
        {upset.winners.length === 1 && (
          <>
            {" · "}
            <Link href={`/head-to-head?a=${upset.winners[0].id}&b=${upset.losers[0].id}`} className="underline hover:text-blue-600">head to head</Link>
          </>
        )}
        {upset.winners.length === 2 && upset.losers.length === 2 && (
          <>
            {" · "}
            <Link
              href={`/head-to-head/doubles?a1=${upset.winners[0].id}&a2=${upset.winners[1].id}&b1=${upset.losers[0].id}&b2=${upset.losers[1].id}`}
              className="underline hover:text-blue-600"
            >
              head to head
            </Link>
          </>
        )}
      </p>
    </article>
  );
}
