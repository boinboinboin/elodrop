// How a club's strength in a pool is calculated, as a sentence fragment
import { t } from "@/messages/i18n";
import type { ClubStrengthRule } from "@/types";
import { pct } from "./format";

export function clubRule(rule: ClubStrengthRule): string {
  const weights = t("clubs.rule.weights", { weights: rule.weights.map((w) => pct(w)).join(" · ") });
  const kind = rule.pairs === "mixed" ? "mixed" : rule.pairs === "doubles" ? "doubles" : "singles";
  return t(`clubs.rule.${kind}`, { slots: rule.slots, weights });
}

/**
 * A club logo's URL for showing it `size` Tailwind units wide (w-5 is 5): a Sanity logo is scaled
 * down by Sanity's image servers to twice that in pixels, for sharp screens, in the best format the
 * browser takes (WebP or AVIF), instead of the full upload (often hundreds of kB); others as they are
 */
export function logoSrc(url: string, size: number): string {
  if (!url.startsWith("https://cdn.sanity.io/")) return url;
  const px = size * 4 * 2;
  return `${url}${url.includes("?") ? "&" : "?"}w=${px}&h=${px}&fit=max&auto=format`;
}
