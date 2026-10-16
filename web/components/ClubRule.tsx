// How a club's strength in a pool is calculated, as a sentence fragment
import type { ClubStrengthRule } from "@/lib/types";

export function clubRule(rule: ClubStrengthRule): string {
  const weights = rule.weights.map((w) => `${Math.round(w * 100)}%`).join(" · ");
  if (rule.pairs === "mixed")
    return `a weighted average of the club's best ${rule.slots} pairs, its best man with its best woman, its second best man with its second best woman and so on (${weights}, best first)`;
  if (rule.pairs === "doubles") return `a weighted average of the club's best ${rule.slots} pairs: its two best players, the next two and so on (${weights}, best first)`;
  return `a weighted average of the club's best ${rule.slots} players (${weights}, best first)`;
}
