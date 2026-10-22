"use client";

// The header's menu: a button whose three lines turn into a cross, opening the site's links (on
// screens too narrow for them in the header, below xl) and the colour theme. On phones the menu is
// a panel under the whole header; from md a dropdown under the button. It closes on a link (the next
// page), a theme picked or Escape (focus back on the button), or a press outside it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import ThemePicker from "@/components/layout/ThemePicker";
import { t } from "@/messages/i18n";

export default function MenuButton({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const pathname = usePathname();
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  // Closed once the page changes (adjusted while rendering, not in an effect)
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    if (!open) return;
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

  const line = "absolute left-1/2 w-5 h-0.5 -ml-2.5 bg-current transition-transform duration-200";
  return (
    // Phones: positioned by the header (the panel spans it); from md by this, for the dropdown
    <div ref={root} className="flex md:relative">
      <button
        ref={button}
        type="button"
        onClick={() => {
          setOpen(!open);
          setOpenedAt(pathname);
        }}
        className="relative w-[42px] h-[42px] border border-black transition-colors duration-200 hover:bg-black hover:text-white cursor-pointer"
        aria-expanded={open}
        aria-controls={id}
        aria-label={t("layout.menu.button")}
      >
        <span aria-hidden="true" className={`${line} top-[13px] ${open ? "translate-y-1.5 rotate-45" : ""}`} />
        <span aria-hidden="true" className={`${line} top-[19px] transition-opacity ${open ? "opacity-0" : ""}`} />
        <span aria-hidden="true" className={`${line} top-[25px] ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
      </button>
      <div
        id={id}
        inert={!open}
        className={`absolute inset-x-0 top-full z-40 bg-white border-b border-gray-200 shadow-sm md:left-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-72 md:border transition-[opacity,translate] duration-200 ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
      >
        <div className="base-container px-4 py-2 md:px-5 md:py-3">
          <nav aria-label={t("layout.nav.label")} className="xl:hidden">
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className={`block py-3 text-lg md:text-base md:py-2 border-b border-gray-100 ${pathname === l.href ? "font-semibold" : "text-gray-700 hover:text-black"}`}
                    aria-current={pathname === l.href ? "page" : undefined}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section className="pt-4 pb-2 xl:pt-1">
            <h2 className="text-sm text-gray-600 mb-2">{t("layout.menu.theme")}</h2>
            {/* Picking a theme closes the menu, with focus back on its button */}
            <ThemePicker
              onPick={() => {
                setOpen(false);
                button.current?.focus();
              }}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
