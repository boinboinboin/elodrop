"use client";

// A squad's players with their points in a round (the captain's twice), in a row of small cards: the member's squad
// (Squad), others' in the tables (Leaderboard) and the team of the round (TeamOfRound); with `compact`, one wrapping
// line of small text, for a league's squads (LeagueView). The points and names come from the players' file (`byId`, its
// last 8 rounds by `index`), or are given (`points`, `names`) for older rounds and players no longer in it.
import type { StonkPlayer } from "@/components/elostonk/useStonk";
import { Star } from "@/components/SVG";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";

/** "Markus Lervik Furuvik" -> "M. Furuvik": the first name's initial and the last name */
const shortName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.length < 2 ? name : `${parts[0][0]}. ${parts.at(-1)}`;
};

export default function SquadLine({
  players,
  captain,
  byId,
  index = -1,
  points,
  names,
  compact = false,
}: {
  players: number[];
  captain: number;
  byId?: Map<number, StonkPlayer>;
  index?: number;
  points?: Map<number, number>;
  names?: Map<number, string>;
  /** One line of small text that wraps, for many squads at once (a league's) */
  compact?: boolean;
}) {
  const { t, signed } = useI18n();
  const pointsOf = (id: number) => (points ? (points.get(id) ?? 0) : index >= 0 ? (byId?.get(id)?.points[index] ?? 0) : 0);
  if (compact) {
    // Flowing text, so it wraps between players, not one to a line; on phones each first name as its initial
    return (
      <p className="text-sm text-gray-700">
        {players.map((id, i) => {
          const pts = pointsOf(id);
          const name = names?.get(id) ?? byId?.get(id)?.name ?? `#${id}`;
          return (
            <span key={id}>
              {i > 0 && <span className="text-gray-400"> · </span>}
              {/* A player and their points wrap together */}
              <span className="whitespace-nowrap">
                {id === captain && <Star filled className="mr-0.5 text-xs" />}
                <span className="sm:hidden">{shortName(name)}</span>
                <span className="hidden sm:inline">{name}</span>{" "}
                <span className={`tabular-nums ${toneClass(pts)}`}>
                  {signed(pts, 0)}
                  {id === captain && <span className="text-gray-600"> ×2</span>}
                </span>
              </span>
              {id === captain && <span className="sr-only">{t("elostonk.squad.captain")}</span>}
            </span>
          );
        })}
      </p>
    );
  }
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-5 gap-2">
      {players.map((id) => {
        const p = byId?.get(id);
        const pts = pointsOf(id);
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
