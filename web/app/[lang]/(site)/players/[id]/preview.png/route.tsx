// A player's link preview, at /players/<id>/preview.png: their name, club, and rating and rank in up to four disciplines
import { previewCard } from "@/components/seo/PreviewCard";
import { getPlayer } from "@/data/players";
import { createI18n, isLanguage } from "@/messages/i18n";
import type { PlayerPool, Pool } from "@/types";
import { parseId } from "@/utils/parse";

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id: rawId } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const i18n = createI18n(lang);
  const { t, num, poolCodes } = i18n;
  const id = parseId(rawId);
  const player = id !== null ? await getPlayer(id) : null;
  if (!player) return new Response(null, { status: 404 });
  const pools = Object.entries(player.pools) as [Pool, PlayerPool][];
  return previewCard(i18n, {
    kicker: t("seo.preview.player"),
    title: player.name,
    subtitle: player.club ?? undefined,
    // Rated disciplines in page order (their own gender's first), ranked ones first
    stats: [...pools.filter(([, p]) => p.rank !== null), ...pools.filter(([, p]) => p.rank === null)].map(([pool, p]) => ({
      value: num(Math.round(p.rating)),
      label: p.rank !== null ? t("seo.preview.rank", { rank: p.rank, pool: poolCodes[pool] }) : t("seo.preview.rating", { pool: poolCodes[pool] }),
    })),
  });
}
