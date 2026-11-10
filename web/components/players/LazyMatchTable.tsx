"use client";

// A match table in a player page's tab that isn't shown when the page opens (another discipline, or a highlight
// after the first): its matches are loaded from app/api/players/[id]/log once its tab is shown, instead of coming
// with the page. One request per discipline, shared by its tables, kept for the visit. Until then a box of about
// the table's height, so the page moves little when they arrive.
import { useEffect, useState } from "react";
import { BUTTON } from "@/components/ui/styles";
import { useTabShown } from "@/components/ui/Tabs";
import { useI18n } from "@/messages/client";
import type { PlayerLog } from "@/utils/playerLog";
import MatchTable from "./MatchTable";

type Props = Omit<React.ComponentProps<typeof MatchTable>, "matches"> & {
  /** The lists' address (with their version) */
  url: string;
  /** Which list */
  list: keyof PlayerLog;
};

const logs = new Map<string, Promise<PlayerLog>>();
function loadLog(url: string) {
  let log = logs.get(url);
  if (!log) {
    log = fetch(url).then((res) => (res.ok ? (res.json() as Promise<PlayerLog>) : Promise.reject(new Error(String(res.status)))));
    // A failed request can be tried again
    log.catch(() => logs.delete(url));
    logs.set(url, log);
  }
  return log;
}

export default function LazyMatchTable({ url, list, ...table }: Props) {
  const { t } = useI18n();
  const shown = useTabShown();
  const [log, setLog] = useState<PlayerLog | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!shown || log) return;
    let live = true;
    loadLog(url).then(
      (value) => live && setLog(value),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [shown, log, url, attempt]);

  if (log) return <MatchTable {...table} matches={log[list]} />;
  return (
    <div className={`${table.embedded ? "" : "bg-white p-4 md:p-6"} ${list === "recent" ? "min-h-[48rem]" : "min-h-80"}`}>
      {!table.embedded && table.title && <h3 className="text-xl mb-4">{table.title}</h3>}
      {failed ? (
        <button type="button" onClick={() => {
            setFailed(false);
            setAttempt(attempt + 1);
          }} className={`px-4 py-2 ${BUTTON}`}>{t("players.matches.loadFailed")}</button>
      ) : (
        <p className="text-gray-600" aria-live="polite">{t("players.matches.loadingMore")}</p>
      )}
    </div>
  );
}
