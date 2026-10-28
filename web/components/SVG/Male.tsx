// The male sign (♂): men
import { type IconProps, iconProps } from "./iconProps";

export const Male = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <circle cx="10" cy="14" r="6" />
    <path d="M14.5 9.5 20 4M15 4h5v5" />
  </svg>
);
