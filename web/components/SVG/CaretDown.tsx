// A small filled triangle pointing down: sorted most first, moved down in a ranking
import { type IconProps, filledIconProps } from "./iconProps";

export const CaretDown = ({ className }: IconProps) => (
  <svg {...filledIconProps(className)}>
    <path d="M4 7h16l-8 11z" />
  </svg>
);
