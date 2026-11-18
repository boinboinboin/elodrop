// The account: signing in (a code by email, or Google), creating the account (the age gate and a nickname), then what
// one has: "This is me", the calendar of one's tournaments, one's reports, signing out and deleting the account.
// Static and the same for everyone (components/account/AccountPage.tsx does it all in the browser), and not indexed.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AccountPage from "@/components/account/AccountPage";
import Section from "@/components/ui/Section";
import { getI18n } from "@/messages/server";
import { ACCOUNTS } from "@/utils/account";
import { pageMetadata } from "@/utils/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await getI18n();
  const { t } = i18n;
  return pageMetadata(i18n, { title: t("account.metadata.title"), description: t("account.metadata.description"), path: "/account", index: false });
}

export default async function Account() {
  // Only where the site has accounts
  if (!ACCOUNTS) notFound();
  const { t } = await getI18n();
  return (
    <Section>
      <h1 className="h1 mb-6">{t("account.metadata.title")}</h1>
      <AccountPage />
    </Section>
  );
}
