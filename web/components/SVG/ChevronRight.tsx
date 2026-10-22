// A chevron pointing right: a section that opens (turned down while it is open)
import { type IconProps, iconProps } from "./iconProps";

export const ChevronRight = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
