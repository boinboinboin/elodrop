// What a page shows while its data loads (a Suspense fallback)
import { t } from "@/messages/i18n";

export default function Loading({ label = t("common.loading"), section = false }: { label?: string; section?: boolean }) {
  return <div className={`base-container px-4 ${section ? "base-section " : ""}text-gray-600`}>{label}</div>;
}
