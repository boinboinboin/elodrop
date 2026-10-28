// The preview of a shared link to any page without its own (components/seo/PreviewCard.tsx)
import { previewCard } from "@/components/seo/PreviewCard";
import { getMeta } from "@/data/meta";
import { t } from "@/messages/i18n";
import { num } from "@/utils/format";
import { PREVIEW_SIZE } from "@/utils/metadata";

export const alt = t("seo.imageAlt.site");
export const size = PREVIEW_SIZE;
export const contentType = "image/png";

export default async function Image() {
  const players = (await getMeta())?.players;
  return previewCard({
    title: t("layout.manifestDescription"),
    subtitle: t("seo.preview.siteSubtitle"),
    stats: players ? [{ value: num(players), label: t("seo.preview.players") }] : [],
  });
}
