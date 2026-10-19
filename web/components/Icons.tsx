// Small inline icons that size and colour themselves with the text around them (1em, currentColor),
// sitting on its baseline, for links like "← Rankings" and "Show all →".
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "inline-block w-[1em] h-[1em] align-[-0.15em] shrink-0",
} as const;

export const ArrowLeft = () => (
  <svg {...iconProps}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);

export const ArrowRight = () => (
  <svg {...iconProps}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
