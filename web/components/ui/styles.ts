// Class names shared by the site's buttons and button-like links: a black outline that fills black
// on hover (and when selected or current)
export const BUTTON = "border border-black transition-colors duration-200 hover:bg-black hover:text-white cursor-pointer";

/** A button or link in a row of choices, filled black when it's the current one */
export const toggleClass = (active: boolean, size: "md" | "sm" = "md") =>
  `${size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-2"} border border-black transition-colors duration-200 ${active ? "bg-black text-white" : "hover:bg-black hover:text-white"}`;

/** A square icon button (carousel arrows) */
export const ICON_BUTTON = `inline-flex items-center justify-center w-10 h-10 ${BUTTON} disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-inherit`;

/** A dropdown's box under its button (LinkSelect, the header's NavGroup), shown while open; placed by its caller */
export const dropdownPanel = (open: boolean) =>
  `bg-white border border-gray-200 shadow-sm transition-[opacity,translate] duration-200 ${open ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`;

/** A link or button in a dropdown's list, the current one bold (with a check beside it); its label in a `link-group` span */
export const dropdownItem = (current: boolean) =>
  `link-host w-full flex items-center justify-between gap-4 px-4 py-2 text-left whitespace-nowrap transition-colors duration-200 hover:bg-gray-50 cursor-pointer ${current ? "font-semibold" : "text-gray-700 hover:text-black"}`;

/** An underlined link in running text: a faint line, the full one growing over it on hover (globals.css link-underlined) */
export const TEXT_LINK = "link-underlined hover:text-blue-600";
/**
 * A table header that stays at the top of the page while its table scrolls past, below the sticky header
 * (--header-offset: components/layout/SiteHeader.tsx), sliding up with it when it goes away on phones
 */
export const STICKY_HEAD = "sticky top-(--header-offset) z-10 transition-[top] duration-200 bg-white text-sm text-gray-600 shadow-[inset_0_-1px_0_var(--color-gray-200)]";

/** A table row with a line under it (but the last) */
export const ROW = "border-b border-gray-100 last:border-0";
