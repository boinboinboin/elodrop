"use client";

// The front page's card for a signed-in user: their own player (the one they've said is them) and the players they
// follow, in a table of their singles, doubles and mixed ratings with the change since last week (FollowedTable), then
// a few of what's new with them (FollowedNews): their draws soon, their latest results, and the followed clubs' next and
// last team matches. Filled in the browser, so the front page stays the same for everyone; nothing for anyone not
// signed in or following no one. At most MAX players; the rest are on the account page, where they're managed.
import { useAccount } from "@/components/account/AccountProvider";
import { FollowedClubMatches, FollowedDraws, FollowedResults } from "@/components/account/FollowedNews";
import FollowedTable from "@/components/account/FollowedTable";
import { useFollowedClubs, useFollowedPlayers } from "@/components/account/useFollowed";
import HomeCard from "@/components/home/HomeCard";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { PALETTE } from "@/utils/chart";

/** At most this many followed players on the card */
const MAX = 4;

export default function FollowingCard() {
  const { t, plural } = useI18n();
  const { status } = useAccount();
  const { players, me, meId } = useFollowedPlayers();
  const clubs = useFollowedClubs();

  if (status !== "ready" || (!players?.length && !clubs.length && meId === null)) return null;

  return (
    <div className="mb-4">
      <HomeCard href="/account#following" title={t("account.following.title")} description={t("account.following.description")} link={t("account.following.link")} colors={[PALETTE[5]]}>
        {players === null ? (
          <p className="text-gray-600">{t("common.loading")}</p>
        ) : (
          <>
            <FollowedTable players={players.slice(0, MAX)} me={me} />
            {players.length > MAX && (
              <p className="mt-2 text-sm">
                <Link href="/account#following" className={TEXT_LINK}>{plural("account.following.more", players.length - MAX)}</Link>
              </p>
            )}
            {!players.length && <p className="mt-3 text-gray-600">{t("account.following.empty")}</p>}
            {/* A few of what's new: their draws soon, their latest results, the clubs' next and last team matches; side by
                side on a wide screen */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
              <FollowedDraws players={players} me={me} limit={4} />
              <FollowedResults players={players} me={me} limit={4} />
              <FollowedClubMatches clubs={clubs} />
            </div>
          </>
        )}
      </HomeCard>
    </div>
  );
}
