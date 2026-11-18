"use client";

// The account page's content (app/[lang]/(site)/account): by the account's state, signing in, creating the account,
// or the account in two tabs: Overview (the member's own numbers) and Settings (?tab=settings). Loads the Supabase code on opening (the provider has it already for a signed-in visitor),
// which also finishes a Google sign-in returning here.
import { useEffect } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import AccountSettings from "@/components/account/AccountSettings";
import CreateProfile from "@/components/account/CreateProfile";
import Overview from "@/components/account/Overview";
import SignIn from "@/components/account/SignIn";
import Tabs from "@/components/ui/Tabs";
import { useI18n } from "@/messages/client";

export default function AccountPage() {
  const { t } = useI18n();
  const { status, load } = useAccount();
  useEffect(() => {
    void load();
  }, [load]);
  if (status === "off") return <p className="text-gray-700">{t("account.errors.unknown")}</p>;
  if (status === "loading") return <p className="text-gray-600">{t("common.loading")}</p>;
  if (status === "signedOut") return <SignIn />;
  if (status === "noProfile") return <CreateProfile />;
  return (
    <Tabs
      label={t("account.tabs.label")}
      param="tab"
      tabs={[
        { id: "overview", label: t("account.tabs.overview"), content: <Overview /> },
        { id: "settings", label: t("account.tabs.settings"), content: <AccountSettings /> },
      ]}
    />
  );
}
