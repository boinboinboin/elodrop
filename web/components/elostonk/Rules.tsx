"use client";

// EloStonk's How it works tab: each rule a numbered section in its colour, as the site's How it works page has them
// (NumberedHeading), then the note that it's free.
import NumberedHeading from "@/components/ui/NumberedHeading";
import { useI18n } from "@/messages/client";
import { PALETTE } from "@/utils/chart";

const PARTS = ["squad", "rounds", "points", "timing", "leagues"] as const;

export default function Rules() {
  const { t, blocks } = useI18n();
  return (
    <div className="grid gap-10 max-w-3xl">
      {PARTS.map((key, i) => (
        <section key={key} aria-labelledby={`rules-${key}`}>
          <NumberedHeading small id={`rules-${key}`} number={i + 1} color={PALETTE[i % 5]} title={t(`elostonk.rules.${key}.title`)} />
          <div className="grid gap-3 text-lg text-gray-800">{blocks(`elostonk.rules.${key}.text`)}</div>
        </section>
      ))}
      <p className="text-gray-600 border-t border-gray-300 pt-6">{t("elostonk.rules.note")}</p>
    </div>
  );
}
