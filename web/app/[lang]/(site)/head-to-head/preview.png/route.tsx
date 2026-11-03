// Two players' link preview, at /head-to-head/preview.png?a=<id>&b=<id>: their names and clubs,
// their record against each other, and each one's chance in singles now as a split bar (when they
// play the same singles), with the day the ratings are from. Only link preview bots and people sharing fetch it (robots.txt keeps
// search engines off head to head).
import { previewCard, ratingsNote } from "@/components/seo/PreviewCard";
import { getHeadToHead } from "@/data/head-to-head";
import { createI18n, isLanguage } from "@/messages/i18n";
import { parseId } from "@/utils/parse";
import { recordValue, shortNames } from "@/utils/preview";

export async function GET(request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const i18n = createI18n(lang);
  const { t } = i18n;
  const query = new URL(request.url).searchParams;
  const a = parseId(query.get("a") ?? undefined);
  const b = parseId(query.get("b") ?? undefined);
  const [h2h, note] = await Promise.all([a !== null && b !== null ? getHeadToHead(a, b, i18n) : null, ratingsNote(i18n)]);
  if (!h2h) return new Response(null, { status: 404 });
  // Singles only: the doubles chances are with equally rated partners, which says less
  const pool = h2h.pools.men ? "men" : h2h.pools.women ? "women" : null;
  const singles = pool ? h2h.pools[pool] : undefined;
  return previewCard(i18n, {
    kicker: t("seo.preview.headToHead"),
    title: `${h2h.a.name} – ${h2h.b.name}`,
    subtitle: h2h.a.club && h2h.b.club ? `${h2h.a.club} – ${h2h.b.club}` : undefined,
    note,
    stats: h2h.record.matches ? [{ value: recordValue(h2h.record), label: t("seo.preview.record") }] : [],
    bar: pool && singles ? { names: shortNames([h2h.a.name, h2h.b.name]) as [string, string], chance: singles.chance } : undefined,
  });
}
