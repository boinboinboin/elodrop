"use client";

// A cross at the end of a row on the account page's Following list: stop following that player or club. Grey until
// hovered, as the search fields' clear button, with a finger-sized target.
import { useAccount } from "@/components/account/AccountProvider";
import { Cross } from "@/components/SVG";
import { useI18n } from "@/messages/client";
import type { FollowKind } from "@/utils/account";

export default function UnfollowButton({ kind, target, name }: { kind: FollowKind; target: string | number; name: string }) {
  const { t } = useI18n();
  const { toggleFollow } = useAccount();
  const label = t("account.follow.unfollow", { name });
  return (
    <button
      type="button"
      onClick={() => void toggleFollow(kind, target)}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center w-10 h-10 text-gray-500 hover:text-black cursor-pointer"
    >
      <Cross className="text-xl" />
    </button>
  );
}
