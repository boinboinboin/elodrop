// How the "just for fun" comparisons put women on the men's scale (pipeline/gender-gap.mjs), with
// examples from the fit itself.
import { t } from "@/messages/i18n";
import type { Format, GenderGap, Pool } from "@/types";
import { num } from "@/utils/format";
import { onMensScale } from "@/utils/rating";

// The women's and the men's discipline of each format
const DISCIPLINES: Record<Format, [Pool, Pool]> = { singles: ["women", "men"], doubles: ["womensDoubles", "mensDoubles"] };

export default function GenderGapNote({ gap, format, extrapolated }: { gap: GenderGap; format: Format; extrapolated: boolean }) {
  const fit = gap[format];
  const [women, men] = DISCIPLINES[format];
  // Examples across the ratings the fit covers, rounded to 100s
  const [lo, hi] = fit.range.map((r) => Math.round(r / 100) * 100);
  const examples = [lo, Math.round((lo + hi) / 200) * 100, hi].map((w) => [num(w), num(Math.round(onMensScale(w, fit, fit.p0 ?? gap.p0) / 10) * 10)]);
  return (
    <p className="text-sm text-gray-600 mt-4 max-w-3xl">
      {t("headToHead.genderGap.note", {
        matches: num(fit.matches),
        men: t(`common.poolsInSentence.${men}`),
        women: t(`common.poolsInSentence.${women}`),
        w1: examples[0][0],
        m1: examples[0][1],
        w2: examples[1][0],
        m2: examples[1][1],
        w3: examples[2][0],
        m3: examples[2][1],
      })}
      {extrapolated && t("headToHead.genderGap.extrapolated", { from: num(fit.range[0]), to: num(fit.range[1]) })}
    </p>
  );
}
