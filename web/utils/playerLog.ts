// A player's match lists in a discipline as app/api/players/[id]/log serves them, for the player page's tabs that load
// when opened (components/players/LazyMatchTable.tsx)
import { createHash } from "node:crypto";
import type { Match, MatchLog } from "@/types";

/** The newest matches a player page shows per discipline; "show all" loads the rest */
export const RECENT_MATCHES = 20;

export const HIGHLIGHTS = ["biggestWins", "biggestLosses", "biggestGains", "biggestDrops"] as const;
export type Highlight = (typeof HIGHLIGHTS)[number];

export type PlayerLog = { recent: Match[] } & Record<Highlight, Match[]>;

/** The lists' version, for the route's address: changes whenever what it serves does (server only) */
export const logVersion = (log: MatchLog) =>
  createHash("sha1")
    .update(JSON.stringify([log.all.slice(0, RECENT_MATCHES), ...HIGHLIGHTS.map((key) => log[key])]))
    .digest("hex")
    .slice(0, 12);
