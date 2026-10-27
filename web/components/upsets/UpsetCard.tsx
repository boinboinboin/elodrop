// One upset: who beat whom with what win chance, each player's rating before the match, the
// rating gained or lost and their club; the score, discipline, event and day.
import Link from "next/link";
import Team from "@/components/clubs/Team";
import { TEXT_LINK } from "@/components/ui/styles";
import { t } from "@/messages/i18n";
import type { ClubEntry, Upset } from "@/types";
import { date, pct, signed, toneClass } from "@/utils/format";
import { doublesHeadToHeadHref, headToHeadHref, playerHref } from "@/utils/hrefs";

export default function UpsetCard({ upset, rank, clubs }: { upset: Upset; rank?: number; clubs: Record<string, ClubEntry> }) {
  const ids = (side: Upset["winners"]) => side.map((p) => p.id);
  return (
    <article className="bg-white p-4 md:p-5 h-full flex flex-col">
      <div className="flex items-baseline justify-between gap-3">
        {rank && <span className="text-sm text-gray-500">{t("common.rankValue", { rank })}</span>}
        <p className="ml-auto text-right">
          <span className="text-3xl font-semibold tabular-nums">{pct(upset.winChance)}</span>
          <span className="block text-sm text-gray-600">{t("upsets.card.chanceOfWinning")}</span>
        </p>
      </div>
      {[upset.winners, upset.losers].map((side, s) => (
        <div key={s}>
          {s === 1 && <p className="text-sm text-gray-600 mt-2">{t("upsets.card.beat")}</p>}
          <ul className={s === 0 ? "mt-2 text-lg" : ""}>
            {side.map((p) => (
              <li key={p.id}>
                <Link href={playerHref(p.id)} className={`${s === 0 ? "font-semibold" : ""} hover:text-blue-600`}>{p.name}</Link>{" "}
                <span className="text-sm text-gray-500 tabular-nums" title={t("upsets.card.ratingBefore")}>{p.rating}</span>
                {p.change !== undefined && (
                  <span className={`text-sm font-semibold tabular-nums ${toneClass(p.change)}`} title={t(p.change >= 0 ? "upsets.ratingGained" : "upsets.ratingLost")}>
                    {" "}{signed(p.change, 1)}
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
            <Link href={headToHeadHref(upset.winners[0].id, upset.losers[0].id)} className={TEXT_LINK}>{t("upsets.card.headToHead")}</Link>
          </>
        )}
        {upset.winners.length === 2 && upset.losers.length === 2 && (
          <>
            {" · "}
            <Link href={doublesHeadToHeadHref(ids(upset.winners), ids(upset.losers))} className={TEXT_LINK}>{t("upsets.card.headToHead")}</Link>
          </>
        )}
      </p>
    </article>
  );
}
