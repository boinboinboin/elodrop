"use client";

// Try the ratings on /how-it-works: two players' ratings on sliders, each one's chance of winning
// (a bar in the two sides' colours) and the points each would win or lose. The points are for a
// singles match at the top level (SEN A, K weight 100%) with a typical margin (21-15, 21-13), so
// K = κ · m(r): each player's own m(r) makes the two sides' changes differ. With the details on, the
// expected score and K of each side too.
import { useId, useState } from "react";
import { NerdOnly } from "@/components/how-it-works/NerdMode";
import { useI18n } from "@/messages/client";
import { SIDE_COLORS } from "@/utils/chart";
import { KAPPA, expectedScore, ratingMultiplier } from "@/utils/rating";

const MIN = 400;
const MAX = 2700;

export default function WinChance() {
  const { t, num, pct } = useI18n();
  const [ratings, setRatings] = useState<[number, number]>([1700, 1450]);
  const [a, b] = ratings;
  const ea = expectedScore(a, b);
  const k = [KAPPA * ratingMultiplier(a), KAPPA * ratingMultiplier(b)];
  // What each result moves: the winner's gain and the loser's loss, K · (S − E)
  const ifAWins = [k[0] * (1 - ea), k[1] * (1 - ea)];
  const ifBWins = [k[0] * ea, k[1] * ea];
  const sides = [
    { name: t("howItWorks.try.playerA"), rating: a, chance: ea, color: SIDE_COLORS[0] },
    { name: t("howItWorks.try.playerB"), rating: b, chance: 1 - ea, color: SIDE_COLORS[1] },
  ];

  return (
    <div className="bg-white p-4 sm:p-5 md:p-6">
      <h3 className="text-xl">{t("howItWorks.try.title")}</h3>
      <p className="text-sm text-gray-600 mb-5">{t("howItWorks.try.subtitle")}</p>
      <div className="grid gap-4 sm:grid-cols-2 sm:gap-8">
        {sides.map((s, i) => (
          <RatingSlider
            key={i}
            label={s.name}
            value={s.rating}
            color={s.color}
            onChange={(v) => setRatings(i === 0 ? [v, b] : [a, v])}
          />
        ))}
      </div>

      {/* The chances as one bar, A from the left and B from the right */}
      <div className="mt-6">
        <div className="flex justify-between text-sm mb-1">
          {sides.map((s, i) => (
            <span key={i} className="tabular-nums">
              <span className="font-semibold text-2xl">{pct(s.chance)}</span> <span className="text-gray-600">{s.name}</span>
            </span>
          ))}
        </div>
        <div className="flex h-3" role="img" aria-label={t("howItWorks.try.chances", { a: pct(ea), b: pct(1 - ea) })}>
          <span className="transition-[width] duration-150" style={{ width: `${ea * 100}%`, background: SIDE_COLORS[0] }} />
          <span className="flex-1" style={{ background: SIDE_COLORS[1] }} />
        </div>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-2">
        {[
          { label: t("howItWorks.try.ifWins", { name: sides[0].name }), gain: ifAWins[0], loss: ifAWins[1], winner: 0 },
          { label: t("howItWorks.try.ifWins", { name: sides[1].name }), gain: ifBWins[1], loss: ifBWins[0], winner: 1 },
        ].map((r) => (
          <div key={r.winner} className="bg-gray-50 p-4">
            <dt className="text-sm text-gray-600">{r.label}</dt>
            <dd className="tabular-nums">
              {t("howItWorks.try.change", { winner: sides[r.winner].name, gain: num(Math.round(r.gain)), loser: sides[1 - r.winner].name, loss: num(Math.round(r.loss)) })}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-gray-600 mt-4">{t("howItWorks.try.note")}</p>

      <NerdOnly>
        <dl className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-sm">
          <Value label="E_A" value={num(ea, 3)} />
          <Value label="E_B" value={num(1 - ea, 3)} />
          <Value label="K_A = κ·m(R_A)" value={num(k[0], 1)} />
          <Value label="K_B = κ·m(R_B)" value={num(k[1], 1)} />
        </dl>
      </NerdOnly>
    </div>
  );
}

function RatingSlider({ label, value, color, onChange }: { label: string; value: number; color: string; onChange: (v: number) => void }) {
  const { num } = useI18n();
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between">
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="w-3 h-3 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="font-semibold tabular-nums text-xl">{num(value)}</span>
      </label>
      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 cursor-pointer"
        style={{ accentColor: color }}
      />
    </div>
  );
}

const Value = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="tabular-nums">{value}</dd>
  </div>
);
