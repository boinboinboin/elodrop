// Parsing values from URLs

/** A numeric id from a route or query parameter ("36501"), or null */
export const parseId = (value: string | string[] | undefined): number | null => (typeof value === "string" && /^\d+$/.test(value) ? Number(value) : null);
