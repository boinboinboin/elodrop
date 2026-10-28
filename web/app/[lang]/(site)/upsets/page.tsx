// The newest week's biggest upsets (components/upsets/Upsets.tsx); other weeks and years are at /upsets/<period>.
import type { Metadata } from "next";
import Upsets from "@/components/upsets/Upsets";
import { getI18n } from "@/messages/server";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("upsets.metadata.title"), description: t("seo.descriptions.upsets"), path: "/upsets" });
}

export default function UpsetsPage() {
  return <Upsets period={Promise.resolve(null)} />;
}
