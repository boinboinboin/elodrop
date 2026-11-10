"use client";

// When the pipeline last finished fetching, rating and building the site's data, in Norwegian time. Loaded in the
// browser (app/api/updated), so the pages don't depend on meta.json and aren't all built again after each run.
import { useEffect, useState } from "react";
import { useI18n } from "@/messages/client";

let request: Promise<string | null> | null = null;
/** One request per visit, shared by every page opened */
const loadUpdated = () =>
  (request ??= fetch("/api/updated")
    .then((res) => (res.ok ? res.json() : { updated: null }))
    .then((data: { updated: string | null }) => data.updated)
    .catch(() => {
      request = null;
      return null;
    }));

export default function UpdatedAt() {
  const { t, dateTime } = useI18n();
  const [updated, setUpdated] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    loadUpdated().then((value) => live && setUpdated(value));
    return () => {
      live = false;
    };
  }, []);
  // The line keeps its height while it loads, so the footer doesn't move
  return <p aria-live="polite">{updated ? t("layout.footer.updated", { time: dateTime(updated) }) : " "}</p>;
}
