// An arrow pointing right: on to, later, show more
import { type IconProps, iconProps } from "./iconProps";

export const ArrowRight = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
