// The preview of a shared link to any page without its own (components/seo/PreviewCard.tsx)
import { previewCard } from "@/components/seo/PreviewCard";
import { getMeta } from "@/data/meta";
import { createI18n, isLanguage } from "@/messages/i18n";
import { PREVIEW_SIZE } from "@/utils/metadata";

export const size = PREVIEW_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLanguage(lang)) return new Response(null, { status: 404 });
  const i18n = createI18n(lang);
  const { t, num } = i18n;
  const players = (await getMeta())?.players;
  return previewCard(i18n, {
    title: t("layout.manifestDescription"),
    subtitle: t("seo.preview.siteSubtitle"),
    stats: players ? [{ value: num(players), label: t("seo.preview.players") }] : [],
  });
}
