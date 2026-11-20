"use client";

// A squad's players with their points in a round (the captain's twice), in a row of small cards: the member's squad
// (Squad), others' in the tables (Leaderboard) and the team of the round (TeamOfRound). The points and names come from
// the players' file (`byId`, its last 8 rounds by `index`), or are given (`points`, `names`) for older rounds and
// players no longer in it.
import type { StonkPlayer } from "@/components/elostonk/useStonk";
import { Star } from "@/components/SVG";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";

export default function SquadLine({
  players,
  captain,
  byId,
  index = -1,
  points,
  names,
}: {
  players: number[];
  captain: number;
  byId?: Map<number, StonkPlayer>;
  index?: number;
  points?: Map<number, number>;
  names?: Map<number, string>;
}) {
  const { t, signed } = useI18n();
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {players.map((id) => {
        const p = byId?.get(id);
        const pts = points ? (points.get(id) ?? 0) : index >= 0 ? (p?.points[index] ?? 0) : 0;
        return (
          <li key={id} className="bg-white px-3 py-2 min-w-0">
            <span className="block font-semibold truncate">
              {id === captain && <Star filled className="mr-1 text-sm" />}
              {names?.get(id) ?? p?.name ?? `#${id}`}
            </span>
            <span className={`text-sm tabular-nums ${toneClass(pts)}`}>
              {signed(pts, 1)}
              {id === captain && <span className="text-gray-600"> ×2</span>}
            </span>
            {id === captain && <span className="sr-only">{t("elostonk.squad.captain")}</span>}
          </li>
        );
      })}
    </ul>
  );
}
