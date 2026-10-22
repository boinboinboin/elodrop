// A check mark: a ticked box
import { type IconProps, iconProps } from "./iconProps";

export const Check = ({ className }: IconProps) => (
  <svg {...iconProps(className)} strokeWidth={3}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
