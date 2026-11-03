// Two doubles pairs' link preview, at /head-to-head/doubles/preview.png?a1=&a2=&b1=&b2=: the pairs,
// the discipline they play in, their record against each other and pair A's chance of beating pair
// B now, with the day the ratings are from. Only link preview bots and people sharing fetch it
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
  const { t, chance, poolCodes, pools: poolNames } = i18n;
  const query = new URL(request.url).searchParams;
  const ids = ["a1", "a2", "b1", "b2"].map((key) => parseId(query.get(key) ?? undefined));
  if (ids.some((id) => id === null)) return new Response(null, { status: 404 });
  const [a1, a2, b1, b2] = ids as number[];
  const [h2h, note] = await Promise.all([getDoublesHeadToHead(a1, a2, b1, b2, i18n), ratingsNote(i18n)]);
  if (!h2h) return new Response(null, { status: 404 });
  const [first1, first2] = shortNames(h2h.a.map((p) => p.name));
  const pools = Object.entries(h2h.pools) as [Pool, DoublesHeadToHeadPool][];
  return previewCard(i18n, {
    kicker: t("seo.preview.doublesHeadToHead"),
    title: `${h2h.a.map((p) => p.name).join(" / ")} – ${h2h.b.map((p) => p.name).join(" / ")}`,
    subtitle: h2h.disciplines.length ? h2h.disciplines.map((pool) => poolNames[pool]).join(", ") : undefined,
    note,
    stats: [
      ...(h2h.record.matches ? [{ value: recordValue(h2h.record), label: t("seo.preview.record") }] : []),
      ...pools.slice(0, 1).map(([pool, p]) => ({ value: chance(p.chance), label: t("seo.preview.chanceFor", { name: `${first1}/${first2}`, pool: poolCodes[pool] }) })),
    ],
  });
}
