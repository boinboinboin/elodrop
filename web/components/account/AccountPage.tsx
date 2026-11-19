"use client";

// The account page's content (app/[lang]/(site)/account): by the account's state, signing in, creating the account,
// a new account's first steps (Welcome, right after it's made), or the account in two tabs: Overview (the member's own numbers) and Settings (?tab=settings). Loads the Supabase code on opening (the provider has it already for a signed-in visitor),
// which also finishes a Google sign-in returning here.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import AccountSettings from "@/components/account/AccountSettings";
import CreateProfile from "@/components/account/CreateProfile";
import Overview from "@/components/account/Overview";
import SignIn from "@/components/account/SignIn";
import Welcome from "@/components/account/Welcome";
import Tabs from "@/components/ui/Tabs";
import { useI18n } from "@/messages/client";

export default function AccountPage() {
  const { t } = useI18n();
  const { status, load } = useAccount();
  // The account was made on this page just now: its first steps before the tabs
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    void load();
  }, [load]);
  if (status === "off") return <p className="text-gray-700">{t("account.errors.unknown")}</p>;
  if (status === "loading") return <p className="text-gray-600">{t("common.loading")}</p>;
  if (status === "signedOut") return <SignIn />;
  if (status === "noProfile") return <CreateProfile onCreated={() => setWelcome(true)} />;
  if (welcome) return <Welcome onDone={() => setWelcome(false)} />;
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
