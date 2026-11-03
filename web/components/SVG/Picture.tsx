// A framed picture with a mountain and a sun: an image (a page's link preview)
import { type IconProps, iconProps } from "./iconProps";

export const Picture = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="9.5" r="1.5" />
    <path d="m21 16-5-5-9 9" />
  </svg>
);
