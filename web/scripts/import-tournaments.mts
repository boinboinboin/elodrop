// Add this season's tournaments whose programme is out (the site's tournaments, tournaments/index.json)
// to Sanity, for checking their organiser and hall in the Studio (sanity/schemas/tournament.ts).
// A new tournament gets the club recognised from Cup2000's organiser and that club's first home hall;
// an organiser or hall left empty is filled in when there's one to give (a hall from the organiser
// chosen in the Studio, too). Cup2000's facts (name, dates, organiser's name) are kept up to date.
// Approved tournaments are left as they are, apart from those facts. Nothing is deleted.
// Runs in the nightly pipeline with plain Node (no packages: Sanity's HTTP API), after the export.
// Reads tournaments/index.json from DATA_DIR (an export folder, relative to web/) or DATA_URL.
// Usage: pnpm --filter web import-tournaments [--dry-run]
// Without SANITY_WRITE_TOKEN it does nothing, so the pipeline runs without it.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { clubByOrganiser } from "../utils/organiser.ts";

interface TournamentSummary {
  cup2000Id: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  organiser?: string | null;
}
interface Club {
  _id: string;
  title: string;
  fullName: string | null;
  homeVenues: string[] | null;
}
interface Doc {
  _id: string;
  name?: string;
  cup2000Id?: number;
  startDate?: string;
  endDate?: string;
  organiserName?: string;
  organiser?: { _ref: string };
  venue?: { _ref: string };
  approved?: boolean;
}

const dryRun = process.argv.includes("--dry-run");
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const token = process.env.SANITY_WRITE_TOKEN;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
if (!projectId || !token) {
  console.log("No NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_WRITE_TOKEN: the tournaments aren't added to Sanity");
  process.exit(0);
}
const api = `https://${projectId}.api.sanity.io/v2025-02-19/data`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

async function query<T>(groq: string): Promise<T> {
  const res = await fetch(`${api}/query/${dataset}?query=${encodeURIComponent(groq)}`, { headers });
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status} ${await res.text()}`);
  return (await res.json()).result as T;
}

async function readIndex(): Promise<TournamentSummary[]> {
  if (process.env.DATA_DIR) return JSON.parse(await readFile(join(import.meta.dirname, "..", process.env.DATA_DIR, "tournaments/index.json"), "utf8")).tournaments;
  if (!process.env.DATA_URL) throw new Error("Set DATA_DIR (a local export folder) or DATA_URL (the data bucket)");
  const res = await fetch(`${process.env.DATA_URL}/tournaments/index.json`);
  if (!res.ok) throw new Error(`tournaments/index.json: ${res.status}`);
  return (await res.json()).tournaments;
}

// This season: from 1 July
const now = new Date();
const seasonStart = `${now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1}-07-01`;
const tournaments = (await readIndex()).filter((t) => t.startDate && t.startDate >= seasonStart);

// Clubs' home halls: also the single one (homeVenue) clubs had before scripts/import-venues.mts moved it
const clubs = await query<Club[]>(`*[_type == "club" && !(_id in path("drafts.**"))]{ _id, title, fullName, "homeVenues": coalesce(homeVenues[]._ref, [homeVenue._ref]) }`);
const clubById = new Map(clubs.map((c) => [c._id, c]));
const docs = await query<Doc[]>(`*[_type == "tournament" && !(_id in path("drafts.**"))]{ _id, name, cup2000Id, startDate, endDate, organiserName, organiser, venue, approved }`);
const docById = new Map(docs.map((d) => [d._id, d]));

const ref = (id: string) => ({ _type: "reference", _ref: id });
const mutations: object[] = [];
const report: string[] = [];
for (const t of tournaments) {
  const _id = `tournament-${t.cup2000Id}`;
  const doc = docById.get(_id);
  const facts = { name: t.name, cup2000Id: t.cup2000Id, startDate: t.startDate, endDate: t.endDate ?? t.startDate, organiserName: t.organiser ?? undefined };
  const set: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(facts)) if (value !== undefined && value !== null && doc?.[key as keyof Doc] !== value) set[key] = value;
  // The organiser and hall, where empty and not approved: the organiser chosen in the Studio, else the one recognised
  if (!doc?.approved) {
    const club = (doc?.organiser && clubById.get(doc.organiser._ref)) || clubByOrganiser(t.organiser, clubs);
    if (!doc?.organiser && club) set.organiser = ref(club._id);
    const hall = club?.homeVenues?.find(Boolean);
    if (!doc?.venue && hall) set.venue = ref(hall);
  }
  if (!Object.keys(set).length) continue;
  if (!doc) mutations.push({ createIfNotExists: { _id, _type: "tournament", approved: false } });
  mutations.push({ patch: { id: _id, set } });
  report.push(`${doc ? "Updated" : "Added"} ${t.name} (${t.cup2000Id}): ${Object.keys(set).join(", ")}`);
}

if (mutations.length && !dryRun) {
  const res = await fetch(`${api}/mutate/${dataset}?returnIds=false&visibility=async`, { method: "POST", headers, body: JSON.stringify({ mutations }) });
  if (!res.ok) throw new Error(`Sanity mutation failed: ${res.status} ${await res.text()}`);
}
console.log(`${tournaments.length} tournaments this season${dryRun ? " (dry run)" : ""}:\n  ${report.join("\n  ") || "nothing to change"}`);
