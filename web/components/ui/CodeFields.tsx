"use client";

// A short code typed one character per box (EloStonk's league codes): letters and digits only, in capitals. Typing moves
// to the next box, Backspace in an empty box goes back to the one before, the arrow keys move, and pasting fills the
// boxes from the one pasted into. `value` is the code so far (spaces where a box is empty).
import { type ClipboardEvent, type KeyboardEvent, useRef } from "react";

const clean = (text: string) => text.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function CodeFields({ id, length, value, onChange, label }: { id: string; length: number; value: string; onChange: (value: string) => void; label: string }) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const chars = Array.from({ length }, (_, i) => value[i]?.trim() ?? "");
  const focus = (i: number) => boxes.current[Math.max(0, Math.min(length - 1, i))]?.focus();
  const set = (at: number, text: string) => {
    const next = [...chars];
    for (let i = 0; i < text.length && at + i < length; i++) next[at + i] = text[i];
    onChange(next.map((c) => c || " ").join("").trimEnd());
  };

  const type = (i: number, raw: string) => {
    const text = clean(raw);
    if (!text) return set(i, " ");
    // A box already filled gets the character typed last
    set(i, text.length > 1 && chars[i] ? text.slice(-1) : text);
    focus(i + (text.length > 1 && chars[i] ? 1 : text.length));
  };
  const key = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !chars[i] && i > 0) {
      e.preventDefault();
      set(i - 1, " ");
      focus(i - 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(i + 1);
    }
  };
  const paste = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = clean(e.clipboardData.getData("text"));
    if (!text) return;
    set(i, text);
    focus(i + text.length);
  };

  return (
    <div className="flex gap-2" role="group" aria-label={label}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el;
          }}
          id={i === 0 ? id : undefined}
          value={c}
          onChange={(e) => type(i, e.target.value)}
          onKeyDown={(e) => key(i, e)}
          onPaste={(e) => paste(i, e)}
          onFocus={(e) => e.target.select()}
          aria-label={`${label} ${i + 1}/${length}`}
          inputMode="text"
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-12 h-12 text-center text-xl font-mono uppercase border border-black bg-white"
        />
      ))}
    </div>
  );
}
