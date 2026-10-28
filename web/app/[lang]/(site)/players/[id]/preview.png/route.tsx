// A player's link preview, at /players/<id>/preview.png: their name, club, and rating and rank in up to four disciplines
import { previewCard } from "@/components/seo/PreviewCard";
import { getPlayer } from "@/data/players";
import { t } from "@/messages/i18n";
import type { PlayerPool, Pool } from "@/types";
import { num } from "@/utils/format";
import { parseId } from "@/utils/parse";
import { POOL_CODES } from "@/utils/pools";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const player = id !== null ? await getPlayer(id) : null;
  if (!player) return new Response(null, { status: 404 });
  const pools = Object.entries(player.pools) as [Pool, PlayerPool][];
  return previewCard({
    kicker: t("seo.preview.player"),
    title: player.name,
    subtitle: player.club ?? undefined,
    // Rated disciplines in page order (their own gender's first), ranked ones first
    stats: [...pools.filter(([, p]) => p.rank !== null), ...pools.filter(([, p]) => p.rank === null)].map(([pool, p]) => ({
      value: num(Math.round(p.rating)),
      label: p.rank !== null ? t("seo.preview.rank", { rank: p.rank, pool: POOL_CODES[pool] }) : t("seo.preview.rating", { pool: POOL_CODES[pool] }),
    })),
  });
}
