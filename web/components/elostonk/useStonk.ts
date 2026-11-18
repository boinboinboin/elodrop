"use client";

// EloStonk's data in the browser: the players who can be picked (/api/elostonk/players, cached, once per visit) and
// reads of the game's tables and views in Supabase (public ones need no sign-in).
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StonkPlayerRow, StonkPlayersFile } from "@/data/elostonk";
import type { Pool } from "@/types";

export interface StonkPlayer {
  id: number;
  name: string;
  club: string | null;
  gender: "M" | "K" | null;
  birthYear: number;
  ratings: Partial<Record<Pool, [number, number | null]>>;
  /** Points per round, newest first (the first: the round under way) */
  points: number[];
  upcoming: { cup2000Id: number; name: string; startDate: string }[];
}

let request: Promise<StonkPlayersFile | null> | null = null;
const loadPlayers = () =>
  (request ??= fetch("/api/elostonk/players")
    .then((res) => (res.ok ? (res.json() as Promise<StonkPlayersFile>) : null))
    .catch(() => {
      request = null;
      return null;
    }));

const toPlayer = ([id, name, club, gender, birthYear, ratings, points, upcoming]: StonkPlayerRow): StonkPlayer => ({
  id,
  name,
  club,
  gender,
  birthYear,
  ratings,
  points,
  upcoming: upcoming.map(([cup2000Id, n, startDate]) => ({ cup2000Id, name: n, startDate })),
});

/** The players file, with the players by id (null while loading) */
export function useStonkPlayers(): { rounds: string[]; players: StonkPlayer[]; byId: Map<number, StonkPlayer> } | null {
  const [data, setData] = useState<{ rounds: string[]; players: StonkPlayer[]; byId: Map<number, StonkPlayer> } | null>(null);
  useEffect(() => {
    let live = true;
    loadPlayers().then((file) => {
      if (!live) return;
      const players = (file?.players ?? []).map(toPlayer);
      setData({ rounds: file?.rounds ?? [], players, byId: new Map(players.map((p) => [p.id, p])) });
    });
    return () => {
      live = false;
    };
  }, []);
  return data;
}

/** A player's best rating (for sorting) */
export const bestRating = (p: StonkPlayer) => Math.max(0, ...Object.values(p.ratings).map((r) => r?.[0] ?? 0));
/** Points over the last `n` rounds, the one under way included */
export const form = (p: StonkPlayer, n = 4) => p.points.slice(0, n).reduce((s, x) => s + x, 0);

let opened: Date | null = null;
const noSubscription = () => () => {};
/**
 * The moment the page opened, in the browser only (null on the server and while hydrating): the page is static, so a
 * date taken when it's built would stay in it. The rounds and the countdowns go by it.
 */
export const useNow = (): Date | null => useSyncExternalStore(noSubscription, () => (opened ??= new Date()), () => null);

/** The newest round with points (the round under way has none until its first results) */
export async function newestScoredRound(client: SupabaseClient): Promise<string | null> {
  const { data } = await client.from("stonk_points").select("round").order("round", { ascending: false }).limit(1).maybeSingle<{ round: string }>();
  return data?.round ?? null;
}
