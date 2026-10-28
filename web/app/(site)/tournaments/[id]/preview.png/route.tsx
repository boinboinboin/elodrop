// A tournament's link preview, at /tournaments/<id>/preview.png (for all its views and events): its
// name, dates, and its events and entries
import { previewCard } from "@/components/seo/PreviewCard";
import { getTournament } from "@/data/tournaments";
import { t } from "@/messages/i18n";
import { dateRange, num } from "@/utils/format";
import { parseId } from "@/utils/parse";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  const tour = id !== null ? await getTournament(id) : null;
  if (!tour) return new Response(null, { status: 404 });
  const entries = tour.events.reduce((sum, e) => sum + e.groups.reduce((n, g) => n + g.entries.length, 0), 0);
  return previewCard({
    kicker: t("seo.preview.tournament"),
    title: tour.name,
    subtitle: tour.startDate ? dateRange(tour.startDate, tour.endDate) : undefined,
    stats: [{ value: num(tour.events.length), label: t("seo.preview.events") }, ...(entries ? [{ value: num(entries), label: t("seo.preview.entries") }] : [])],
  });
}
