// A player on a line of their own (the upsets and team matches): their club's logo (if any) and name,
// then their rating before the match, the club and the rating gained or lost, which wrap together onto
// the next line when they don't fit. A player without a page is shown by name only (PlayerName).
import { ClubLogo } from "@/components/clubs/Team";
import { getI18n } from "@/messages/server";
import type { ClubEntry, Pool } from "@/types";
import { toneClass } from "@/utils/format";
import PlayerName from "@/components/players/PlayerName";

interface Props {
  p: { id: number | null; name: string; rating?: number; change?: number; club?: string | null };
  clubs: Record<string, ClubEntry>;
  bold?: boolean;
  /** Show the rating before the match */
  rating?: boolean;
  /** Align to the right (the away side of a team match) */
  right?: boolean;
  /** Grey the name (the side that lost) */
  muted?: boolean;
  /** The match's discipline: the player's page opens on it */
  pool?: Pool | null;
}

export default async function PlayerLine({ p, clubs, bold = false, rating = false, right = false, muted = false, pool }: Props) {
  const { signed, t } = await getI18n();
  const club = p.club ?? null;
  return (
    <span className={`flex flex-wrap items-baseline gap-x-1.5 ${right ? "justify-end text-right" : ""}`} title={club ?? undefined}>
      <span className="inline-flex items-center gap-1 self-center">
        <ClubLogo name={club} clubs={clubs} />
        {/* In a span, so the link stays inline in this flex row: its line on hover under each line of a name that wraps */}
        <span className="min-w-0">
          <PlayerName id={p.id} name={p.name} pool={pool ?? undefined} className={`${bold ? "font-semibold" : ""} ${muted ? "text-gray-600" : ""}`.trim()} linkClassName="link hover:text-blue-600" />
        </span>
      </span>
      <span className="text-sm whitespace-nowrap">
        {rating && p.rating !== undefined && <span className="text-gray-500 tabular-nums mr-1.5" title={t("upsets.card.ratingBefore")}>{p.rating}</span>}
        {club && <span className="text-gray-500">{club}</span>}
        {p.change !== undefined && (
          <span className={`tabular-nums ${club ? "ml-1.5 " : ""}${toneClass(p.change)}`} title={t(p.change >= 0 ? "upsets.ratingGained" : "upsets.ratingLost")}>
            {signed(p.change, 1)}
          </span>
        )}
      </span>
    </span>
  );
}
