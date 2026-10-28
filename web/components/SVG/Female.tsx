// The female sign (♀): women
import { type IconProps, iconProps } from "./iconProps";

export const Female = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <circle cx="12" cy="9" r="6" />
    <path d="M12 15v7M9 19h6" />
  </svg>
);
