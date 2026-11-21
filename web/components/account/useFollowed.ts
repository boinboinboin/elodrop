"use client";

// The signed-in user's players and clubs, for the front page's Following card and the account page: each followed
// player's (and their own player's) ratings from /api/players/<id>/summary (cached by the CDN, read once per visit),
// and the followed clubs' names from the search index.
import { useEffect, useState } from "react";
import type { PlayerSummary } from "@/app/api/players/[id]/summary/route";
import { useAccount } from "@/components/account/AccountProvider";
import { useI18n } from "@/messages/client";
import type { ClubTeamMatchesFile, DrawnFile } from "@/types";
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

// The Following card's two shared files: who is drawn in a tournament soon, and each club's next and last team matches.
// Read once per visit, only by a member following someone, straight from the data bucket (Cloudflare's traffic from R2
// is free; as EloStonk's players, useStonk.ts), or, without its address (local development), from the site's routes.
const files = new Map<string, Promise<unknown>>();
function loadFile<T>(path: string, local: string): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_DATA_URL ? `${process.env.NEXT_PUBLIC_DATA_URL}/${path}` : local;
  if (!files.has(url))
    files.set(
      url,
      fetch(url)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => {
          // Tried again on the next look
          files.delete(url);
          return null;
        }),
    );
  return files.get(url) as Promise<T | null>;
}

function useFile<T>(enabled: boolean, path: string, local: string): T | null {
  const [file, setFile] = useState<T | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    loadFile<T>(path, local).then((f) => live && setFile(f));
    return () => {
      live = false;
    };
  }, [enabled, path, local]);
  return enabled ? file : null;
}

/** Who is drawn in a tournament not over yet (tournaments/drawn.json); null while it loads, or when `enabled` is false */
export const useDrawn = (enabled: boolean) => useFile<DrawnFile>(enabled, "tournaments/drawn.json", "/api/following/drawn");

/** Each club's next fixtures and last results this season (team-matches/clubs.json), likewise */
export const useClubTeamMatches = (enabled: boolean) => useFile<ClubTeamMatchesFile>(enabled, "team-matches/clubs.json", "/api/following/clubs");

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
