// A small filled triangle pointing up: moved up in a ranking
import { type IconProps, filledIconProps } from "./iconProps";

export const CaretUp = ({ className }: IconProps) => (
  <svg {...filledIconProps(className)}>
    <path d="M4 17h16L12 6z" />
  </svg>
);
