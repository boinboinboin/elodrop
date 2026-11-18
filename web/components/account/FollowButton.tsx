"use client";

// A star by a player's or a club's share buttons: follow it (filled while followed), or, signed out, a way to the
// sign-in page. Nothing where the site has no accounts. The page around it is the same for everyone; only this
// changes, in the browser.
import { useAccount } from "@/components/account/AccountProvider";
import { Star } from "@/components/SVG";
import Link from "@/components/ui/Link";
import { ICON_BUTTON } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import type { FollowKind } from "@/utils/account";

export default function FollowButton({ kind, target, name }: { kind: FollowKind; target: string | number; name: string }) {
  const { t } = useI18n();
  const { status, follows, toggleFollow } = useAccount();
  if (status === "off") return null;
  if (status !== "ready") {
    const label = t("account.follow.signIn", { name });
    return (
      <Link href="/account" aria-label={label} title={label} className={ICON_BUTTON}>
        <Star className="text-xl" />
      </Link>
    );
  }
  const following = follows.has(`${kind}:${target}`);
  const label = t(following ? "account.follow.unfollow" : "account.follow.follow", { name });
  return (
    <button type="button" onClick={() => void toggleFollow(kind, target)} aria-pressed={following} aria-label={label} title={label} className={`${ICON_BUTTON} ${following ? "bg-black text-white" : ""}`}>
      <Star filled={following} className="text-xl" />
    </button>
  );
}
