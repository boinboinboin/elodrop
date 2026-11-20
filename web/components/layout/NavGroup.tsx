"use client";

// A group of the header's links (from xl, where the links are in the header): its name with a caret, opening a
// dropdown of its pages ("Players": rankings, head to head, upsets), the current one bold with a check, as in a
// LinkSelect. Below xl the same groups are headings in the menu (MenuButton). It closes on a link, Escape (focus back on
// the button) or a press outside it (useDropdown).
import { useId } from "react";
import { CaretDown, Check } from "@/components/SVG";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { dropdownItem, dropdownPanel } from "@/components/ui/styles";
import { useDropdown } from "@/components/ui/useDropdown";
import { splitLanguage } from "@/messages/i18n";

/** A page in the header and the menu */
export interface NavLink {
  href: string;
  label: string;
  /** A tag after the label ("Beta") */
  badge?: string;
}
/** A group of them, under its name */
export interface NavGroupEntry {
  label: string;
  links: NavLink[];
}
export type NavEntry = NavLink | NavGroupEntry;

export default function NavGroup({ label, links }: NavGroupEntry) {
  const { open, root, button, pathname, toggle, close } = useDropdown();
  const id = useId();
  // The links are without a language ("/en/rankings" → "/rankings")
  const path = splitLanguage(pathname).path;
  // The page it's on, also under it ("/rankings/women"); the group's name in black then
  const current = links.find((l) => path === l.href || path.startsWith(`${l.href}/`))?.href;
  const inGroup = current !== undefined;
  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={id}
        className={`link-host inline-flex items-center gap-1.5 cursor-pointer hover:text-black ${open || inGroup ? "text-black" : ""}`}
      >
        <span className="link-group">{label}</span>
        <CaretDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {/* Just under the header's bottom edge (its padding and the space around this in its row below) */}
      <div id={id} inert={!open} className={`absolute -left-4 top-[calc(100%+1.625rem)] z-40 min-w-48 ${dropdownPanel(open)}`}>
        <ul className="py-1">
          {links.map((l) => (
            <li key={l.href} className="border-b border-gray-100 last:border-0">
              <Link href={l.href} onClick={close} className={dropdownItem(l.href === current)} aria-current={l.href === current ? "page" : undefined}>
                <span className="inline-flex items-center gap-1.5">
                  <span className="link-group">{l.label}</span>
                  {l.badge && <Badge className="font-normal">{l.badge}</Badge>}
                </span>
                {l.href === current && <Check className="w-4 h-4" />}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
