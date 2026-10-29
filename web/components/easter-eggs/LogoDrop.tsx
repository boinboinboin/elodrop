"use client";

// The logo's hidden drop: five quick clicks on it and a rating change falls off the dip, an elo drop.
// The header stays mounted while navigating, so the clicks that take you home count too. With
// reduced motion the number only fades in and out where it is.
import { type ReactNode, useRef, useState } from "react";

const CLICKS = 5;
const WITHIN_MS = 800;

export default function LogoDrop({ children }: { children: ReactNode }) {
  const clicks = useRef({ count: 0, last: 0 });
  const [drops, setDrops] = useState<{ id: number; points: number }[]>([]);

  const onClick = () => {
    const now = Date.now();
    const c = clicks.current;
    c.count = now - c.last < WITHIN_MS ? c.count + 1 : 1;
    c.last = now;
    if (c.count < CLICKS) return;
    c.count = 0;
    setDrops((d) => [...d, { id: now, points: 8 + Math.floor(Math.random() * 25) }]);
  };

  return (
    <span className="relative flex items-center gap-1" onClick={onClick}>
      {children}
      {drops.map((d) => (
        <span
          key={d.id}
          aria-hidden="true"
          className="pointer-events-none absolute left-5 top-6 font-mono text-sm font-semibold text-accent animate-egg-drop motion-reduce:animate-egg-fade"
          onAnimationEnd={() => setDrops((ds) => ds.filter((x) => x.id !== d.id))}
        >
          −{d.points}
        </span>
      ))}
    </span>
  );
}
