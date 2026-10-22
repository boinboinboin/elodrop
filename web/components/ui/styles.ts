// Class names shared by the site's buttons and button-like links: a black outline that fills black
// on hover (and when selected or current)
export const BUTTON = "border border-black transition-colors duration-200 hover:bg-black hover:text-white cursor-pointer";

/** A button or link in a row of choices, filled black when it's the current one */
export const toggleClass = (active: boolean, size: "md" | "sm" = "md") =>
  `${size === "sm" ? "px-3 py-1 text-sm" : "px-4 py-2"} border border-black transition-colors duration-200 ${active ? "bg-black text-white" : "hover:bg-black hover:text-white"}`;

/** A square icon button (carousel arrows) */
export const ICON_BUTTON = `inline-flex items-center justify-center w-10 h-10 ${BUTTON} disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-inherit`;

/** An underlined link in running text */
export const TEXT_LINK = "underline hover:text-blue-600";

/** A table header that stays at the top of the page while its table scrolls past */
export const STICKY_HEAD = "sticky top-0 z-10 bg-white text-sm text-gray-600 shadow-[inset_0_-1px_0_var(--color-gray-200)]";

/** A table row with a line under it (but the last) */
export const ROW = "border-b border-gray-100 last:border-0";
