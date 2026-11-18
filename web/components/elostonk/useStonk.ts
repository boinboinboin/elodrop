"use client";

// EloStonk's data in the browser: the players who can be picked, once per visit, and reads of the game's tables and
// views in Supabase (public ones need no sign-in). The players' file comes straight from the data bucket
// (NEXT_PUBLIC_DATA_URL: Cloudflare's traffic from R2 is free, so the site's biggest download for the game costs
// nothing on Vercel; the bucket's CORS rule lets the site's pages read it); without it (local development) from the
// site's own route over the local export (/api/elostonk/players).
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StonkPlayerRow, StonkPlayersFile } from "@/data/elostonk";
import type { Pool } from "@/types";

export interface StonkPlayer {
  id: number;
  name: string;
  club: string | null;
  gender: "M" | "K" | null;
  ratings: Partial<Record<Pool, number>>;
  /** Points per round, newest first (the first: the round under way) */
  points: number[];
  upcoming: { cup2000Id: number; name: string; startDate: string }[];
}

let request: Promise<StonkPlayersFile | null> | null = null;
const PLAYERS_URL = process.env.NEXT_PUBLIC_DATA_URL ? `${process.env.NEXT_PUBLIC_DATA_URL}/elostonk/players.json` : "/api/elostonk/players";
const loadPlayers = () =>
  (request ??= fetch(PLAYERS_URL)
    .then((res) => (res.ok ? (res.json() as Promise<StonkPlayersFile>) : null))
    .catch(() => {
      request = null;
      return null;
    }));

const toPlayer = ([id, name, club, gender, ratings, points, upcoming]: StonkPlayerRow, tournaments: StonkPlayersFile["tournaments"]): StonkPlayer => ({
  id,
  name,
  club,
  gender,
  ratings,
  points,
  upcoming: upcoming.flatMap((cup2000Id) => (tournaments[cup2000Id] ? [{ cup2000Id, name: tournaments[cup2000Id][0], startDate: tournaments[cup2000Id][1] }] : [])),
});

/** The players file, with the players by id (null while loading) */
export function useStonkPlayers(): { rounds: string[]; players: StonkPlayer[]; byId: Map<number, StonkPlayer> } | null {
  const [data, setData] = useState<{ rounds: string[]; players: StonkPlayer[]; byId: Map<number, StonkPlayer> } | null>(null);
  useEffect(() => {
    let live = true;
    loadPlayers().then((file) => {
      if (!live) return;
      const players = (file?.players ?? []).map((row) => toPlayer(row, file?.tournaments ?? {}));
      setData({ rounds: file?.rounds ?? [], players, byId: new Map(players.map((p) => [p.id, p])) });
    });
    return () => {
      live = false;
    };
  }, []);
  return data;
}

/** A player's best rating (for sorting) */
export const bestRating = (p: StonkPlayer) => Math.max(0, ...Object.values(p.ratings).map((r) => r ?? 0));
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
