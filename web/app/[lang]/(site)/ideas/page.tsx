// Ideas for the site: everyone sees them with their votes; signed-in users vote, and suggest new ones, which wait for
// the owner (set to open, planned, done or declined in the Supabase dashboard). Static: the list is loaded in the
// browser (components/account/Ideas.tsx), so votes never make the page be built again.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Ideas from "@/components/account/Ideas";
import Section from "@/components/ui/Section";
import { getI18n } from "@/messages/server";
import { ACCOUNTS } from "@/utils/account";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("account.ideas.title"), description: t("account.ideas.description"), path: "/ideas" });
}

export default async function IdeasPage() {
  // Only where the site has accounts
  if (!ACCOUNTS) notFound();
  const { t } = await getI18n();
  return (
    <Section>
      <h1 className="h1">{t("account.ideas.title")}</h1>
      <p className="text-2xl max-w-3xl mt-2 mb-8">{t("account.ideas.intro")}</p>
      <Ideas />
    </Section>
  );
}
