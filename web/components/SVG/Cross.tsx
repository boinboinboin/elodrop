// A cross: clear a field
import { type IconProps, iconProps } from "./iconProps";

export const Cross = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="m7 7 10 10M17 7 7 17" />
  </svg>
);
