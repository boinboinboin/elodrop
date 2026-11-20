"use client";

// A line asking a signed-out visitor to sign in, with a link to the sign-in page ("Is this you? Sign in for…" on a
// player page, the draw notifications on an upcoming tournament). Nothing for anyone signed in (or while that's being
// read) or where the site has no accounts. The page around it is the same for everyone; only this changes, in the
// browser, and a visitor who has never signed in here gets it without loading the account code.
import { useAccount } from "@/components/account/AccountProvider";
import Link from "@/components/ui/Link";
import { TEXT_LINK } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { osloToday } from "@/utils/rounds";

interface Props {
  message: "account.prompts.player" | "account.prompts.draw";
  /** The last day it's shown (a tournament's end): checked here, as the static page doesn't know the day it's seen */
  until?: string | null;
  className?: string;
}

export default function SignInPrompt({ message, until, className = "" }: Props) {
  const { rich } = useI18n();
  const { status } = useAccount();
  if (status !== "signedOut" && status !== "noProfile") return null;
  // Only ever drawn in the browser (the status is "loading" on the server), so the day is the visitor's
  if (until && osloToday() > until) return null;
  return <p className={`text-gray-700 ${className}`}>{rich(message, { link: (text) => <Link href="/account" className={TEXT_LINK}>{text}</Link> })}</p>;
}
