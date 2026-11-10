// The rating data (pipeline/export.mjs): read from the data bucket (DATA_URL) or, locally, from a
// folder (DATA_DIR, e.g. ../pipeline/export). Every read is cached under three tags: "elo-data" (everything),
// one per area and one per file. After a run the pipeline revalidates the files it uploaded
// (app/api/revalidate), so only the pages reading a changed file are built again; old team matches,
// finished tournaments and inactive players' pages stay cached.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife, cacheTag } from "next/cache";
import { fileTag } from "./dataTags";

export async function load<T>(path: string): Promise<T | null> {
  "use cache";
  // elo-data for everything, one tag per area ("elo-data:tournaments" for tournaments/...) and one per file
  // ("elo-data/players/123.json": fileTag, what the pipeline refreshes)
  cacheTag("elo-data", `elo-data:${path.split("/")[0].replace(/\.json$/, "")}`, fileTag(path));
  // Until a tag is revalidated: the data only changes with a pipeline run, so time alone never rebuilds a page
  cacheLife("max");
  const dir = process.env.DATA_DIR;
  if (dir) {
    try {
      // Local development only, so the bundler needn't trace it
      return JSON.parse(await readFile(join(/*turbopackIgnore: true*/ process.cwd(), dir, path), "utf8")) as T;
    } catch {
      return null;
    }
  }
  const base = process.env.DATA_URL;
  if (!base) throw new Error("Set DATA_URL (the data bucket) or DATA_DIR (a local export folder)");
  const res = await fetch(`${base}/${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return (await res.json()) as T;
}
