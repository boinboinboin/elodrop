// A five-pointed star: follow a player or a club (filled while followed)
import { type IconProps, iconProps } from "./iconProps";

export const Star = ({ className, filled = false }: IconProps & { filled?: boolean }) => (
  <svg {...iconProps(className)} fill={filled ? "currentColor" : "none"}>
    <path d="m12 2.8 2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z" />
  </svg>
);
