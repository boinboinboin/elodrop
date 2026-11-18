// EloStonk's players (pipeline/elostonk.mjs: export/elostonk/players.json): who can be picked, their ratings, recent
// points per round and upcoming tournaments
import { load } from "./load";
import type { Pool } from "@/types";

/** [id, name, club, gender, { pool: rating }, points per round (newest first, whole), [upcoming tournaments' Cup2000 ids]] */
export type StonkPlayerRow = [number, string, string | null, "M" | "K" | null, Partial<Record<Pool, number>>, number[], number[]];
export interface StonkPlayersFile {
  minAge: number;
  /** The rounds (Fridays) of each player's points, newest first: the first is the round under way */
  rounds: string[];
  /** The drawn tournaments not over: Cup2000 id → [name, startDate] */
  tournaments: Record<string, [string, string]>;
  players: StonkPlayerRow[];
}

export const getStonkPlayers = async () => load<StonkPlayersFile>("elostonk/players.json");
