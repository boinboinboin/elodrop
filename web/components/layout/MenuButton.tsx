"use client";

// The header's menu: a button whose three lines turn into a cross, opening the site's links (on
// screens too narrow for them in the header, below xl), the pages about the site, the colour theme and the language,
// and installing the site as an app where it can be (InstallApp). On phones the menu is
// a panel under the whole header; from md a dropdown under the button. It closes on a link (the next
// page), a theme picked or Escape (focus back on the button), or a press outside it. The header's groups of links
// (NavGroup) are listed here under their headings.
import { useId } from "react";
import InstallApp from "@/components/layout/InstallApp";
import LanguagePicker from "@/components/layout/LanguagePicker";
import type { NavEntry, NavGroupEntry, NavLink } from "@/components/layout/NavGroup";
import { usePublishedPages, type WrittenPageKey } from "@/components/layout/PublishedPages";
import ThemePicker from "@/components/layout/ThemePicker";
import Badge from "@/components/ui/Badge";
import Link from "@/components/ui/Link";
import { useDropdown } from "@/components/ui/useDropdown";
import { useI18n } from "@/messages/client";
import { splitLanguage } from "@/messages/i18n";

interface MenuLink extends NavLink {
  /** Small text after the label ("v1.15.0") */
  detail?: string;
  /** A page written in the Studio: linked only once it's published (./PublishedPages.tsx) */
  page?: WrittenPageKey;
}

export default function MenuButton({ links: entries, about: allAbout }: { links: NavEntry[]; about: MenuLink[] }) {
  const published = usePublishedPages();
  const about = allAbout.filter((l) => !l.page || published[l.page]);
  const { t } = useI18n();
  const { open, root, button, pathname, toggle, close } = useDropdown();
  // The links are without a language; compared with the page's address without it ("/en/rankings" → "/rankings")
  const current = splitLanguage(pathname).path;
  const id = useId();
  // The site's pages: the single links first, then each group's under its heading (in the header, its dropdown)
  const singles = entries.filter((e): e is MenuLink => !("links" in e));
  const groups = entries.filter((e): e is NavGroupEntry => "links" in e);
  const pageLink = (l: MenuLink) => (
    <li key={l.href}>
      <Link
        href={l.href}
        onClick={close}
        className={`link-host flex items-center gap-2 py-3 text-lg md:text-base md:py-2 border-b border-gray-100 ${current === l.href ? "font-semibold" : "text-gray-700 hover:text-black"}`}
        aria-current={current === l.href ? "page" : undefined}
      >
        <span className="link-group">{l.label}</span>
        {l.badge && <Badge className="font-normal">{l.badge}</Badge>}
      </Link>
    </li>
  );

  const line = "absolute left-1/2 w-5 h-0.5 -ml-2.5 bg-current transition-transform duration-200";
  return (
    // Phones: positioned by the header (the panel spans it); from md by this, for the dropdown
    <div ref={root} className="flex md:relative">
      <button
        ref={button}
        type="button"
        onClick={toggle}
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
        // The header is sticky, so the menu can't be scrolled to with the page: on phones it covers the screen below the
        // header and scrolls in itself; from md the dropdown scrolls in itself when it's taller than the screen below
        // the header. Scrolling to its end doesn't go on to scroll the page behind it (overscroll-contain).
        className={`absolute inset-x-0 top-full z-40 bg-white border-b border-gray-200 shadow-sm overflow-y-auto overscroll-contain max-md:h-[calc(100dvh-var(--header-offset))] md:max-h-[calc(100dvh-var(--header-offset)-1rem)] md:left-auto md:right-0 md:top-[calc(100%+0.5rem)] md:w-72 md:border transition-[opacity,translate] duration-200 ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
      >
        <div className="base-container px-4 py-2 md:px-5 md:py-3">
          <nav aria-label={t("layout.nav.label")} className="xl:hidden">
            <ul>{singles.map(pageLink)}</ul>
            {groups.map((g) => (
              <section key={g.label} className="pt-4">
                <h2 className="text-sm text-gray-600 mb-1">{g.label}</h2>
                <ul>{g.links.map(pageLink)}</ul>
              </section>
            ))}
          </nav>
          <nav aria-label={t("layout.nav.about")} className="pt-4 xl:pt-1">
            <h2 className="text-sm text-gray-600 mb-1">{t("layout.nav.about")}</h2>
            <ul>
              {about.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className={`link-host flex items-baseline gap-2 py-3 text-lg md:text-base md:py-2 border-b border-gray-100 ${current === l.href ? "font-semibold" : "text-gray-700 hover:text-black"}`}
                    aria-current={current === l.href ? "page" : undefined}
                  >
                    <span className="link-group">{l.label}</span>
                    {l.detail && <span className="font-mono text-xs font-normal text-gray-500">{l.detail}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <section className="pt-4 pb-2">
            <h2 className="text-sm text-gray-600 mb-2">{t("layout.menu.theme")}</h2>
            {/* Picking a theme closes the menu, with focus back on its button */}
            <ThemePicker
              onPick={() => {
                close();
                button.current?.focus();
              }}
            />
          </section>
          <section className="pt-2 pb-2">
            <h2 className="text-sm text-gray-600 mb-2">{t("layout.menu.language")}</h2>
            <LanguagePicker onPick={close} />
          </section>
          {/* Only where the site can be installed as an app and isn't open as one */}
          <InstallApp title={t("layout.menu.app")} className="pt-2 pb-2" />
        </div>
      </div>
    </div>
  );
}
