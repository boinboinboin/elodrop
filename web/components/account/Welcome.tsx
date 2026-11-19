"use client";

// A new account's first steps, right after it's made (AccountPage): who they are among the players ("This is me", the
// Settings tab's part; not required, as a member needn't be a player), notifications on this device (only with a
// player: they're about the player's draws), players to follow, and a first EloStonk squad (the game's own squad
// picking), then the end. Every step can be skipped, and all of it can be changed later (Settings, the players' stars,
// the game's page). Shown once, in the visit the account is made in (nothing is stored for it).
import { useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import FollowPlayers from "@/components/account/FollowPlayers";
import { PART, SUBMIT } from "@/components/account/form";
import MeSettings from "@/components/account/MeSettings";
import NotificationSettings from "@/components/account/NotificationSettings";
import SquadPicker from "@/components/elostonk/SquadPicker";
import Badge from "@/components/ui/Badge";
import { useI18n } from "@/messages/client";
import { VAPID_PUBLIC_KEY } from "@/utils/push";

type Step = "me" | "notifications" | "follow" | "stonk" | "done";

export default function Welcome({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { profile, follows } = useAccount();
  const [step, setStep] = useState<Step>("me");
  const [squadSaved, setSquadSaved] = useState(false);
  if (!profile) return null;
  const steps: Step[] = ["me", ...(profile.player_id !== null && VAPID_PUBLIC_KEY ? (["notifications"] as const) : []), "follow", "stonk", "done"];
  const index = steps.indexOf(step);
  const next = () => {
    setStep(steps[index + 1]);
    window.scrollTo({ top: 0 });
  };
  // Done with the step: "Next"; nothing done in it yet: "Skip"
  const done = { me: profile.player_id !== null, notifications: true, follow: [...follows].some((f) => f.startsWith("player:")), stonk: squadSaved, done: true }[step];
  const nextButton = (skip = t("account.welcome.skip")) => (
    <div className="mt-6">
      <button type="button" onClick={next} className={`${SUBMIT} ${done ? "bg-black text-white" : ""}`}>{done ? t("account.welcome.next") : skip}</button>
    </div>
  );

  return (
    <div className="max-w-3xl">
      <h2 className="text-3xl mb-1">{t("account.welcome.title", { name: profile.nickname })}</h2>
      <p className="text-sm text-gray-600 mb-8">{t("account.welcome.step", { step: index + 1, of: steps.length })}</p>

      {step === "me" && (
        <>
          <MeSettings />
          {nextButton(t("account.welcome.notPlayer"))}
        </>
      )}

      {step === "notifications" && (
        <>
          <NotificationSettings />
          {nextButton()}
        </>
      )}

      {step === "follow" && (
        <>
          <FollowPlayers />
          {nextButton()}
        </>
      )}

      {step === "stonk" && (
        <>
          <div className={PART}>
            <h2 className="text-2xl mb-2">
              EloStonk <Badge className="align-middle">{t("layout.nav.beta")}</Badge>
            </h2>
            <p className="text-gray-700 mb-4">{t("account.welcome.stonkIntro")}</p>
            {nextButton()}
          </div>
          <div className="mt-8">
            <SquadPicker onSaved={() => setSquadSaved(true)} />
          </div>
          {nextButton()}
        </>
      )}

      {step === "done" && (
        <>
          <h2 className="text-2xl mb-2">{t("account.welcome.doneTitle")}</h2>
          <p className="text-gray-700 mb-6">{t("account.welcome.settings")}</p>
          <button type="button" onClick={onDone} className={`${SUBMIT} bg-black text-white`}>{t("account.welcome.finish")}</button>
        </>
      )}
    </div>
  );
}
