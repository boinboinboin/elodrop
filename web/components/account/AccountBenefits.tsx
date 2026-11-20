"use client";

// What an account gives you, as a list of ticks: on the sign-in page (each with a line on it), and the first few,
// titles only, on the front page's card for signed-out visitors (SignUpCard)
import { Check } from "@/components/SVG";
import { useI18n } from "@/messages/client";

const BENEFITS = ["overview", "notifications", "follow", "elostonk", "ideas", "mistakes"] as const;
/** How many the compact list shows */
const COMPACT = 4;

export default function AccountBenefits({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <ul className={compact ? "flex flex-col sm:flex-row sm:flex-wrap gap-x-8 gap-y-2" : "space-y-4"}>
      {(compact ? BENEFITS.slice(0, COMPACT) : BENEFITS).map((key) => (
        <li key={key} className="flex gap-3">
          <Check className="shrink-0 mt-1" />
          <div>
            <p className={compact ? "" : "font-semibold"}>{t(`account.benefits.${key}.title`)}</p>
            {!compact && <p className="text-gray-700">{t(`account.benefits.${key}.text`)}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
