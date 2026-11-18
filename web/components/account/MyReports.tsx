"use client";

// The user's error reports (ReportMistake) and where each stands, on the account page; only shown once they've sent one.
import { useEffect, useState } from "react";
import { useAccount } from "@/components/account/AccountProvider";
import { PART } from "@/components/account/form";
import { useI18n } from "@/messages/client";

interface Report {
  id: number;
  kind: "club" | "match" | "tournament" | "duplicate" | "birthYear";
  status: "open" | "accepted" | "declined";
  created_at: string;
}

export default function MyReports() {
  const { t, date } = useI18n();
  const { profile, load } = useAccount();
  const [reports, setReports] = useState<Report[]>([]);
  useEffect(() => {
    let live = true;
    load()
      .then((client) => client.from("reports").select("id, kind, status, created_at").order("created_at", { ascending: false }))
      .then(({ data }) => live && setReports((data as Report[] | null) ?? []));
    return () => {
      live = false;
    };
  }, [load]);
  if (!reports.length) return null;
  const declined = reports.filter((r) => r.status === "declined").length;
  return (
    <div className={PART}>
      <h2 className="text-2xl mb-3">{t("account.report.mine")}</h2>
      <ul className="space-y-2">
        {reports.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-x-4 border-b border-gray-100 pb-2">
            <span>{t(`account.report.kinds.${r.kind}`)} <span className="text-gray-600">· {date(r.created_at.slice(0, 10))}</span></span>
            <span className={r.status === "declined" ? "text-red-700" : r.status === "accepted" ? "text-green-700" : "text-gray-700"}>{t(`account.report.status.${r.status}`)}</span>
          </li>
        ))}
      </ul>
      {declined === 1 && profile?.can_report && <p className="text-sm text-gray-600 mt-3">{t("account.report.declinedNote")}</p>}
    </div>
  );
}
