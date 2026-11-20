// An entry's players with their club logos and ratings; ≈ marks a rating estimated for someone
// without one in this discipline. With `ratingBelow`, phones show each rating on its own line under
// the name and club (narrow boxes), wider screens beside the name. `changes`: each player's rating
// gained or lost (in the tournament's week), shown after their rating. `pool`: the event's discipline, which the
// players' pages open on.
import LogoImage from "@/components/clubs/LogoImage";
import Link from "@/components/ui/Link";
import { getI18n } from "@/messages/server";
import type { ClubEntry, Entry, Pool } from "@/types";
import { toneClass } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";

export default async function EntryNames({
  e,
  clubs,
  ratingBelow = false,
  changes,
  pool,
}: {
  e: Pick<Entry, "players">;
  clubs: Record<string, ClubEntry>;
  ratingBelow?: boolean;
  changes?: (number | null)[] | null;
  pool?: Pool;
}) {
  const { signed, t } = await getI18n();
  return (
    <>
      {e.players.map((p, i) => {
        const club = p.club ? clubs[p.club] : undefined;
        const rating = { text: `${p.estimated ? "≈" : ""}${Math.round(p.rating)}`, title: p.estimated ? t("tournaments.entry.estimated") : undefined };
        const change = changes?.[i];
        const changed = change != null && (
          <span className={`ml-1 ${toneClass(change)}`} title={t("tournaments.result.ratingChangeTitle")}>
            {signed(change, 0)}
          </span>
        );
        return (
          <span key={i}>
            {/* The rating is in the name's text, so a long name that wraps has it after its last word; the logo is
                centred on the first line */}
            <span className="flex gap-1.5">
              {club?.logo && (
                <span className="h-[1lh] flex items-center shrink-0">
                  <LogoImage src={club.logo} size={4} invert={club.logoInvert} lazy className="w-4 h-4" />
                </span>
              )}
              <span className="min-w-0">
                {p.id ? <Link href={playerHref(p.id, pool)} className="link hover:text-blue-600">{p.name}</Link> : p.name}
                <span className={`ml-1.5 text-sm text-gray-500 tabular-nums whitespace-nowrap ${ratingBelow ? "max-sm:hidden" : ""}`} title={rating.title}>
                  {rating.text}
                  {changed}
                </span>
              </span>
            </span>
            {p.club && <span className={`block text-sm text-gray-600 ${club?.logo ? "pl-5.5" : ""}`}>{p.club}</span>}
            {ratingBelow && (
              <span className={`sm:hidden block text-sm text-gray-500 tabular-nums ${club?.logo ? "pl-5.5" : ""}`} title={rating.title}>{rating.text}{changed}</span>
            )}
          </span>
        );
      })}
    </>
  );
}
