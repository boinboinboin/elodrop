"use client";

// What typing on the site (outside its fields) can set off: the Konami code (↑↑↓↓←→←→BA) lets
// shuttles rain down, "smash" sends one across the screen at the record smash's speed. In a layer
// above the page that clicks go through. With reduced motion nothing moves: the shuttles and the
// speed fade in and out where they are.
import { type CSSProperties, useEffect, useState } from "react";
import { useI18n } from "@/messages/client";
import Shuttle from "./Shuttle";

const KONAMI = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
const SMASH = "smash";
const RAIN_SHUTTLES = 36;
// The longest a shuttle takes, its delay and fall (below), and then some
const RAIN_MS = 5000;
const SMASH_MS = 2200;

type Drop = { left: number; top: number; delay: number; duration: number; size: number; tilt: number };

const makeRain = (): Drop[] =>
  Array.from({ length: RAIN_SHUTTLES }, () => ({
    left: Math.random() * 96,
    top: 5 + Math.random() * 80,
    delay: Math.random() * 1.5,
    duration: 1.8 + Math.random() * 1.4,
    size: 20 + Math.random() * 20,
    tilt: Math.random() * 50 - 25,
  }));

/** Typing in a field (the search) doesn't count */
const inField = (target: EventTarget | null) => target instanceof HTMLElement && (target.isContentEditable || !!target.closest("input, textarea, select"));

export default function KeyEggs() {
  const { t } = useI18n();
  const [rain, setRain] = useState<{ id: number; drops: Drop[] } | null>(null);
  const [smash, setSmash] = useState<number | null>(null);

  useEffect(() => {
    let keys: string[] = [];
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || inField(e.target)) return;
      keys = [...keys, e.key.toLowerCase()].slice(-KONAMI.length);
      const id = Date.now();
      if (KONAMI.every((k, i) => keys[i] === k)) {
        keys = [];
        setRain({ id, drops: makeRain() });
        setTimeout(() => setRain((r) => (r?.id === id ? null : r)), RAIN_MS);
      } else if (keys.slice(-SMASH.length).join("") === SMASH) {
        keys = [];
        setSmash(id);
        setTimeout(() => setSmash((s) => (s === id ? null : s)), SMASH_MS);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!rain && !smash) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {rain?.drops.map((d, i) => (
        <Shuttle
          key={`${rain.id}-${i}`}
          className="absolute top-0 motion-reduce:top-(--egg-top) text-gray-700 animate-egg-fall motion-reduce:animate-egg-fade"
          width={d.size}
          height={d.size}
          style={{ left: `${d.left}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.duration}s`, "--egg-top": `${d.top}%`, "--egg-tilt": `${d.tilt}deg` } as CSSProperties}
        />
      ))}
      {smash && (
        <div key={smash}>
          {/* Cork first, down across the screen */}
          <div className="absolute left-0 top-[15%] animate-egg-smash motion-reduce:hidden">
            <Shuttle className="-rotate-60 text-gray-700" width={44} height={44} />
          </div>
          <p className="absolute inset-x-0 top-1/3 text-center font-mono text-5xl sm:text-7xl font-semibold tracking-tight text-accent animate-egg-fade [animation-duration:2s]">
            {t("layout.easterEggs.smashSpeed")}
          </p>
        </div>
      )}
    </div>
  );
}
