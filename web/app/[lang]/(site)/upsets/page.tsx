// The newest week's biggest upsets (components/upsets/Upsets.tsx); other weeks and years are at /upsets/<period>.
import type { Metadata } from "next";
import Upsets from "@/components/upsets/Upsets";
import { t } from "@/messages/i18n";
import { pageMetadata } from "@/utils/metadata";

export const metadata: Metadata = pageMetadata({ title: t("upsets.metadata.title"), description: t("seo.descriptions.upsets"), path: "/upsets" });

export default function UpsetsPage() {
  return <Upsets period={Promise.resolve(null)} />;
}
