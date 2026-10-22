// A magnifying glass: a search field
import { type IconProps, iconProps } from "./iconProps";

export const Search = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
