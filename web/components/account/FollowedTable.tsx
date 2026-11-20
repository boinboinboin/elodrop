"use client";

// The followed players as a table, on the front page's Following card and the account page: a row a player, the user's
// own first (marked "You"), and three columns, singles, doubles and mixed (men's and women's in one, as a player has
// only one of each), each with the rating and its change since last week, linking to that discipline on their page.
// Wider than a phone with the account page's unfollow crosses: it scrolls in its own box, its cells on one line.
import type { PlayerSummary } from "@/app/api/players/[id]/summary/route";
import UnfollowButton from "@/components/account/UnfollowButton";
import { WeekChange } from "@/components/rankings/RankMovement";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { ROW } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { Pool } from "@/types";
import { playerHref } from "@/utils/hrefs";

const COLUMNS = [
  { key: "singles", pools: ["men", "women"] },
  { key: "doubles", pools: ["mensDoubles", "womensDoubles"] },
  { key: "mixed", pools: ["mixedDoubles"] },
] as const satisfies { key: string; pools: Pool[] }[];

export default function FollowedTable({ players, me, unfollow = false }: { players: PlayerSummary[]; me: PlayerSummary | null; unfollow?: boolean }) {
  const { t, num, pools: poolNames } = useI18n();
  const rows = [...(me ? [{ player: me, you: true }] : []), ...players.map((player) => ({ player, you: false }))];
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-sm text-gray-600 border-b border-gray-200">
            <th scope="col" className="py-1 pr-3 font-normal">{t("account.following.columns.player")}</th>
            {COLUMNS.map((c) => (
              <th key={c.key} scope="col" className="py-1 px-2 font-normal text-right whitespace-nowrap">{t(`account.following.columns.${c.key}`)}</th>
            ))}
            {unfollow && <th scope="col"><span className="sr-only">{t("account.following.columns.unfollow")}</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, you }) => (
            <tr key={player.id} className={`${ROW} align-top`}>
              <th scope="row" className="py-2 pr-3 font-normal">
                <Link href={playerHref(player.id)} className="link font-semibold hover:text-blue-600 whitespace-nowrap">{player.name}</Link>
                {you && <Badge className="ml-2 align-middle">{t("account.me.you")}</Badge>}
                {player.club && <span className="block text-sm text-gray-600 whitespace-nowrap">{player.club}</span>}
              </th>
              {COLUMNS.map((c) => {
                const entry = player.pools.find((p) => (c.pools as readonly Pool[]).includes(p.pool));
                return (
                  <td key={c.key} className="py-2 px-2 text-right whitespace-nowrap">
                    {entry ? (
                      <Link href={playerHref(player.id, entry.pool)} title={`${poolNames[entry.pool]}${entry.rank ? ` · #${num(entry.rank)}` : ""}`} className="link hover:text-blue-600">
                        <span className="text-lg font-semibold tabular-nums">{num(entry.rating)}</span>
                        <span className="block">
                          <WeekChange change={entry.change} />
                        </span>
                      </Link>
                    ) : (
                      <span className="text-gray-400">–</span>
                    )}
                  </td>
                );
              })}
              {unfollow && (
                <td className="py-1 pl-1 text-right">{!you && <UnfollowButton kind="player" target={player.id} name={player.name} />}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
