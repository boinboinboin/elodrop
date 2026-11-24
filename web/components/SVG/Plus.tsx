// A plus: add (a player to the EloStonk squad)
import { type IconProps, iconProps } from "./iconProps";

export const Plus = ({ className }: IconProps) => (
  <svg {...iconProps(className)} strokeWidth={2.5}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
