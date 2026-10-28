"use client";

// What a page shows while its data loads (a Suspense fallback)
import { useI18n } from "@/messages/client";

export default function Loading({ label, section = false }: { label?: string; section?: boolean }) {
  const { t } = useI18n();
  return <div className={`base-container px-4 ${section ? "base-section " : ""}text-gray-600`}>{label ?? t("common.loading")}</div>;
}
