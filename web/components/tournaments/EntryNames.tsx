// An entry's players with their club logos and ratings; ≈ marks a rating estimated for someone
// without one in this discipline. With `ratingBelow`, phones show each rating on its own line under
// the name and club (narrow boxes), wider screens beside the name. `changes`: each player's rating
// gained or lost (in the tournament's week), shown after their rating.
import Link from "next/link";
import { t } from "@/messages/i18n";
import type { ClubEntry, Entry } from "@/types";
import { signed, toneClass } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";

export default function EntryNames({
  e,
  clubs,
  ratingBelow = false,
  changes,
}: {
  e: Pick<Entry, "players">;
  clubs: Record<string, ClubEntry>;
  ratingBelow?: boolean;
  changes?: (number | null)[] | null;
}) {
  return (
    <>
      {e.players.map((p, i) => {
        const logo = p.club ? clubs[p.club]?.logo : null;
        const rating = { text: `${p.estimated ? "≈" : ""}${Math.round(p.rating)}`, title: p.estimated ? t("tournaments.entry.estimated") : undefined };
        const change = changes?.[i];
        const changed = change != null && (
          <span className={`ml-1 ${toneClass(change)}`} title={t("tournaments.result.ratingChangeTitle")}>
            {signed(change, 0, "+")}
          </span>
        );
        return (
          <span key={i}>
            {/* The rating is in the name's text, so a long name that wraps has it after its last word; the logo is
                centred on the first line */}
            <span className="flex gap-1.5">
              {logo && (
                <span className="h-[1lh] flex items-center shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="w-4 h-4 object-contain" />
                </span>
              )}
              <span className="min-w-0">
                {p.id ? <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link> : p.name}
                <span className={`ml-1.5 text-sm text-gray-500 tabular-nums whitespace-nowrap ${ratingBelow ? "max-sm:hidden" : ""}`} title={rating.title}>
                  {rating.text}
                  {changed}
                </span>
              </span>
            </span>
            {p.club && <span className={`block text-sm text-gray-600 ${logo ? "pl-5.5" : ""}`}>{p.club}</span>}
            {ratingBelow && (
              <span className={`sm:hidden block text-sm text-gray-500 tabular-nums ${logo ? "pl-5.5" : ""}`} title={rating.title}>{rating.text}{changed}</span>
            )}
          </span>
        );
      })}
    </>
  );
}
