"use client";

// The account page's overview of what the user follows: every followed player in the same table as the front page's
// card (their own player first), each with a cross to stop following, and the followed clubs, likewise.
import FollowedTable from "@/components/account/FollowedTable";
import { PART } from "@/components/account/form";
import UnfollowButton from "@/components/account/UnfollowButton";
import { useFollowedClubs, useFollowedPlayers } from "@/components/account/useFollowed";
import Link from "@/components/ui/Link";
import { useI18n } from "@/messages/client";
import { clubHref } from "@/utils/hrefs";

export default function FollowingSettings() {
  const { t } = useI18n();
  const { players, me } = useFollowedPlayers();
  const clubs = useFollowedClubs();

  return (
    <div id="following" className={`${PART} scroll-mt-(--header-offset)`}>
      <h2 className="text-2xl mb-2">{t("account.following.title")}</h2>
      <p className="text-gray-700 mb-4">{t("account.following.manage")}</p>
      {players === null ? (
        <p className="text-gray-600">{t("common.loading")}</p>
      ) : !players.length && !me ? (
        <p className="text-gray-600">{t("account.following.empty")}</p>
      ) : (
        <FollowedTable players={players} me={me} unfollow />
      )}
      {clubs.length > 0 && (
        <>
          <h3 className="text-xl mt-6 mb-2">{t("account.following.clubs")}</h3>
          <ul>
            {clubs.map((c) => (
              <li key={c.slug} className="flex items-center justify-between gap-3 py-1 border-b border-gray-100 last:border-0">
                <Link href={clubHref(c.slug)} className="link font-semibold hover:text-blue-600 min-w-0">{c.name}</Link>
                <UnfollowButton kind="club" target={c.slug} name={c.name} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
