// Switch between the two head-to-head pages: two players, or two doubles pairs.
import LinkTabs from "@/components/ui/LinkTabs";
import { t } from "@/messages/i18n";

export default function HeadToHeadSwitch({ current }: { current: "players" | "pairs" }) {
  return (
    <LinkTabs
      label={t("headToHead.switch.label")}
      current={current}
      className="flex gap-2 mt-6"
      tabs={[
        { key: "players", href: "/head-to-head", label: t("headToHead.switch.players") },
        { key: "pairs", href: "/head-to-head/doubles", label: t("headToHead.switch.pairs") },
      ]}
    />
  );
}
