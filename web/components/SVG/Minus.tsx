// A minus: take out (a player from the EloStonk squad)
import { type IconProps, iconProps } from "./iconProps";

export const Minus = ({ className }: IconProps) => (
  <svg {...iconProps(className)} strokeWidth={2.5}>
    <path d="M5 12h14" />
  </svg>
);
