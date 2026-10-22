// One week's biggest upsets (/upsets/2026-10-12) or a year's newest week (/upsets/2019), with the
// biggest upset of every week of that year.
import type { Metadata } from "next";
import Upsets from "@/components/upsets/Upsets";
import { getUpsetsIndex } from "@/data/upsets";
import { t } from "@/messages/i18n";
import { addDays, dateRange } from "@/utils/format";

// Every year is prerendered; weeks are rendered on their first visit and then cached
export async function generateStaticParams() {
  const years = (await getUpsetsIndex())?.years ?? [];
  return years.length ? years.map((period) => ({ period })) : [{ period: "0" }];
}

export async function generateMetadata({ params }: PageProps<"/upsets/[period]">): Promise<Metadata> {
  const { period } = await params;
  if (/^\d{4}$/.test(period)) return { title: t("upsets.metadata.year", { year: period }) };
  return { title: /^\d{4}-\d{2}-\d{2}$/.test(period) ? t("upsets.metadata.week", { week: dateRange(period, addDays(period, 6)) }) : t("upsets.metadata.title") };
}

export default function UpsetPeriodPage(props: PageProps<"/upsets/[period]">) {
  return <Upsets period={props.params.then((p) => p.period)} />;
}
