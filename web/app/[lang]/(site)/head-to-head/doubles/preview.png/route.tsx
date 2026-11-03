// Two doubles pairs' link preview, at /head-to-head/doubles/preview.png?a1=&a2=&b1=&b2=: the pairs,
// the discipline they play in, their record against each other and each pair's chance in it now as a
// split bar, with the day the ratings are from. Only link preview bots and people sharing fetch it
// (robots.txt keeps search engines off head to head).
import { previewCard, ratingsNote } from "@/components/seo/PreviewCard";
import { getDoublesHeadToHead } from "@/data/head-to-head";
import { createI18n, isLanguage } from "@/messages/i18n";
import type { DoublesHeadToHeadPool, Pool } from "@/types";
import { parseId } from "@/utils/parse";
import { recordValue, shortNames } from "@/utils/preview";

export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const i18n = createI18n(lang);
  const { t, pools: poolNames } = i18n;
  const query = new URL(request.url).searchParams;
  const ids = ["a1", "a2", "b1", "b2"].map((key) => parseId(query.get(key) ?? undefined));
  if (ids.some((id) => id === null)) return new Response(null, { status: 404 });
  const [a1, a2, b1, b2] = ids as number[];
  const [h2h, note] = await Promise.all([getDoublesHeadToHead(a1, a2, b1, b2, i18n), ratingsNote(i18n)]);
  if (!h2h) return new Response(null, { status: 404 });
  // The pairs by their first names ("Danila/Jonas"), unless two of the four share one
  const names = shortNames([...h2h.a, ...h2h.b].map((p) => p.name));
  const pairNames: [string, string] = [`${names[0]}/${names[1]}`, `${names[2]}/${names[3]}`];
  // The discipline both pairs play in (not the just-for-fun comparison of pairs that don't)
  const [pool, p] = (Object.entries(h2h.pools) as [Pool, DoublesHeadToHeadPool][])[0] ?? [];
  return previewCard(i18n, {
    kicker: t("seo.preview.doublesHeadToHead"),
    title: `${h2h.a.map((p) => p.name).join(" / ")} – ${h2h.b.map((p) => p.name).join(" / ")}`,
    subtitle: h2h.disciplines.length ? h2h.disciplines.map((pool) => poolNames[pool]).join(", ") : undefined,
    note,
    stats: h2h.record.matches ? [{ value: recordValue(h2h.record), label: t("seo.preview.record") }] : [],
    bar: pool && p ? { names: pairNames, chance: p.chance } : undefined,
  });
}
