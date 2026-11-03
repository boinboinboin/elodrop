// One team match in a list, the whole box a link to its page: the teams (the winner bold), the day and
// its upsets, and the score. Used by the week view and the division pages.
import Team from "@/components/clubs/Team";
import { ArrowRight } from "@/components/SVG";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { getI18n } from "@/messages/server";
import type { ClubEntry, TeamMatchSummary } from "@/types";
import { teamMatchHref } from "@/utils/hrefs";

export default async function TieRow({ tie, clubs }: { tie: TeamMatchSummary; clubs: Record<string, ClubEntry> }) {
  const { date, plural, t } = await getI18n();
  return (
    <li>
      <Link
        href={teamMatchHref(tie.matchId)}
        className="group bg-white p-3 sm:px-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 transition-colors duration-200 hover:bg-gray-50"
      >
        <span className="min-w-0">
          <Team name={tie.home} club={tie.homeClub} clubs={clubs} size={5} linked={false} className={tie.winner === 1 ? "font-semibold" : ""} />
          <span className="text-gray-500 mx-1">–</span>
          <Team name={tie.away} club={tie.awayClub} clubs={clubs} size={5} linked={false} className={tie.winner === 2 ? "font-semibold" : ""} />
          <span className="block text-sm text-gray-600">
            {date(tie.day, "dayMonth")}
            {tie.upsets > 0 && <> · {plural("teamMatches.matchUpsets", tie.upsets)}</>}
          </span>
          {/* On phones the upset label goes under the teams, so the score keeps its place on the right */}
          {tie.upset && <span className="sm:hidden block mt-1" title={t("teamMatches.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span>}
        </span>
        <span className="flex items-center gap-3">
          {tie.upset && <span className="hidden sm:inline" title={t("teamMatches.upsetTitle")}><Badge>{t("teamMatches.upset")}</Badge></span>}
          <span className="inline-flex items-center gap-1 text-xl font-semibold tabular-nums group-hover:text-blue-600">
            {tie.score[0]}–{tie.score[1]} <ArrowRight />
          </span>
        </span>
      </Link>
    </li>
  );
}
