// A shuttlecock, cork down: the feathers in the text's colour, the cork in the logo's accent. For
// the hidden things on the site (the 404 page, the shuttles that fall and fly). `cork`: a fixed
// colour instead of the theme's.
import type { SVGProps } from "react";

export default function Shuttle({ cork, ...props }: SVGProps<SVGSVGElement> & { cork?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2H20L15 15H9Z" strokeWidth={1.6} />
        <path d="M9.4 2L11 15M14.6 2L13 15M5.2 5.2H18.8" strokeWidth={1} />
      </g>
      <path className={cork ? undefined : "fill-accent"} fill={cork} d="M8.6 15H15.4V16.6A3.4 3.4 0 0 1 8.6 16.6Z" />
    </svg>
  );
}
