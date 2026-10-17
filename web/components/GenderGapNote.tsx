// How the "just for fun" comparisons put women on the men's scale (pipeline/gender-gap.mjs), with
// examples from the fit itself.
import { type Format, type GenderGap, onMensScale } from "@/lib/data";
import { num } from "@/lib/format";

const DISCIPLINES: Record<Format, [string, string]> = { singles: ["women's singles", "men's singles"], doubles: ["women's doubles", "men's doubles"] };

export default function GenderGapNote({ gap, format, extrapolated }: { gap: GenderGap; format: Format; extrapolated: boolean }) {
  const fit = gap[format];
  const [women, men] = DISCIPLINES[format];
  // Examples across the ratings the fit covers, rounded to 100s
  const [lo, hi] = fit.range.map((r) => Math.round(r / 100) * 100);
  const examples = [lo, Math.round((lo + hi) / 200) * 100, hi].map((w) => [num(w), num(Math.round(onMensScale(w, fit, gap.p0) / 10) * 10)]);
  return (
    <p className="text-sm text-gray-600 mt-4 max-w-3xl">
      Women&apos;s ratings are moved onto the men&apos;s scale using the {num(fit.matches)} matches women have played against men in {men}, set against their rating in {women} at the time. A woman
      rated {examples[0][0]} plays like a man rated about {examples[0][1]}, one rated {examples[1][0]} like one rated about {examples[1][1]}, and one rated {examples[2][0]} like one rated
      about {examples[2][1]}: the gap grows with the level.
      {extrapolated && <> Ratings marked * are beyond those the matches cover (about {num(fit.range[0])} to {num(fit.range[1])}), so for them the gap is extrapolated.</>}
    </p>
  );
}
