"use client";

// "You" by the name on the player page of the player the signed-in user has said is them (account page: "This is me").
// Only they see it: the claim is private, and the page itself is the same for everyone.
import { useAccount } from "@/components/account/AccountProvider";
import Badge from "@/components/ui/Badge";
import { useI18n } from "@/messages/client";

export default function YouBadge({ playerId }: { playerId: number }) {
  const { t } = useI18n();
  const { profile } = useAccount();
  if (profile?.player_id !== playerId) return null;
  return <Badge className="ml-3 align-middle tracking-normal">{t("account.me.you")}</Badge>;
}
