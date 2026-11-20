"use client";

// The header's account button, beside the menu: to the sign-in page, or (signed in) to one's account; the same outline
// as the header's other buttons either way (its label says which). Not signed in, it says "Sign in" too, from sm up.
// Nothing where the site has no accounts.
import { useAccount } from "@/components/account/AccountProvider";
import { User } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";

export default function AccountButton() {
  const { t } = useI18n();
  const { status, profile } = useAccount();
  if (status === "off") return null;
  const label = profile ? t("account.button.account", { nickname: profile.nickname }) : t("account.button.signIn");
  // Not signed in (or not yet known): "Sign in" beside the icon where there's room, so it's seen as a way in
  const text = !profile && status !== "loading";
  return (
    <Link
      href="/account"
      aria-label={label}
      title={label}
      className={`${text ? "w-[42px] sm:w-auto sm:px-3 sm:gap-2" : "w-[42px]"} h-[42px] inline-flex items-center justify-center ${BUTTON}`}
    >
      <User className="text-xl" />
      {text && <span className="hidden sm:inline">{label}</span>}
    </Link>
  );
}
