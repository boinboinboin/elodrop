// How a club's strength in a pool is calculated, as a sentence fragment
import { t } from "@/messages/i18n";
import type { ClubStrengthRule } from "@/types";
import { pct } from "./format";

export function clubRule(rule: ClubStrengthRule): string {
  const weights = t("clubs.rule.weights", { weights: rule.weights.map((w) => pct(w)).join(" · ") });
  const kind = rule.pairs === "mixed" ? "mixed" : rule.pairs === "doubles" ? "doubles" : "singles";
  return t(`clubs.rule.${kind}`, { slots: rule.slots, weights });
}
