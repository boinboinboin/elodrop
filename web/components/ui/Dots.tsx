"use client";

// A dot per position, the current one filled, each a 24px button (a size a finger can tap) around the small dot that
// shows: the Carousel's positions and the swiped Tabs' tabs (components/ui/Tabs.tsx `swipe`). `button(i)` adds each
// dot's own attributes (its label, a tab's role and ids). On the narrowest phones many dots wrap.
import type { ButtonHTMLAttributes, HTMLAttributes } from "react";

interface Props extends Omit<HTMLAttributes<HTMLDivElement>, "onSelect"> {
  count: number;
  current: number;
  onSelect: (i: number) => void;
  button: (i: number) => ButtonHTMLAttributes<HTMLButtonElement> & { ref?: (el: HTMLButtonElement | null) => void };
}

export default function Dots({ count, current, onSelect, button, className = "", ...props }: Props) {
  return (
    <div className={`flex flex-wrap min-w-0 -mx-1.5 ${className}`} {...props}>
      {Array.from({ length: count }, (_, i) => (
        <button key={i} type="button" onClick={() => onSelect(i)} className="group w-6 h-6 flex items-center justify-center cursor-pointer" {...button(i)}>
          <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full transition-colors duration-200 ${i === current ? "bg-black" : "bg-gray-300 group-hover:bg-gray-500"}`} />
        </button>
      ))}
    </div>
  );
}
