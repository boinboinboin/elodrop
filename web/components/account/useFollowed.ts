"use client";

// The signed-in user's players and clubs, for the front page's Following card and the account page: each followed
// player's (and their own player's) ratings from /api/players/<id>/summary (cached by the CDN, read once per visit),
// and the followed clubs' names from the search index.
import { useEffect, useState } from "react";
import type { PlayerSummary } from "@/app/api/players/[id]/summary/route";
import { useAccount } from "@/components/account/AccountProvider";
import { useI18n } from "@/messages/client";
import { loadSearchIndex } from "@/utils/search";

const summaries = new Map<number, Promise<PlayerSummary | null>>();
const loadSummary = (id: number) => {
  if (!summaries.has(id))
    summaries.set(
      id,
      fetch(`/api/players/${id}/summary`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
    );
  return summaries.get(id)!;
};

/** The followed players (by name) and the user's own, null while loading */
export function useFollowedPlayers(): { players: PlayerSummary[] | null; me: PlayerSummary | null; meId: number | null } {
  const { status, profile, follows } = useAccount();
  const [players, setPlayers] = useState<PlayerSummary[] | null>(null);
  const [me, setMe] = useState<PlayerSummary | null>(null);
  const meId = profile?.player_id ?? null;
  // The user's own player is on its own row, not again among the followed
  const key = [...follows]
    .filter((f) => f.startsWith("player:"))
    .map((f) => Number(f.slice(7)))
    .filter((id) => id !== meId)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (status !== "ready") return;
    let live = true;
    const ids = key ? key.split(",").map(Number) : [];
    Promise.all([Promise.all(ids.map(loadSummary)), meId ? loadSummary(meId) : null]).then(([list, mine]) => {
      if (!live) return;
      setPlayers(list.filter((p): p is PlayerSummary => !!p).sort((a, b) => a.name.localeCompare(b.name)));
      setMe(mine);
    });
    return () => {
      live = false;
    };
  }, [status, key, meId]);

  return { players, me, meId };
}

/** The followed clubs with their names, by name */
export function useFollowedClubs(): { slug: string; name: string }[] {
  const { lang } = useI18n();
  const { follows } = useAccount();
  const [names, setNames] = useState<Map<string, string> | null>(null);
  const slugs = [...follows].filter((f) => f.startsWith("club:")).map((f) => f.slice(5));
  const any = slugs.length > 0;

  useEffect(() => {
    if (!any) return;
    let live = true;
    loadSearchIndex(lang)
      .then((index) => live && setNames(new Map(index.pages.clubs.map((c) => [c.url.split("/").pop() ?? "", c.name]))))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [any, lang]);

  return slugs.map((slug) => ({ slug, name: names?.get(slug) ?? slug })).sort((a, b) => a.name.localeCompare(b.name));
}
