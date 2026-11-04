// A map pin: a place's address (a tournament's hall), linking to it on a map
import { type IconProps, iconProps } from "./iconProps";

export const MapPin = ({ className }: IconProps) => (
  <svg {...iconProps(className)}>
    <path d="M20 10c0 5-5.5 10.2-7.4 11.8a1 1 0 0 1-1.2 0C9.5 20.2 4 15 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
