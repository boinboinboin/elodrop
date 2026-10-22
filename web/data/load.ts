// The rating data (pipeline/export.mjs): read from the data bucket (DATA_URL) or, locally, from a
// folder (DATA_DIR, e.g. ../pipeline/export). Every read is cached under the "elo-data" tag, which
// the pipeline revalidates after each run (app/api/revalidate), and one tag per area.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { cacheLife, cacheTag } from "next/cache";

export async function load<T>(path: string): Promise<T | null> {
  "use cache";
  // elo-data for everything, and one tag per area ("elo-data:tournaments" for tournaments/...), so a
  // night that only brings new tournament draws refreshes just the pages that use them
  cacheTag("elo-data", `elo-data:${path.split("/")[0].replace(/\.json$/, "")}`);
  cacheLife("days");
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
