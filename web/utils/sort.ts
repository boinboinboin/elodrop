// Sorting helpers

/** The items by a number, highest first; equal ones keep their order */
export const sortByDesc = <T>(items: T[], value: (item: T) => number): T[] =>
  items.map((item, i) => ({ item, i })).sort((a, b) => value(b.item) - value(a.item) || a.i - b.i).map(({ item }) => item);

/** Newest first, by day ("yyyy-MM-dd") */
export const byNewest = <T extends { day: string }>(x: T, y: T) => y.day.localeCompare(x.day);

/** Highest rating first */
export const byRating = <T extends { rating: number }>(x: T, y: T) => y.rating - x.rating;
