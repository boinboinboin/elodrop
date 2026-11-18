// EloStonk's players (pipeline/elostonk.mjs: export/elostonk/players.json): who can be picked, their ratings, recent
// points per round and upcoming tournaments
import { load } from "./load";
import type { Pool } from "@/types";

/** [id, name, club, gender, birthYear, { pool: [rating, rank] }, points per round (newest first), [[cup2000Id, tournament, startDate], …]] */
export type StonkPlayerRow = [number, string, string | null, "M" | "K" | null, number, Partial<Record<Pool, [number, number | null]>>, number[], [number, string, string][]];
export interface StonkPlayersFile {
  minAge: number;
  /** The rounds (Fridays) of each player's points, newest first: the first is the round under way */
  rounds: string[];
  players: StonkPlayerRow[];
}

export const getStonkPlayers = async () => load<StonkPlayersFile>("elostonk/players.json");
