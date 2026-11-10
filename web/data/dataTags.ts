// The rating data's cache tags (data/load.ts), also used by app/api/revalidate. In a file of their own: a file with
// 'use cache' functions can't share plain values with a route (as data/sanityTags.ts).

/** Every data file */
export const DATA_TAG = "elo-data";
/** A data file's own tag ("elo-data/players/123.json"), what the pipeline refreshes after uploading the file */
export const fileTag = (path: string) => `${DATA_TAG}/${path}`;
/**
 * A data file's path as the pipeline sends it: folders and a .json file ("players/123.json", "junior/mensDoubles.json":
 * the disciplines' files have capitals), letters, digits, dots and dashes, never ".."
 */
export const isDataPath = (path: unknown): path is string => typeof path === "string" && path.length < 200 && /^[a-z0-9-]+(\/[A-Za-z0-9.-]+)*\.json$/.test(path) && !path.includes("..");
