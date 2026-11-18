"use client";

// EloStonk's statistics for a round that has started (newest first, any to pick), from everyone's locked squads: how
// many played and their average and best score, the most picked and most captained players, the best picks (the
// most points, with how many had them) and the best players nobody picked ("the stonks nobody bought").
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { newestScoredRound, useStonkPlayers } from "@/components/elostonk/useStonk";
import Link from "@/components/ui/Link";
import LinkSelect from "@/components/ui/LinkSelect";
import StatCard from "@/components/ui/StatCard";
import { ROW } from "@/components/ui/styles";
import { useI18n } from "@/messages/client";
import { toneClass } from "@/utils/format";
import { playerHref } from "@/utils/hrefs";
import { currentRound } from "@/utils/rounds";

interface Owned {
  player_id: number;
  name: string | null;
  picks: number;
  captains: number;
  picked_pct: number;
  points: number;
}

export default function Stats() {
  const { t, num, signed, date, pct } = useI18n();
  const { load } = useAccount();
  const players = useStonkPlayers();
  const [rounds, setRounds] = useState<string[]>([]);
  const [round, setRound] = useState<string | null>(null);
  const [owned, setOwned] = useState<Owned[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [unpicked, setUnpicked] = useState<{ player_id: number; points: number }[]>([]);

  useEffect(() => {
    let live = true;
    void load().then(async (client) => {
      const [{ data }, newest] = await Promise.all([client.from("stonk_rounds").select("round").lte("round", currentRound()).order("round", { ascending: false }), newestScoredRound(client)]);
      if (!live) return;
      const list = ((data as { round: string }[] | null) ?? []).map((r) => r.round);
      setRounds(list);
      // The newest round with points first (the one under way has none until its first results)
      setRound((r) => r ?? newest ?? list[0] ?? null);
    });
    return () => {
      live = false;
    };
  }, [load]);

  useEffect(() => {
    if (!round) return;
    let live = true;
    void load().then(async (client) => {
      const [o, s, p] = await Promise.all([
        client.from("stonk_ownership").select("player_id, name, picks, captains, picked_pct, points").eq("round", round),
        client.from("stonk_round_scores").select("points").eq("round", round),
        client.from("stonk_points").select("player_id, points").eq("round", round).order("points", { ascending: false }).limit(50),
      ]);
      if (!live) return;
      const own = ((o.data as Owned[] | null) ?? []).map((x) => ({ ...x, picked_pct: Number(x.picked_pct), points: Number(x.points) }));
      setOwned(own);
      setScores(((s.data as { points: number }[] | null) ?? []).map((x) => Number(x.points)));
      const ownedIds = new Set(own.map((x) => x.player_id));
      setUnpicked(((p.data as { player_id: number; points: number }[] | null) ?? []).map((x) => ({ ...x, points: Number(x.points) })).filter((x) => !ownedIds.has(x.player_id)).slice(0, 5));
    });
    return () => {
      live = false;
    };
  }, [load, round]);

  const nameOf = (id: number, name?: string | null) => name ?? players?.byId.get(id)?.name ?? `#${id}`;
  const top = (list: Owned[], by: (o: Owned) => number) => [...list].sort((a, b) => by(b) - by(a)).filter((o) => by(o) > 0).slice(0, 5);
  const average = scores.length ? scores.reduce((s, x) => s + x, 0) / scores.length : null;

  if (!rounds.length) return <p className="text-gray-600">{t("elostonk.stats.none")}</p>;
  return (
    <div>
      <LinkSelect
        label={t("elostonk.board.round")}
        current={round ?? ""}
        onSelect={setRound}
        options={rounds.map((r) => ({ key: r, label: t("elostonk.squad.roundOf", { date: date(r) }) }))}
        className="mb-6 w-full sm:w-72"
      />
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <StatCard label={t("elostonk.stats.managers")}>{num(scores.length)}</StatCard>
        <StatCard label={t("elostonk.stats.average")}>{average === null ? "–" : signed(Math.round(average * 10) / 10, 1)}</StatCard>
        <StatCard label={t("elostonk.stats.best")}>{scores.length ? signed(Math.max(...scores), 1) : "–"}</StatCard>
      </dl>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <List title={t("elostonk.stats.mostPicked")} rows={top(owned, (o) => o.picks).map((o) => ({ id: o.player_id, name: nameOf(o.player_id, o.name), value: pct(o.picked_pct / 100) }))} />
        <List title={t("elostonk.stats.mostCaptained")} rows={top(owned, (o) => o.captains).map((o) => ({ id: o.player_id, name: nameOf(o.player_id, o.name), value: num(o.captains) }))} />
        <List
          title={t("elostonk.stats.bestPicks")}
          rows={top(owned, (o) => o.points).map((o) => ({ id: o.player_id, name: nameOf(o.player_id, o.name), value: signed(o.points, 1), detail: t("elostonk.stats.pickedBy", { pct: pct(o.picked_pct / 100) }), tone: o.points }))}
        />
        <List
          title={t("elostonk.stats.unbought")}
          help={t("elostonk.stats.unboughtHelp")}
          rows={unpicked.map((u) => ({ id: u.player_id, name: nameOf(u.player_id), value: signed(u.points, 1), tone: u.points }))}
        />
      </div>
    </div>
  );
}

function List({ title, help, rows }: { title: string; help?: string; rows: { id: number; name: string; value: string; detail?: string; tone?: number }[] }) {
  const { t } = useI18n();
  return (
    <div className="bg-white p-4 min-w-0">
      <h3 className="text-sm text-gray-600 mb-2">{title}</h3>
      {rows.length ? (
        <ol>
          {rows.map((r) => (
            <li key={r.id} className={`${ROW} flex justify-between gap-3 py-1.5`}>
              <span className="min-w-0">
                <Link href={playerHref(r.id)} className="font-semibold hover:text-blue-600 break-words">{r.name}</Link>
                {r.detail && <span className="block text-sm text-gray-600">{r.detail}</span>}
              </span>
              <span className={`tabular-nums whitespace-nowrap ${r.tone === undefined ? "" : toneClass(r.tone)}`}>{r.value}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-gray-400">{t("elostonk.stats.empty")}</p>
      )}
      {help && <p className="text-xs text-gray-500 mt-2">{help}</p>}
    </div>
  );
}
