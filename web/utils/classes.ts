// The rating classes: the official senior classes (E = elite, A, B, C, D) set by rating instead of ranking
// points, the same cut-offs in every discipline, so a rating is the same class everywhere. They are the mean
// rating of the active players plus 2.5, 1.5 and 0.5 standard deviations (E, A, B) and minus 0.5 (C), rounded
// to 25; D is the rest. Mean and standard deviation are over the five disciplines, each counting equally (they
// spread alike: means 936–975, standard deviations 323–348). The ratings are skewed (a long tail at the top),
// so this gives a pyramid of about 2/6/17/39/36% in each discipline. Worked out by pipeline/class-cutoffs.mjs
// once a season and fixed for it, so a player's class only changes with their own rating. As in
// pipeline/README.md "Rating classes".

export type RatingClass = "E" | "A" | "B" | "C" | "D";

export const CLASSES: RatingClass[] = ["E", "A", "B", "C", "D"];

/** The lowest rating of E, A, B and C, in every discipline (2026/2027, from November 2026's ratings) */
export const CLASS_CUTOFFS = [1800, 1450, 1125, 775] as const;

/**
 * A rating's class (for the senior ratings: junior rankings are on their own scale). By the rating as shown
 * (rounded), so a player shown at 1800 is in E everywhere
 */
export function classOf(rating: number): RatingClass {
  const i = CLASS_CUTOFFS.findIndex((cutoff) => Math.round(rating) >= cutoff);
  return CLASSES[i < 0 ? 4 : i];
}
