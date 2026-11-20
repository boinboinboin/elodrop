"use client";

// A button's dropdown, opened and closed: the header's menu (MenuButton), a list of pages (LinkSelect) and the
// header's groups of links (NavGroup). It closes on Escape (focus back on the button), a press outside `root`, or once
// the page changes (a link followed); closing it on a link pressed, to a page already shown, is up to its caller.
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function useDropdown<Button extends HTMLElement = HTMLButtonElement>(onOpen?: () => void) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<Button>(null);
  // Closed once the page changes (adjusted while rendering, not in an effect)
  if (open && openedAt !== pathname) setOpen(false);
  // The latest onOpen, without opening again when it changes
  const opened = useRef(onOpen);
  useEffect(() => {
    opened.current = onOpen;
  });

  useEffect(() => {
    if (!open) return;
    opened.current?.();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return {
    open,
    root,
    button,
    pathname,
    toggle: () => {
      setOpen(!open);
      setOpenedAt(pathname);
    },
    close: () => setOpen(false),
  };
}
