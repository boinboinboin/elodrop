"use client";

// TEMPORARY PREVIEW (remove before merging): the Following card's new parts with real data, as if a member followed
// these players and clubs, without signing in (the dev server uses the live accounts).
import { useEffect, useState } from "react";
import type { PlayerSummary } from "@/app/api/players/[id]/summary/route";
import { FollowedClubMatches, FollowedDraws, FollowedResults } from "@/components/account/FollowedNews";
import FollowedTable from "@/components/account/FollowedTable";
import HomeCard from "@/components/home/HomeCard";
import Section from "@/components/ui/Section";
import { PALETTE } from "@/utils/chart";

const ME = 17647;
const FOLLOWED = [22376, 17018, 17674, 17741, 17138];
const CLUBS = [
  { slug: "bergen", name: "Bergen" },
  { slug: "haugerud", name: "Haugerud" },
  { slug: "ntnui", name: "NTNUI" },
];

export default function PreviewFollowing() {
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null);
  const [me, setMe] = useState<PlayerSummary | null>(null);
  useEffect(() => {
    const load = (id: number) => fetch(`/api/players/${id}/summary`).then((r) => (r.ok ? (r.json() as Promise<PlayerSummary>) : null));
    Promise.all([load(ME), ...FOLLOWED.map(load)]).then(([mine, ...list]) => {
      setMe(mine);
      setPlayers(list.filter((p): p is PlayerSummary => !!p));
    });
  }, []);
  return (
    <Section>
      <p className="mb-4 font-mono text-sm">Preview (not on the site): the Following card and the account page&apos;s parts</p>
      <HomeCard href="/account#following" title="Following" description="Front page card" link="Manage on your account page" colors={[PALETTE[5]]}>
        {players && (
          <>
            <FollowedTable players={players.slice(0, 4)} me={me} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
              <FollowedDraws players={players} me={me} limit={4} />
              <FollowedResults players={players} me={me} limit={4} />
              <FollowedClubMatches clubs={CLUBS} />
            </div>
          </>
        )}
      </HomeCard>
      <div className="mt-8 bg-white p-6 max-w-3xl">
        <p className="font-mono text-sm">Account page (all of it)</p>
        {players && (
          <>
            <FollowedDraws players={players} me={me} />
            <FollowedResults players={players} me={me} />
          </>
        )}
        <FollowedClubMatches clubs={CLUBS} fixtures={2} results={3} />
      </div>
    </Section>
  );
}
