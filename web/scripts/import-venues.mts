// Create the halls (venue documents) in Sanity from the team matches' halls, and give each club
// without a home hall the one it hosts the most team matches in. Only adds: an existing venue, or a
// hall that is another venue's other spelling, is left alone, as is a club's home hall already set.
// The addresses are then filled in in the Studio (/studio), where spellings of the same hall can be
// merged: keep one venue and add the others' names to its "Other spellings".
// Reads team-matches/venues.json (pipeline/team-matches.mjs) from DATA_DIR or DATA_URL.
// Usage: pnpm --filter web import-venues [--dry-run] [--min 3] [--venues-only]   (--min: halls with at least that
// many team matches, 3 by default; --venues-only: the venues, not the clubs' home halls)
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@sanity/client";
import { venueKey } from "../utils/structuredData";

interface Hall {
  name: string;
  ties: number;
  hosts: Record<string, number>;
}

const dryRun = process.argv.includes("--dry-run");
const venuesOnly = process.argv.includes("--venues-only");
const min = process.argv.includes("--min") ? Number(process.argv[process.argv.indexOf("--min") + 1]) : 3;
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_WRITE_TOKEN;
if (!projectId || !token) throw new Error("Set NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_WRITE_TOKEN");
const client = createClient({ projectId, dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production", token, apiVersion: "2025-02-19", useCdn: false });

async function readHalls(): Promise<Hall[]> {
  if (process.env.DATA_DIR) return JSON.parse(await readFile(join(import.meta.dirname, "..", process.env.DATA_DIR, "team-matches/venues.json"), "utf8"));
  if (!process.env.DATA_URL) throw new Error("Set DATA_DIR (a local export folder) or DATA_URL (the data bucket)");
  const res = await fetch(`${process.env.DATA_URL}/team-matches/venues.json`);
  if (!res.ok) throw new Error(`team-matches/venues.json: ${res.status}`);
  return res.json();
}

const idFor = (name: string) => `venue-${name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/æ/g, "ae").replace(/ø/g, "o").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const halls = (await readHalls()).filter((h) => h.ties >= min);
const venues = await client.fetch<{ _id: string; name: string; aliases: string[] | null }[]>(`*[_type == "venue"]{ _id, name, aliases }`);
const clubs = await client.fetch<{ _id: string; title: string; homeVenue: { _ref: string } | null }[]>(`*[_type == "club" && !(_id in path("drafts.**"))]{ _id, title, homeVenue }`);

// Each hall's venue id: an existing venue with that name or spelling, else a new one
const byKey = new Map(venues.flatMap((v) => [v.name, ...(v.aliases ?? [])].map((n) => [venueKey(n), v._id] as const)));
const created: string[] = [];
const idOf = new Map<string, string>();
for (const hall of halls) {
  const existing = byKey.get(venueKey(hall.name));
  if (existing) {
    idOf.set(hall.name, existing);
    continue;
  }
  const _id = idFor(hall.name);
  byKey.set(venueKey(hall.name), _id);
  idOf.set(hall.name, _id);
  created.push(`${hall.name} (${hall.ties} team matches)`);
  if (!dryRun) await client.createIfNotExists({ _id, _type: "venue", name: hall.name });
}

// Each club without a home hall: the hall it hosts the most team matches in
const homes: string[] = [];
for (const club of venuesOnly ? [] : clubs) {
  if (club.homeVenue) continue;
  const best = halls.filter((h) => h.hosts[club.title]).sort((a, b) => b.hosts[club.title] - a.hosts[club.title])[0];
  if (!best) continue;
  homes.push(`${club.title}: ${best.name} (${best.hosts[club.title]} of its hosted team matches)`);
  if (!dryRun) await client.patch(club._id).set({ homeVenue: { _type: "reference", _ref: idOf.get(best.name)! } }).commit();
}

console.log(`${dryRun ? "Would create" : "Created"} ${created.length} venues (of ${halls.length} halls with at least ${min} team matches):\n  ${created.join("\n  ") || "none"}`);
if (!venuesOnly) console.log(`${dryRun ? "Would set" : "Set"} ${homes.length} clubs' home halls:\n  ${homes.join("\n  ") || "none"}`);
