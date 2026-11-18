// EloStonk, the fantasy game: pick 5 players, one the captain, and score from how much better than expected they do in
// each round's matches (README: "EloStonk"). Static: the game is played in the browser (components/elostonk).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import StonkPage from "@/components/elostonk/StonkPage";
import Section from "@/components/ui/Section";
import { getI18n } from "@/messages/server";
import { ACCOUNTS } from "@/utils/account";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("elostonk.title"), description: t("elostonk.description"), path: "/elostonk" });
}

export default async function EloStonk() {
  // Only where the site has accounts
  if (!ACCOUNTS) notFound();
  const { t } = await getI18n();
  return (
    <Section>
      <h1 className="h1">{t("elostonk.title")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t("elostonk.intro")}</p>
      <StonkPage />
    </Section>
  );
}
