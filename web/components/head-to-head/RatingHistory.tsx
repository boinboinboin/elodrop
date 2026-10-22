// Both sides' rating histories in one chart, under a heading, inside a comparison's box
import LineChart, { type ChartSeries } from "@/components/charts/LineChart";

export default function RatingHistory({ title, intro, series, label }: { title: string; intro: string; series: ChartSeries[]; label?: string }) {
  return (
    <>
      <h4 className="text-lg mt-8 mb-1">{title}</h4>
      <p className="text-sm text-gray-600 mb-4">{intro}</p>
      <LineChart series={series} label={label} className="relative h-72" />
    </>
  );
}
