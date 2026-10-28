// A club's link preview, at /clubs/<slug>/preview.png: its logo, name, full name and region, and its rank among the clubs in each discipline
import { previewCard } from "@/components/seo/PreviewCard";
import { getClubsFile } from "@/data/clubs";
import { getClubBySlug } from "@/data/sanity";
import { t } from "@/messages/i18n";
import { POOL_CODES, POOL_KEYS } from "@/utils/pools";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const [club, file] = await Promise.all([getClubBySlug(decodeURIComponent((await params).slug)), getClubsFile()]);
  if (!club) return new Response(null, { status: 404 });
  const stats = POOL_KEYS.flatMap((pool) => {
    const standing = file?.clubs[pool]?.find((c) => c.club === club.title);
    return standing ? [{ value: `#${standing.rank}`, label: POOL_CODES[pool] }] : [];
  });
  return previewCard({
    kicker: t("seo.preview.club"),
    title: club.title,
    subtitle: [club.fullName !== club.title ? club.fullName : null, club.region].filter(Boolean).join(", ") || undefined,
    stats,
    // A Sanity logo as a PNG (next/og can't draw WebP), at twice its size here; logos in public/ by their address
    image: club.logo?.startsWith("https://cdn.sanity.io/") ? `${club.logo}${club.logo.includes("?") ? "&" : "?"}w=280&h=280&fit=max&fm=png` : null,
  });
}
