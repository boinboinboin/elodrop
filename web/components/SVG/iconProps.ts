// What every icon shares: sized and coloured by the text around it (1em, currentColor), sitting on
// its baseline, hidden from screen readers (the text next to an icon says what it means). Line
// icons are stroked; filled icons (the carets) override fill and stroke.
import type { SVGProps } from "react";

export type IconProps = { className?: string };

export const iconProps = (className = ""): SVGProps<SVGSVGElement> => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: `inline-block w-[1em] h-[1em] align-[-0.15em] shrink-0 ${className}`,
});

/** A filled icon's props (no stroke) */
export const filledIconProps = (className = ""): SVGProps<SVGSVGElement> => ({ ...iconProps(className), fill: "currentColor", stroke: "none" });
