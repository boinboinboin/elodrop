// Sorting helpers

/** The items by a number, highest first; equal ones keep their order */
export const sortByDesc = <T>(items: T[], value: (item: T) => number): T[] =>
  items.map((item, i) => ({ item, i })).sort((a, b) => value(b.item) - value(a.item) || a.i - b.i).map(({ item }) => item);

/**
 * The items by their change since last week: the biggest gain first ("gain") or the biggest loss first ("loss"); items
 * without one (new since last week) last, and equal ones keep their order
 */
export const sortByChange = <T>(items: T[], change: (item: T) => number | null | undefined, order: "gain" | "loss"): T[] => {
  const sign = order === "gain" ? 1 : -1;
  const value = (item: T) => {
    const c = change(item);
    return c == null ? -Infinity : sign * c;
  };
  return items.map((item, i) => ({ item, i })).sort((a, b) => value(b.item) - value(a.item) || a.i - b.i).map(({ item }) => item);
};

/** Newest first, by day ("yyyy-MM-dd") */
export const byNewest = <T extends { day: string }>(x: T, y: T) => y.day.localeCompare(x.day);

/** Highest rating first */
export const byRating = <T extends { rating: number }>(x: T, y: T) => y.rating - x.rating;
