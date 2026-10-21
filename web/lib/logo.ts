// The elodrop mark: a drop shot. One line runs across: a rating graph that drops, its dip the
// feathers of a shuttlecock falling cork first, and recovers; the cork (the one accent colour) leads.
// Drawn on a 32 grid; the 16 px icon has its own drawing on the pixel grid (whole-pixel lines, the
// graph's wiggle left out), as the full one blurs at that size.
// Used by components/Logo.tsx (the header) and scripts/make-icons.mts (the favicons).

/** The cork's colour: the mark's only colour besides black and white */
export const ACCENT = "#f97316";

export const MARK = {
  size: 32,
  // From the left edge to the right, overshooting both (clipped to the square)
  line: "M-1 9H3L6.4 12.8L9 11L12.4 14.6L14.2 17.4H21.8L25.2 11.6H33",
  stroke: 2.6,
  cork: "M14.6 19.6V22A3.4 3.4 0 0 0 21.4 22V19.6Z",
  radius: 7,
};

export const MARK_16 = {
  size: 16,
  line: "M-1 4H2L7 9H10L13 6H17",
  stroke: 2,
  cork: "M6.5 11H10.5V12A2 2 0 0 1 6.5 12Z",
  radius: 3.5,
};

/** The mark as an SVG file: white on a black square (rounded, or square for phone home screens) */
export function markSvg(mark: typeof MARK, { rounded = true } = {}) {
  const { size, line, stroke, cork, radius } = mark;
  const rx = rounded ? ` rx="${radius}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><clipPath id="square"><rect width="${size}" height="${size}"${rx}/></clipPath><rect width="${size}" height="${size}"${rx} fill="#000"/><g clip-path="url(#square)"><path d="${line}" fill="none" stroke="#fff" stroke-width="${stroke}" stroke-linejoin="round"/><path d="${cork}" fill="${ACCENT}"/></g></svg>`;
}
