"use client";

// "Report a mistake about you", on the player page of the player the signed-in user has said is them, and only when the
// database would take a report: an account at least 30 days old, a claim at least 14 days old, reporting not ended
// for them nor switched off. Anyone else never sees it. What's wrong is picked from a fixed list, the detail from lists
// where there is one (their matches, loaded when it's chosen; their other player page, from the player search), with a
// short optional note. The database checks it all again and keeps them few (supabase/migrations: check_report).
import { type FormEvent, useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { ERROR, FIELD, HELP, LABEL, SUBMIT } from "@/components/account/form";
import PlayerPicker from "@/components/head-to-head/PlayerPicker";
import { useI18n } from "@/messages/client";
import type { Match, Pool } from "@/types";
import { accountError, daysSince, REPORT_ACCOUNT_DAYS, REPORT_CLAIM_DAYS } from "@/utils/account";

const KINDS = ["club", "match", "tournament", "duplicate", "birthYear"] as const;
type Kind = (typeof KINDS)[number];

export default function ReportMistake({ playerId, pools }: { playerId: number; pools: Pool[] }) {
  const { t, pools: poolNames, date } = useI18n();
  const { status, profile, createdAt, load } = useAccount();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("club");
  const [pool, setPool] = useState<Pool | null>(pools[0] ?? null);
  // The matches loaded, and the discipline they're from (another discipline chosen: loading again)
  const [loaded, setMatches] = useState<{ pool: Pool; list: Match[] } | null>(null);
  const matches = loaded && loaded.pool === pool ? loaded.list : null;
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligible =
    status === "ready" &&
    !!profile &&
    profile.player_id === playerId &&
    profile.can_report &&
    !!profile.player_claimed_at &&
    (profile.trusted || daysSince(profile.player_claimed_at) >= REPORT_CLAIM_DAYS) &&
    !!createdAt &&
    (profile.trusted || daysSince(createdAt) >= REPORT_ACCOUNT_DAYS);

  // Whether reports are switched on (the owner's switch), asked only for someone who could send one
  useEffect(() => {
    if (!eligible) return;
    let live = true;
    load()
      .then((client) => client.from("settings").select("value").eq("key", "reports_enabled").maybeSingle<{ value: boolean }>())
      .then(({ data }) => live && setEnabled(data?.value === true));
    return () => {
      live = false;
    };
  }, [eligible, load]);

  // Their matches in the discipline, when a match is what's wrong (cached by the CDN, as for "show all matches")
  useEffect(() => {
    if (!open || kind !== "match" || !pool) return;
    let live = true;
    fetch(`/api/players/${playerId}/matches?pool=${pool}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((list: Match[]) => live && setMatches({ pool, list }))
      .catch(() => live && setMatches({ pool, list: [] }));
    return () => {
      live = false;
    };
  }, [open, kind, pool, playerId]);

  if (!eligible || !enabled || !profile) return null;
  if (sent) return <p role="status" className="mt-4 text-gray-700">{t("account.report.sent")}</p>;
  if (!open)
    return (
      <p className="mt-4">
        <button type="button" onClick={() => setOpen(true)} className="underline hover:text-blue-600">{t("account.report.open")}</button>
      </p>
    );

  const send = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const value = (name: string) => String(form.get(name) ?? "").trim();
    const detail: Record<string, string | number> =
      kind === "club"
        ? { club: value("club") }
        : kind === "match"
          ? { pool: pool ?? "", match: value("match") }
          : kind === "tournament"
            ? { tournament: value("tournament") }
            : kind === "duplicate"
              ? { other: Number(value("other")) }
              : { birthYear: Number(value("birthYear")) };
    setBusy(true);
    setError(null);
    const client = await load();
    const { error } = await client.from("reports").insert({ user_id: profile.user_id, player_id: playerId, kind, detail, note: value("note") });
    setBusy(false);
    if (error) return setError(t(`account.errors.${accountError(error) ?? "unknown"}`));
    setSent(true);
  };

  return (
    <form onSubmit={send} className="mt-6 max-w-xl space-y-4 border border-black p-4">
      <h2 className="text-2xl">{t("account.report.title")}</h2>
      <p className="text-gray-700">{t("account.report.intro")}</p>
      <div>
        <label htmlFor="report-kind" className={LABEL}>{t("account.report.kind")}</label>
        <select id="report-kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={FIELD}>
          {KINDS.map((k) => (
            <option key={k} value={k}>{t(`account.report.kinds.${k}`)}</option>
          ))}
        </select>
      </div>
      {kind === "club" && <TextField name="club" label={t("account.report.club")} maxLength={60} />}
      {kind === "tournament" && <TextField name="tournament" label={t("account.report.tournament")} maxLength={80} />}
      {kind === "birthYear" && (
        <div>
          <label htmlFor="report-birthYear" className={LABEL}>{t("account.report.birthYear")}</label>
          <input id="report-birthYear" name="birthYear" type="number" required min={1900} max={new Date().getFullYear()} className={`${FIELD} max-w-32`} />
        </div>
      )}
      {kind === "duplicate" && <PlayerPicker name="other" label={t("account.report.duplicate")} initial={null} />}
      {kind === "match" && (
        <>
          <div>
            <label htmlFor="report-pool" className={LABEL}>{t("account.report.pool")}</label>
            <select id="report-pool" value={pool ?? ""} onChange={(e) => setPool(e.target.value as Pool)} className={FIELD}>
              {pools.map((p) => (
                <option key={p} value={p}>{poolNames[p]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="report-match" className={LABEL}>{t("account.report.match")}</label>
            {matches === null ? (
              <p className="text-gray-600">{t("account.report.loadingMatches")}</p>
            ) : (
              <select id="report-match" name="match" required className={FIELD}>
                {matches.map((m, i) => {
                  const label = `${date(m.day)} · ${m.event} · ${m.opponents.map((o) => o.name).join(" / ")} · ${m.score}`;
                  return (
                    <option key={m.key ?? i} value={label.slice(0, 200)}>{label}</option>
                  );
                })}
              </select>
            )}
          </div>
        </>
      )}
      <div>
        <label htmlFor="report-note" className={LABEL}>{t("account.report.note")}</label>
        <textarea id="report-note" name="note" maxLength={280} rows={3} className={`${FIELD} max-w-none`} />
        <p className={HELP}>{t("account.report.noteHelp")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy} className={SUBMIT}>{t(busy ? "account.report.sending" : "account.report.send")}</button>
        <button type="button" onClick={() => setOpen(false)} className={SUBMIT}>{t("account.report.cancel")}</button>
      </div>
      {error && <p role="alert" className={ERROR}>{error}</p>}
    </form>
  );
}

function TextField({ name, label, maxLength }: { name: string; label: string; maxLength: number }) {
  return (
    <div>
      <label htmlFor={`report-${name}`} className={LABEL}>{label}</label>
      <input id={`report-${name}`} name={name} required maxLength={maxLength} className={FIELD} />
    </div>
  );
}
