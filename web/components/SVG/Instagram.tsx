// Instagram's glyph (a camera: rounded square, lens, flash), drawn as a line icon like the others: the link to the
// site's Instagram in the footer
import { type IconProps, iconProps } from "./iconProps";

export const Instagram = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);
