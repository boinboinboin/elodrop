// An entry's players with their club logos and ratings; ≈ marks a rating estimated for someone
// without one in this discipline
import Link from "next/link";
import { t } from "@/messages/i18n";
import type { ClubEntry, Entry } from "@/types";
import { playerHref } from "@/utils/hrefs";

export default function EntryNames({ e, clubs }: { e: Pick<Entry, "players">; clubs: Record<string, ClubEntry> }) {
  return (
    <>
      {e.players.map((p, i) => {
        const logo = p.club ? clubs[p.club]?.logo : null;
        return (
          <span key={i}>
            <span className="flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logo && <img src={logo} alt="" className="w-4 h-4 object-contain shrink-0" />}
              {p.id ? <Link href={playerHref(p.id)} className="hover:text-blue-600">{p.name}</Link> : p.name}
              <span className="text-sm text-gray-500 tabular-nums" title={p.estimated ? t("tournaments.entry.estimated") : undefined}>
                {p.estimated ? "≈" : ""}{Math.round(p.rating)}
              </span>
            </span>
            {p.club && <span className={`block text-sm text-gray-600 ${logo ? "pl-5.5" : ""}`}>{p.club}</span>}
          </span>
        );
      })}
    </>
  );
}
