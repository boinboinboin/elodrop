// An arrow pointing left: back, earlier
import { type IconProps, iconProps } from "./iconProps";

export const ArrowLeft = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="M19 12H5M11 18l-6-6 6-6" />
  </svg>
);
