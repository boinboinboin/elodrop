"use client";

// The front page's card for a signed-out visitor, under the About cards: what an account gives you (AccountBenefits,
// the first few) and the way to the sign-in page. Filled in the browser, so the front page stays the same for
// everyone; nothing for the signed-in (they have their Following card) or where the site has no accounts.
import AccountBenefits from "@/components/account/AccountBenefits";
import { useAccount } from "@/components/account/AccountProvider";
import HomeCard from "@/components/home/HomeCard";
import { useI18n } from "@/messages/client";
import { PALETTE } from "@/utils/chart";

export default function SignUpCard() {
  const { t } = useI18n();
  const { status } = useAccount();
  if (status !== "signedOut" && status !== "noProfile") return null;
  return (
    <div className="mt-4">
      <HomeCard href="/account" title={t("account.prompts.card.title")} description={t("account.prompts.card.description")} link={t("account.prompts.card.link")} colors={[PALETTE[5]]}>
        <AccountBenefits compact />
      </HomeCard>
    </div>
  );
}
