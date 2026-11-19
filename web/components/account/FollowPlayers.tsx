"use client";

// Following players by name, for a new account's first steps (Welcome): the player search (as "This is me" has), a
// button to follow the one chosen, and the players followed so far in the front page's table, each with a cross to stop
// following. Elsewhere players are followed with the star on their page (FollowButton).
import { type FormEvent, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import FollowedTable from "@/components/account/FollowedTable";
import { PART, SUBMIT } from "@/components/account/form";
import { useFollowedPlayers } from "@/components/account/useFollowed";
import PlayerPicker from "@/components/head-to-head/PlayerPicker";
import { useI18n } from "@/messages/client";

export default function FollowPlayers() {
  const { t } = useI18n();
  const { follows, toggleFollow } = useAccount();
  const { players, me } = useFollowedPlayers();
  // A new key empties the search field after following
  const [round, setRound] = useState(0);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const id = Number(new FormData(e.currentTarget).get("follow"));
    if (!(id > 0)) return;
    if (!follows.has(`player:${id}`)) void toggleFollow("player", id);
    setRound(round + 1);
  };

  return (
    <div className={PART}>
      <h2 className="text-2xl mb-2">{t("account.welcome.followTitle")}</h2>
      <p className="text-gray-700 mb-4">{t("account.welcome.followIntro")}</p>
      <form onSubmit={submit} className="max-w-sm space-y-3 mb-6">
        <PlayerPicker key={round} name="follow" label={t("account.welcome.followLabel")} initial={null} />
        <button type="submit" className={SUBMIT}>{t("account.welcome.followButton")}</button>
      </form>
      {players && <FollowedTable players={players} me={me} unfollow />}
    </div>
  );
}
