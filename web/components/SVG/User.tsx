// A head and shoulders: the account (sign in, or the signed-in user's menu)
import { type IconProps, iconProps } from "./iconProps";

export const User = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
