"use client";

// EloStonk's page (app/[lang]/(site)/elostonk) in tabs: My squad, Leaderboard, Leagues, Statistics and How it works
// (?tab=…; the rules in Rules). Everything is read in the browser (Supabase, and the players from /api/elostonk/players), so the page is
// static and the same for everyone. Nothing where the site has no accounts.
import { Suspense } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import Leaderboard from "@/components/elostonk/Leaderboard";
import Leagues from "@/components/elostonk/Leagues";
import Rules from "@/components/elostonk/Rules";
import Squad from "@/components/elostonk/Squad";
import Stats from "@/components/elostonk/Stats";
import Tabs from "@/components/ui/Tabs";
import { useI18n } from "@/messages/client";

export default function StonkPage() {
  const { t } = useI18n();
  const { status } = useAccount();
  if (status === "off") return null;
  return (
    <Tabs
      label={t("elostonk.tabs.label")}
      param="tab"
      tabs={[
        { id: "squad", label: t("elostonk.tabs.squad"), content: <Squad /> },
        { id: "board", label: t("elostonk.tabs.board"), content: <Leaderboard /> },
        {
          id: "leagues",
          label: t("elostonk.tabs.leagues"),
          // It reads the invite link's code from the address, which waits for the browser
          content: (
            <Suspense fallback={null}>
              <Leagues />
            </Suspense>
          ),
        },
        { id: "stats", label: t("elostonk.tabs.stats"), content: <Stats /> },
        { id: "rules", label: t("elostonk.tabs.rules"), content: <Rules /> },
      ]}
    />
  );
}
