"use client";

// The team of a round: the best squad anyone could have picked, within the rules (rules.ts: at most 2 from one club, a
// man and a woman), with the best of them captain (counted twice). Found among the round's 30 best scorers
// (stonk_points, with the players' clubs and genders from stonk_players) by trying every 5 of them (about 140,000, a
// blink). Shown in the statistics (Stats) and beside the member's own squad in their rounds (Squad), with `yours` their
// score to compare.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { followsRules } from "@/components/elostonk/rules";
import SquadLine from "@/components/elostonk/SquadLine";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";

const POOL = 30;
const SIZE = 5;

interface Candidate {
  id: number;
  name: string;
  club: string | null;
  gender: "M" | "K" | null;
  points: number;
}

/** The best 5 within the rules (best first, so the first is captain), or null if none */
export function bestSquad(candidates: Candidate[]): { squad: Candidate[]; total: number } | null {
  const sorted = [...candidates].sort((a, b) => b.points - a.points);
  const n = sorted.length;
  let best: { squad: Candidate[]; total: number } | null = null;
  const pick: Candidate[] = [];
  const walk = (from: number, sum: number) => {
    if (pick.length === SIZE) {
      // The first picked is the best of them: the captain, counted twice
      const total = sum + pick[0].points;
      if ((!best || total > best.total) && followsRules(pick)) best = { squad: [...pick], total };
      return;
    }
    for (let i = from; i <= n - (SIZE - pick.length); i++) {
      // The rest can't do better than the next ones in order (sorted): stop when even they fall short
      const rest = sorted.slice(i, i + SIZE - pick.length).reduce((s, c) => s + c.points, 0);
      const captain = pick.length ? pick[0].points : sorted[i].points;
      if (best && sum + rest + captain <= best.total) return;
      pick.push(sorted[i]);
      walk(i + 1, sum + sorted[i].points);
      pick.pop();
    }
  };
  walk(0, 0);
  return best;
}

export default function TeamOfRound({ round, yours }: { round: string; yours?: number }) {
  const { t, signed } = useI18n();
  const { load } = useAccount();
  const [team, setTeam] = useState<{ squad: Candidate[]; total: number } | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void load().then(async (client) => {
      const { data: top } = await client.from("stonk_points").select("player_id, points").eq("round", round).order("points", { ascending: false }).limit(POOL);
      const rows = (top as { player_id: number; points: number }[] | null) ?? [];
      const { data: info } = rows.length
        ? await client.from("stonk_players").select("player_id, name, club, gender").in("player_id", rows.map((r) => r.player_id))
        : { data: [] };
      const byId = new Map(((info as { player_id: number; name: string; club: string | null; gender: "M" | "K" | null }[] | null) ?? []).map((p) => [p.player_id, p]));
      const candidates = rows.flatMap((r) => {
        const p = byId.get(r.player_id);
        return p ? [{ id: r.player_id, name: p.name, club: p.club, gender: p.gender, points: Number(r.points) }] : [];
      });
      if (live) setTeam(bestSquad(candidates));
    });
    return () => {
      live = false;
    };
  }, [load, round]);

  if (!team) return team === null ? <p className="text-sm text-gray-600">{t("elostonk.teamOfRound.none")}</p> : null;
  return (
    <div>
      <p className="text-sm text-gray-600 mb-2">
        {t("elostonk.teamOfRound.title")}: <span className={`font-semibold tabular-nums ${toneClass(team.total)}`}>{signed(team.total, 1)}</span>
        {yours !== undefined && <> · {t("elostonk.teamOfRound.yours")}: <span className={`font-semibold tabular-nums ${toneClass(yours)}`}>{signed(yours, 1)}</span></>}
      </p>
      <SquadLine
        players={team.squad.map((c) => c.id)}
        captain={team.squad[0].id}
        points={new Map(team.squad.map((c) => [c.id, c.points]))}
        names={new Map(team.squad.map((c) => [c.id, c.name]))}
      />
    </div>
  );
}
